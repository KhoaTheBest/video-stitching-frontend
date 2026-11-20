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
