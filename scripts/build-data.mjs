// @ts-check
/**
 * Pré-processamento de dados do Pardalizando (spec §3.2 / milestone M1).
 *
 * Dois modos:
 *   node scripts/build-data.mjs <caminho.csv>   -> processa um CSV real (Kaggle FC 25/26)
 *   node scripts/build-data.mjs --fixture        -> gera um dataset sintético determinístico
 *
 * Saída (sempre o mesmo formato, embarcado no app):
 *   src/data/generated/clubs.json
 *   src/data/generated/players.json
 *   src/data/generated/meta.json
 *
 * Mantemos só campos enxutos. O rating vira `ovr` (número próprio do jogo) — sem
 * branding do dataset original.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '../src/data/generated');

const MAX_SQUAD = 30; // teto de jogadores por clube (controla tamanho do JSON)
const MIN_SQUAD = 11; // clube com menos que isto é descartado (elenco incompleto)

/** @type {{ id: string, name: string, code: string }[]} */
const LEAGUES = [
  { id: 'premier-league', name: 'Premier League', code: 'ENG' },
  { id: 'la-liga', name: 'La Liga', code: 'ESP' },
  { id: 'serie-a', name: 'Serie A', code: 'ITA' },
  { id: 'bundesliga', name: 'Bundesliga', code: 'GER' },
  { id: 'ligue-1', name: 'Ligue 1', code: 'FRA' },
  { id: 'eredivisie', name: 'Eredivisie', code: 'NED' },
  { id: 'primeira-liga', name: 'Primeira Liga', code: 'POR' },
  { id: 'super-lig', name: 'Süper Lig', code: 'TUR' },
  { id: 'allsvenskan', name: 'Allsvenskan', code: 'SWE' },
  { id: 'super-league-gr', name: 'Super League', code: 'GRE' },
  { id: 'brasileirao', name: 'Brasileirão', code: 'BRA' },
  { id: 'liga-argentina', name: 'Liga Argentina', code: 'ARG' },
  { id: 'primera-uruguay', name: 'Primera Uruguai', code: 'URU' },
  { id: 'primera-chile', name: 'Primera Chile', code: 'CHI' },
  { id: 'primera-venezuela', name: 'Primera Venezuela', code: 'VEN' },
  { id: 'primera-colombia', name: 'Primera A Colômbia', code: 'COL' },
  { id: 'primera-paraguay', name: 'Primera Paraguai', code: 'PAR' },
];

// --- Normalização de posições: subPos -> Position (spec §4.1/§4.2) ---
const SUBPOS_MAP = {
  GK: 'GK',
  CB: 'CB', RCB: 'CB', LCB: 'CB', SW: 'CB',
  LB: 'LB', LWB: 'LB',
  RB: 'RB', RWB: 'RB',
  CDM: 'DM', DM: 'DM',
  CM: 'CM', RCM: 'CM', LCM: 'CM', LM: 'CM', RM: 'CM',
  CAM: 'AM', AM: 'AM',
  LW: 'LW', RW: 'RW',
  CF: 'ST', ST: 'ST', RS: 'ST', LS: 'ST', RF: 'ST', LF: 'ST',
};
const POS_OF_SUBPOS = {
  GK: 'GK',
  CB: 'DF', LB: 'DF', RB: 'DF',
  DM: 'MF', CM: 'MF', AM: 'MF',
  LW: 'FW', RW: 'FW', ST: 'FW',
};

const BUDGET_BY_REP = { 1: 8_000_000, 2: 18_000_000, 3: 35_000_000, 4: 70_000_000, 5: 140_000_000 };

/** league_id numérico (padrão sofifa) → slug da liga (1ª divisão masculina). */
const MEN_LEAGUE_IDS = {
  13: 'premier-league',
  53: 'la-liga',
  31: 'serie-a',
  19: 'bundesliga',
  16: 'ligue-1',
  10: 'eredivisie',
  308: 'primeira-liga',
  68: 'super-lig',
  56: 'allsvenskan',
  63: 'super-league-gr',
  7: 'brasileirao',
  353: 'liga-argentina',
  338: 'primera-uruguay',
  335: 'primera-chile',
  2019: 'primera-venezuela',
  336: 'primera-colombia',
  337: 'primera-paraguay',
};

// ----------------------------------------------------------------------------
// Util
// ----------------------------------------------------------------------------

function slug(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** mulberry32 inline (mesmo algoritmo de src/engine/rng.ts) para geração determinística. */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function reputationFromAvgOvr(avgOvr) {
  if (avgOvr >= 80) return 5;
  if (avgOvr >= 76) return 4;
  if (avgOvr >= 72) return 3;
  if (avgOvr >= 68) return 2;
  return 1;
}

function marketValue(ovr, age) {
  const ageFactor = age <= 23 ? 1.15 : age <= 28 ? 1 : age <= 31 ? 0.7 : 0.4;
  const base = Math.pow(Math.max(0, ovr - 45), 3) * 650;
  return Math.max(50_000, Math.round((base * ageFactor) / 50_000) * 50_000);
}

// ----------------------------------------------------------------------------
// Montagem final (compartilhada pelos dois modos)
// ----------------------------------------------------------------------------

/**
 * @param {Map<string, { id: string, name: string, leagueId: LeagueId, players: any[] }>} clubMap
 * @param {'fixture'|'fc-csv'} source
 */
function buildAndWrite(clubMap, source) {
  /** @type {any[]} */
  const clubs = [];
  /** @type {any[]} */
  const players = [];
  const perLeague = Object.fromEntries(LEAGUES.map((l) => [l.id, 0]));
  let dropped = 0;

  for (const club of clubMap.values()) {
    const squad = [...club.players].sort((a, b) => b.ovr - a.ovr).slice(0, MAX_SQUAD);
    if (squad.length < MIN_SQUAD) {
      dropped += 1;
      continue;
    }
    const avgOvr = squad.reduce((sum, p) => sum + p.ovr, 0) / squad.length;
    const reputation = reputationFromAvgOvr(avgOvr);

    clubs.push({
      id: club.id,
      name: club.name,
      leagueId: club.leagueId,
      squad: squad.map((p) => p.id),
      budget: BUDGET_BY_REP[reputation],
      reputation,
    });
    for (const p of squad) players.push(p);
    perLeague[club.leagueId] += 1;
  }

  clubs.sort((a, b) => a.leagueId.localeCompare(b.leagueId) || a.name.localeCompare(b.name));

  const meta = {
    source,
    dataVersion: `${source}-${new Date().toISOString().slice(0, 10)}`,
    generatedAt: new Date().toISOString(),
    totalClubs: clubs.length,
    totalPlayers: players.length,
    clubsPerLeague: perLeague,
    note:
      source === 'fixture'
        ? 'Dataset sintético determinístico (clubes reais, jogadores placeholder). Rode `npm run data:build <csv>` para dados reais.'
        : 'Derivado de um CSV público; ovr é número próprio do jogo, sem branding oficial.',
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, 'clubs.json'), JSON.stringify(clubs));
  writeFileSync(resolve(OUT_DIR, 'players.json'), JSON.stringify(players));
  writeFileSync(resolve(OUT_DIR, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

  console.log(`\n✓ ${source}: ${clubs.length} clubes, ${players.length} jogadores`);
  for (const league of LEAGUES) {
    console.log(`  ${league.code}  ${league.name.padEnd(16)} ${perLeague[league.id]} clubes`);
  }
  if (dropped > 0) console.log(`  (${dropped} clubes descartados por elenco < ${MIN_SQUAD})`);
  console.log(`→ escrito em src/data/generated/`);
}

// ----------------------------------------------------------------------------
// Modo CSV real
// ----------------------------------------------------------------------------

/** Parser CSV minimalista com suporte a campos entre aspas. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function pickColumn(header, candidates) {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = lower.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Resolve a liga-alvo de uma linha. Prioriza league_id numérico; cai pro nome. */
function resolveLeagueId(cells, col) {
  if (col.leagueId !== -1) {
    const id = parseInt(String(cells[col.leagueId]).trim(), 10);
    return MEN_LEAGUE_IDS[id] ?? null;
  }
  const byName = matchLeague(cells[col.league] ?? '');
  if (!byName) return null;
  if (col.rank !== -1) {
    const rank = parseInt(String(cells[col.rank]).trim(), 10);
    if (Number.isFinite(rank) && rank !== 1) return null; // só a 1ª divisão
  }
  return byName;
}

function matchLeague(rawName) {
  const s = String(rawName).toLowerCase();
  // Brasil primeiro (a Série A brasileira não pode cair no matcher italiano).
  if (/(brasileir|brazil|brasil|série a)/.test(s)) return 'brasileirao';
  // Inglaterra — exclui outras "premier league" (Rússia, Ucrânia, Escócia...).
  if (/premier league/.test(s)) {
    if (/(russ|ukrain|scott|wel|belarus|kazakh|gibralt|malta|egypt|india)/.test(s)) return null;
    return 'premier-league';
  }
  // Espanha — exige contexto (evita "Primera División" sul-americana).
  if (/(laliga|la liga|spain primera|spanish primera)/.test(s)) return 'la-liga';
  // Alemanha — só a 1ª divisão.
  if (/bundesliga/.test(s)) {
    if (/(2\.|3\.|second|third|austria|swiss|2 ?bundes)/.test(s)) return null;
    return 'bundesliga';
  }
  if (/ligue 1/.test(s)) return 'ligue-1';
  // Itália — exclui Equador (também tem "Serie A").
  if (/serie a/.test(s)) {
    if (/(ecuad|brazil|brasil)/.test(s)) return null;
    return 'serie-a';
  }
  return null;
}

function normalizeSubPos(rawPositions) {
  const first = String(rawPositions)
    .split(/[,\s|/]+/)[0]
    ?.replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
  return SUBPOS_MAP[first] ?? 'CM';
}

function processCsv(csvPath) {
  const text = readFileSync(csvPath, 'utf8');
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('CSV vazio ou sem linhas de dados.');

  const header = rows[0];
  const col = {
    id: pickColumn(header, ['player_id', 'sofifa_id', 'id', 'fifa_id']),
    name: pickColumn(header, ['short_name', 'name', 'long_name', 'player_name']),
    overall: pickColumn(header, ['overall', 'ovr', 'overall_rating', 'rating']),
    potential: pickColumn(header, ['potential', 'pot']),
    positions: pickColumn(header, ['player_positions', 'positions', 'position', 'best_position']),
    age: pickColumn(header, ['age']),
    dob: pickColumn(header, ['dob', 'birth_date']),
    club: pickColumn(header, ['club_name', 'club', 'club_team_name', 'team_name', 'team']),
    league: pickColumn(header, ['league_name', 'league']),
    leagueId: pickColumn(header, ['league_id']),
    rank: pickColumn(header, ['league_rank', 'league_level', 'leaguelevel']),
    value: pickColumn(header, ['value_eur', 'value', 'market_value', 'value_euro']),
  };

  const missing = ['name', 'overall', 'positions', 'club', 'league'].filter((k) => col[k] === -1);
  if (missing.length > 0) {
    throw new Error(
      `Colunas obrigatórias não encontradas: ${missing.join(', ')}.\n` +
        `Cabeçalho detectado: ${header.join(', ')}`,
    );
  }

  /** @type {Map<string, any>} */
  const clubMap = new Map();
  const usedIds = new Set();
  /** @type {Map<string, Map<string, number>>} */
  const sourceNames = new Map();

  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    if (!cells || cells.length < 2) continue;

    const leagueId = resolveLeagueId(cells, col);
    if (!leagueId) continue; // fora das 6 ligas-alvo (1ª divisão masculina)

    const clubName = (cells[col.club] ?? '').trim();
    if (!clubName) continue;
    const ovr = Math.round(Number(cells[col.overall]));
    if (!Number.isFinite(ovr) || ovr <= 0) continue;

    const subPos = normalizeSubPos(cells[col.positions] ?? '');
    const pos = POS_OF_SUBPOS[subPos];
    const name = (cells[col.name] ?? '').trim() || 'Desconhecido';

    let age = col.age !== -1 ? Math.round(Number(cells[col.age])) : NaN;
    if (!Number.isFinite(age) && col.dob !== -1) {
      const year = Number(String(cells[col.dob]).slice(0, 4));
      if (Number.isFinite(year)) age = 2025 - year;
    }
    if (!Number.isFinite(age)) age = 25;

    const pot = col.potential !== -1 ? Math.round(Number(cells[col.potential])) : ovr;
    const value =
      col.value !== -1 && Number.isFinite(Number(cells[col.value]))
        ? Math.round(Number(cells[col.value]))
        : marketValue(ovr, age);

    const rawLeague = (cells[col.league] ?? '').trim();
    if (!sourceNames.has(leagueId)) sourceNames.set(leagueId, new Map());
    const nameCounts = sourceNames.get(leagueId);
    nameCounts.set(rawLeague, (nameCounts.get(rawLeague) ?? 0) + 1);

    const clubId = slug(clubName);
    let id = col.id !== -1 && cells[col.id] ? `p-${cells[col.id]}` : `${clubId}-${slug(name)}`;
    while (usedIds.has(id)) id += 'x';
    usedIds.add(id);

    if (!clubMap.has(clubId)) {
      clubMap.set(clubId, { id: clubId, name: clubName, leagueId, players: [] });
    }
    clubMap.get(clubId).players.push({
      id,
      name,
      clubId,
      pos,
      subPos,
      ovr: clamp(ovr, 40, 99),
      pot: clamp(Math.max(pot, ovr), 40, 99),
      age: clamp(age, 15, 45),
      value,
      form: 0,
    });
  }

  console.log('Fontes (league_name → leagueId):');
  for (const [leagueId, nameCounts] of sourceNames) {
    const parts = [...nameCounts.entries()].map(([name, count]) => `"${name}"(${count})`).join(', ');
    console.log(`  ${leagueId}: ${parts}`);
  }

  if (clubMap.size === 0) {
    throw new Error(
      'Nenhum clube das 6 ligas-alvo foi encontrado. Confira se o CSV tem a coluna de liga ' +
        'com nomes reconhecíveis (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Brasileirão).',
    );
  }
  buildAndWrite(clubMap, 'fc-csv');
}

// ----------------------------------------------------------------------------
// Modo fixture (sintético, determinístico)
// ----------------------------------------------------------------------------

const FIXTURE_CLUBS = {
  'premier-league': [
    ['Arsenal', 83], ['Manchester City', 84], ['Liverpool', 83], ['Manchester United', 80],
    ['Chelsea', 80], ['Tottenham Hotspur', 80],
  ],
  'la-liga': [
    ['Real Madrid', 85], ['Barcelona', 83], ['Atlético de Madrid', 82], ['Sevilla', 78],
    ['Real Sociedad', 79], ['Villarreal', 78],
  ],
  'serie-a': [
    ['Inter', 82], ['Milan', 81], ['Juventus', 81], ['Napoli', 81], ['Roma', 79], ['Atalanta', 80],
  ],
  bundesliga: [
    ['Bayern de Munique', 84], ['Borussia Dortmund', 81], ['RB Leipzig', 81],
    ['Bayer Leverkusen', 82], ['Eintracht Frankfurt', 78], ['VfB Stuttgart', 79],
  ],
  'ligue-1': [
    ['Paris Saint-Germain', 83], ['Monaco', 79], ['Marseille', 78], ['Lyon', 77],
    ['Lille', 78], ['Nice', 77],
  ],
  brasileirao: [
    ['Flamengo', 78], ['Palmeiras', 78], ['São Paulo', 76], ['Corinthians', 75],
    ['Grêmio', 75], ['Atlético Mineiro', 76],
  ],
};

const SQUAD_TEMPLATE = [
  'GK', 'GK', 'GK',
  'CB', 'CB', 'CB', 'CB', 'LB', 'LB', 'RB', 'RB',
  'DM', 'DM', 'CM', 'CM', 'CM', 'AM', 'AM',
  'LW', 'RW', 'ST', 'ST', 'ST',
];

const FIRST_NAMES = [
  'Léo', 'Bruno', 'Diego', 'Marco', 'Tomás', 'Iker', 'Luka', 'Mateo', 'Nico', 'Eric',
  'Samir', 'Karim', 'Yann', 'Pavel', 'Hugo', 'Andrei', 'Felix', 'Otto', 'Dani', 'Rafa',
  'Theo', 'Milan', 'Sven', 'Joel', 'Ravi', 'Caio', 'Enzo', 'Vito', 'Noah', 'Aleks',
];
const LAST_NAMES = [
  'Moreau', 'Costa', 'Berg', 'Rossi', 'Nunes', 'Keller', 'Vidal', 'Haas', 'Lima', 'Sandberg',
  'Dorich', 'Mensah', 'Petrov', 'Oliveira', 'Nowak', 'Falk', 'Bauer', 'Conti', 'Ferro', 'Vega',
  'Stein', 'Maric', 'Dumas', 'Lindqvist', 'Adeyemi', 'Bianchi', 'Sousa', 'Wolff', 'Reyes', 'Hovland',
];

function generateFixture() {
  /** @type {Map<string, any>} */
  const clubMap = new Map();

  for (const league of LEAGUES) {
    const clubsOfLeague = FIXTURE_CLUBS[league.id];
    if (!clubsOfLeague) continue;
    for (const [clubName, baseOvr] of clubsOfLeague) {
      const clubId = slug(clubName);
      const rng = makeRng(seedFromString(clubId));
      /** @type {any[]} */
      const playersOfClub = [];

      SQUAD_TEMPLATE.forEach((subPos, slot) => {
        const tier = slot < 11 ? 2 : slot < 18 ? -1 : -3; // titulares um pouco melhores
        const ovr = clamp(Math.round(baseOvr + tier + (rng() * 10 - 5)), 50, 90);
        const pot = clamp(ovr + Math.round(rng() * 6), ovr, 95);
        const age = clamp(18 + Math.floor(rng() * 18), 17, 37);
        const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
        const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
        playersOfClub.push({
          id: `${clubId}-${slot}`,
          name: `${first} ${last}`,
          clubId,
          pos: POS_OF_SUBPOS[subPos],
          subPos,
          ovr,
          pot,
          age,
          value: marketValue(ovr, age),
          form: 0,
        });
      });

      clubMap.set(clubId, { id: clubId, name: clubName, leagueId: league.id, players: playersOfClub });
    }
  }
  buildAndWrite(clubMap, 'fixture');
}

// ----------------------------------------------------------------------------
// Entry
// ----------------------------------------------------------------------------

const arg = process.argv[2];
if (!arg || arg === '--help' || arg === '-h') {
  console.log('Uso:\n  node scripts/build-data.mjs <caminho.csv>\n  node scripts/build-data.mjs --fixture');
  process.exit(arg ? 0 : 1);
} else if (arg === '--fixture') {
  generateFixture();
} else {
  processCsv(resolve(process.cwd(), arg));
}
