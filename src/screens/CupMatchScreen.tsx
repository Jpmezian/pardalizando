import { useGameStore } from '@/store/gameStore';
import { CupMatchCinematic } from '@/components/CupMatchCinematic';

export function CupMatchScreen(): JSX.Element | null {
  const cupQueue = useGameStore((state) => state.cupQueue);
  const advanceCupMatch = useGameStore((state) => state.advanceCupMatch);
  const skipCupCinematics = useGameStore((state) => state.skipCupCinematics);

  if (!cupQueue) return null;
  const current = cupQueue.matches[cupQueue.index];
  if (!current) return null;

  const total = cupQueue.matches.length;

  return (
    <CupMatchCinematic
      key={cupQueue.index}
      play={current.play}
      theme={current.theme}
      roundName={current.roundName}
      managedSide={current.managedSide}
      homeColor={current.homeColor}
      awayColor={current.awayColor}
      position={{ index: cupQueue.index, total }}
      onDone={advanceCupMatch}
      onSkipAll={total > 1 ? skipCupCinematics : undefined}
    />
  );
}
