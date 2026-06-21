/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Semantic tokens only — actual values live as OKLCH CSS vars in index.css.
      colors: {
        bg: 'var(--c-bg)',
        surface: {
          DEFAULT: 'var(--c-surface)',
          raised: 'var(--c-surface-raised)',
        },
        line: 'var(--c-line)',
        ink: {
          DEFAULT: 'var(--c-text)',
          muted: 'var(--c-text-muted)',
          faint: 'var(--c-text-faint)',
        },
        accent: {
          DEFAULT: 'var(--c-accent)',
          strong: 'var(--c-accent-strong)',
          ink: 'var(--c-accent-ink)',
        },
        live: 'var(--c-live)',
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
      // Intentional radius variation: broadcast UI is mostly hard-edged.
      borderRadius: {
        none: '0',
        xs: '2px',
        sm: '3px',
      },
      letterSpacing: {
        broadcast: '0.14em',
      },
    },
  },
  plugins: [],
};
