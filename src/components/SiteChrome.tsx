import type { ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, Layout, LayoutContent, LayoutFooter, LayoutHeader, VStack } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav';
import { APP_NAME } from '../config/plans';
import { usePath } from '../router';

const FOOTER_LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refunds', label: 'Refunds' },
  { href: '/licenses', label: 'Open-source licences' },
];

/** Header and footer for the marketing and legal pages. */
export function SiteChrome({ children }: { children: ReactNode }) {
  const path = usePath();
  return (
    <Layout
      height="auto"
      header={
        <LayoutHeader hasDivider>
          <TopNav
            heading={<TopNavHeading heading={APP_NAME} headingHref="/" />}
            startContent={<TopNavItem label="Pricing" href="/pricing" isSelected={path === '/pricing'} />}
            endContent={<Button label="Open the editor" variant="primary" size="sm" href="/app" />}
          />
        </LayoutHeader>
      }
      content={<LayoutContent padding={0}>{children}</LayoutContent>}
      footer={
        <LayoutFooter>
          <VStack gap={4} paddingBlock={6}>
            <Divider />
            <HStack gap={4} wrap="wrap" hAlign="between" vAlign="center">
              <Text type="supporting">© {new Date().getFullYear()} {APP_NAME}. Videos are processed on your device.</Text>
              <HStack gap={4} wrap="wrap">
                {FOOTER_LINKS.map((l) => (
                  <Link key={l.href} href={l.href}>
                    {l.label}
                  </Link>
                ))}
              </HStack>
            </HStack>
          </VStack>
        </LayoutFooter>
      }
    />
  );
}
