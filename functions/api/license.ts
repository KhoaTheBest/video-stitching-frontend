/**
 * Cloudflare Pages Function: POST /api/license
 *
 * Proxies Lemon Squeezy's public License API and only accepts keys sold by
 * this store and product, so a key bought for another product can't unlock Pro.
 * It returns no customer details to the browser.
 *
 * Env (Pages project settings, not committed):
 *   LEMONSQUEEZY_STORE_ID     numeric store id
 *   LEMONSQUEEZY_PRODUCT_IDS  comma-separated product ids that grant Pro
 */

export interface Env {
  LEMONSQUEEZY_STORE_ID?: string;
  LEMONSQUEEZY_PRODUCT_IDS?: string;
}

type Action = 'activate' | 'validate' | 'deactivate';

export interface LicenseResponse {
  ok: boolean;
  instanceId?: string;
  productName?: string;
  error?: string;
}

interface LemonSqueezyResponse {
  activated?: boolean;
  valid?: boolean;
  deactivated?: boolean;
  error?: string | null;
  license_key?: { status?: string };
  instance?: { id?: string } | null;
  meta?: { store_id?: number; product_id?: number; product_name?: string };
}

const LS_API = 'https://api.lemonsqueezy.com/v1/licenses';
const ACTIONS: readonly Action[] = ['activate', 'validate', 'deactivate'];

const json = (body: LicenseResponse, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const isShortString = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;

export async function handleLicenseRequest(request: Request, env: Env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const storeId = Number(env.LEMONSQUEEZY_STORE_ID);
  const productIds = (env.LEMONSQUEEZY_PRODUCT_IDS ?? '').split(',').map((s) => Number(s.trim())).filter(Boolean);
  if (!storeId || productIds.length === 0) {
    return json({ ok: false, error: 'Licensing is not configured on this site yet.' }, 503);
  }

  let body: { action?: unknown; key?: unknown; instanceId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }
  const { action, key, instanceId } = body;
  if (!ACTIONS.includes(action as Action) || !isShortString(key)) {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }
  if (action !== 'activate' && !isShortString(instanceId)) {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  const form = new URLSearchParams({ license_key: key.trim() });
  if (action === 'activate') form.set('instance_name', 'Browser');
  else form.set('instance_id', instanceId as string);

  let ls: LemonSqueezyResponse;
  try {
    const res = await fetchImpl(`${LS_API}/${action}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    ls = await res.json();
  } catch {
    return json({ ok: false, error: 'The licence server could not be reached. Try again shortly.' }, 502);
  }

  // Never trust a key from another store or product, even if Lemon Squeezy says it is valid.
  if (ls.meta && (ls.meta.store_id !== storeId || !productIds.includes(Number(ls.meta.product_id)))) {
    return json({ ok: false, error: 'This key is not for this product.' });
  }

  const succeeded = action === 'activate' ? ls.activated : action === 'validate' ? ls.valid : ls.deactivated;
  if (!succeeded || !ls.meta) {
    return json({ ok: false, error: ls.error ?? 'This licence key is not valid.' });
  }
  if (action !== 'deactivate' && ls.license_key?.status !== 'active') {
    return json({ ok: false, error: `This licence key is ${ls.license_key?.status ?? 'inactive'}.` });
  }

  return json({ ok: true, instanceId: ls.instance?.id ?? (instanceId as string | undefined), productName: ls.meta.product_name });
}

export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleLicenseRequest(request, env);
