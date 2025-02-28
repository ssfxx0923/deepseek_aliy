import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        background: 'rgb(var(--background-start-rgb))',
        foreground: 'rgb(var(--foreground-rgb))',
      },
      animation: {
        'bounce': 'bounce 1s infinite',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#fff',
            a: {
              color: '#3b82f6',
              '&:hover': {
                color: '#60a5fa',
              },
            },
            'h1,h2,h3,h4': {
              color: '#fff',
              'scroll-margin-top': '6rem',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            code: {
              color: '#86efac',
              'border-radius': '0.25rem',
              padding: '0.15rem 0.3rem',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderWidth: '1px',
              borderColor: 'rgba(255,255,255,0.1)',
            },
            pre: {
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              overflowX: 'auto',
              'code': {
                backgroundColor: 'transparent',
                borderWidth: '0',
                borderRadius: '0',
                padding: '0',
                color: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                display: 'inline',
                lineHeight: 'inherit',
              }
            },
            'blockquote p:first-of-type::before': {
              content: '""',
            },
            'blockquote p:last-of-type::after': {
              content: '""',
            },
            'math-display': {
              overflow: 'auto',
              padding: '1rem',
            },
            '.katex': {
              display: 'inline-block',
              color: '#fff',
              'font-size': '1.1em',
            },
            '.katex-display': {
              display: 'block',
              margin: '1em 0',
              'overflow-x': 'auto',
              'overflow-y': 'hidden',
              padding: '0.5em 0',
              'text-align': 'center',
              '> .katex': {
                'font-size': '1.21em',
              }
            },
            '.katex-html': {
              'overflow-x': 'auto',
              'overflow-y': 'hidden',
            },
            '.katex-error': {
              color: '#ff6b6b',
            },
            table: {
              width: '100%',
              borderCollapse: 'collapse',
              'thead': {
                borderBottomColor: 'rgba(255,255,255,0.1)',
              },
              'th,td': {
                padding: '0.75rem',
                borderColor: 'rgba(255,255,255,0.1)',
              },
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config; 