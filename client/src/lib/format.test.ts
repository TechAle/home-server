import {formatAgo, formatPercent, formatTemperature} from './format';

test('formatPercent keeps one decimal only when needed', () => {
  expect(formatPercent(0)).toBe('0%');
  expect(formatPercent(0.4)).toBe('0.4%');
  expect(formatPercent(2.63)).toBe('2.6%');
  expect(formatPercent(11.44)).toBe('11.4%');
  expect(formatPercent(12)).toBe('12%');
  expect(formatPercent(100)).toBe('100%');
});

test('formatPercent hides unavailable sentinels', () => {
  expect(formatPercent(-591)).toBe('—');
  expect(formatPercent(-590)).toBe('—');
  expect(formatPercent(undefined)).toBe('—');
});

test('formatTemperature shows one decimal', () => {
  expect(formatTemperature(49.5)).toBe('49.5°C');
});

test('formatAgo keeps relative labels fresh against a supplied clock', () => {
  const now = 1_700_000_000_000;

  expect(formatAgo(now - 5_000, now)).toBe('adesso');
  expect(formatAgo(now - 30_000, now)).toBe('30s fa');
  expect(formatAgo(now - 5 * 60_000, now)).toBe('5 min fa');
  expect(formatAgo(now - 2 * 3_600_000, now)).toBe('2 h fa');
  expect(formatAgo(now + 10_000, now)).toBe('adesso');
  expect(formatAgo(0, now)).toBe('—');
});
