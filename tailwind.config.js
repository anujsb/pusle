
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'heartbeat': 'heartbeat 2s ease-in-out infinite',
        'heartbeat-gentle': 'heartbeat-gentle 3s ease-in-out infinite',
        'heartbeat-sync': 'heartbeat-sync 4s ease-in-out infinite',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { 
            transform: 'scale(1)',
            opacity: '0.7'
          },
          '50%': { 
            transform: 'scale(1.05)',
            opacity: '1'
          }
        },
        'heartbeat-gentle': {
          '0%, 100%': { 
            transform: 'scale(1)',
            opacity: '0.6',
            filter: 'blur(0px)'
          },
          '50%': { 
            transform: 'scale(1.02)',
            opacity: '0.9',
            filter: 'blur(1px)'
          }
        },
        'heartbeat-sync': {
          '0%, 100%': { 
            transform: 'scale(1)',
            opacity: '0.5'
          },
          '25%': { 
            transform: 'scale(1.03)',
            opacity: '0.8'
          },
          '75%': { 
            transform: 'scale(1.01)',
            opacity: '0.6'
          }
        }
      }
    },
  },
  plugins: [],
}
