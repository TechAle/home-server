import {useRef} from 'react';
import {Dimensions, useWindowDimensions} from 'react-native';

interface WindowSize {
  width: number;
  height: number;
}

const initial = Dimensions.get('window');

/**
 * Window size that survives the app coming back from the background.
 *
 * react-native-macos can report `0x0` for a moment when the window is restored
 * (no resize event until the user moves it). Accepting that value collapses the
 * sky background and switches the top bar to its narrow layout, so keep the last
 * positive size and only use fresh values when they are valid.
 */
export function useWindowSize(): WindowSize {
  const {width, height} = useWindowDimensions();
  const lastGood = useRef<WindowSize>({width: initial.width, height: initial.height});

  if (width > 0 && height > 0) {
    lastGood.current = {width, height};
  }

  return width > 0 && height > 0 ? {width, height} : lastGood.current;
}
