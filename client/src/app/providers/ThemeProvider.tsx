import type {PropsWithChildren} from 'react';
import {useSettingsStore} from '../../store/settings';
import {ThemeContext} from '../../theme/ThemeContext';
import {themes} from '../../theme/themes';

export function ThemeProvider({children}: PropsWithChildren) {
  const mode = useSettingsStore(state => state.theme);

  return (
    <ThemeContext.Provider value={themes[mode]}>
      {children}
    </ThemeContext.Provider>
  );
}
