import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Switch } from '@astryxdesign/core/Switch';
import type { Segment } from '../types';

interface SegmentEditorProps {
  segment: Segment;
  /** Length of the source in seconds, when known, to bound the end time. */
  sourceDurationSec?: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<Pick<Segment, 'start_ms' | 'end_ms' | 'muted'>>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}

const toMs = (sec: number) => Math.round(sec * 1000);

/** In/out points, mute, order and removal for the selected segment. */
export function SegmentEditor({ segment, sourceDurationSec, isFirst, isLast, onChange, onMove, onRemove }: SegmentEditorProps) {
  const start = segment.start_ms / 1000;
  const end = segment.end_ms / 1000;
  const maxEnd = sourceDurationSec && sourceDurationSec > 0 ? sourceDurationSec : null;

  return (
    <VStack gap={3}>
      <HStack gap={2}>
        <NumberInput
          label="Start (s)"
          value={start}
          min={0}
          max={Math.max(0, end - 0.1)}
          step={0.1}
          onChange={(v) => onChange({ start_ms: toMs(v) })}
          width="100%"
        />
        <NumberInput
          label="End (s)"
          value={end}
          min={start + 0.1}
          max={maxEnd}
          step={0.1}
          onChange={(v) => onChange({ end_ms: toMs(v) })}
          width="100%"
        />
      </HStack>
      <Switch label="Mute this segment" value={segment.muted} onChange={(muted) => onChange({ muted })} />
      <HStack gap={1} hAlign="between">
        <HStack gap={1}>
          <Button label="Move up" icon={<Icon icon={ArrowUpIcon} />} isIconOnly variant="ghost" size="sm" isDisabled={isFirst} onClick={() => onMove(-1)} />
          <Button label="Move down" icon={<Icon icon={ArrowDownIcon} />} isIconOnly variant="ghost" size="sm" isDisabled={isLast} onClick={() => onMove(1)} />
        </HStack>
        <Button label="Remove" icon={<Icon icon={TrashIcon} />} variant="ghost" size="sm" onClick={onRemove} />
      </HStack>
    </VStack>
  );
}
