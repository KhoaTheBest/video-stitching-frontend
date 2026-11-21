import { describe, expect, it } from 'vitest';
import { analyticsToken, initAnalytics, CF_BEACON_SRC } from './analytics';

function fakeDoc() {
  const head: { children: Record<string, unknown>[]; appendChild(el: Record<string, unknown>): void } = {
    children: [],
    appendChild(el) {
      this.children.push(el);
    },
  };
  return {
    head,
    createElement: () => {
      const attrs: Record<string, string> = {};
      return { setAttribute: (k: string, v: string) => (attrs[k] = v), attrs } as Record<string, unknown>;
    },
    querySelector: () => (head.children.length ? head.children[0] : null),
  } as unknown as Document & { head: typeof head };
}

describe('analytics', () => {
  it('is off without a token', () => {
    expect(analyticsToken({})).toBeNull();
    expect(analyticsToken({ VITE_CF_ANALYTICS_TOKEN: '  ' })).toBeNull();
    const doc = fakeDoc();
    expect(initAnalytics(null, doc)).toBe(false);
    expect((doc.head as unknown as { children: unknown[] }).children).toHaveLength(0);
  });

  it('adds the beacon once with the token', () => {
    expect(analyticsToken({ VITE_CF_ANALYTICS_TOKEN: ' abc ' })).toBe('abc');
    const doc = fakeDoc();
    expect(initAnalytics('abc', doc)).toBe(true);
    expect(initAnalytics('abc', doc)).toBe(true);
    const children = (doc.head as unknown as { children: Record<string, unknown>[] }).children;
    expect(children).toHaveLength(1);
    expect(children[0].src).toBe(CF_BEACON_SRC);
    expect(children[0].defer).toBe(true);
    expect((children[0].attrs as Record<string, string>)['data-cf-beacon']).toBe('{"token":"abc"}');
  });
});
