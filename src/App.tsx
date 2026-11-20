import { lazy, Suspense } from 'react';
import { LinkProvider } from '@astryxdesign/core/Link';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Spinner } from '@astryxdesign/core/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SiteChrome } from './components/SiteChrome';
import { LandingPage } from './pages/LandingPage';
import { isLegalSlug } from './pages/legalSlugs';
import { usePageMeta, usePath } from './router';
import { RouterLink } from './RouterLink';

// The editor and the less-visited pages load on demand, so the landing page stays light.
const WorkspacePage = lazy(() => import('./pages/WorkspacePage').then((m) => ({ default: m.WorkspacePage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then((m) => ({ default: m.PricingPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const LicensesPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LicensesPage })));

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
      <ErrorBoundary>
        <Suspense
          fallback={
            <Center height="100vh">
              <Spinner label="Loading" />
            </Center>
          }
        >
          <Route path={path} />
        </Suspense>
      </ErrorBoundary>
    </LinkProvider>
  );
}
