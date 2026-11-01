# Formigueiro — o jogo (especificação)

Jogo de quebra-cabeça para o Victor e a família (idosos primeiro). Slug `formigueiro`.
**Refeito em 1/nov** no estilo do "Colony Flow": o Victor pediu de propósito a **mesma jogabilidade**.
(A versão antiga, de trilha/fome/folha seca/dorminhoca, saiu inteira. Ver `DECISOES.md`.)

## A ideia em uma frase
Um **quadro grande de quadradinhos coloridos** (pixel-art) fica em cima. Embaixo tem um **buraco** e **5 vagas**.
Você toca nos **ninhos** (cada um tem uma cor e um número); o ninho sobe para uma vaga e dele saem **formigas**
que pegam quadradinhos da cor dele e levam ao buraco. Esvazie o quadro sem prender todas as vagas.

## Peças
- **Quadro**: grade L×A de quadradinhos (cada um de uma cor da paleta, ou vazio). Fica em `Estado.desenho`.
- **Buraco**: logo abaixo do quadro. Todo quadradinho pego vai para lá.
- **Vagas**: **5**, numa fila abaixo do buraco. É onde os ninhos "trabalham".
- **Ninho**: tem **cor** e **número n** = quantos quadradinhos ele leva (= quantas formigas ele solta). O número vai
  diminuindo conforme as formigas saem (`restam`).
- **Grade de ninhos**: ninhos organizados em 3–4 colunas, embaixo. **Só o da frente de cada coluna** (o de cima) pode ser tocado;
  os de trás aparecem (cor e número) mas ficam apagados até virarem os da frente.
- **Cano**: ninhos lado a lado na mesma linha, ligados por um cano (`g` igual no JSON), **sobem juntos** e precisam de
  **vagas livres para todos**; só podem ser tocados quando todos estão na frente.

## Como o jogo anda (o motor é por "passos", 30 por segundo em 1×; puro e determinístico)
1. **Tocar** num ninho da frente: ele sobe para a primeira vaga livre. Se não há vaga livre (para ele e os ligados por cano),
   o toque não vale e a tela avisa ("Sem vagas livres").
2. A cada poucos passos o ninho **solta uma formiga**. Ela escolhe um quadradinho **exposto** da **cor do ninho** — o mais
   perto pelo caminho — anda até ele pelo contorno do quadro, **pega** (o quadradinho some) e **leva ao buraco**.
3. **Exposto** = o primeiro quadradinho (não vazio) de uma linha ou coluna, **visto de fora** do quadro (de cima, de baixo,
   da esquerda ou da direita). Quem está escondido atrás de outro não pode ser pego até aquele sumir. Cada quadradinho
   só é escolhido por uma formiga de cada vez.
4. Ninho **sem nenhum quadradinho exposto da sua cor** fica **esperando** e **ocupa a vaga**. Quando outro ninho abrir caminho,
   ele volta a soltar formigas.
5. Quando o ninho soltou todas as formigas (n), ele some e **libera a vaga**.
6. **Vitória**: o quadro ficou vazio (e as formigas entregaram tudo).
7. **Derrota**: nenhuma formiga andando, nenhum ninho nas vagas consegue pegar algo **e** nenhum ninho da frente pode subir
   (vagas cheias de ninhos que não alcançam nada). A tela mostra "Perdeu" com Desfazer e Recomeçar.
8. Invariante das fases: para cada cor, **soma dos números dos ninhos = quantidade de quadradinhos daquela cor**.

## Ajudas (simples, para idosos)
- **Desfazer ilimitado**: volta ao estado antes do último toque num ninho (também depois de perder).
- **Recomeçar** a fase, **sempre com confirmação** ("Sim, recomeçar" / "Não").
- **Velocidade 1× / 2× / 3×** (um botão que alterna, número escrito grande). Muda só a animação; o resultado é o mesmo. Fica salva.
- **Como jogar** (?) a qualquer hora, por cima da partida.
- **Símbolos nas cores** (Ajustes, desligado por padrão): um desenhinho em cada cor, para quem confunde cores parecidas.
- **Não existem**: poderes, moedas, anúncios, "ajuda do olho", torrão duro, folha seca, formiga dorminhoca (zzz), fome, trilha.

## As 60 fases (congeladas em `src/fases/fases.json`; nunca gerar na hora)
| Grupo | Fases | Observação |
|---|---|---|
| Fácil | 1–10 | poucas cores, poucos ninhos, 3 colunas, bastante folga |
| Média | 11–30 | mais cores e ninhos; aparecem os canos |
| Difícil | 31–50 | 4 colunas, mais cores, mais canos, menos folga |
| Muito difícil | 51–60 | tudo junto, pouca folga |
- Cada fase traz uma **solução** (sequência de ninhos tocados, um de cada vez) e a `taxaAleatoria` (fração de partidas ao acaso que vencem).
  Teste automático prova que toda solução vence. Detalhes em `FASES.md`.
- Fases trancadas até ganhar a anterior; as ganhas podem ser jogadas de novo. O mapa tem uma aba por grupo.

## Telas (idoso primeiro — sem rolagem)
- **Início** (Jogar/Continuar, Fases, Como jogar, Ajustes), **Mapa** (abas por grupo), **Jogo**, **Ganhou!** (próxima fase), **Perdeu** (Desfazer / Recomeçar), **Tutorial** (5 passos com desenhos, "Pular" sempre visível), **Ajustes**.
- Em pé: título; quadro; buraco; 5 vagas; grade de ninhos; botões (Desfazer, Recomeçar, Velocidade, Fases, ?).
  Deitado: quadro à esquerda, o resto à direita.
- Visual padrão da casa: creme + tinta `#3b2f2a` + âmbar, Fredoka/Nunito. Formigas e ninhos em SVG próprio. Letras e botões grandes.
- Tela cheia no iPhone/iPad: fundo em `body::before`, `#app` com `position: fixed; inset: 0` (ver `CLAUDE.md` da pasta de jogos).

## Progresso
- `localStorage`, chave **`formigueiro:v2`**: fases ganhas, fase atual, velocidade, tutorial visto, símbolos ligados, tela atual.
  (A `v1` era do jogo antigo e foi abandonada.) **Sem Firebase, sem conta.** Recarregar volta para a tela/fase em que estava.

## Parâmetros de URL (só para testes e prints)
`?limpo=1` zera o progresso · `?visto=1` tutorial visto · `?ganhas=N` · `?todas=1` · `?tela=inicio|mapa|jogo|tutorial|ajustes` ·
`?fase=N` ou `?fase=teste` (usa `src/fases/fase-teste.json`) · `?demo=meio|ganhou|perdeu|vagas` (a tela do jogo monta o estado) ·
`?passo=N` (tutorial) · `?simbolos=1` · `?teste=1` (expõe `window.__formigueiro.estado()`).
