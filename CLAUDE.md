# Formigueiro — instruções para o Claude

Quebra-cabeça de formigas e açúcar, feito para o Victor e a família (idosos primeiro). Slug `formigueiro`.
**Esta pasta é só do Formigueiro.** Não mexa em outros jogos, no `_modelo/` nem no `APRENDIZADOS.md` daqui
(anote sugestões no `PROMPT-PROXIMA-SESSAO.md`).
**Ainda NÃO foi publicado**: repositório só local (sem GitHub, sem Pages). Sem Firebase: progresso só no `localStorage`.

## Como falar com o usuário
Português, linguagem simples, passo a passo (ele não programa). No fim, diga como testar no iPhone e no iPad.

## O jogo (resumo — a especificação completa está em `JOGO.md`)
- Um desenho de pixels feito de pedacinhos de açúcar coloridos; **formigas** coloridas, cada uma com uma **fome** (número),
  dão uma volta numa **trilha** em torno do desenho e comem **o primeiro pedacinho que veem** em cada linha/coluna, se for da cor delas.
- 5 lugares de espera; encheu e sobrou formiga com fome = derrota. Desenho vazio = vitória.
- Peças especiais: folha seca (cai quando um vizinho é comido), formiga dorminhoca (acorda após 3 saídas).
- Ajudas: Desfazer (só com a trilha vazia), Recomeçar, velocidade 1×/2×/5×. Sem moedas/anúncios/poderes.
- 60 fases **congeladas** em `src/fases/fases.json` (nunca gerar na hora; se regerar, troque a chave `formigueiro:v1`).
- **Originalidade**: não imitar nenhum jogo comercial existente (tela, desenhos, peças, ajudas).

## Organização
- `src/motor/` regras puras e determinísticas (`tipos`, `trilha`, `jogo`, `regras`). Sem `Math.random`, sem tela.
- `src/fases/` paleta, desenhos (grades de letras) e `fases.json`. Gerador: `node scripts/gerar.ts` (Node 26 roda TypeScript direto).
- `src/ui/` telas e `salvar.ts`; `src/estilo.css` visual da casa (creme, tinta `#3b2f2a`, âmbar, Fredoka/Nunito).
- `tests/` Vitest (inclui a conferência de todas as fases: replay da solução vence).
- `scripts/mock-tela.html` mock; `scripts/prints.mjs` prints Playwright.

## Antes de entregar
1. `source ~/.nvm/nvm.sh`; `npm test` e `npx tsc --noEmit -p .`; `npm run build`.
2. Prints (`npx vite --port 5199` + `node scripts/prints.mjs prints`): iPad 1180×820 e 820×1180; iPhone 440×800, 390×844 e deitado 956×360. **Nunca iPhone SE.**
3. Idoso primeiro: letras/botões grandes (≥56 px iPad, ≥48 px iPhone), tocar (não exigir arrastar), sem rolagem, avisos curtos.

## Para testar no celular sem publicar
`npx vite --host --port 5180` e abrir no celular (mesmo Wi-Fi) o endereço "Network". Ou dois cliques em `Jogar no computador.command`.

## Decisão do Victor (1/nov)
- **Sem torrão duro** (ele pediu para tirar do jogo). Os símbolos de cor e a "ajuda do olho" (👁 N e contorno) existem só em **Ajustes**, desligados por padrão.
