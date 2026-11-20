import { describe, expect, it } from 'vitest';
import { entitlementsFor, FREE, needsRevalidation, OFFLINE_GRACE, parseStoredLicense, PRO, REVALIDATE_AFTER } from './entitlements';

const license = { key: 'k', instanceId: 'i', productName: 'Pro', validatedAt: 1_000 };

describe('entitlementsFor', () => {
  it('is free without a licence', () => {
    expect(entitlementsFor(null, 0)).toBe(FREE);
    expect(FREE.watermark).toBeTruthy();
  });
  it('is pro while the last validation is within the offline grace period', () => {
    expect(entitlementsFor(license, 1_000 + OFFLINE_GRACE)).toBe(PRO);
    expect(PRO.watermark).toBeUndefined();
  });
  it('falls back to free once the grace period has passed', () => {
    expect(entitlementsFor(license, 1_001 + OFFLINE_GRACE)).toBe(FREE);
  });
});

it('asks for revalidation after a week', () => {
  expect(needsRevalidation(license, 1_000 + REVALIDATE_AFTER)).toBe(false);
  expect(needsRevalidation(license, 1_001 + REVALIDATE_AFTER)).toBe(true);
  expect(needsRevalidation(null, Infinity)).toBe(false);
});

it('ignores corrupt stored data', () => {
  expect(parseStoredLicense(null)).toBeNull();
  expect(parseStoredLicense('{')).toBeNull();
  expect(parseStoredLicense('{"key":"k"}')).toBeNull();
  expect(parseStoredLicense(JSON.stringify(license))).toEqual(license);
});
