import { CheckIcon } from '@heroicons/react/24/outline';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { Heading, Text } from '@astryxdesign/core/Text';
import { SiteChrome } from '../components/SiteChrome';
import { APP_NAME, FREE_LIMITS, PAID_PLANS, PRO_LIMITS, type PaidPlan } from '../config/plans';
import { formatTime } from '../lib/format';
import { usePageMeta } from '../router';

const FREE_FEATURES = [
  `Up to ${FREE_LIMITS.maxSegments} segments per export`,
  `Up to ${FREE_LIMITS.maxOutputSeconds} seconds per export`,
  `${FREE_LIMITS.maxShortSide}p output`,
  'Small watermark',
];

const PRO_FEATURES = [
  'Unlimited segments',
  `Up to ${formatTime(PRO_LIMITS.maxOutputSeconds).split('.')[0]} per export`,
  `Up to ${PRO_LIMITS.maxShortSide}p output`,
  'No watermark',
];

function Features({ items }: { items: string[] }) {
  return (
    <VStack gap={2}>
      {items.map((f) => (
        <HStack key={f} gap={2} vAlign="center">
          <Icon icon={CheckIcon} size="sm" color="accent" />
          <Text>{f}</Text>
        </HStack>
      ))}
    </VStack>
  );
}

function PlanCard({ plan }: { plan: PaidPlan }) {
  const ready = plan.checkoutUrl !== '' && plan.price !== '';
  return (
    <Card>
      <VStack gap={4}>
        <HStack gap={2} vAlign="center" hAlign="between">
          <Heading level={3}>{plan.name}</Heading>
          {plan.id === 'yearly' && <Badge variant="info" label="Best value" />}
        </HStack>
        <VStack gap={0}>
          <Text type="display-3">{plan.price || '—'}</Text>
          <Text type="supporting">{plan.cadence}</Text>
        </VStack>
        <Features items={PRO_FEATURES} />
        <Button
          label={ready ? `Buy ${plan.name}` : 'Coming soon'}
          variant={plan.id === 'yearly' ? 'primary' : 'secondary'}
          href={ready ? plan.checkoutUrl : undefined}
          isDisabled={!ready}
          width="100%"
        />
      </VStack>
    </Card>
  );
}

export function PricingPage() {
  usePageMeta(`Pricing · ${APP_NAME}`, `Free to try. Upgrade to ${APP_NAME} Pro for longer, watermark-free exports.`);

  return (
    <SiteChrome>
      <VStack gap={8} paddingBlock={10} paddingInline={4} align="center">
        <VStack gap={3} hAlign="center" maxWidth={640}>
          <Heading level={1} type="display-3" justify="center">Simple pricing</Heading>
          <Text color="secondary" justify="center" textWrap="balance">
            Start free with no account. Pay once or subscribe when you need longer, watermark-free exports.
            Checkout is handled by Lemon Squeezy, our merchant of record, which calculates any sales tax.
          </Text>
        </VStack>

        <Grid columns={{ minWidth: 260, max: 4 }} gap={4} maxWidth={1200} width="100%">
          <Card variant="muted">
            <VStack gap={4}>
              <Heading level={3}>Free</Heading>
              <VStack gap={0}>
                <Text type="display-3">$0</Text>
                <Text type="supporting">no account needed</Text>
              </VStack>
              <Features items={FREE_FEATURES} />
              <Button label="Open the editor" href="/app" width="100%" />
            </VStack>
          </Card>
          {PAID_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </Grid>

        <Text type="supporting" justify="center">
          After checkout you get a licence key by email; paste it into the editor to unlock Pro. See the{' '}
          <Link href="/refunds">refund policy</Link> and <Link href="/terms">terms</Link>.
        </Text>
      </VStack>
    </SiteChrome>
  );
}
