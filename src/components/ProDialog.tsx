import { useState, type FormEvent } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { APP_NAME, FREE_LIMITS, PRO_LIMITS } from '../config/plans';
import type { LimitViolation } from '../engine/plan';
import { formatTime } from '../lib/format';
import type { UseEntitlements } from '../licensing/useEntitlements';

export type ProDialogMode = 'upgrade' | 'license';

interface ProDialogProps {
  mode: ProDialogMode | null;
  onModeChange: (mode: ProDialogMode | null) => void;
  entitlements: UseEntitlements;
  /** Why the export was blocked, when opened from Export. */
  violations?: LimitViolation[];
}

function describe(v: LimitViolation) {
  return v.kind === 'segments'
    ? `${v.actual} segments (free plan: up to ${v.limit})`
    : `${formatTime(v.actual)} long (free plan: up to ${formatTime(v.limit)})`;
}

export function ProDialog({ mode, onModeChange, entitlements, violations = [] }: ProDialogProps) {
  const close = () => onModeChange(null);
  return (
    <Dialog isOpen={mode !== null} onOpenChange={(open) => !open && close()} purpose="form" width={480}>
      {mode === 'upgrade' && <Upgrade violations={violations} onClose={close} onHaveKey={() => onModeChange('license')} />}
      {mode === 'license' && <License entitlements={entitlements} onClose={close} />}
    </Dialog>
  );
}

function Upgrade({ violations, onClose, onHaveKey }: { violations: LimitViolation[]; onClose: () => void; onHaveKey: () => void }) {
  return (
    <Layout
      header={<DialogHeader title={`Upgrade to ${APP_NAME} Pro`} subtitle="One licence, no watermark, longer exports." onOpenChange={onClose} />}
      content={
        <LayoutContent>
          <VStack gap={4}>
            {violations.length > 0 && (
              <Banner status="info" title="This project is over the free limits" collapsible={false}>
                <VStack gap={1}>
                  {violations.map((v) => (
                    <Text key={v.kind} type="supporting">{describe(v)}</Text>
                  ))}
                </VStack>
              </Banner>
            )}
            <List density="balanced" hasDividers>
              <ListItem label="No watermark" description={`Free exports carry a small "${APP_NAME}" mark.`} />
              <ListItem label={`Up to ${PRO_LIMITS.maxShortSide}p`} description={`Free exports are capped at ${FREE_LIMITS.maxShortSide}p.`} />
              <ListItem
                label="Unlimited segments, up to 30 minutes"
                description={`Free: ${FREE_LIMITS.maxSegments} segments and ${FREE_LIMITS.maxOutputSeconds} seconds.`}
              />
            </List>
          </VStack>
        </LayoutContent>
      }
      footer={
        <LayoutFooter>
          <HStack gap={2} hAlign="end">
            <Button label="I have a key" variant="ghost" onClick={onHaveKey} />
            <Button label="See pricing" variant="primary" href="/pricing" />
          </HStack>
        </LayoutFooter>
      }
    />
  );
}

function License({ entitlements, onClose }: { entitlements: UseEntitlements; onClose: () => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { license } = entitlements;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!key.trim()) {
      setError('Paste the key from your purchase email.');
      return;
    }
    setBusy(true);
    const err = await entitlements.activate(key);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  if (license && entitlements.plan === 'pro') {
    return (
      <Layout
        header={<DialogHeader title={`${APP_NAME} Pro is active`} subtitle={license.productName} onOpenChange={onClose} />}
        content={
          <LayoutContent>
            <Text type="supporting">
              Key ending in {license.key.slice(-4)}. Deactivate it here to free this activation for another browser.
            </Text>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Deactivate" variant="destructive" clickAction={async () => { await entitlements.deactivate(); onClose(); }} />
              <Button label="Done" variant="primary" onClick={onClose} />
            </HStack>
          </LayoutFooter>
        }
      />
    );
  }

  return (
    <form onSubmit={submit}>
      <Layout
        header={<DialogHeader title="Enter your licence key" subtitle="It's in the email you got after buying." onOpenChange={onClose} />}
        content={
          <LayoutContent>
            <TextInput
              label="Licence key"
              value={key}
              onChange={(v) => {
                setKey(v);
                setError(null);
              }}
              placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              autoComplete="off"
              hasAutoFocus
              status={error ? { type: 'error', message: error } : undefined}
            />
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onClose} />
              <Button label="Activate" variant="primary" type="submit" isLoading={busy} />
            </HStack>
          </LayoutFooter>
        }
      />
    </form>
  );
}
