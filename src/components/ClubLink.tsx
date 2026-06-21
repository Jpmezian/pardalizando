import type { MouseEvent } from 'react';
import { useGameStore } from '@/store/gameStore';

interface ClubLinkProps {
  clubId: string;
  name: string;
  className?: string;
}

/** Nome de clube clicável — abre a tela do clube. */
export function ClubLink({ clubId, name, className = '' }: ClubLinkProps): JSX.Element {
  const goToClub = useGameStore((state) => state.goToClub);

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    goToClub(clubId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`max-w-full truncate transition-colors duration-150 hover:text-accent hover:underline ${className}`}
    >
      {name}
    </button>
  );
}
