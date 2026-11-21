import { ArrowRightIcon, CpuChipIcon, FilmIcon, LockClosedIcon, ScissorsIcon } from '@heroicons/react/24/outline';
import { Button } from '@astryxdesign/core/Button';
import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Section } from '@astryxdesign/core/Section';
import { Heading, Text } from '@astryxdesign/core/Text';
import { SiteChrome } from '../components/SiteChrome';
import { APP_NAME, FREE_LIMITS } from '../config/plans';
import { usePageMeta } from '../router';

const STEPS = [
  { icon: FilmIcon, title: 'Add your clips', body: 'Drop in videos from your computer, or start from a sample project.' },
  { icon: ScissorsIcon, title: 'Pick the moments', body: 'Set in and out points, mute a clip, and preview each segment instantly.' },
  { icon: CpuChipIcon, title: 'Export one MP4', body: 'Segments are scaled, cropped and joined into a single file on your device.' },
];

const FAQ = [
  {
    q: 'Are my videos uploaded anywhere?',
    a: `No. ${APP_NAME} decodes and encodes video inside your browser with WebCodecs. Your files never leave your device.`,
  },
  {
    q: 'Which browsers work?',
    a: 'Current desktop versions of Chrome and Edge. Export needs WebCodecs, which recent Safari and Firefox also ship; if a browser lacks it, the editor tells you instead of failing silently.',
  },
  {
    q: 'What does the free plan include?',
    a: `Exports of up to ${FREE_LIMITS.maxSegments} segments and ${FREE_LIMITS.maxOutputSeconds} seconds at ${FREE_LIMITS.maxShortSide}p, with a small watermark. No account needed.`,
  },
  {
    q: 'How does Pro work without an account?',
    a: 'You get a licence key by email after checkout. Paste it into the editor to unlock Pro in that browser. You can move it to another browser at any time.',
  },
];

export function LandingPage() {
  usePageMeta(
    `${APP_NAME}: cut and stitch videos in your browser`,
    'Trim clips and join them into one MP4 without uploading anything. Free to try, no account needed.',
  );

  return (
    <SiteChrome>
      <VStack gap={10} paddingBlock={10} paddingInline={4}>
        <VStack gap={6} hAlign="center">
          <VStack gap={3} hAlign="center" maxWidth={720}>
            <Heading level={1} type="display-2" justify="center" textWrap="balance">
              Cut and stitch videos in your browser
            </Heading>
            <Text type="large" color="secondary" justify="center" textWrap="balance">
              Pick the best moments from your clips and export one MP4. Nothing is uploaded: every frame is
              processed on your device.
            </Text>
          </VStack>
          <HStack gap={3} wrap="wrap" hAlign="center">
            <Button
              label="Try it free"
              variant="primary"
              size="lg"
              href="/app"
              endContent={<Icon icon={ArrowRightIcon} size="sm" color="inherit" />}
            />
            <Button label="See pricing" variant="secondary" size="lg" href="/pricing" />
          </HStack>
          <Text type="supporting">No account. No upload. Best in current Chrome and Edge.</Text>
        </VStack>

        <VStack gap={6} maxWidth={1100} width="100%" align="center">
          <Heading level={2} justify="center">How it works</Heading>
          <Grid columns={{ minWidth: 240, max: 3 }} gap={6}>
            {STEPS.map((step, i) => (
              <VStack key={step.title} gap={2}>
                <Icon icon={step.icon} color="accent" size="lg" />
                <Heading level={3}>
                  {i + 1}. {step.title}
                </Heading>
                <Text color="secondary">{step.body}</Text>
              </VStack>
            ))}
          </Grid>
        </VStack>

        <Section variant="muted" padding={8}>
          <HStack gap={6} wrap="wrap" vAlign="center" hAlign="center">
            <Icon icon={LockClosedIcon} size="lg" color="accent" />
            <VStack gap={2} maxWidth={640}>
              <Heading level={2}>Private by design</Heading>
              <Text color="secondary">
                Cloud editors need your footage on their servers. {APP_NAME} doesn't: decoding, cropping and
                encoding all run in your browser. That keeps client work and unreleased footage on your machine.
              </Text>
            </VStack>
          </HStack>
        </Section>

        <VStack gap={4} maxWidth={720} width="100%" align="center">
          <Heading level={2}>Questions</Heading>
          <CollapsibleGroup type="single" hasDividers>
            {FAQ.map((item) => (
              <Collapsible key={item.q} value={item.q} trigger={<Text weight="semibold">{item.q}</Text>}>
                <Text color="secondary">{item.a}</Text>
              </Collapsible>
            ))}
          </CollapsibleGroup>
        </VStack>
      </VStack>
    </SiteChrome>
  );
}
