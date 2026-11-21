import { expect, it } from 'vitest';
import { formatTime } from './format';

it('formats seconds as m:ss.s', () => {
  expect(formatTime(2.5)).toBe('0:02.5');
  expect(formatTime(75)).toBe('1:15.0');
  expect(formatTime(-1)).toBe('0:00.0');
});
