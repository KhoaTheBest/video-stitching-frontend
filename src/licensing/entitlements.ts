import { FREE_LIMITS, FREE_WATERMARK, PRO_LIMITS } from '../config/plans';
import type { ExportLimits } from '../engine/plan';

/** What the browser remembers about an activated licence key. */
export interface StoredLicense {
  key: string;
  instanceId: string;
  productName: string;
  /** Last successful server validation, epoch ms. */
  validatedAt: number;
}

export interface Entitlements {
  plan: 'free' | 'pro';
  limits: ExportLimits;
  watermark: string | undefined;
}

const DAY = 24 * 60 * 60 * 1000;
/** Re-check the key with the server after this long. */
export const REVALIDATE_AFTER = 7 * DAY;
/** Keep Pro working offline this long after the last good check. */
export const OFFLINE_GRACE = 30 * DAY;

export const FREE: Entitlements = { plan: 'free', limits: FREE_LIMITS, watermark: FREE_WATERMARK };
export const PRO: Entitlements = { plan: 'pro', limits: PRO_LIMITS, watermark: undefined };

export function entitlementsFor(license: StoredLicense | null, now: number): Entitlements {
  if (!license) return FREE;
  return now - license.validatedAt <= OFFLINE_GRACE ? PRO : FREE;
}

export function needsRevalidation(license: StoredLicense | null, now: number): boolean {
  return license !== null && now - license.validatedAt > REVALIDATE_AFTER;
}

export function parseStoredLicense(raw: string | null): StoredLicense | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<StoredLicense>;
    if (typeof v.key === 'string' && typeof v.instanceId === 'string' && typeof v.validatedAt === 'number') {
      return { key: v.key, instanceId: v.instanceId, productName: v.productName ?? 'Pro', validatedAt: v.validatedAt };
    }
  } catch {
    // fall through
  }
  return null;
}
