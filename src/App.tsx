import { LinkProvider } from '@astryxdesign/core/Link';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { SiteChrome } from './components/SiteChrome';
import { LandingPage } from './pages/LandingPage';
import { LegalPage, LicensesPage } from './pages/LegalPage';
import { isLegalSlug } from './pages/legalSlugs';
import { PricingPage } from './pages/PricingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { usePageMeta, usePath } from './router';
import { RouterLink } from './RouterLink';

function NotFound() {
  usePageMeta('Page not found', 'This page does not exist.');
  return (
    <SiteChrome>
      <EmptyState
        title="Page not found"
        description="The link may be old or mistyped."
        actions={<Button label="Go to the home page" href="/" variant="primary" />}
      />
    </SiteChrome>
  );
}

function Route({ path }: { path: string }) {
  const slug = path.replace(/^\/+|\/+$/g, '');
  if (slug === '') return <LandingPage />;
  if (slug === 'app') return <WorkspacePage />;
  if (slug === 'pricing') return <PricingPage />;
  if (slug === 'licenses') return <LicensesPage />;
  if (isLegalSlug(slug)) return <LegalPage slug={slug} />;
  return <NotFound />;
}

export default function App() {
  const path = usePath();
  return (
    <LinkProvider component={RouterLink}>
      <Route path={path} />
    </LinkProvider>
  );
}
