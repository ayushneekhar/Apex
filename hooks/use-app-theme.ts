import { APP_THEMES, DEFAULT_THEME_ID } from '@/constants/app-themes';
import { useAppStore } from '@/store/use-app-store';

export function useAppTheme() {
  const themeId = useAppStore((state) => state.settings.themeId);
  return APP_THEMES[themeId] ?? APP_THEMES[DEFAULT_THEME_ID];
}
