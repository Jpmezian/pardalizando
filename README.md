# Pardalizando ⚡

Um **Football Manager rápido e leve** de navegador: pegue um time real, mexa na
escalação por overall, **simule a temporada inteira de uma vez**, veja todos os
stats e mexa no mercado de transferências "às cegas" (pacotes + scouting com
névoa). 100% client-side, sem backend.

> 🎮 **Jogar agora:** https://pardalizando.vercel.app
>
> Spec completo (fonte da verdade): [`spec-mvp-football-manager.md`](./spec-mvp-football-manager.md).

## Stack

- **Vite + React 18 + TypeScript** — SPA pura, deploy estático.
- **Zustand** — estado global do jogo.
- **idb-keyval (IndexedDB)** — save do jogo.
- **Tailwind CSS** — estilo (sem libs de componente genéricas).
- **Vitest** — testes do motor (`/src/engine`).

Regra de ouro: toda lógica de jogo vive em [`src/engine`](./src/engine) como
TypeScript puro, determinístico e testável, separado do React.

## Rodar

```bash
npm install
npm run dev            # servidor de desenvolvimento
npm run build          # typecheck + build de produção (gera /dist)
npm run preview        # serve o /dist buildado
npm run test           # testes do motor (watch)
npm run test:run       # testes uma vez (CI)
npm run data:fixture   # (re)gera o dataset sintético embarcado
npm run data:build <csv>  # gera o dataset a partir de um CSV real (ver "Dados")
```

## Progresso por milestone

- [x] **M0 — Esqueleto.** Projeto Vite+React+TS+Tailwind+Zustand. RNG seedado
  com testes. Tela de início (broadcast). Store + ciclo de save em IndexedDB.
  `dev`/`build`/`test` funcionando.
- [x] **M1 — Dados.** Script de pré-processamento (`scripts/build-data.mjs`) →
  `clubs.json`/`players.json` das 6 ligas. Loader + agregados. Fluxo de seleção
  liga → time → elenco. **Rodando com dados reais do FC 26**; regenere com seu
  próprio CSV (ver "Dados"). Tem um fixture sintético de fallback
  (`npm run data:fixture`). Filtro casa por `league_id` sofifa (1ª divisão
  masculina), com fallback por nome.
- [x] **M2 — Escalação + motor de partida.** Motor puro em `/src/engine`
  (`positions`, `formations`, `ratings`, `poisson`, `match`): força do XI por
  setor, penalidade de posição, resultado via Poisson seedado. Tela de escalação
  (campo, 5 formações, troca de jogador, força ao vivo) → simular amistoso →
  placar. 26 testes (determinismo + sanidade estatística de 10k jogos).
- [x] **M3 — Temporada completa.** `engine/season.ts`: calendário ida-e-volta
  (método do círculo), simula todas as rodadas de uma vez, tabela final +
  artilharia + stats por jogador (gols/assists distribuídos por posição×OVR,
  notas, clean sheets). Tela de resultados com abas (Tabela · Artilharia · Meu
  time). Botão "Simular Temporada" na escalação. 31 testes. **Já é um jogo
  jogável de uma temporada inteira.**
- [x] **M4 — Replay rápido.** A temporada passa **rodada a rodada** (placares
  aparecendo, classificação subindo/descendo) com play/pause, próxima rodada e
  pular pro fim. `engine/season.ts` devolve resultados por rodada;
  `standingsFromRounds` reconstrói a tabela parcial (testado: bate com a final).
- [x] **M5 — Mercado.** `engine/market.ts` + `config/economy.ts`: pacotes
  (Bronze/Prata/Ouro/Lendário) com tiers de OVR e **probabilidades transparentes**,
  **pity timer** no Ouro, moeda dupla (orçamento + fichas). Sorta jogadores reais
  do pool global. Vender (com piso de 11 e trade-off). Tela de mercado com abas +
  **animação de revelação** por raridade. 37 testes.
- [x] **M6 — Scouting com névoa.** `engine/scouting.ts` + `config/economy.ts`:
  define alvo (posição + faixa, com gate de reputação), compra relatórios que
  apertam a névoa (OVR/idade/valor borrados → exatos), assina pagando o valor
  estimado e revela o jogador real. Aba "Olheiro" no mercado. 39 testes.
- [x] **Ajustes de feedback:** venda nerfada (anti-arbitragem), fit de posição
  claro na troca + detalhe do jogador (OVR por posição), stats da temporada
  ordenáveis, controles de velocidade no replay, botão de voltar no mercado.
- [x] **M7 — Progressão multi-temporada.** `engine/progression.ts`:
  envelhecimento, jovens evoluem rumo ao potencial, veteranos declinam, IA repõe
  aposentados por crias, valores recalculados. Botão "Avançar temporada" (com
  receita/fichas por posição), tela de Histórico, e Exportar/Importar save (JSON).
  Fecha o loop N→N+1. **44 testes.**
- [ ] M8 — Polimento (acessibilidade, balanceamento fino, áudio leve nos
  momentos de revelação).

> ✅ **Os 8 critérios de aceite do MVP (spec §13) estão cumpridos** — o loop
> completo roda ponta a ponta sem servidor.

### Pós-MVP já entregue

- **Roleta** (`engine/roulette.ts`) — gacha com near-miss (cartas de tier alto
  coladas no resultado), fita animada, pity e probabilidades transparentes.
  Substituiu o scouting/olheiro.
- **17 ligas** (Europa + América do Sul) e **competições continentais**
  (`engine/competition.ts`) — **Champions** (Europa) e **Libertadores** (América
  do Sul) com **fase de grupos → mata-mata**, mais a **Copa Nacional**. Grupos e
  chaveamento visíveis. Banco de reservas + lesões com feed viral e pôsteres.
- **Cinemática de simulação** — loading orgânico + replay obrigatório com
  competição, data e placar colorido por resultado.
- **Polimento** — capitão, idades, ano da temporada, potencial e melhor posição
  no detalhe do jogador, artilharia destacando seus jogadores, stats ordenáveis,
  ver elenco dos rivais, export/import de save.
- **Profundidade de jogo** — o craque pesa de verdade na partida (`STAR_BONUS`
  no `teamStrength`, não é mais média pura), **formações com trade-off**
  ofensivo/defensivo (`FORMATION_BIAS`), e **diretoria** (`engine/board.ts`) com
  objetivo de temporada pela reputação + barra de confiança: falhar demais
  **demite** você (game over com recomeço). Tela do clube com o XI no campo e
  hover em cada jogador.

## Dados (importar o CSV real)

Já está rodando com **dados reais do FC 26**. Pra regenerar com outro CSV
(FC 25/26) ou voltar ao fixture sintético (`npm run data:fixture`):

1. Baixe **1 CSV** de um dataset público de ratings, ex.:
   [EA FC 25 from Sofifa](https://www.kaggle.com/datasets/aniss7/fifa-player-data-from-sofifa-2025-06-03)
   ou [FC 26 Player Data](https://www.kaggle.com/datasets/rovnez/fc-26-fifa-26-player-data)
   (precisa de conta Kaggle grátis → botão **Download**).
2. Descompacte e coloque o `.csv` em qualquer lugar (ex.: a raiz do projeto).
3. Rode: `npm run data:build ./nome-do-arquivo.csv`
4. O script filtra as 6 ligas, normaliza posições, renomeia o rating pra `ovr`
   e reescreve os JSONs embarcados. Recarregue o app.

> Aceita as colunas comuns dos datasets sofifa (`overall`, `player_positions`,
> `club_name`, `league_name`, `value_eur`…); se faltar coluna obrigatória, o
> script avisa quais e mostra o cabeçalho detectado.

## Identidade visual

Estética de **transmissão esportiva / placar de TV**, não template de IA
(spec §9.4). Decisões registradas:

- **Tipografia:** `Big Shoulders Display` (display de placar) + `Hanken
  Grotesk` (corpo, algarismos tabulares).
- **Cor:** neutros escuros de estúdio em OKLCH (charcoal frio, sem preto puro)
  + 1 acento verde-gramado. Tokens semânticos em `src/index.css` /
  `tailwind.config.js` (`bg-bg`, `text-ink`, `bg-accent`…).

## Nota legal (dados)

Nomes de jogadores/clubes são fatos. Os ratings derivam de datasets públicos; o
jogo trata `ovr` como número próprio, sem branding oficial. Projeto
pessoal/não-comercial (spec §3.2 / §14).
