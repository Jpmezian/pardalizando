import { useGameStore, type Screen } from '@/store/gameStore';

interface NavItem {
  key: Screen;
  label: string;
}

const ITEMS: NavItem[] = [
  { key: 'squad', label: 'Elenco' },
  { key: 'lineup', label: 'Escalação' },
  { key: 'market', label: 'Mercado' },
  { key: 'league-view', label: 'Liga' },
  { key: 'history', label: 'Histórico' },
];

/** Menu de seções fixo no topo das telas principais — pular pra qualquer lugar em 1 toque. */
export function MainNav({ active }: { active: Screen }): JSX.Element {
  const backToSquad = useGameStore((state) => state.backToSquad);
  const goToLineup = useGameStore((state) => state.goToLineup);
  const goToMarket = useGameStore((state) => state.goToMarket);
  const goToLeagueView = useGameStore((state) => state.goToLeagueView);
  const goToHistory = useGameStore((state) => state.goToHistory);

  const go = (key: Screen): void => {
    if (key === active) return;
    switch (key) {
      case 'squad':
        backToSquad();
        break;
      case 'lineup':
        goToLineup();
        break;
      case 'market':
        goToMarket();
        break;
      case 'league-view':
        goToLeagueView();
        break;
      case 'history':
        goToHistory();
        break;
    }
  };

  return (
    <nav className="sticky top-0 z-[200] border-b border-line bg-bg">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 lg:px-8">
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => go(item.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 font-display text-sm font-bold uppercase tracking-wide transition-colors duration-150 ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
