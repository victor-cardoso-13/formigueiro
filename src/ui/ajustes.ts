/** Ajustes: a única ajuda opcional (símbolos nas cores), desligada por padrão. */
import { guardar, progresso, type Ajudas } from './salvar.ts';

const LINHAS: { chave: keyof Ajudas; titulo: string; texto: string }[] = [
  { chave: 'simbolos', titulo: 'Símbolos nas cores', texto: 'Põe um desenhinho (●, ▲, ■…) em cada cor. Ajuda quem confunde cores parecidas.' },
];

export function montarAjustes(app: HTMLElement, voltar: () => void) {
  function desenhar() {
    const aj = progresso().ajudas;
    app.innerHTML = `<div class="ajustes">
      <div class="topo"><button class="btn" id="aVoltar">‹ Voltar</button><h2>Ajustes</h2><span style="min-width:84px"></span></div>
      <div class="lista-ajustes">${LINHAS.map(
        (l) => `<button class="linha-ajuste ${aj[l.chave] ? 'ligado' : ''}" data-k="${l.chave}" role="switch" aria-checked="${aj[l.chave]}">
          <span class="txt"><b>${l.titulo}</b><small>${l.texto}</small></span><span class="chave"><i></i><em>${aj[l.chave] ? 'Ligado' : 'Desligado'}</em></span></button>`,
      ).join('')}</div>
    </div>`;
    app.querySelector('#aVoltar')!.addEventListener('click', voltar);
    for (const b of app.querySelectorAll<HTMLElement>('.linha-ajuste')) {
      b.addEventListener('click', () => {
        const k = b.dataset.k as keyof Ajudas;
        guardar({ ajudas: { ...progresso().ajudas, [k]: !progresso().ajudas[k] } });
        desenhar();
      });
    }
  }
  desenhar();
}
