/**
 * @format
 */

import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Only this known-noisy warning is hidden; everything else stays visible in
// LogBox and React Native DevTools.
LogBox.ignoreLogs([
  'sending onAnimatedValueUpdate with no listeners registered',
]);

AppRegistry.registerComponent(appName, () => App);
