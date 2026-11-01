# Formigueiro — instruções para o Claude

Quebra-cabeça de formigas e açúcar, feito para o Victor e a família (idosos primeiro). Slug `formigueiro`.
**Esta pasta é só do Formigueiro.** Não mexa em outros jogos, no `_modelo/` nem no `APRENDIZADOS.md` daqui
(anote sugestões no `PROMPT-PROXIMA-SESSAO.md`).
**Publicado** em https://victor-cardoso-13.github.io/formigueiro/ (repositório `victor-cardoso-13/formigueiro`, PR + merge no `main` publica sozinho).
Progresso no `localStorage` (`formigueiro:v4`, uma gaveta por conta) e, com login, na nuvem: Firebase compartilhado `jogos-sem-anuncio`, `jogadores/{uid}/jogos/formigueiro` (só fases ganhas e símbolos; ver `src/nuvem/`). Sem mexer nas regras do Firestore.

## Como falar com o usuário
Português, linguagem simples, passo a passo (ele não programa). No fim, diga como testar no iPhone e no iPad.

## O jogo (resumo — a especificação completa está em `JOGO.md`)
- Quadro grande de quadradinhos pixel-art; embaixo um **buraco** e **5 vagas**; grade de **ninhos** (cor + número) em 3–4 colunas,
  só os da frente tocáveis.
- Tocar num ninho: ele sobe para uma vaga e dele saem formigas; cada uma pega um quadradinho **exposto** (primeiro da linha/coluna visto
  de fora) **da cor do ninho** e leva ao buraco. Ninho sem alvo espera e **ocupa a vaga**. Ninhos ligados por **cano** sobem juntos e
  precisam de vagas livres para todos.
- Quadro vazio = vitória. Vagas cheias de ninhos que não alcançam nada (e nada mais pode subir) = derrota.
- Ajudas: Desfazer ilimitado, Recomeçar (com confirmação), velocidade 1×/2×/3×. Sem moedas/anúncios/poderes.
- 500 fases **congeladas** em `src/fases/fases.json`, em 4 níveis livres para escolher (como no Miaudoku): Fácil 50, Médio 50, Difícil 200, Desafio 200 (ids 1–70 = as primeiras, já publicadas e NUNCA mudam de id: o progresso salvo usa o id; ids 71–500 = extras no fim de cada nível, ordenadas da mais fácil para a mais difícil pela taxa do robô). Dentro de cada nível a fase só abre depois de ganhar a anterior do mesmo nível (`liberada` em `salvar.ts`). Se regerar, troque a chave `formigueiro:v4`.
- Canos: grupo de 2–3 ninhos, lado a lado na 1ª fileira ou empilhados na mesma coluna; só sobe com o grupo todo à vista; nas vagas ficam lado a lado até todos terminarem. Fases extras: `FASES_EXTRA=1 node scripts/gerar.ts <a> <b>` / `bash scripts/gerar-extras.sh` (lista em `scripts/lista-extra.ts`, vai para `src/fases/fases-extra.json`, não versionado). Alguns ninhos de trás aparecem como "?" (`scripts/misterios.mjs`, rode depois de gerar).

## Decisão do Victor (1/nov)
- **Mecânica igual à do Colony Flow, a pedido dele** (o jogo foi refeito por isso). **Sem torrão duro, sem zzz (dorminhoca), sem folha seca,
  sem fome/trilha, sem "ajuda do olho".**
- Os **símbolos nas cores** existem só em **Ajustes**, desligados por padrão.

## Organização
- `src/motor/` regras puras e determinísticas (`tipos`, `regras`, `geometria`, `colonia`). Sem `Math.random`, sem tela.
- `src/fases/` paleta, desenhos e `fases.json` (+ `fase-teste.json` só para testes). Gerador: `scripts/gerar.ts` (Node 26 roda TypeScript direto).
- `src/ui/` telas (`inicio`, `mapa`, `tela-jogo`, `tabuleiro`, `formiga`, `tutorial`, `ajustes`) e `salvar.ts`; `src/estilo.css` visual da casa (creme, tinta `#3b2f2a`, âmbar, Fredoka/Nunito).
- `tests/` Vitest (inclui a conferência de todas as fases: replay da solução vence).
- `scripts/prints.mjs` prints Playwright; `scripts/jogar-teste.mjs` joga a fase de verdade no navegador.

## Antes de entregar
1. `source ~/.nvm/nvm.sh`; `npm test` e `npx tsc --noEmit -p .`; `npm run build`.
2. Prints: `npx vite --port 5194 --strictPort` (a 5191 é do dono) e `node scripts/prints.mjs prints 5194 [cena] [fase]`: iPad 1180×820 e 820×1180; iPhone 440×800, 390×844 e deitado 956×360;
   mais 393×852 com a área segura do iPhone (topo 59, base 34). **Nunca iPhone SE.** O script avisa rolagem e erros.
3. `node scripts/jogar-teste.mjs <fase> 5194`: vence a fase pela tela e confere derrota, Desfazer e Recomeçar.
4. Idoso primeiro: letras/botões grandes (≥56 px iPad, ≥48 px iPhone), tocar (não exigir arrastar), sem rolagem, avisos curtos.
5. Tela cheia no iPhone/iPad: fundo em `body::before`, `#app` com `position: fixed; inset: 0` (nunca `100dvh`).

## Para testar no celular sem publicar
`npx vite --host --port 5180` e abrir no celular (mesmo Wi-Fi) o endereço "Network". Ou dois cliques em `Jogar no computador.command`.
