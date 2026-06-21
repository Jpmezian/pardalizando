import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { StartScreen } from '@/screens/StartScreen';
import { LeagueSelectScreen } from '@/screens/LeagueSelectScreen';
import { ClubSelectScreen } from '@/screens/ClubSelectScreen';
import { SquadScreen } from '@/screens/SquadScreen';
import { LineupScreen } from '@/screens/LineupScreen';
import { MatchResultScreen } from '@/screens/MatchResultScreen';
import { SimulatingScreen } from '@/screens/SimulatingScreen';
import { ReplayScreen } from '@/screens/ReplayScreen';
import { SeasonResultsScreen } from '@/screens/SeasonResultsScreen';
import { MarketScreen } from '@/screens/MarketScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { LeagueViewScreen } from '@/screens/LeagueViewScreen';
import { CompetitionScreen } from '@/screens/CompetitionScreen';
import { ClubDetailScreen } from '@/screens/ClubDetailScreen';
import { FiredScreen } from '@/screens/FiredScreen';
import { CupMatchScreen } from '@/screens/CupMatchScreen';

export function App(): JSX.Element {
  const screen = useGameStore((state) => state.screen);
  const checkForSave = useGameStore((state) => state.checkForSave);

  useEffect(() => {
    void checkForSave();
  }, [checkForSave]);

  switch (screen) {
    case 'league-select':
      return <LeagueSelectScreen />;
    case 'club-select':
      return <ClubSelectScreen />;
    case 'squad':
      return <SquadScreen />;
    case 'lineup':
      return <LineupScreen />;
    case 'match-result':
      return <MatchResultScreen />;
    case 'simulating':
      return <SimulatingScreen />;
    case 'replay':
      return <ReplayScreen />;
    case 'season-results':
      return <SeasonResultsScreen />;
    case 'market':
      return <MarketScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'league-view':
      return <LeagueViewScreen />;
    case 'competition':
      return <CompetitionScreen />;
    case 'club':
      return <ClubDetailScreen />;
    case 'cup-match':
      return <CupMatchScreen />;
    case 'fired':
      return <FiredScreen />;
    case 'start':
      return <StartScreen />;
    default:
      return <StartScreen />;
  }
}
