import type { SyntheticEvent } from 'react';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { formatTime } from '../lib/format';
import type { Segment } from '../types';

interface SegmentPreviewProps {
  index: number;
  segment: Segment;
  /** URL of the source, or a blob: URL for a local file. `null` when the source is missing. */
  sourceUrl: string | null;
}

/**
 * Previews one segment straight from its source, without re-encoding: the media
 * fragment (`#t=start,end`) seeks to the start, and playback is kept in range.
 */
export function SegmentPreview({ index, segment, sourceUrl }: SegmentPreviewProps) {
  const start = segment.start_ms / 1000;
  const end = segment.end_ms / 1000;

  const keepInRange = (e: SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.currentTime > end) {
      video.pause();
      video.currentTime = start;
    } else if (video.currentTime < start - 0.05) {
      video.currentTime = start;
    }
  };

  return (
    <Card padding={3}>
      <VStack gap={2}>
        <AspectRatio ratio={16 / 9} fit="contain">
          {sourceUrl ? (
            <video
              src={`${sourceUrl}#t=${start},${end}`}
              muted={segment.muted}
              controls
              playsInline
              preload="metadata"
              aria-label={`Preview of segment ${index + 1}`}
              onTimeUpdate={keepInRange}
              onSeeked={keepInRange}
            />
          ) : (
            <VStack hAlign="center" vAlign="center">
              <Text type="supporting">Source {segment.source_id} not found</Text>
            </VStack>
          )}
        </AspectRatio>
        <HStack gap={2} vAlign="center" hAlign="between">
          <Text weight="semibold" maxLines={1}>
            {index + 1}. {segment.purpose || `Scene ${segment.scene_id}`}
          </Text>
          {segment.muted && <Badge label="Muted" />}
        </HStack>
        <Text type="supporting" hasTabularNumbers>
          {formatTime(start)} – {formatTime(end)} · {formatTime(end - start)}
        </Text>
      </VStack>
    </Card>
  );
}
