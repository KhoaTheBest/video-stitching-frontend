import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { readStored, writeStored } from '../lib/storage';
import { entitlementsFor, needsRevalidation, parseStoredLicense, type Entitlements, type StoredLicense } from './entitlements';

const STORAGE_KEY = 'license';
const listeners = new Set<() => void>();
let cached: { raw: string | null; license: StoredLicense | null } = { raw: null, license: null };

function getLicense(): StoredLicense | null {
  const raw = readStored(STORAGE_KEY);
  if (raw !== cached.raw) cached = { raw, license: parseStoredLicense(raw) };
  return cached.license;
}

function setLicense(license: StoredLicense | null) {
  writeStored(STORAGE_KEY, license ? JSON.stringify(license) : null);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep tabs in sync.
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

interface ApiResult {
  ok: boolean;
  instanceId?: string;
  productName?: string;
  error?: string;
  /** Server or network trouble: says nothing about whether the key is valid. */
  transient?: boolean;
}

async function callLicenseApi(body: Record<string, string>): Promise<ApiResult> {
  try {
    const res = await fetch('/api/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as ApiResult;
    return res.status >= 500 ? { ok: false, error: data.error, transient: true } : data;
  } catch {
    return { ok: false, error: 'Could not reach the licence server. Check your connection.', transient: true };
  }
}

let revalidating = false;

export interface UseEntitlements extends Entitlements {
  license: StoredLicense | null;
  /** Activates a key in this browser. Resolves to an error message, or null on success. */
  activate: (key: string) => Promise<string | null>;
  deactivate: () => Promise<void>;
}

export function useEntitlements(): UseEntitlements {
  const license = useSyncExternalStore(subscribe, getLicense, () => null);
  // Read the clock once per mount; the offline grace period is measured in weeks.
  const [now] = useState(Date.now);
  const entitlements = entitlementsFor(license, now);

  // Re-check an activated key about once a week. Network failures keep the
  // current state; only an explicit "not valid" answer removes the licence.
  useEffect(() => {
    if (!license || revalidating || !needsRevalidation(license, Date.now())) return;
    revalidating = true;
    callLicenseApi({ action: 'validate', key: license.key, instanceId: license.instanceId })
      .then((r) => {
        if (r.ok) setLicense({ ...license, validatedAt: Date.now() });
        else if (!r.transient) setLicense(null);
      })
      .finally(() => {
        revalidating = false;
      });
  }, [license]);

  const activate = useCallback(async (key: string) => {
    const r = await callLicenseApi({ action: 'activate', key: key.trim() });
    if (!r.ok || !r.instanceId) {
      return r.error ?? 'Activation failed.';
    }
    setLicense({ key: key.trim(), instanceId: r.instanceId, productName: r.productName ?? 'Pro', validatedAt: Date.now() });
    return null;
  }, []);

  const deactivate = useCallback(async () => {
    const current = getLicense();
    if (current) await callLicenseApi({ action: 'deactivate', key: current.key, instanceId: current.instanceId });
    setLicense(null);
  }, []);

  return { ...entitlements, license, activate, deactivate };
}
