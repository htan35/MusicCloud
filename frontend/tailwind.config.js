/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                obsidian: {
                    950: '#0a0a0f',
                    900: '#0f0f18',
                    800: '#1a1a28',
                    700: '#252535',
                    600: '#333348'
                },
                aurora: {
                    violet: '#8b5cf6',
                    pink: '#ec4899',
                    cyan: '#06b6d4',
                    gold: '#f59e0b'
                },
                apple: {
                    red: '#fc3c44',
                    dark: '#1c1c1e',
                    card: '#2c2c2e',
                }
            },
            fontFamily: {
                display: ['Inter', 'system-ui', 'sans-serif'],
                body: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace']
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' }
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(20px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                }
            }
        }
    },
    plugins: []
};
