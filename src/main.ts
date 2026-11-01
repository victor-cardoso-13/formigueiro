/**
 * Formigueiro — controle da tela.
 * Liga as telas (início, mapa, jogo, tutorial) às regras (src/motor) e guarda o progresso (src/ui/salvar).
 */
import './estilo.css';
import fasesJson from './fases/fases.json';
import type { Fase } from './motor/tipos.ts';
import { montarInicio } from './ui/inicio.ts';
import { montarAjustes } from './ui/ajustes.ts';
import { montarMapa } from './ui/mapa.ts';
import { esquecerTudoParaTeste, guardar, ganhou, liberada, progresso } from './ui/salvar.ts';
import { iniciarNuvem, levarProgressoSemConta, progressoSemConta, sincronizar } from './nuvem/sincronia.ts';
import { abrirConta, atualizarChip, janela, perguntar } from './ui/conta.ts';
import { montarTutorial } from './ui/tutorial.ts';

const fases = fasesJson as unknown as Fase[];
// número da fase dentro do nível (1, 2, 3…)
{
  const contagem: Record<string, number> = {};
  for (const f of fases) f.numero = contagem[f.grupo] = (contagem[f.grupo] ?? 0) + 1;
}
const app = document.getElementById('app')!;
const params = new URLSearchParams(location.search);
let limpar: (() => void) | null = null;
/** Redesenha a tela atual (início, fases, ajustes) quando a conta muda; null durante a partida e o tutorial. */
let redesenhar: (() => void) | null = null;
let emJogo = false;

// Só para os prints e testes (ver scripts/prints.mjs):
//   ?limpo=1 começa do zero · ?visto=1 tutorial já visto · ?ganhas=N ganha as N primeiras · ?todas=1 libera tudo
//   ?tela=inicio|mapa|jogo|tutorial|ajustes · ?fase=N ou ?fase=teste (usa src/fases/fase-teste.json) · ?demo=... (passa para o jogo)
//   ?passo=N (tutorial) · ?simbolos=1 liga os símbolos nas cores · ?teste=1 (a tela do jogo abre o gancho para o teste automático)
if (params.get('limpo')) esquecerTudoParaTeste();
if (params.get('simbolos')) guardar({ ajudas: { ...progresso().ajudas, simbolos: true } });
if (params.get('visto')) guardar({ tutorialVisto: true });
if (params.get('todas')) for (const f of fases) ganhou(f.id);
if (params.get('ganhas')) for (let i = 1; i <= Number(params.get('ganhas')); i++) ganhou(i);

/** Fase de teste (?fase=teste): lida de src/fases/fase-teste.json, se esse arquivo existir. */
const emTeste = params.get('fase') === 'teste';
let faseTeste: Fase | null = null;
async function carregarFaseTeste() {
  const achados = import.meta.glob('./fases/fase-teste.json', { import: 'default' });
  const ler = achados['./fases/fase-teste.json'];
  if (ler) faseTeste = (await ler()) as Fase;
}

function trocar(montar: () => (() => void) | void) {
  limpar?.();
  limpar = null;
  app.innerHTML = '';
  app.className = '';
  limpar = montar() ?? null;
}

function inicio() {
  guardar({ tela: 'inicio' });
  emJogo = false;
  redesenhar = inicio;
  trocar(() => montarInicio(app, { jogar: () => void jogar(proximaFase()), mapa, ajuda: () => tutorial(inicio), ajustes, conta: abrirConta }));
}
function ajustes() {
  emJogo = false;
  redesenhar = ajustes;
  trocar(() => montarAjustes(app, inicio, abrirConta));
}
function mapa() {
  guardar({ tela: 'mapa' });
  emJogo = false;
  redesenhar = mapa;
  trocar(() => montarMapa(app, fases, { jogar: (id) => void jogar(id), inicio }));
}
function tutorial(depois: () => void) {
  emJogo = false;
  redesenhar = null;
  trocar(() =>
    montarTutorial(app, () => {
      guardar({ tutorialVisto: true });
      depois();
    }),
  );
}
/** "?" durante a partida: abre o tutorial por cima, sem desmontar o jogo (a partida continua de onde estava). */
function tutorialPorCima() {
  const camada = document.createElement('div');
  camada.className = 'camada-tutorial';
  document.body.appendChild(camada);
  window.dispatchEvent(new Event('formigueiro:pausa'));
  montarTutorial(camada, () => {
    camada.remove();
    window.dispatchEvent(new Event('formigueiro:retomar'));
  });
}
function proximaFase(): number {
  const p = progresso();
  const atual = fases.find((x) => x.id === p.faseAtual);
  // continua no nível em que a pessoa estava: a próxima ainda não ganha, na ordem
  const f = fases.find((x) => x.grupo === (atual?.grupo ?? 'facil') && !p.ganhas.includes(x.id) && liberada(x, fases)) ?? fases.find((x) => !p.ganhas.includes(x.id) && liberada(x, fases));
  return f?.id ?? p.faseAtual;
}
/** A fase que vem depois de `id` no mesmo nível, se houver. */
function proximaDoNivel(id: number): number | undefined {
  const f = fases.find((x) => x.id === id);
  const lista = fases.filter((x) => x.grupo === f?.grupo);
  return lista[lista.findIndex((x) => x.id === id) + 1]?.id;
}
async function jogar(id: number, demo?: string) {
  const fase = emTeste && faseTeste ? faseTeste : fases.find((f) => f.id === id);
  if (!fase) return mapa();
  // a tela do jogo é a parte mais pesada: só é carregada quando alguém vai jogar
  const { montarJogo } = await import('./ui/tela-jogo.ts');
  const entrar = () => {
    emJogo = true;
    redesenhar = null;
    guardar({ tela: 'jogo', faseAtual: id });
    trocar(() =>
      montarJogo(
        app,
        fase,
        {
          irParaMapa: mapa,
          irParaFase: (n) => (emTeste ? mapa() : void jogar(proximaDoNivel(n) ?? n)),
          abrirTutorial: tutorialPorCima,
          temProxima: (n) => !emTeste && proximaDoNivel(n) !== undefined,
        },
        demo,
      ),
    );
  };
  if (!progresso().tutorialVisto && !demo) tutorial(entrar);
  else entrar();
}

// ---------- ponto de partida ----------
async function iniciar() {
  if (emTeste) await carregarFaseTeste();
  const tela = params.get('tela') ?? (params.get('fase') ? 'jogo' : progresso().tela);
  if (tela === 'tutorial') {
    tutorial(inicio);
    const n = Number(params.get('passo') ?? 0);
    for (let i = 0; i < n; i++) (app.querySelector('#tProx') as HTMLElement | null)?.click();
  } else if (tela === 'jogo') {
    const pedida = params.get('fase');
    await jogar(emTeste ? 1 : Number(pedida ?? progresso().faseAtual), params.get('demo') ?? undefined);
  } else if (tela === 'mapa') mapa();
  else if (tela === 'ajustes') ajustes();
  else inicio();
}
/** Conta e nuvem: o Firebase só é carregado se já havia conta neste aparelho ou quando alguém abre "Entrar". */
function ligarNuvem() {
  void iniciarNuvem({
    trocouDeConta: () => {
      if (emJogo) janela('A conta mudou', '<p>Voltando para a tela inicial.</p>', [{ rotulo: 'Ok', classe: 'verde', acao: inicio }]);
      else redesenhar?.();
    },
    mudouSituacao: atualizarChip,
    aoUsuario: async (u) => {
      if (!u) return;
      await sincronizar(progresso());
      const sem = progressoSemConta();
      const marca = `formigueiro:perguntou:${u.uid}`;
      if (sem && !localStorage.getItem(marca)) {
        localStorage.setItem(marca, '1');
        perguntar(
          'Juntar o progresso?',
          'Você jogou sem conta neste aparelho. Quer juntar esse progresso à sua conta? (Se este aparelho não é seu, escolha "Não".)',
          'Sim, juntar',
          'Não',
          () => {
            levarProgressoSemConta(progresso());
            if (!emJogo) redesenhar?.();
          },
        );
      }
      if (!emJogo) redesenhar?.();
    },
  });
}

void iniciar().then(ligarNuvem);
