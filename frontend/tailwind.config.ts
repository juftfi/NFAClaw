import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#050505', // Deep black
        surface: '#0A0A0A',    // Slightly lighter black
        surfaceHighlight: '#121212',
        border: '#1F1F1F',
        
        // Brand Colors
        flap: {
          DEFAULT: '#8B5CF6', // Purple
          glow: '#A78BFA',
          dim: '#5B21B6',
        },
        neon: {
          green: '#10B981',   // Emerald Green
          blue: '#3B82F6',
          pink: '#EC4899',
        }
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #1f1f1f 1px, transparent 1px), linear-gradient(to bottom, #1f1f1f 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid-pattern': '40px 40px',
      },
      boxShadow: {
        'neon-purple': '0 0 5px theme("colors.flap.DEFAULT"), 0 0 20px theme("colors.flap.dim")',
        'neon-green': '0 0 5px theme("colors.neon.green"), 0 0 20px rgba(16, 185, 129, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px theme("colors.flap.DEFAULT"), 0 0 10px theme("colors.flap.dim")' },
          '100%': { boxShadow: '0 0 20px theme("colors.flap.DEFAULT"), 0 0 30px theme("colors.flap.dim")' },
        }
      }
    }
  },
  plugins: []
};

export default config;
