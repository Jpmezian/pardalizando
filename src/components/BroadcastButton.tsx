import type { ButtonHTMLAttributes } from 'react';

type BroadcastButtonVariant = 'primary' | 'ghost';

interface BroadcastButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BroadcastButtonVariant;
}

const VARIANT_CLASSES: Record<BroadcastButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink border-transparent hover:bg-accent-strong',
  ghost: 'bg-transparent text-ink border-line hover:border-ink-faint hover:bg-surface-raised',
};

/** Botão chapado estilo lower-third: caixa-alta condensada + seta que avança no hover. */
export function BroadcastButton({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...rest
}: BroadcastButtonProps): JSX.Element {
  return (
    <button
      type={type}
      className={`group flex w-full items-center justify-between gap-4 border px-5 py-4 text-left font-display text-3xl font-bold uppercase leading-none tracking-wide transition-[background-color,border-color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      <span>{children}</span>
      <svg
        className="h-6 w-6 shrink-0 transition-transform duration-150 group-hover:translate-x-1"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
      >
        <path d="M5 12h13M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}
