# Spec do MVP — "Pardalizando" (Football Manager rápido e leve)

> Documento de especificação para construção no **Claude Code**.
> Objetivo: um jogo de navegador inspirado no Football Manager, mas **rápido, dinâmico e leve**: você pega um time real, mexe na escalação por overall, simula a temporada inteira de uma vez, vê todos os stats e mexe no mercado de transferências "às cegas" (mecânica de figurinhas/pacotes). No fim, simula a próxima temporada e segue.

---

## 0. TL;DR das decisões (leia isto primeiro)

| Tema | Decisão recomendada | Por quê |
|---|---|---|
| **Stack** | Vite + React + TypeScript, SPA 100% client-side. Save em IndexedDB. | Zero backend = leve, rápido, deploy num clique (Vercel/Netlify/GitHub Pages). Sem latência de rede entre telas. |
| **Dados** | Seed a partir de um CSV público de ratings (FC 25/26 via Kaggle/sofifa) → pré-processado num JSON enxuto embarcado no app. | Você não tem os dados; existem datasets prontos. Embarcar = jogo abre offline e instantâneo. |
| **Simulação** | Motor probabilístico (Poisson) baseado na força do XI por posição. Temporada inteira simulada em <1s. | "Direto e dinâmico" — nada de simular minuto a minuto. |
| **Mercado** | **Híbrido**: Pacotes/loot-box (entrada de jogadores, dopamina) + Scouting com névoa (alvos específicos). | Casa as duas ideias que você levantou e maximiza o "vício saudável" sem dinheiro real. |
| **Escopo** | Loop completo ponta a ponta, raso mas inteiro. | Foi o que você pediu: "tudo". |

---

## 1. Visão geral e pilares de design

**Fantasia central:** "Sou o diretor esportivo. Monto o time, aperto *Simular Temporada*, e o futebol acontece. Depois mexo no elenco apostando em pacotes e scouting, e faço de novo — cada temporada melhor."

**Três pilares (toda decisão de design serve a um deles):**

1. **Velocidade** — do menu à temporada simulada em segundos. Nenhuma tela exige mais de 2-3 cliques. Simular a temporada é instantâneo, com opção de "ver replay rápido" rodada a rodada.
2. **Legibilidade** — overall é o número que manda. O jogador entende na hora por que ganhou ou perdeu (força do XI vs. adversário + sorte).
3. **Tensão do mercado** — você nunca vê exatamente o que vai contratar. A revelação é o momento emocional do jogo (abrir o pacote, tirar a névoa do scout).

**Anti-objetivos do MVP:** táticas detalhadas (instruções por jogador), finanças complexas (folha salarial, FFP), lesões/moral profundas, partidas minuto-a-minuto, multiplayer, contratos longos. Tudo isso é pós-MVP (seção 11).

---

## 2. Decisões técnicas

### 2.1 Stack
- **Vite + React 18 + TypeScript.** SPA pura, sem servidor.
- **Estado:** Zustand (store global simples) — mais leve que Redux, ideal para o save do jogo.
- **Persistência:** IndexedDB via `idb-keyval` (o save pode passar de alguns MB com histórico de temporadas; localStorage tem limite de ~5MB e é síncrono).
- **Roteamento:** React Router (poucas rotas) ou simples state machine de telas.
- **Estilo:** Tailwind CSS. **Sem** bibliotecas de componentes genéricas (ver Diretriz de UI, seção 9.4).
- **RNG:** gerador seedado (ex: `mulberry32`) guardado no save → a mesma temporada é reproduzível e o "replay" bate com o resultado.
- **Build/deploy:** `npm run build` → deploy estático.

> Por que não Next.js: não há necessidade de SSR, rotas de API ou banco. Next adiciona peso e complexidade de backend que contraria o pilar "leve". Se um dia virar online/multiplayer, migra-se a camada de dados; o motor de jogo (TS puro) é reaproveitável.

### 2.2 Arquitetura de pastas
```
/src
  /data            # JSON de seed (times, jogadores) + loaders
  /engine          # motor puro, SEM React: simulação, mercado, progressão
    match.ts       # simula 1 partida
    season.ts      # gera calendário + simula temporada
    market.ts      # pacotes, scouting, valores
    progression.ts # evolução/declínio entre temporadas
    rng.ts         # gerador seedado
    ratings.ts     # força do time a partir do XI
  /store           # Zustand: GameState + ações
  /screens         # telas React
  /components       # UI reutilizável
  /save            # serialização IndexedDB
```
**Regra de ouro:** `/engine` é TypeScript puro, determinístico e testável sem React. Toda a lógica de jogo mora lá e tem testes unitários (Vitest). A UI só lê estado e dispara ações.

---

## 3. Dados dos jogadores (o ponto mais sensível)

### 3.1 Fontes disponíveis (pesquisa)
Existem datasets públicos com **nomes reais + overall + posição + idade** já prontos:
- **Kaggle — FC 26 / FC 25 player data (sofifa):** ~18k jogadores, colunas `overall`, `potential`, `position`, `age`, `club`, `value`, etc., em CSV.
- **sofifa-web-scraper (GitHub):** scraper Python que gera o CSV atualizado (70+ colunas) caso você queira regenerar.
- **Hugging Face / data.world:** versões históricas (FIFA 15→23) se quiser séries temporais.

### 3.2 Recomendação
1. Baixar **um** CSV recente (FC 25 ou 26).
2. Rodar um **script de pré-processamento** (Node, parte do repo) que:
   - Filtra só os clubes das ligas-alvo (seção 3.4).
   - Mantém só os campos que o jogo usa (slim): `id, name, clubId, pos, ovr, pot, age, value`.
   - Normaliza posições para o esquema do jogo (GK, DF, MF, FW + subposições, seção 4.2).
   - Renomeia o campo de rating para `ovr` (nosso, derivado) — **não** carregamos a marca/branding do dataset original.
   - Exporta `players.json` e `clubs.json` enxutos (alvo: < 1.5 MB total para abrir rápido).

> **Nota legal (importante, não pular):** nomes de jogadores e clubes são fatos e podem ser usados. Os *ratings* desses datasets derivam de uma base proprietária (EA Sports). Para um **projeto pessoal/portfólio não-comercial** isso é prática comum e de baixo risco. Se você **monetizar**, evite: usar marcas/logos oficiais, dizer que os números são "oficiais FIFA/EA", e considere recalcular overalls a partir de stats públicos ou aplicar um leve ruído determinístico para que sejam "seus". O spec já trata `ovr` como número próprio do jogo.

### 3.3 Estratégia de atualização
- MVP: dataset embarcado (snapshot). Versão do dataset fica no save (`dataVersion`).
- Pós-MVP: botão "atualizar elencos" que baixa um JSON novo de um link estático.

### 3.4 Ligas-alvo do MVP
Top 5 + Brasileirão (você escolhe 1 time de qualquer uma para começar):
- 🏴 Premier League (ING)
- 🇪🇸 La Liga (ESP)
- 🇮🇹 Serie A (ITA)
- 🇩🇪 Bundesliga (ALE)
- 🇫🇷 Ligue 1 (FRA)
- 🇧🇷 Brasileirão Série A (BRA)

Para o MVP, **cada liga roda como uma competição isolada** (você joga o campeonato da liga do seu time). Competições continentais e copas nacionais ficam fora do MVP (seção 11). Isso simplifica calendário e mantém o loop enxuto.

---

## 4. Modelo de dados

### 4.1 Entidades (TypeScript)
```ts
type Position = 'GK' | 'DF' | 'MF' | 'FW';
type SubPos = 'GK'|'CB'|'LB'|'RB'|'DM'|'CM'|'AM'|'LW'|'RW'|'ST';

interface Player {
  id: string;
  name: string;
  clubId: string;
  pos: Position;
  subPos: SubPos;
  ovr: number;        // 40–99
  pot: number;        // potencial (teto de evolução)
  age: number;
  value: number;      // valor de mercado (derivado de ovr+idade)
  form: number;       // -3..+3, varia por temporada (afeta desempenho)
  // estado dinâmico de save:
  seasonStats?: PlayerSeasonStats;
}

interface Club {
  id: string;
  name: string;
  leagueId: LeagueId;
  squad: string[];     // player ids
  budget: number;      // orçamento de transferências (moeda do jogo)
  reputation: number;  // 1–5 (afeta scouting e preços)
}

interface League { id: LeagueId; name: string; clubIds: string[]; }

interface GameState {
  seed: number;
  dataVersion: string;
  managedClubId: string;
  currentSeason: number;          // 1, 2, 3...
  phase: 'lineup'|'season'|'results'|'market';
  lineup: Lineup;                 // XI + formação do jogador
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  history: SeasonRecord[];        // resultados de todas as temporadas
  packs: PackInventory;           // moeda/pacotes do mercado
}
```

### 4.2 Posições e formações
- Formações do MVP: **4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2** (5 opções cobrem tudo).
- Cada slot da formação tem uma `SubPos` ideal. Jogar fora da posição aplica penalidade (seção 5.2).
- UI de escalação: arrastar jogador para o slot; mostra o `ovr efetivo` no slot (já com penalidade de posição).

### 4.3 Stats rastreados (para "ver todos os stats")
- **Por jogador/temporada:** jogos, gols, assistências, nota média, clean sheets (GK/DF).
- **Por time/temporada:** V/E/D, gols pró/contra, saldo, pontos, posição final, sequência.
- **Tabela da liga** completa por temporada.
- **Artilharia e assistências** da liga.
- **Histórico:** todas as temporadas anteriores navegáveis (títulos, posições, contratações).

---

## 5. Motor de simulação

Princípio: **rápido e explicável**. Resultado vem de (força do meu XI) vs (força do adversário) + variância controlada.

### 5.1 Força do time a partir do XI
Para cada time, calcula-se três setores ponderados pelos jogadores escalados naqueles setores:

```
atk  = média ponderada dos OVR efetivos dos jogadores ofensivos (FW + AM + alas)
mid  = média ponderada do meio (MF/DM/CM/AM)
def  = média ponderada da defesa + GK (GK pesa mais)
```
- `ovr efetivo = ovr * penalidadePosição * (1 + form*0.02)`
- Time controlado por IA usa o "XI ideal" (melhores OVRs por posição da formação padrão do clube).

### 5.2 Penalidade de posição
Matriz simples de familiaridade entre `SubPos` escalada e ideal:
- Mesma posição: ×1.00
- Posição adjacente (ex: CM↔DM, LB↔LW): ×0.92
- Mesma linha mas distante (ex: CB↔ST): ×0.75
- Linha errada extrema (GK fora do gol / linha no gol): ×0.50

### 5.3 Resultado de uma partida (modelo Poisson)
```
forcaCasa  = 0.40*atk + 0.35*mid + 0.25*def  + VANTAGEM_CASA(+3)
forcaFora  = 0.40*atk + 0.35*mid + 0.25*def
diff       = forcaCasa - forcaFora

# gols esperados (lambda) por time
lambdaCasa = clamp( BASE_GOLS * exp(diff/ESCALA) , 0.2, 5.0 )
lambdaFora = clamp( BASE_GOLS * exp(-diff/ESCALA), 0.2, 5.0 )
# BASE_GOLS ≈ 1.35 ; ESCALA ≈ 8

golsCasa = poisson(lambdaCasa, rng)
golsFora = poisson(lambdaFora, rng)
```
- Amostragem de Poisson com o RNG seedado → reproduzível.
- **Notas dos jogadores** derivadas do resultado + contribuição do setor (ex: ataque que marcou muito sobe nota; defesa que sofreu cai). Gols/assists distribuídos probabilisticamente entre os atacantes/meias escalados, ponderado por OVR.

### 5.4 Temporada
- **Calendário:** turno e returno (todos contra todos, ida e volta) — round-robin clássico.
- **Simular Temporada (botão principal):** roda todas as rodadas de uma vez (<1s). Gera tabela final, artilharia, histórico.
- **Dois modos de visualização** (escolha do jogador):
  1. **Instantâneo** — pula direto pros resultados finais.
  2. **Replay rápido** — anima rodada a rodada (resultados aparecendo, tabela subindo/descendo) em poucos segundos, com possibilidade de pausar. É barato e aumenta MUITO a emoção sem custar performance.
- **Lesões/suspensões (versão leve):** chance pequena por rodada de um titular "ficar de fora" por X rodadas (só remove do XI; sem sistema médico). Pode ser flag opcional no MVP.

### 5.5 Testabilidade
- Testes de "sanidade estatística": rodar 10.000 partidas entre times de força conhecida e checar que o time mais forte vence ~X% das vezes (calibrar BASE_GOLS/ESCALA).
- Mesma seed → mesma temporada (teste de determinismo).

---

## 6. Mercado de transferências "às cegas" (o coração viciante)

Você pediu recomendação e psicologia. Recomendo um **modelo híbrido** com duas formas de adquirir jogadores, ambas sem revelar o jogador exato antes:

### 6.1 Via A — Pacotes (loot-box, a dopamina)
Você gasta orçamento comprando **pacotes** que revelam jogadores aleatórios ponderados por raridade.

| Pacote | Custo | Distribuição de OVR (faixa provável) | Gancho |
|---|---|---|---|
| Bronze | barato | 60–72 | volume, completar elenco |
| Prata | médio | 70–80 | upgrade realista |
| Ouro | caro | 78–86 | titularidade |
| Especial/Lendário | muito caro / só por conquista | 85–93 | sonho, raríssimo |

**Princípios psicológicos aplicados (de forma ética — sem dinheiro real):**
- **Revelação encenada:** abrir o pacote é uma animação curta com suspense (carta virando, brilho por raridade). O momento da revelação > o jogador em si.
- **Reforço de razão variável:** recompensa imprevisível é o que mais engaja. A faixa de OVR é uma distribuição, com cauda rara para cima.
- **"Quase lá" (near-miss):** ocasionalmente mostrar que "faltou pouco" pra um craque aumenta a vontade de abrir de novo — usar com moderação e honestidade (sem manipular probabilidades exibidas).
- **Pity timer (anti-frustração):** garantia de que a cada N pacotes Ouro sem nada ≥85 vem um item alto. Reduz raiva, sustenta a sessão.
- **Probabilidades transparentes:** mostrar as chances reais (boa prática e gera confiança). O vício saudável vem da emoção, não de enganar.
- **Moeda dupla:** `Orçamento` (ganho jogando/vendendo) compra pacotes. Conquistas dão **fichas douradas** (moeda premium fictícia) pra pacotes especiais — cria metas.

### 6.2 Via B — Scouting com névoa (a aposta calculada)
Para quem quer mirar uma posição específica:
- Você define o alvo (ex: "atacante, sub-25, faixa Ouro") e gasta em **relatórios de olheiro**.
- O jogo revela só **faixas borradas**: `"ST, 23a, OVR 80–85, valor ~€X"`. Nome oculto.
- Quanto mais você investe em scouting daquele alvo, **menor a névoa** (a faixa aperta: 80–85 → 82–84 → 83). Nunca 100% até assinar.
- Ao assinar, revela o jogador real. Tensão: pode ser o topo ou o piso da faixa.
- Reputação do clube afeta quão bons são os alvos que aparecem.

### 6.3 Vender
- Você vê seu próprio elenco com OVR real (são seus jogadores).
- Vender gera `Orçamento` baseado no `value` (função de OVR + idade + reputação do comprador).
- **Tensão de elenco:** vender o craque dá muita grana pra pacotes — mas enfraquece o XI agora. Trade-off explícito.

### 6.4 Janelas de mercado
- Mercado abre **entre temporadas** (e opcionalmente uma "janela de inverno" no meio, pós-MVP).
- Limite de tamanho de elenco (ex: 25) força decisões: pra abrir pacote às vezes precisa vender.

### 6.5 Economia / balanceamento (números iniciais para calibrar)
- Orçamento inicial proporcional à reputação do clube.
- Receita por temporada = bônus por posição final na liga + bônus por título.
- Custo dos pacotes calibrado para **~3–6 pacotes Ouro por temporada** num clube médio → escolhas reais, não inflação.
- Inflação de elenco controlada pelo limite de 25 + custo de manutenção (opcional).
- Tudo isso deve ficar num arquivo `config/economy.ts` com constantes nomeadas, fácil de tunar.

---

## 7. Progressão entre temporadas

Ao fechar uma temporada e antes da próxima:
1. **Envelhecimento:** todos `age += 1`.
2. **Evolução/declínio (determinístico + ruído):**
   - Jovens (≤23) abaixo do potencial: `ovr` sobe (puxa em direção a `pot`), mais rápido se jogaram bem/muito.
   - Pico (24–29): estável, pequenas oscilações por forma.
   - Veteranos (≥31): `ovr` declina gradualmente.
3. **Forma** re-sorteada para a nova temporada.
4. **IA dos outros clubes:** fazem transferências simples (compram/vendem para manter força ~ reputação) para o mundo parecer vivo. MVP pode ser leve (só ajustar OVR/elenco levemente).
5. **Valores de mercado** recalculados.
6. Abre a **janela de mercado** → jogador mexe no elenco → escala → simula próxima temporada.

Isso cria o ciclo de longo prazo: ver um jovem que você tirou num pacote virar craque ao longo das temporadas é o gancho de retenção.

---

## 8. Loop de jogo (a máquina de estados)

```
[Novo Jogo] → escolher liga → escolher time → orçamento inicial
   │
   ▼
┌─────────────────────────────────────────────┐
│  LINEUP   → monta XI + formação              │
│     ▼                                        │
│  SEASON   → "Simular Temporada" (instant ou  │
│             replay rápido)                   │
│     ▼                                        │
│  RESULTS  → tabela, stats, artilharia,       │
│             conquistas, histórico            │
│     ▼                                        │
│  MARKET   → vender / pacotes / scouting      │
│     ▼                                        │
│  PROGRESSION (automática) → próxima temporada│
└──────────────┬──────────────────────────────┘
               └──── volta para LINEUP (temporada N+1)
```
Save automático ao fim de cada fase.

---

## 9. Telas e UX

### 9.1 Lista de telas (MVP)
1. **Início / Novo Jogo / Continuar** — escolher liga → grade de times (com badge de reputação e OVR médio).
2. **Vestiário / Escalação** — formação + arraste de jogadores; mostra força por setor (atk/mid/def) em tempo real; botão grande **Simular Temporada**.
3. **Temporada (replay)** — rodadas passando, tabela animada; botão "pular para o fim".
4. **Resultados/Stats** — abas: Tabela · Artilharia/Assists · Meu time (stats por jogador) · Histórico (temporadas anteriores).
5. **Mercado** — abas: Pacotes (com animação de abertura) · Scouting (alvos com névoa) · Vender (elenco) · Orçamento/Fichas.
6. **Detalhe do jogador** — OVR, idade, posição, evolução, stats da temporada.

### 9.2 Princípios de UX
- Tudo a ≤3 cliques. Botão primário óbvio em cada tela.
- Números grandes e legíveis; cor por raridade/posição; feedback imediato.
- O momento de **abrir pacote** merece o capricho visual máximo (é o pico emocional).

### 9.3 Acessibilidade mínima
- Funciona em teclado; contraste adequado; sem depender só de cor (usar ícones/labels para posição).

### 9.4 Diretriz visual (evitar "cara de template de IA")
- **Não** usar a estética genérica: gradiente roxo-azul, Inter/Geist, cards arredondados shadcn padrão, bento grid.
- Buscar identidade de "broadcast esportivo": tipografia condensada/forte para números e nomes, paleta com 1 cor de acento vibrante + neutros escuros, sensação de placar/transmissão. Densidade de informação tipo tabela esportiva real.
- (Ao construir a UI no Claude Code, vale acionar a skill anti-slop para reforçar isso.)

---

## 10. Persistência

- 1 slot de save no MVP (multi-slot é pós-MVP), em IndexedDB.
- Serializa `GameState` inteiro (inclui `seed`, histórico, elenco). Botão **Exportar/Importar save** (JSON) para backup e portabilidade — barato e dá segurança ao jogador.
- `dataVersion` no save: se o dataset embarcado mudar, migração ou aviso.

---

## 11. Fora do escopo do MVP (backlog futuro)

Copas e competições continentais (Champions/Libertadores), copas nacionais; táticas detalhadas (instruções, marcação, intensidade); finanças realistas (salários, FFP, bilheteria); sistema de lesões/moral/química profundo; empréstimos e contratos com duração; partidas minuto-a-minuto com narração; multiplayer/online; rebaixamento e acesso entre divisões; multi-slot de save; comemorações/troféus elaborados.

> Sugestão de priorização pós-MVP: (1) Copas continentais, (2) Rebaixamento/promoção, (3) Química de time, (4) Finanças com salário.

---

## 12. Ordem de construção (milestones para o Claude Code)

Construir em fatias verticais testáveis. Cada milestone deve rodar e ser jogável até onde chegou.

**M0 — Esqueleto (meio dia)**
Vite+React+TS+Tailwind+Zustand. Tela de Início mockada. Store vazio. Deploy estático funcionando.

**M1 — Dados**
Script de pré-processamento do CSV → `players.json`/`clubs.json` das 6 ligas. Loader. Tela de seleção de liga/time lendo dados reais.

**M2 — Escalação + Motor de partida**
`/engine/ratings.ts`, `match.ts`, `rng.ts`. Tela de escalação com força por setor. Simular 1 partida e mostrar placar. Testes do motor (determinismo + sanidade estatística).

**M3 — Temporada completa**
`season.ts` (calendário round-robin + simular tudo). Tela de resultados: tabela, artilharia, stats por jogador. Modo instantâneo. *(Já é um jogo jogável de 1 temporada.)*

**M4 — Replay rápido**
Animação rodada a rodada da temporada. Polimento da tela de resultados + histórico.

**M5 — Mercado (vender + pacotes)**
`market.ts`: economia, venda, pacotes com raridade/pity/probabilidades, animação de abertura. Moeda dupla.

**M6 — Scouting com névoa**
Alvos, relatórios de olheiro, redução de névoa, revelação ao assinar.

**M7 — Progressão + multi-temporada**
`progression.ts`: envelhecimento, evolução/declínio, IA simples de transferências dos clubes, recálculo de valores. Fechar o loop N→N+1. Save/IndexedDB + export/import.

**M8 — Polimento**
Diretriz visual (anti-slop), acessibilidade, balanceamento final da economia, áudio leve nos momentos de revelação.

---

## 13. Critérios de aceite do MVP

O MVP está "pronto" quando, num navegador, sem servidor:
1. Escolho 1 time de qualquer das 6 ligas com nomes/OVRs reais carregados.
2. Monto o XI numa de ≥5 formações e vejo a força do time mudar.
3. Aperto **Simular Temporada** e em <2s tenho tabela final, artilharia e stats — com opção de replay rápido.
4. Vejo todos os stats da temporada e o histórico das temporadas anteriores.
5. No mercado: vendo jogadores, abro pacotes (com revelação encenada e probabilidades visíveis) e faço scouting com névoa, sem nunca ver o jogador exato antes de adquirir.
6. Avanço para a próxima temporada com elenco envelhecido/evoluído e repito o loop.
7. Fecho e reabro o navegador e meu progresso continua (save).
8. Testes do `/engine` passam (determinismo + sanidade estatística).

---

## 14. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Licenciamento dos ratings se monetizar | Tratar `ovr` como número próprio; sem branding oficial; ruído determinístico; manter não-comercial no MVP. |
| Simulação "injusta" (time forte perde demais/de menos) | Calibrar BASE_GOLS/ESCALA com teste estatístico de 10k jogos antes de fechar. |
| Economia quebrada (pacotes inflam elenco) | Constantes em `economy.ts`; limite de elenco 25; calibrar p/ ~3–6 Ouros/temporada. |
| Mecânica de pacote vista como "predatória" | Sem dinheiro real; probabilidades transparentes; pity timer; foco na emoção, não em enganar. |
| Save grande/lento | IndexedDB assíncrono; histórico enxuto (guardar agregados, não cada evento de partida). |

---

### Fontes (datasets pesquisados)
- [FC 26 (FIFA 26) Player Data — Kaggle](https://www.kaggle.com/datasets/rovnez/fc-26-fifa-26-player-data)
- [EA FC 25 player data from Sofifa (2025) — Kaggle](https://www.kaggle.com/datasets/aniss7/fifa-player-data-from-sofifa-2025-06-03)
- [sofifa-web-scraper — GitHub](https://github.com/prashantghimire/sofifa-web-scraper)
- [FIFA Players Dataset — Kaggle](https://www.kaggle.com/datasets/luisfucros/fifa-players)
- [jsulz/FIFA23 — Hugging Face](https://huggingface.co/datasets/jsulz/FIFA23)
