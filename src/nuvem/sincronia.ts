/**
 * Mantém o progresso do aparelho e o da nuvem iguais.
 * - Ao entrar (ou ao abrir o jogo já com conta): baixa da nuvem, junta com o do aparelho e envia o resultado.
 * - A cada mudança: espera 2 s sem mudanças e envia (para não gastar o limite grátis a cada toque).
 * - Sem internet: o jogo continua normal; envia quando a internet voltar.
 * O Firebase só é carregado aqui dentro, depois que o jogo já abriu.
 */
import { carregar, contaAtiva, definirProgresso, limparSemConta, quandoSalvar, temProgresso, usarConta, type Progresso } from '../ui/salvar.ts';
import { daNuvem, iguais, mesclar, paraNuvem } from './mesclar.ts';
import type { Usuario } from './conta.ts';

type Conta = typeof import('./conta.ts');

export type Situacao = 'verificando' | 'sem-conta' | 'salvo' | 'enviando' | 'sem-internet';

let conta: Conta | null = null;
let usuario: Usuario | null = null;
let situacao: Situacao = 'verificando';
let espera: ReturnType<typeof setTimeout> | null = null;
let pendente: Progresso | null = null;
let ultimoEnviado = '';
let avisar: () => void = () => {};
let eventosGuardados: EventosNuvem | null = null;
export const eventosDaNuvem = () => eventosGuardados;

export const usuarioAtual = () => usuario;
export const situacaoAtual = () => situacao;

function mudar(s: Situacao) {
  situacao = s;
  avisar();
}

export async function carregarConta(): Promise<Conta> {
  return (conta ??= await import('./conta.ts'));
}

/**
 * Liga a nuvem. "trocouDeConta" é chamado quando a gaveta do aparelho muda (alguém entrou ou saiu);
 * "mudouSituacao" quando muda o "salvo na nuvem / sem internet".
 */
export interface EventosNuvem {
  /** a gaveta do aparelho mudou (alguém entrou ou saiu) */
  trocouDeConta: () => void;
  /** mudou o "salvo na nuvem / sem internet" */
  mudouSituacao: () => void;
  /** depois de cada aviso do Firebase sobre quem está dentro (inclusive ao abrir o jogo já com conta) */
  aoUsuario: (u: Usuario | null) => void;
}

export async function iniciarNuvem(eventos: EventosNuvem) {
  avisar = eventos.mudouSituacao;
  quandoSalvar(agendarEnvio);
  eventosGuardados = eventos;
  addEventListener('online', () => pendente && void enviarAgora());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void enviarAgora();
  });
  // quem já usou uma conta neste aparelho: só carrega o Firebase se havia conta (quem joga sem conta não paga esse peso)
  if (!contaAtiva() && !localStorage.getItem('formigueiro:quer-nuvem')) {
    mudar('sem-conta');
    return;
  }
  await ligar(eventos);
}

/** Carrega o Firebase e passa a observar quem entra e sai. */
let ligado = false;
export async function ligar(eventos: EventosNuvem) {
  avisar = eventos.mudouSituacao;
  if (ligado) return;
  try {
    const c = await carregarConta();
    ligado = true;
    localStorage.setItem('formigueiro:quer-nuvem', '1');
    c.observarConta((u) => {
      usuario = u;
      const trocou = trocarGaveta(u?.uid ?? null);
      mudar(u ? 'salvo' : 'sem-conta');
      if (trocou) eventos.trocouDeConta();
      eventos.aoUsuario(u);
    });
  } catch {
    mudar('sem-internet'); // não deu para carregar o Firebase (sem internet na primeira vez)
  }
}

/** Abre a gaveta da conta (se ainda não for a aberta). Devolve true se trocou. */
export function trocarGaveta(uid: string | null): boolean {
  if (uid === contaAtiva()) return false;
  if (espera) clearTimeout(espera);
  espera = null;
  pendente = null;
  usarConta(uid);
  return true;
}

function agendarEnvio(p: Progresso) {
  if (!usuario) return;
  if (JSON.stringify(paraNuvem(p)) === ultimoEnviado) return; // só mudou algo que não vai para a nuvem
  pendente = p;
  if (espera) clearTimeout(espera);
  espera = setTimeout(() => void enviarAgora(), 2000);
}

export async function enviarAgora() {
  if (espera) clearTimeout(espera);
  espera = null;
  const p = pendente;
  const u = usuario;
  if (!p || !u || !conta) return;
  pendente = null;
  mudar('enviando');
  try {
    const dados = paraNuvem(p);
    await conta.enviar(u.uid, dados as unknown as Record<string, unknown>);
    ultimoEnviado = JSON.stringify(dados);
    if (usuario?.uid === u.uid) mudar('salvo');
  } catch {
    pendente ??= p;
    mudar('sem-internet');
  }
}

/** Baixa da nuvem, junta com o do aparelho, guarda e envia o resultado. Devolve o progresso juntado. */
export async function sincronizar(local: Progresso): Promise<Progresso> {
  const u = usuario;
  if (!u || !conta) return local;
  try {
    const remoto = await conta.baixar(u.uid);
    if (usuario?.uid !== u.uid) return local; // trocou de conta no meio do caminho
    const doRemoto = remoto ? daNuvem(remoto as never, local) : null;
    const junto = doRemoto ? mesclar(local, doRemoto) : local;
    if (!doRemoto || !iguais(junto, doRemoto)) {
      mudar('enviando');
      await conta.enviar(u.uid, paraNuvem(junto) as unknown as Record<string, unknown>);
    }
    ultimoEnviado = JSON.stringify(paraNuvem(junto));
    definirProgresso(junto, u.uid);
    pendente = null;
    mudar('salvo');
    return junto;
  } catch {
    mudar('sem-internet');
    return local;
  }
}

/** Há progresso feito sem conta neste aparelho? */
export const progressoSemConta = (): Progresso | null => {
  const p = carregar(null);
  return temProgresso(p) ? p : null;
};

/** Leva o progresso feito sem conta para a conta aberta e apaga a gaveta "sem conta". */
export function levarProgressoSemConta(daConta: Progresso): Progresso {
  const junto = mesclar(daConta, carregar(null));
  definirProgresso(junto);
  limparSemConta();
  pendente = junto;
  void enviarAgora();
  return junto;
}

export async function sairDaConta() {
  await enviarAgora();
  await (await carregarConta()).sair();
}
