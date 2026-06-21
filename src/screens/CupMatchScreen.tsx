import { useGameStore } from '@/store/gameStore';
import { CupMatchCinematic } from '@/components/CupMatchCinematic';

export function CupMatchScreen(): JSX.Element | null {
  const cupMatch = useGameStore((state) => state.cupMatch);
  const exitCupMatch = useGameStore((state) => state.exitCupMatch);

  if (!cupMatch) return null;

  return (
    <CupMatchCinematic
      play={cupMatch.play}
      theme={cupMatch.theme}
      roundName={cupMatch.roundName}
      managedSide={cupMatch.managedSide}
      onDone={exitCupMatch}
    />
  );
}
