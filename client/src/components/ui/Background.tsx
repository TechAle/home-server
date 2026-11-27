/**
 * Sky layers.
 *
 * The login uses the real Vanta NET background from the mockup (WebView).
 * The app keeps the native day sky and, for the dark theme, a static star
 * field. Clouds are moved with the same algorithm as the mockup: a
 * requestAnimationFrame loop, a vertical bob, and a respawn fully off-screen
 * (so nothing ever "teleports" into view).
 */
import {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View, useWindowDimensions} from 'react-native';
import {useTheme, type Theme} from '../../theme';

/** Timers never start under Jest: they would keep the test process alive. */
const ANIMATIONS_ENABLED = process.env.NODE_ENV !== 'test';
const BAND_COUNT = 24;
const CLOUD_FRAME_MS = 33;

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mixHex(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const channel = (index: number) =>
    Math.round(a[index] + (b[index] - a[index]) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function skyColor(theme: Theme, t: number): string {
  return t < 0.5
    ? mixHex(theme.colors.skyTop, theme.colors.skyMid, t * 2)
    : mixHex(theme.colors.skyMid, theme.colors.skyBottom, (t - 0.5) * 2);
}

function Sky({theme, height}: {theme: Theme; height: number}) {
  const bands = useMemo(
    () =>
      Array.from({length: BAND_COUNT}, (_, index) => ({
        key: index,
        color: skyColor(theme, index / (BAND_COUNT - 1)),
      })),
    [theme],
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      {bands.map((band, index) => (
        <View
          key={band.key}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: (index / BAND_COUNT) * height,
            height: height / BAND_COUNT + 1,
            backgroundColor: band.color,
          }}
        />
      ))}
    </View>
  );
}

function Celestial({theme}: {theme: Theme}) {
  const size = 150;

  if (theme.mode === 'dark') {
    return (
      <View
        style={{
          position: 'absolute',
          top: 54,
          right: '18%',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.moon,
          shadowColor: '#96beff',
          shadowOpacity: 0.22,
          shadowRadius: 45,
          shadowOffset: {width: 0, height: 0},
        }}>
        <View
          style={{
            position: 'absolute',
            top: -12,
            left: 24,
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: (size * 0.9) / 2,
            backgroundColor: theme.colors.skyMid,
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 58,
        right: '18%',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.sun,
        opacity: 0.9,
        shadowColor: theme.colors.sun,
        shadowOpacity: 0.8,
        shadowRadius: 40,
        shadowOffset: {width: 0, height: 0},
      }}
    />
  );
}

/** Static stars for the dark home: same idea as the mockup's night sky. */
function StaticStars({
  width,
  height,
  color,
}: {
  width: number;
  height: number;
  color: string;
}) {
  const stars = useMemo(
    () =>
      Array.from({length: 80}, () => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.85,
        size: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.6,
      })),
    [width, height],
  );

  return (
    <>
      {stars.map((star, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: color,
            opacity: star.opacity,
          }}
        />
      ))}
    </>
  );
}

interface CloudParticle {
  x: number;
  y: number;
  size: number;
  cloudHeight: number;
  speed: number;
  bob: number;
  bobSpeed: number;
  bobAmount: number;
  opacity: number;
}

function createClouds(
  width: number,
  height: number,
  variant: 'login' | 'home',
): CloudParticle[] {
  const mobile = width < 640;
  const login = variant === 'login';
  const count = mobile ? (login ? 7 : 8) : 12;
  const yMax = login ? 0.5 : 0.3;
  const opacityMin = login ? 0.6 : 0.55;
  const opacityMax = login ? 1 : 0.95;
  const sizeMin = login ? 140 : 120;
  const sizeMax = login ? 340 : 330;

  return Array.from({length: count}, () => {
    const size = sizeMin + Math.random() * (sizeMax - sizeMin);

    return {
      x: Math.random() * width,
      y: height * (0.03 + Math.random() * (yMax - 0.03)),
      size,
      cloudHeight: size * (0.26 + Math.random() * 0.1),
      speed: 6 + Math.random() * 14,
      bob: Math.random() * Math.PI * 2,
      bobSpeed: 0.15 + Math.random() * 0.3,
      bobAmount: 4 + Math.random() * 7,
      opacity: opacityMin + Math.random() * (opacityMax - opacityMin),
    };
  });
}

function Clouds({
  width,
  height,
  color,
  variant,
}: {
  width: number;
  height: number;
  color: string;
  variant: 'login' | 'home';
}) {
  const [particles, setParticles] = useState<CloudParticle[]>(() =>
    createClouds(width, height, variant),
  );

  useEffect(() => {
    if (!ANIMATIONS_ENABLED) {
      return;
    }

    const login = variant === 'login';
    const yMax = login ? 0.5 : 0.3;
    const opacityMin = login ? 0.6 : 0.55;
    const opacityMax = login ? 1 : 0.95;

    let raf = 0;
    let last = Date.now();

    const step = () => {
      const now = Date.now();
      const elapsed = now - last;

      if (elapsed >= CLOUD_FRAME_MS) {
        const dt = Math.min(0.05, elapsed / 1000);
        last = now;

        setParticles(current =>
          current.map(particle => {
            let {x, y, speed, bob, opacity} = particle;
            x += speed * dt;
            bob += particle.bobSpeed * dt;

            // Respawn completely outside the left edge: no visible teleport.
            if (x > width + particle.size) {
              x = -particle.size - Math.random() * 120;
              y = height * (0.03 + Math.random() * (yMax - 0.03));
              speed = 6 + Math.random() * 14;
              opacity = opacityMin + Math.random() * (opacityMax - opacityMin);
            }

            return {...particle, x, y, speed, bob, opacity};
          }),
        );
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => cancelAnimationFrame(raf);
  }, [width, height, variant]);

  return (
    <>
      {particles.map((particle, index) => {
        const bobY = Math.sin(particle.bob) * particle.bobAmount;

        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: particle.opacity,
              transform: [
                {translateX: particle.x},
                {translateY: particle.y + bobY},
              ],
            }}>
            <View
              style={{
                width: particle.size,
                height: particle.cloudHeight,
                borderRadius: particle.cloudHeight / 2,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: -particle.cloudHeight * 0.55,
                left: particle.size * 0.16,
                width: particle.cloudHeight * 1.25,
                height: particle.cloudHeight * 1.25,
                borderRadius: particle.cloudHeight * 0.625,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: -particle.cloudHeight * 0.3,
                left: particle.size * 0.5,
                width: particle.cloudHeight,
                height: particle.cloudHeight,
                borderRadius: particle.cloudHeight / 2,
                backgroundColor: color,
              }}
            />
          </View>
        );
      })}
    </>
  );
}

export function Background({variant}: {variant: 'login' | 'home'}) {
  const theme = useTheme();
  const {width, height} = useWindowDimensions();

  // In the dark theme the persistent VantaLayer in RootShell owns the night
  // background; in light it is the day sky below.
  if (variant === 'login' && theme.mode === 'dark') {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Sky theme={theme} height={height} />
      {theme.mode === 'dark' ? (
        <>
          <StaticStars width={width} height={height} color={theme.colors.star} />
          <Celestial theme={theme} />
        </>
      ) : (
        <>
          <Celestial theme={theme} />
          <Clouds
            width={width}
            height={height}
            color={theme.colors.cloud}
            variant={variant}
          />
        </>
      )}
    </View>
  );
}
