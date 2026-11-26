import { describe, expect, it, vi } from 'vitest';
import { handleLicenseRequest, type Env, type LicenseResponse } from './license';

const env: Env = { LEMONSQUEEZY_STORE_ID: '10', LEMONSQUEEZY_PRODUCT_IDS: '20, 21' };
const meta = { store_id: 10, product_id: 20, product_name: 'Stitcher Pro', customer_email: 'buyer@example.com' };

const request = (body: unknown) =>
  new Request('https://site/api/license', { method: 'POST', body: JSON.stringify(body) });

const lemon = (payload: unknown) => vi.fn(async () => new Response(JSON.stringify(payload))) as unknown as typeof fetch;

async function call(body: unknown, upstream: unknown, e: Env = env) {
  const fetchImpl = lemon(upstream);
  const res = await handleLicenseRequest(request(body), e, fetchImpl);
  return { status: res.status, body: (await res.json()) as LicenseResponse, fetchImpl };
}

describe('POST /api/license', () => {
  it('activates a key for this product and hides customer data', async () => {
    const { body, fetchImpl } = await call(
      { action: 'activate', key: 'abc' },
      { activated: true, license_key: { status: 'active' }, instance: { id: 'inst-1' }, meta },
    );
    expect(body).toEqual({ ok: true, instanceId: 'inst-1', productName: 'Stitcher Pro' });
    expect(JSON.stringify(body)).not.toContain('buyer@example.com');
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.lemonsqueezy.com/v1/licenses/activate');
    expect(String(init.body)).toBe('license_key=abc&instance_name=Browser');
  });

  it('rejects valid keys from another store or product', async () => {
    const other = await call(
      { action: 'validate', key: 'abc', instanceId: 'i' },
      { valid: true, license_key: { status: 'active' }, meta: { ...meta, store_id: 99 } },
    );
    expect(other.body).toMatchObject({ ok: false, error: 'This key is not for this product.' });
    const otherProduct = await call(
      { action: 'validate', key: 'abc', instanceId: 'i' },
      { valid: true, license_key: { status: 'active' }, meta: { ...meta, product_id: 99 } },
    );
    expect(otherProduct.body.ok).toBe(false);
  });

  it('passes on Lemon Squeezy errors and rejects expired keys', async () => {
    const limit = await call({ action: 'activate', key: 'abc' }, { activated: false, error: 'Activation limit reached.', meta });
    expect(limit.body).toEqual({ ok: false, error: 'Activation limit reached.' });
    const expired = await call(
      { action: 'validate', key: 'abc', instanceId: 'i' },
      { valid: true, license_key: { status: 'expired' }, meta },
    );
    expect(expired.body).toEqual({ ok: false, error: 'This licence key is expired.' });
  });

  it('validates input and configuration', async () => {
    expect((await call({ action: 'delete', key: 'abc' }, {})).status).toBe(400);
    expect((await call({ action: 'validate', key: 'abc' }, {})).status).toBe(400);
    expect((await call({ action: 'activate', key: 'abc' }, {}, {})).status).toBe(503);
  });
});
