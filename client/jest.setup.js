/* eslint-env jest */
jest.mock('react-native-webview', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    WebView: props => React.createElement(View, {style: props.style}),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();

  const AsyncStorage = {
    getItem: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
    setItem: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async key => {
      store.delete(key);
    }),
    mergeItem: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    clear: jest.fn(async () => {
      store.clear();
    }),
    getAllKeys: jest.fn(async () => Array.from(store.keys())),
    multiGet: jest.fn(async keys =>
      keys.map(key => [key, store.has(key) ? store.get(key) : null]),
    ),
    multiSet: jest.fn(async pairs => {
      pairs.forEach(([key, value]) => store.set(key, value));
    }),
    multiRemove: jest.fn(async keys => {
      keys.forEach(key => store.delete(key));
    }),
  };

  return {__esModule: true, default: AsyncStorage, ...AsyncStorage};
});
