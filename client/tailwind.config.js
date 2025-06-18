/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                // Auth color system
                'auth': {
                    primary: '#667eea',
                    secondary: '#764ba2',
                    text: {
                        dark: '#374151',
                        medium: '#64748b',
                        light: '#9ca3af'
                    }
                },
                // Vocab app colors
                'vocab': {
                    bg: '#f8fafc',
                    surface: 'rgba(255, 255, 255, 0.95)',
                    'surface-hover': 'rgba(255, 255, 255, 0.98)',
                    border: '#e2e8f0',
                    'border-light': '#f1f5f9',
                    primary: '#667eea',
                    secondary: '#8b5cf6',
                    success: '#10b981',
                    danger: '#ef4444',
                    warning: '#f59e0b'
                }
            },
            fontFamily: {
                'inter': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                'montserrat': ['Montserrat', 'sans-serif']
            },
            fontSize: {
                'xs': '0.75rem',
                'sm': '0.875rem',
                'base': '1rem',
                'lg': '1.125rem',
                'xl': '1.25rem',
                '2xl': '1.5rem',
                '3xl': '1.75rem',
                '4xl': '2rem',
                '5xl': '2.25rem',
                '6xl': '2.5rem',
                '7xl': '2.75rem',
                '8xl': '3rem'
            },
            spacing: {
                'xs': '0.25rem',
                'sm': '0.5rem',
                'md': '1rem',
                'lg': '1.5rem',
                'xl': '2rem',
                '2xl': '3rem'
            },
            borderRadius: {
                'xs': '6px',
                'sm': '8px',
                'md': '12px',
                'lg': '16px',
                'xl': '20px',
                '2xl': '24px',
                '3xl': '28px',
                '4xl': '32px'
            },
            boxShadow: {
                'xs': '0 2px 4px rgba(0, 0, 0, 0.04)',
                'sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
                'md': '0 4px 12px rgba(0, 0, 0, 0.08)',
                'lg': '0 8px 25px rgba(102, 126, 234, 0.15)',
                'xl': '0 20px 60px rgba(0, 0, 0, 0.15)',
                'vocab-lg': '0 8px 25px rgba(102, 126, 234, 0.4)'
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'gradient-secondary': 'linear-gradient(135deg, #8b5cf6 0%, #667eea 100%)',
                'gradient-surface': 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%)',
                'gradient-text': 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
                'gradient-auth': 'linear-gradient(135deg, #948b77 0%, #31144f 100%)',
                'gradient-danger': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            },
            animation: {
                'float': 'float 20s ease-in-out infinite',
                'slideIn': 'slideIn 0.6s ease-out',
                'slideDown': 'slideDown 0.3s ease-out',
                'popupFadeIn': 'popupFadeIn 0.2s ease-out',
                'hoverFadeIn': 'hoverFadeIn 0.3s ease-out',
                'modalFadeIn': 'modalFadeIn 0.2s ease-out'
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '33%': { transform: 'translateY(-20px) rotate(1deg)' },
                    '66%': { transform: 'translateY(10px) rotate(-1deg)' }
                },
                slideIn: {
                    from: { opacity: '0', transform: 'translateY(30px) scale(0.95)' },
                    to: { opacity: '1', transform: 'translateY(0) scale(1)' }
                },
                slideDown: {
                    from: { opacity: '0', transform: 'translateY(-10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                },
                popupFadeIn: {
                    from: { opacity: '0', transform: 'translateY(-10px) scale(0.95)' },
                    to: { opacity: '1', transform: 'translateY(0) scale(1)' }
                },
                hoverFadeIn: {
                    from: { opacity: '0', transform: 'translateY(-10px) scale(0.95)' },
                    to: { opacity: '1', transform: 'translateY(0) scale(1)' }
                },
                modalFadeIn: {
                    from: { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
                    to: { opacity: '1', transform: 'scale(1) translateY(0)' }
                }
            }
        },
    },
    plugins: [],
};
