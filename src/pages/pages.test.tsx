import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from '../astryx-themes';
import { WorkspacePage } from './WorkspacePage';

const render = (node: React.ReactNode) => renderToString(<Theme theme={themes[defaultThemeSlug]}>{node}</Theme>);

it('renders the workspace with the first sample project', () => {
  const html = render(<WorkspacePage />);
  expect(html).toContain('iPhone 15 Portrait Mode Ad Cutdown');
  expect(html).toContain('Export video');
});

it('shows the free plan limits when no licence is active', () => {
  expect(render(<WorkspacePage />)).toContain('Free plan: up to 5 segments');
});

it('renders the marketing, pricing and legal pages', async () => {
  const { LandingPage } = await import('./LandingPage');
  const { PricingPage } = await import('./PricingPage');
  const { LegalPage, LicensesPage } = await import('./LegalPage');
  expect(render(<LandingPage />)).toContain('Cut and stitch videos in your browser');
  // No checkout links are configured in tests, so paid plans must not be buyable.
  const pricing = render(<PricingPage />);
  expect(pricing).toContain('Coming soon');
  expect(pricing).not.toContain('lemonsqueezy.com/checkout');
  for (const slug of ['terms', 'privacy', 'refunds'] as const) expect(render(<LegalPage slug={slug} />)).toContain('Draft');
  expect(render(<LicensesPage />)).toContain('MPL-2.0');
});
