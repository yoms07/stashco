import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        // Raw design tokens (docs/DESIGN.md) for direct use, e.g. bg-surface-dark, text-muted-soft
        ink: 'var(--color-ink)',
        black: 'var(--color-black)',
        canvas: 'var(--color-canvas)',
        'muted-soft': 'var(--color-muted-soft)',
        slate: 'var(--color-slate)',
        hairline: 'var(--color-hairline)',
        'hairline-soft': 'var(--color-hairline-soft)',
        'surface-soft': 'var(--color-surface-soft)',
        'surface-mint': 'var(--color-surface-mint)',
        'surface-mint-alt': 'var(--color-surface-mint-alt)',
        'surface-dark': 'var(--color-surface-dark)',
        'surface-dark-alt': 'var(--color-surface-dark-alt)',
        'on-dark': 'var(--color-on-dark)',
        'accent-mint': 'var(--color-accent-mint)',
        'accent-green': 'var(--color-accent-green)',
        'accent-sage': 'var(--color-accent-sage)',
        'accent-aqua': 'var(--color-accent-aqua)',
        'accent-mint-pale': 'var(--color-accent-mint-pale)',
        error: 'var(--color-error)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      spacing: {
        xxs: 'var(--spacing-xxs)',
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        xxl: 'var(--spacing-xxl)',
        huge: 'var(--spacing-huge)',
        section: 'var(--spacing-section)',
        'section-lg': 'var(--spacing-section-lg)',
        'section-xl': 'var(--spacing-section-xl)',
      },
      fontFamily: {
        sans: ['var(--font-body)', ...defaultTheme.fontFamily.sans],
        display: ['var(--font-display)', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        // Product-UI page titles: display face, sane product size — NOT the 88px marketing headline
        // (see docs/DESIGN.md Known Gaps / issue #12).
        'page-title': ['32px', { lineHeight: '1.15', letterSpacing: '0.01em' }],
        // Corrected per docs/DESIGN.md Known Gaps: measured 10.75px/8px were capture artifacts.
        eyebrow: ['13px', { lineHeight: '1.3', letterSpacing: '0.06em' }],
      },
      boxShadow: {
        'soft-float': '0 4px 16px 0 rgba(0, 0, 0, 0.08)',
        'medium-float': '0 2px 15px 0 rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
