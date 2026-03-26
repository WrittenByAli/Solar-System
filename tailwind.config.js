/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                space: {
                    950: '#020408',
                    900: '#040c18',
                    800: '#071428',
                    700: '#0a1e3d',
                    600: '#0d2855',
                },
                solar: {
                    gold: '#f5a623',
                    blue: '#4fc3f7',
                    purple: '#7c3aed',
                    cyan: '#00e5ff',
                    orange: '#ff6b35',
                }
            },
            animation: {
                'orbit': 'orbit 20s linear infinite',
                'orbit-slow': 'orbit 40s linear infinite',
                'orbit-fast': 'orbit 10s linear infinite',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
                'twinkle': 'twinkle 3s ease-in-out infinite',
                'spin-slow': 'spin 20s linear infinite',
            },
            keyframes: {
                orbit: {
                    '0%': { transform: 'rotate(0deg) translateX(var(--orbit-r)) rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg)' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
                    '50%': { opacity: '1', transform: 'scale(1.05)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
                twinkle: {
                    '0%, 100%': { opacity: '0.3' },
                    '50%': { opacity: '1' },
                },
            },
            boxShadow: {
                'glow-blue': '0 0 20px rgba(79, 195, 247, 0.4)',
                'glow-gold': '0 0 20px rgba(245, 166, 35, 0.4)',
                'glow-purple': '0 0 20px rgba(124, 58, 237, 0.4)',
                'glow-cyan': '0 0 30px rgba(0, 229, 255, 0.5)',
                'glow-orange': '0 0 25px rgba(255, 107, 53, 0.5)',
            },
        },
    },
    plugins: [],
}
