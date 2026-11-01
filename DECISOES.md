> **Leia primeiro:** o jogo foi refeito em 1/nov (estilo Colony Flow). Só a seção "Refeito em 1/nov" vale; o que vem antes dela descreve o jogo ANTIGO e está obsoleto.

# Decisões tomadas sozinho (madrugada, Victor dormindo)

- **Motor:** as funções (`tocar`, `passo`…) mexem no estado recebido; `clonar()` serve para guardar o "antes" (Desfazer).
- **Fim da volta:** a formiga entra na posição 0 (entrada) e a volta termina ao voltar a ela (2L+2A+4 passos). Ao terminar, ela não ocupa a entrada.
- **Vitória** limpa a trilha (formigas voltam para casa). **Derrota** deixa tudo como está.
- **Folha seca:** só cai quando um vizinho (cima/baixo/esquerda/direita) **some de vez**.
- **Dorminhoca:** só as que **já estavam na frente** de outra coluna contam a saída; a que acabou de chegar à frente não conta aquela saída.
- **Travado:** se todas as formigas da frente estão dormindo, a trilha está vazia e a espera também, o resultado é "travado" (tratado como derrota na tela, com Desfazer).
- **Desfazer:** guarda um "antes" só nos toques feitos com a trilha **vazia** (início de cada rodada); só funciona com a trilha vazia.
- **Toques nas soluções** são números: 0–4 = coluna; 10–14 = lugar de espera 0–4.
- **Dificuldade medida:** a IA que joga ao acaso vence quase sempre nas fases com 3 colunas (média) — fica em 70–100%, acima do alvo de 20–60%. Nas difíceis (4 colunas) fica em ~10–40% (algumas mais) e nas muito difíceis em 2–35%. O gerador tenta 14 vezes ajustar a "dureza" (sobras de fome, espera, fome máxima) e guarda a mais próxima da faixa. A dificuldade real vem de mais cores, mais formigas e das peças especiais. Tabela completa em `FASES.md`. Se quiser fases médias mais apertadas, dá para ajustar `scripts/gerador.ts` e regerar (trocar a chave `formigueiro:v1`).
- **Desenhos:** 10 pequenos + 7 médios à mão; o resto é por código (listras, xadrez, anéis, espiral, tijolinhos, vitral/mosaico) ou "de retalhos" (desenho pequeno ampliado 2× com cores trocadas por cores primas).
- **Mapa de fases em 4 abas** (uma por grupo) para caber sem rolagem em todos os tamanhos.
- **Previsão 👀:** simula uma volta da formiga sozinha, sem contar as outras formigas que já estejam na trilha.
- **Torrão duro REMOVIDO** a pedido do Victor (1/nov): saiu do motor, do gerador, das fases (36–60 foram geradas de novo), dos testes e da tela.
- **Ajustes:** nova tela com 2 chaves, desligadas por padrão: "Ajuda do olho" (👁 N + contorno nos pedacinhos à vista) e "Símbolos nas cores" (para daltonismo).

---

# Refeito em 1/nov: estilo "Colony Flow" (decisão do Victor)

**Decisão:** o jogo foi refeito do zero na jogabilidade. O Victor pediu, de propósito, a mesma mecânica do Colony Flow:
quadro de pixels, buraco, **5 vagas**, grade de **ninhos** (cor + número), formigas que pegam quadradinhos **expostos** e levam ao buraco,
ninhos ligados por **cano**. **Motivo:** ele prefere esse jogo; a versão com trilha e fome era mais difícil de entender para os idosos.
Substitui as regras abaixo; os visuais da casa (creme/tinta/âmbar, Fredoka/Nunito), a regra "idoso primeiro", o progresso em `localStorage` e o fluxo de testes continuam.

- Motor novo em `src/motor/` (`colonia.ts`, `geometria.ts`, `regras.ts`). 60 fases novas (10/20/20/10), solução congelada em cada uma.
- **Velocidade** 1×/2×/3× (antes 1×/2×/5×). **Desfazer ilimitado** a qualquer momento (antes só com a trilha vazia). **Recomeçar** pede confirmação.
- Chave do progresso: **`formigueiro:v2`** (a `v1` era do jogo antigo). Campo `olho` foi removido; só sobra "Símbolos nas cores" em Ajustes.
- Tutorial novo de 5 passos (ninho tem cor e número; toque na frente; formiga pega da borda; 5 vagas; canos).
- Tela cheia no iPhone/iPad: fundo em `body::before` e `#app` fixo (padrão da casa), em vez de `height: 100dvh`.
- `?fase=teste` carrega `src/fases/fase-teste.json` (só testes/prints). A tela do jogo é carregada sob demanda (`import()`).

## OBSOLETO (valia só para o jogo antigo — não usar)
As decisões abaixo, da versão com trilha, **não valem mais**: Motor "tocar/passo" da trilha · Fim da volta · Vitória limpa a trilha ·
**Folha seca** · **Dorminhoca** · Travado · Desfazer só com a trilha vazia · toques 0–4/10–14 nas soluções · Previsão 👀 ·
fome por formiga · Ajuda do olho · velocidade 5×. Também ficam obsoletas as "dificuldades medidas" daquela época (ver `FASES.md` novo).
Continuam valendo: torrão duro removido (nunca volta), mapa em 4 abas por grupo, desenhos originais.
