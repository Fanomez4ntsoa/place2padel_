/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Orange CTA
        'brand-orange': '#E8650A',
        'brand-orange-hover': '#C75508',
        'brand-orange-light': '#FFF0E6',
        // Navy
        'brand-navy': '#1A2A4A',
        'brand-navy-2': '#2A4A6A',
        // Surfaces
        'brand-bg': '#FFF8F4',
        'brand-border': '#F0EBE8',
        // Status
        'brand-success': '#059669',
        'brand-danger': '#DC2626',
        'brand-live': '#FF3B30',
        'brand-muted': '#64748B',
      },
      fontFamily: {
        // Chargées via expo-font dans app/_layout.tsx
        heading: ['PlusJakartaSans_700Bold'],
        'heading-black': ['PlusJakartaSans_800ExtraBold'],
        body: ['DMSans_400Regular'],
        'body-medium': ['DMSans_500Medium'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
