import {createContext, useContext} from 'react';
import {lightTheme, type Theme} from './themes';

export const ThemeContext = createContext<Theme>(lightTheme);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
