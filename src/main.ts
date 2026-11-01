/**
 * Formigueiro — controle da tela.
 * Liga as telas (início, mapa, jogo, tutorial) às regras (src/motor) e guarda o progresso (src/ui/salvar).
 */
import './estilo.css';
import fasesJson from './fases/fases.json';
import type { Fase } from './motor/tipos.ts';
import { montarInicio } from './ui/inicio.ts';
import { montarMapa } from './ui/mapa.ts';
import { esquecerTudoParaTeste, guardar, ganhou, liberada, progresso } from './ui/salvar.ts';
import { montarJogo } from './ui/tela-jogo.ts';
import { montarTutorial } from './ui/tutorial.ts';

const fases = fasesJson as unknown as Fase[];
const app = document.getElementById('app')!;
const params = new URLSearchParams(location.search);
let limpar: (() => void) | null = null;

// Só para os prints e testes: ?limpo=1 começa do zero; ?todas=1 libera todas as fases.
if (params.get('limpo')) esquecerTudoParaTeste();
if (params.get('visto')) guardar({ tutorialVisto: true });
if (params.get('todas')) for (const f of fases) ganhou(f.id);
if (params.get('ganhas')) for (let i = 1; i <= Number(params.get('ganhas')); i++) ganhou(i);

function trocar(montar: () => (() => void) | void) {
  limpar?.();
  limpar = null;
  app.innerHTML = '';
  app.className = '';
  limpar = montar() ?? null;
}

function inicio() {
  guardar({ tela: 'inicio' });
  trocar(() => montarInicio(app, { jogar: () => jogar(proximaFase()), mapa, ajuda: () => tutorial(inicio) }));
}
function mapa() {
  guardar({ tela: 'mapa' });
  trocar(() => montarMapa(app, fases, { jogar, inicio }));
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
  montarTutorial(camada, () => camada.remove());
}
function proximaFase(): number {
  const p = progresso();
  const f = fases.find((x) => !p.ganhas.includes(x.id) && liberada(x.id));
  return f?.id ?? p.faseAtual;
}
function jogar(id: number, demo?: string) {
  const fase = fases.find((f) => f.id === id);
  if (!fase) return mapa();
  const entrar = () => {
    guardar({ tela: 'jogo', faseAtual: id });
    trocar(() =>
      montarJogo(
        app,
        fase,
        { irParaMapa: mapa, irParaFase: (n) => jogar(n), abrirTutorial: tutorialPorCima, temProxima: (n) => fases.some((f) => f.id === n + 1) },
        demo,
      ),
    );
  };
  if (!progresso().tutorialVisto && !demo) tutorial(entrar);
  else entrar();
}

// ---------- ponto de partida ----------
const tela = params.get('tela') ?? progresso().tela;
if (tela === 'tutorial') {
  tutorial(inicio);
  const n = Number(params.get('passo') ?? 0);
  for (let i = 0; i < n; i++) (app.querySelector('#tProx') as HTMLElement | null)?.click();
} else if (tela === 'jogo') jogar(Number(params.get('fase') ?? progresso().faseAtual), params.get('demo') ?? undefined);
else if (tela === 'mapa') mapa();
else inicio();
