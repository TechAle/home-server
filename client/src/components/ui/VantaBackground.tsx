/**
 * The exact Vanta NET background from `mockup/app.js`, running in a WebView.
 *
 * Vanta.js needs a DOM and WebGL, so it cannot run in React Native directly;
 * a WebView executes the same HTML/JS/CSS as the mockup. The view ignores
 * touches so the login form above it keeps working.
 *
 * The `source` object and the component are stable on purpose: re-rendering
 * the login form (typing!) must not reload the WebView and restart Vanta.
 */
import {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {THREE_SOURCE, VANTA_SOURCE} from '../../assets/vendor/vanta';

const HTML = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: transparent; }
      #screen-login { position: fixed; inset: 0; overflow: hidden; background: transparent; }
      .vanta-bg {
        position: absolute;
        top: -15%;
        left: -15%;
        width: 130%;
        height: 130%;
        z-index: 0;
        background: transparent;
      }
      .night-veil {
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        background:
          radial-gradient(70% 60% at 50% 35%, rgba(6, 12, 26, 0) 0%, rgba(4, 8, 18, 0.55) 100%),
          linear-gradient(180deg, rgba(4, 8, 18, 0.35), rgba(4, 8, 18, 0.7));
      }
    </style>
  </head>
  <body>
    <div id="screen-login">
      <div id="vanta-bg" class="vanta-bg"></div>
      <div class="night-veil"></div>
    </div>
    <script>${THREE_SOURCE}</script>
    <script>${VANTA_SOURCE}</script>
    <script>
      (function () {
        var el = document.getElementById('vanta-bg');
        function fallback(reason) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage('vanta-fallback: ' + reason);
          }
        }
        try {
          if (window.VANTA && typeof window.VANTA.NET === 'function') {
            window.VANTA.NET({
              el: el,
              mouseControls: false,
              touchControls: false,
              gyroControls: false,
              minHeight: 200,
              minWidth: 200,
              scale: 1,
              scaleMobile: 1,
              color: 0x4f8cff,
              backgroundColor: 0x050a17,
              points: 16,
              maxDistance: 26,
              spacing: 15,
              showDots: true
            });
          } else {
            fallback('VANTA.NET unavailable');
          }
        } catch (error) {
          fallback(error && error.message ? error.message : 'unknown error');
        }
      })();
    </script>
  </body>
</html>`;

// Stable module-level object: a new one on every render reloads the WebView.
const SOURCE = {html: HTML};

export const VantaBackground = memo(function VantaBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <WebView
        originWhitelist={['*']}
        source={SOURCE}
        style={styles.webview}
        containerStyle={styles.webview}
        opaque={false}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        androidLayerType="hardware"
        pointerEvents="none"
        setSupportMultipleWindows={false}
        onError={event =>
          console.warn('[vanta] WebView error', event.nativeEvent)
        }
        onMessage={event => console.warn('[vanta]', event.nativeEvent.data)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  webview: {flex: 1, backgroundColor: 'transparent'},
});
