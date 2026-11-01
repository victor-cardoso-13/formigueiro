# Decisões tomadas sozinho (madrugada, Victor dormindo)

- **Motor:** as funções (`tocar`, `passo`…) mexem no estado recebido; `clonar()` serve para guardar o "antes" (Desfazer).
- **Fim da volta:** a formiga entra na posição 0 (entrada) e a volta termina ao voltar a ela (2L+2A+4 passos). Ao terminar, ela não ocupa a entrada.
- **Vitória** limpa a trilha (formigas voltam para casa). **Derrota** deixa tudo como está.
- **Folha seca:** só cai quando um vizinho (cima/baixo/esquerda/direita) **some de vez** (uma mordida num torrão duro que só rachou não derruba).
- **Dorminhoca:** só as que **já estavam na frente** de outra coluna contam a saída; a que acabou de chegar à frente não conta aquela saída.
- **Travado:** se todas as formigas da frente estão dormindo, a trilha está vazia e a espera também, o resultado é "travado" (tratado como derrota na tela, com Desfazer).
- **Desfazer:** guarda um "antes" só nos toques feitos com a trilha **vazia** (início de cada rodada); só funciona com a trilha vazia.
- **Toques nas soluções** são números: 0–4 = coluna; 10–14 = lugar de espera 0–4.
