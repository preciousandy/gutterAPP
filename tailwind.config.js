/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand navy scale (from Gutter App.dc.html)
        navy: {
          DEFAULT: '#12306E',
          deep: '#0E2050',
          darker: '#0A1738',
          darkest: '#08122E',
          light: '#14367A',
          bright: '#153A82',
        },
        // Mint accent
        mint: {
          DEFAULT: '#23D3A5',
          dark: '#0FA97F',
          deeper: '#0A7A5C',
          on: '#062B22',
          bg: '#E7FBF4',
        },
        // Surfaces
        page: '#F4F6FA',
        sheet: '#F7F9FC',
        surface: '#FFFFFF',
        chip: '#EEF2FB',
        segment: '#E7EBF4',
        // Borders
        line: {
          DEFAULT: '#E6EAF2',
          input: '#E3E8F1',
          soft: '#F0F3F8',
          sheet: '#EDF0F6',
        },
        // Text
        ink: {
          DEFAULT: '#0E2050',
          mid: '#54648A',
          muted: '#7C8AA6',
          soft: '#8A97B1',
          faint: '#9AA6BE',
          ghost: '#C3CBDA',
          slate: '#4C5C7A',
        },
        // Status / asset colors
        red: { DEFAULT: '#D6455F', bg: '#FDEEF0' },
        btc: { DEFAULT: '#D98319', bg: '#FFF3E6', logo: '#F0A028' },
        eth: { DEFAULT: '#4B57C7', bg: '#EEF0FF' },
        bnb: { DEFAULT: '#C79A0B', bg: '#FFF9E5' },
        sol: { DEFAULT: '#7A4BD1', bg: '#F0E9FF' },
        amber: { DEFAULT: '#8A6412', bg: '#FFF7E8', line: '#F5E3BE' },
      },
      fontFamily: {
        sans: ['Manrope_500Medium'],
        'sans-regular': ['Manrope_400Regular'],
        'sans-semibold': ['Manrope_600SemiBold'],
        'sans-bold': ['Manrope_700Bold'],
        'sans-extrabold': ['Manrope_800ExtraBold'],
        grotesk: ['SpaceGrotesk_600SemiBold'],
        'grotesk-bold': ['SpaceGrotesk_700Bold'],
      },
    },
  },
  plugins: [],
};
