/**
 * Persistent Vanta layer, mounted for the whole app lifetime so the WebGL
 * scene is already initialised when the login (or logout) appears.
 *
 * Behind the transparent WebView there is a static native constellation: it
 * fills the first frames with stars and lines while Vanta starts, then the
 * opaque Vanta canvas covers it.
 */
import {useMemo} from 'react';
import {StyleSheet, View, useWindowDimensions} from 'react-native';
import {VantaBackground} from './VantaBackground';

const NET_COLOR = '#4f8cff';
const NET_POINTS = 30;
const NET_DISTANCE = 150;

interface Dot {
  x: number;
  y: number;
}

interface Line {
  key: string;
  x: number;
  y: number;
  length: number;
  angle: number;
  opacity: number;
}

function computeLines(dots: Dot[]): Line[] {
  const result: Line[] = [];

  for (let i = 0; i < dots.length; i += 1) {
    for (let j = i + 1; j < dots.length; j += 1) {
      const a = dots[i];
      const b = dots[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance > NET_DISTANCE) {
        continue;
      }

      result.push({
        key: `${i}-${j}`,
        x: (a.x + b.x) / 2 - distance / 2,
        y: (a.y + b.y) / 2 - 0.5,
        length: distance,
        angle: Math.atan2(dy, dx),
        opacity: Math.max(0.06, 0.5 * (1 - distance / NET_DISTANCE)),
      });
    }
  }

  return result;
}

export function VantaLayer({visible}: {visible: boolean}) {
  const {width, height} = useWindowDimensions();

  // Static on purpose: no per-frame recomputation, so it cannot glitch.
  const dots = useMemo(
    () =>
      Array.from({length: NET_POINTS}, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
      })),
    [width, height],
  );
  const lines = useMemo(() => computeLines(dots), [dots]);

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {opacity: visible ? 1 : 0}]}>
      <View
        style={[StyleSheet.absoluteFill, {backgroundColor: '#050a17'}]}
      />

      {lines.map(line => (
        <View
          key={line.key}
          style={{
            position: 'absolute',
            left: line.x,
            top: line.y,
            width: line.length,
            height: 1,
            backgroundColor: NET_COLOR,
            opacity: line.opacity,
            transform: [{rotate: `${line.angle}rad`}],
          }}
        />
      ))}

      {dots.map((dot, index) => (
        <View
          key={`dot-${index}`}
          style={{
            position: 'absolute',
            left: dot.x - 4,
            top: dot.y - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: NET_COLOR,
            opacity: 0.12,
          }}>
          <View
            style={{
              position: 'absolute',
              left: 2.5,
              top: 2.5,
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: NET_COLOR,
              opacity: 0.95,
            }}
          />
        </View>
      ))}

      <VantaBackground />
    </View>
  );
}
