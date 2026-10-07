/**
 * Brand colors for places Tailwind classes can't reach: navigation options,
 * gradients, ActivityIndicator/icon color props. Keep in sync with
 * tailwind.config.js — values come from the Gutter design (Gutter App.dc.html).
 */
export const colors = {
  navy: '#12306E',
  navyDeep: '#0E2050',
  navyDarker: '#0A1738',
  navyDarkest: '#08122E',
  navyLight: '#14367A',
  navyBright: '#153A82',

  mint: '#23D3A5',
  mintDark: '#0FA97F',
  mintOn: '#062B22',

  page: '#F4F6FA',
  sheet: '#F7F9FC',
  surface: '#FFFFFF',
  chip: '#EEF2FB',

  line: '#E6EAF2',
  lineInput: '#E3E8F1',

  ink: '#0E2050',
  inkMid: '#54648A',
  inkMuted: '#7C8AA6',
  inkSoft: '#8A97B1',
  inkFaint: '#9AA6BE',
  inkGhost: '#C3CBDA',
  white: '#FFFFFF',

  red: '#D6455F',
  btc: '#D98319',
  eth: '#4B57C7',
} as const;

/** Header gradient used across screens: linear-gradient(160deg,#14367A,#0E2050). */
export const headerGradient = [colors.navyLight, colors.navyDeep] as const;

/** Primary button gradient: linear-gradient(120deg,#12306E,#0E2050). */
export const buttonGradient = [colors.navy, colors.navyDeep] as const;

/** Virtual card gradient: linear-gradient(135deg,#0A1738,#153A82,#0E2050). */
export const cardGradient = [colors.navyDarker, colors.navyBright, colors.navyDeep] as const;
