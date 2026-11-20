import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownTrayIcon, FilmIcon, PlayIcon } from '@heroicons/react/24/outline';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Text } from '@astryxdesign/core/Text';
import { Toolbar } from '@astryxdesign/core/Toolbar';
import { formatTime } from '../lib/format';
import type { StitchPlan } from '../engine/plan';

type ExportState =
  | { kind: 'idle' }
  | { kind: 'running'; progress: number; label: string }
  | { kind: 'done'; url: string; sizeMb: number }
  | { kind: 'error'; message: string };

interface ExportPanelProps {
  /** `null` when the project cannot be planned; `planError` says why. */
  plan: StitchPlan | null;
  planError: string | null;
  files?: ReadonlyMap<number, Blob>;
  watermark?: string;
  /** Shown above the actions, e.g. the free-plan limits notice. */
  notice?: ReactNode;
  /** When set, Export calls this instead of rendering (used by the paywall). */
  onBlockedExport?: () => void;
  fileName: string;
}

function saveFile(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

export function ExportPanel({ plan, planError, files, watermark, notice, onBlockedExport, fileName }: ExportPanelProps) {
  const [state, setState] = useState<ExportState>({ kind: 'idle' });
  const [warnings, setWarnings] = useState<string[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  // A new plan invalidates the previous export.
  useEffect(() => {
    setState({ kind: 'idle' });
    setWarnings([]);
    return () => controllerRef.current?.abort();
  }, [plan]);

  // Free the previous video when it is replaced or the panel unmounts.
  const doneUrl = state.kind === 'done' ? state.url : null;
  useEffect(() => () => {
    if (doneUrl) URL.revokeObjectURL(doneUrl);
  }, [doneUrl]);

  const startExport = async () => {
    if (!plan) return;
    if (onBlockedExport) {
      onBlockedExport();
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setWarnings([]);
    setState({ kind: 'running', progress: 0, label: 'Preparing' });
    try {
      // Mediabunny is only downloaded when the first export starts.
      const { stitch } = await import('../engine/stitch');
      const result = await stitch(plan, {
        files,
        watermark,
        signal: controller.signal,
        onProgress: (progress, label) => setState({ kind: 'running', progress, label }),
        onWarning: (w) => setWarnings((prev) => [...prev, w]),
      });
      setState({ kind: 'done', url: URL.createObjectURL(result.blob), sizeMb: result.blob.size / 1_048_576 });
    } catch (err) {
      if (controller.signal.aborted) {
        setState({ kind: 'idle' });
        return;
      }
      console.error('Export failed', err);
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' });
    }
  };

  const cancel = () => controllerRef.current?.abort();

  return (
    <VStack gap={4}>
      <AspectRatio ratio={plan ? plan.width / plan.height : 16 / 9} fit="contain">
        {state.kind === 'done' ? (
          <video
            src={state.url}
            controls
            playsInline
            aria-label="Stitched video"
          />
        ) : (
          <VStack hAlign="center" vAlign="center" padding={4}>
            {state.kind === 'running' ? (
              <VStack gap={2} width="min(360px, 100%)">
                <ProgressBar label={state.label} value={Math.round(state.progress * 100)} hasValueLabel />
                <Text type="supporting">Rendering happens on this device. Keep this tab open.</Text>
              </VStack>
            ) : (
              <EmptyState
                icon={<Icon icon={FilmIcon} />}
                title={plan ? 'Ready to export' : 'Nothing to export yet'}
                description={
                  plan
                    ? `${plan.items.length} segments, ${formatTime(plan.totalSec)} at ${plan.width}×${plan.height}.`
                    : 'Add at least one valid segment.'
                }
                isCompact
              />
            )}
          </VStack>
        )}
      </AspectRatio>

      {planError && <Banner status="error" title="This project can't be exported" description={planError} />}
      {state.kind === 'error' && (
        <Banner status="error" title="Export failed" description={state.message} role="alert" />
      )}
      {warnings.length > 0 && (
        <Banner status="warning" title={`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`} isDismissable>
          <VStack gap={1}>
            {warnings.map((w) => (
              <Text key={w} type="supporting">{w}</Text>
            ))}
          </VStack>
        </Banner>
      )}
      {notice}

      <Toolbar
        label="Export actions"
        startContent={
          state.kind === 'done' ? (
            <Text type="supporting" hasTabularNumbers>{state.sizeMb.toFixed(1)} MB MP4</Text>
          ) : undefined
        }
        endContent={
          <HStack gap={2}>
            {state.kind === 'running' && <Button label="Cancel" variant="ghost" onClick={cancel} />}
            {state.kind === 'done' && (
              <Button
                label="Download MP4"
                variant="primary"
                icon={<Icon icon={ArrowDownTrayIcon} />}
                onClick={() => saveFile(state.url, `${fileName}.mp4`)}
              />
            )}
            <Button
              label={state.kind === 'done' ? 'Export again' : 'Export video'}
              variant={state.kind === 'done' ? 'secondary' : 'primary'}
              icon={<Icon icon={PlayIcon} />}
              isDisabled={!plan || state.kind === 'running'}
              onClick={startExport}
            />
          </HStack>
        }
      />
    </VStack>
  );
}
