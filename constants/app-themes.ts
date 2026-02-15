export type ThemeId = 'neon-noir' | 'electric-ocean' | 'laser-sunset';

export type AppTheme = {
  id: ThemeId;
  name: string;
  punchline: string;
  statusBarStyle: 'light' | 'dark';
  palette: {
    background: string;
    backgroundAlt: string;
    panel: string;
    panelSoft: string;
    border: string;
    textPrimary: string;
    textMuted: string;
    accent: string;
    accentStrong: string;
    accentContrast: string;
    accentSecondary: string;
    danger: string;
    success: string;
    gridLine: string;
  };
};

export const DEFAULT_THEME_ID: ThemeId = 'neon-noir';

export const APP_THEMES: Record<ThemeId, AppTheme> = {
  'neon-noir': {
    id: 'neon-noir',
    name: 'Neon Noir',
    punchline: 'Neon yellow on black',
    statusBarStyle: 'light',
    palette: {
      background: '#050505',
      backgroundAlt: '#0b0b0b',
      panel: '#101010',
      panelSoft: '#151515',
      border: '#252525',
      textPrimary: '#f5f5f5',
      textMuted: '#9a9a9a',
      accent: '#e8ff1f',
      accentStrong: '#f3ff3d',
      accentContrast: '#070707',
      accentSecondary: '#7ea1d1',
      danger: '#ff5a5a',
      success: '#7dff90',
      gridLine: 'rgba(255, 255, 255, 0.06)',
    },
  },
  'electric-ocean': {
    id: 'electric-ocean',
    name: 'Electric Ocean',
    punchline: 'Cyan pulse and deep navy',
    statusBarStyle: 'light',
    palette: {
      background: '#020813',
      backgroundAlt: '#041022',
      panel: '#07172e',
      panelSoft: '#0d2240',
      border: '#18416f',
      textPrimary: '#ddf5ff',
      textMuted: '#8eb7cd',
      accent: '#2ef8ff',
      accentStrong: '#7dffff',
      accentContrast: '#021014',
      accentSecondary: '#4459ff',
      danger: '#ff7d9c',
      success: '#51ffcf',
      gridLine: 'rgba(65, 154, 255, 0.2)',
    },
  },
  'laser-sunset': {
    id: 'laser-sunset',
    name: 'Laser Sunset',
    punchline: 'Tangerine pop on charcoal',
    statusBarStyle: 'light',
    palette: {
      background: '#10100f',
      backgroundAlt: '#171715',
      panel: '#1d1b17',
      panelSoft: '#25231d',
      border: '#3a3327',
      textPrimary: '#f4ebe0',
      textMuted: '#baa58f',
      accent: '#ffb100',
      accentStrong: '#ffd15c',
      accentContrast: '#1d1400',
      accentSecondary: '#ed5c4a',
      danger: '#ff6a6a',
      success: '#baff53',
      gridLine: 'rgba(255, 177, 0, 0.14)',
    },
  },
};

export const THEME_OPTIONS: AppTheme[] = Object.values(APP_THEMES);

export function isThemeId(value: string): value is ThemeId {
  return Object.prototype.hasOwnProperty.call(APP_THEMES, value);
}
