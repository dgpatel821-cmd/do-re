import { useAppTheme } from './ThemeContext';

export { ThemeProvider, useAppTheme } from './ThemeContext';

export function useColorScheme() {
  const { theme } = useAppTheme();
  return theme;
}
