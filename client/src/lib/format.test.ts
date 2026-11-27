import {formatPercent, formatTemperature} from './format';

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
