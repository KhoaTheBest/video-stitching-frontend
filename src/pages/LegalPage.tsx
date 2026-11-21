import type { ReactNode } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { VStack } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Heading, Text } from '@astryxdesign/core/Text';
import { SiteChrome } from '../components/SiteChrome';
import { APP_NAME, SUPPORT_EMAIL } from '../config/plans';
import { analyticsEnabled } from '../lib/analytics';
import { usePageMeta } from '../router';
import type { LegalSlug } from './legalSlugs';

/*
 * DRAFTS. These texts are a starting point, not legal advice. Fill in the
 * [BRACKETED] placeholders and have them reviewed before charging money.
 */

const OPERATOR = '[OPERATOR NAME AND ADDRESS]';
const CONTACT = SUPPORT_EMAIL || '[SUPPORT EMAIL]';
const UPDATED = '[DATE]';

function H({ children }: { children: ReactNode }) {
  return <Heading level={2}>{children}</Heading>;
}

function P({ children }: { children: ReactNode }) {
  return (
    <Text as="p" display="block" color="secondary">
      {children}
    </Text>
  );
}

const PAGES = {
  terms: {
    title: 'Terms of Service',
    body: (
      <>
        <P>
          These terms govern your use of {APP_NAME} (the "Service"), operated by {OPERATOR}. By using the Service you
          agree to them.
        </P>
        <H>The Service</H>
        <P>
          {APP_NAME} is a browser-based tool that trims and joins video files. Processing happens on your device. You
          are responsible for having the rights to the videos you process and for keeping copies of your originals.
        </P>
        <H>Plans and licences</H>
        <P>
          The free plan is limited as described on the pricing page. Paid plans are sold by our reseller and merchant
          of record, Lemon Squeezy, under its own buyer terms. A licence key is for your personal or business use and
          may be activated in a limited number of browsers. You may not share, resell or publish licence keys.
        </P>
        <H>Subscriptions</H>
        <P>
          Monthly and yearly plans renew automatically until cancelled. You can cancel any time from the link in your
          receipt email; Pro stays active until the end of the paid period.
        </P>
        <H>Acceptable use</H>
        <P>
          Do not use the Service to process content you have no right to use, or try to bypass licence checks.
        </P>
        <H>Disclaimer and liability</H>
        <P>
          The Service is provided "as is". To the extent the law allows, we are not liable for indirect or
          consequential losses, or for loss of data. Nothing in these terms limits rights you have as a consumer
          under the law of your country.
        </P>
        <H>Changes and contact</H>
        <P>
          We may update these terms and will post the new version here. Governing law: [JURISDICTION]. Questions:{' '}
          {CONTACT}.
        </P>
      </>
    ),
  },
  privacy: {
    title: 'Privacy Policy',
    body: (
      <>
        <P>This policy explains what {OPERATOR} ("we") collects when you use {APP_NAME}.</P>
        <H>Your videos</H>
        <P>
          Videos are decoded and encoded in your browser. We never receive your video files. When a project points to
          a video URL, your browser downloads it directly from that server.
        </P>
        <H>Licence keys</H>
        <P>
          When you activate Pro, your licence key is sent to our server, which checks it with Lemon Squeezy and
          stores nothing. Your browser keeps the key in local storage to remember your plan. Purchases are processed
          by Lemon Squeezy as merchant of record; see its privacy policy for the data it handles.
        </P>
        <H>Local storage and cookies</H>
        <P>
          We use your browser's local storage for your licence and the last opened sample project. We set no
          tracking or advertising cookies, so no cookie banner is needed.
        </P>
        <H>Analytics</H>
        <P>
          {analyticsEnabled
            ? 'We use Cloudflare Web Analytics to count page views. It sets no cookies, does not use local storage, and does not build profiles of visitors. It records the page, referrer, browser and country, and Cloudflare receives your IP address to do this.'
            : 'We do not use analytics.'}
        </P>
        <H>Third-party requests</H>
        <P>
          Pages load the Figtree font from Google Fonts, and the JSON editor loads Monaco from the jsDelivr CDN. Both
          providers receive your IP address when they serve these files. Our hosting provider, Cloudflare, processes
          request logs to deliver and protect the site.
        </P>
        <H>Your rights</H>
        <P>
          Depending on where you live you can ask for access to, correction of or deletion of personal data we hold.
          Contact {CONTACT}. Last updated {UPDATED}.
        </P>
      </>
    ),
  },
  refunds: {
    title: 'Refund Policy',
    body: (
      <>
        <P>
          Try the free plan before buying: it runs the same engine. If Pro doesn't work for you, email {CONTACT} within
          [14] days of purchase with your order number and we'll refund you in full through Lemon Squeezy.
        </P>
        <P>
          Cancelling a subscription stops future renewals; the current period is not refunded unless required by law.
          A refund deactivates the licence key. Your statutory rights as a consumer are not affected.
        </P>
      </>
    ),
  },
} satisfies Record<LegalSlug, { title: string; body: ReactNode }>;


export function LegalPage({ slug }: { slug: LegalSlug }) {
  const page = PAGES[slug];
  usePageMeta(`${page.title} · ${APP_NAME}`, `${page.title} for ${APP_NAME}.`);
  return (
    <SiteChrome>
      <VStack gap={4} paddingBlock={10} paddingInline={4} maxWidth={760} align="stretch">
        <Heading level={1}>{page.title}</Heading>
        <Banner
          status="warning"
          title="Draft"
          description="This text is a template and has not been reviewed by a lawyer. Placeholders in brackets still need real values."
        />
        {page.body}
      </VStack>
    </SiteChrome>
  );
}

/** Notices required by the open-source licences of what we ship to the browser. */
const NOTICES = [
  { name: 'Mediabunny', licence: 'MPL-2.0', href: 'https://github.com/Vanilagy/mediabunny', note: 'Unmodified. Source code is available at the link.' },
  { name: 'Astryx (@astryxdesign/core, theme-neutral)', licence: 'MIT', href: 'https://github.com/meta/astryx' },
  { name: 'React and React DOM', licence: 'MIT', href: 'https://github.com/facebook/react' },
  { name: 'Monaco Editor and @monaco-editor/react', licence: 'MIT', href: 'https://github.com/microsoft/monaco-editor' },
  { name: 'DOMPurify', licence: 'Apache-2.0 (dual MPL-2.0)', href: 'https://github.com/cure53/DOMPurify' },
  { name: 'StyleX', licence: 'MIT', href: 'https://github.com/facebook/stylex' },
  { name: 'Heroicons', licence: 'MIT', href: 'https://github.com/tailwindlabs/heroicons' },
  { name: 'Lucide', licence: 'ISC', href: 'https://github.com/lucide-icons/lucide' },
  { name: 'FormatJS (intl-messageformat)', licence: 'BSD-3-Clause', href: 'https://github.com/formatjs/formatjs' },
  { name: 'Figtree font', licence: 'SIL Open Font License 1.1', href: 'https://github.com/erikdkennedy/figtree' },
];

export function LicensesPage() {
  usePageMeta(`Open-source licences · ${APP_NAME}`, `Open-source software used by ${APP_NAME}.`);
  return (
    <SiteChrome>
      <VStack gap={4} paddingBlock={10} paddingInline={4} maxWidth={760} align="stretch">
        <Heading level={1}>Open-source licences</Heading>
        <P>
          {APP_NAME} is built on open-source software. Video is encoded by your browser's own WebCodecs encoders; no
          GPL-licensed code is included. The main components and their licences are listed below, with links to their
          source code and full licence texts. Smaller transitive dependencies (MIT, ISC or BSD) are listed in the
          project's package-lock.json.
        </P>
        <List hasDividers>
          {NOTICES.map((n) => (
            <ListItem
              key={n.name}
              label={n.name}
              description={n.note ? `${n.licence}. ${n.note}` : n.licence}
              endContent={<Link href={n.href} isExternalLink>Source</Link>}
            />
          ))}
        </List>
      </VStack>
    </SiteChrome>
  );
}
