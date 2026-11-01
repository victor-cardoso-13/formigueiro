import { formigaSvg } from './formiga.ts';
import { progresso } from './salvar.ts';

export function montarInicio(app: HTMLElement, nav: { jogar(): void; mapa(): void; ajuda(): void; ajustes(): void }) {
  const p = progresso();
  const continua = p.ganhas.length > 0;
  app.innerHTML = `<div class="inicio">
    <div class="fila-formigas">${[0, 2, 4, 1, 7].map((c, i) => `<span style="animation-delay:${i * 0.15}s">${formigaSvg(c)}</span>`).join('')}</div>
    <h1>Formigueiro</h1>
    <p class="sub">Mande as formigas buscarem o açúcar da cor delas.</p>
    <div class="botoes-inicio">
      <button class="btn grande ambar" id="bJogar">${continua ? 'Continuar' : 'Jogar'}</button>
      <button class="btn grande" id="bMapa">Fases</button>
      <button class="btn grande" id="bAjuda">Como jogar</button>
      <button class="btn grande" id="bAjustes">Ajustes</button>
    </div>
    <p class="rodape">Sem anúncios · ${p.ganhas.length} fases ganhas</p>
  </div>`;
  app.querySelector('#bJogar')!.addEventListener('click', nav.jogar);
  app.querySelector('#bMapa')!.addEventListener('click', nav.mapa);
  app.querySelector('#bAjuda')!.addEventListener('click', nav.ajuda);
  app.querySelector('#bAjustes')!.addEventListener('click', nav.ajustes);
}
