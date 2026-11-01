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
import { montarTutorial } from './ui/tutorial.ts';

const fases = fasesJson as unknown as Fase[];
const app = document.getElementById('app')!;
const params = new URLSearchParams(location.search);
let limpar: (() => void) | null = null;

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
  trocar(() => montarInicio(app, { jogar: () => void jogar(proximaFase()), mapa, ajuda: () => tutorial(inicio), ajustes }));
}
function ajustes() {
  trocar(() => montarAjustes(app, inicio));
}
function mapa() {
  guardar({ tela: 'mapa' });
  trocar(() => montarMapa(app, fases, { jogar: (id) => void jogar(id), inicio }));
}
function tutorial(depois: () => void) {
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
  const f = fases.find((x) => !p.ganhas.includes(x.id) && liberada(x.id));
  return f?.id ?? p.faseAtual;
}
async function jogar(id: number, demo?: string) {
  const fase = emTeste && faseTeste ? faseTeste : fases.find((f) => f.id === id);
  if (!fase) return mapa();
  // a tela do jogo é a parte mais pesada: só é carregada quando alguém vai jogar
  const { montarJogo } = await import('./ui/tela-jogo.ts');
  const entrar = () => {
    guardar({ tela: 'jogo', faseAtual: id });
    trocar(() =>
      montarJogo(
        app,
        fase,
        {
          irParaMapa: mapa,
          irParaFase: (n) => (emTeste ? mapa() : void jogar(n)),
          abrirTutorial: tutorialPorCima,
          temProxima: (n) => !emTeste && fases.some((f) => f.id === n + 1),
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
void iniciar();
