/**
 * Conta (entrar, criar, sair) e o botão pequeno da tela inicial.
 * O Firebase só é carregado quando alguém abre a janela de entrar (ou se já havia conta neste aparelho).
 */
import { carregarConta, enviarAgora, eventosDaNuvem, ligar, sairDaConta, situacaoAtual, usuarioAtual } from '../nuvem/sincronia.ts';

/** Texto curto do botão da tela inicial. */
export function rotuloDoChip(): string {
  if (!usuarioAtual()) return '☁ Entrar';
  const s = situacaoAtual();
  if (s === 'enviando') return '☁ Salvando…';
  if (s === 'sem-internet') return '☁ Sem internet';
  return '☁ Salvo ✓';
}

/** Atualiza o botão da tela inicial (se ela estiver aberta). */
export function atualizarChip() {
  const b = document.getElementById('bConta');
  if (b) b.textContent = rotuloDoChip();
}

interface BotaoJanela {
  rotulo: string;
  classe?: string;
  /** devolver false mantém a janela aberta */
  acao?: () => void | boolean | Promise<void | boolean>;
}

/** Janela simples por cima de tudo (fecha ao tocar num botão, a não ser que a ação devolva false). */
export function janela(titulo: string, corpo: string, botoes: BotaoJanela[]): HTMLElement {
  document.querySelector('.camada-conta')?.remove();
  const el = document.createElement('div');
  el.className = 'camada-conta';
  el.innerHTML = `<div class="caixa-conta" role="dialog" aria-modal="true" aria-label="${titulo}">
    <h2>${titulo}</h2>${corpo}
    <div class="acoes-conta">${botoes.map((b, i) => `<button class="btn grande ${b.classe ?? 'bege'}" data-i="${i}">${b.rotulo}</button>`).join('')}</div>
  </div>`;
  document.body.appendChild(el);
  el.querySelectorAll<HTMLElement>('.acoes-conta .btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const r = await botoes[Number(btn.dataset.i)].acao?.();
      if (r !== false) el.remove();
    }),
  );
  return el;
}

export function perguntar(titulo: string, texto: string, sim: string, nao: string, aoSim: () => void, aoNao?: () => void) {
  janela(titulo, `<p>${texto}</p>`, [
    { rotulo: sim, classe: 'verde', acao: aoSim },
    { rotulo: nao, acao: aoNao },
  ]);
}

/** Formulário de entrar / criar conta. */
function abrirEntrar() {
  const el = janela(
    'Entrar na conta',
    `<p>Com uma conta, o seu progresso fica guardado na nuvem e você joga em qualquer aparelho.</p>
     <form id="formConta" autocomplete="on" novalidate>
       <label class="campo">E-mail<input id="cEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false"></label>
       <label class="campo">Senha<input id="cSenha" type="password" autocomplete="current-password" autocapitalize="none"></label>
       <p class="erro-conta" id="cErro" role="alert"></p>
       <button type="submit" hidden></button>
     </form>
     <button class="link-conta" id="cEsqueci" type="button">Esqueci a senha</button>`,
    [
      { rotulo: 'Entrar', classe: 'verde', acao: () => tentar('entrar') },
      { rotulo: 'Criar conta', classe: 'roxo', acao: () => tentar('criar') },
      { rotulo: 'Agora não' },
    ],
  );
  const email = el.querySelector<HTMLInputElement>('#cEmail')!;
  const senha = el.querySelector<HTMLInputElement>('#cSenha')!;
  const erro = el.querySelector<HTMLElement>('#cErro')!;
  const ocupar = (v: boolean) => el.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.disabled = v));
  async function tentar(acao: 'entrar' | 'criar'): Promise<boolean> {
    erro.textContent = '';
    ocupar(true);
    try {
      const ev = eventosDaNuvem();
      if (ev) await ligar(ev);
      const c = await carregarConta();
      if (acao === 'entrar') await c.entrar(email.value, senha.value);
      else await c.criarConta(email.value, senha.value);
      return true; // fecha; o resto (juntar com a nuvem) acontece quando o Firebase avisa quem entrou
    } catch (e) {
      const c = await carregarConta().catch(() => null);
      erro.textContent = c ? c.mensagemDeErro(e) : 'Sem internet agora. Tente de novo quando a internet voltar.';
      ocupar(false);
      return false;
    }
  }
  el.querySelector('#formConta')!.addEventListener('submit', (ev) => {
    ev.preventDefault();
    void tentar('entrar').then((ok) => ok && el.remove());
  });
  el.querySelector('#cEsqueci')!.addEventListener('click', async () => {
    erro.textContent = '';
    try {
      const ev = eventosDaNuvem();
      if (ev) await ligar(ev);
      await (await carregarConta()).esqueciSenha(email.value);
      erro.textContent = 'Pronto! Se existir uma conta com esse e-mail, chega lá uma mensagem para criar uma senha nova.';
    } catch (e) {
      const c = await carregarConta().catch(() => null);
      erro.textContent = c ? c.mensagemDeErro(e) : 'Sem internet agora.';
    }
  });
  setTimeout(() => email.focus(), 50);
}

const SITUACAO: Record<string, string> = {
  verificando: 'Conferindo…',
  salvo: 'Seu progresso está guardado na nuvem ✓',
  enviando: 'Guardando na nuvem…',
  'sem-internet': 'Sem internet agora. O jogo continua e guarda quando a internet voltar.',
  'sem-conta': '',
};

/** O botão da tela inicial / dos Ajustes: entrar (se não tem conta) ou ver a conta. */
export function abrirConta() {
  const u = usuarioAtual();
  if (!u) return abrirEntrar();
  janela('Sua conta', `<p class="email-conta">${u.email}</p><p>${SITUACAO[situacaoAtual()]}</p>`, [
    { rotulo: 'Sair da conta', acao: () => confirmarSair() },
    { rotulo: 'Fechar', classe: 'verde' },
  ]);
}

function confirmarSair(): boolean {
  perguntar(
    'Sair da conta?',
    'O seu progresso continua guardado na nuvem. Neste aparelho, o jogo volta para "sem conta".',
    'Sair',
    'Ficar',
    async () => {
      await enviarAgora();
      await sairDaConta();
    },
  );
  return false;
}
