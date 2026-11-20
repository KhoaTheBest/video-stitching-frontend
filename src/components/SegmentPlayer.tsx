import type { SyntheticEvent } from 'react';
import type { Segment } from '../types';

interface SegmentPlayerProps {
  segment: Segment;
  sourceUrl: string;
}

/**
 * Previews one segment straight from its source, without re-encoding: the media
 * fragment (`#t=start,end`) seeks to the start, and playback is kept in range.
 */
export function SegmentPlayer({ segment, sourceUrl }: SegmentPlayerProps) {
  const start = segment.start_ms / 1000;
  const end = segment.end_ms / 1000;

  const keepInRange = (e: SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.currentTime < start - 0.05 || video.currentTime > end) {
      if (video.currentTime > end) video.pause();
      video.currentTime = start;
    }
  };

  return (
    <div style={{
      width: '260px', padding: '15px', border: '1px solid #444', borderRadius: '8px',
      backgroundColor: '#1a1a1a', color: '#fff', display: 'flex', flexDirection: 'column', gap: '10px'
    }}>
      <div style={{ fontSize: '0.85em', fontFamily: 'monospace' }}>
        <div>Scene: {segment.scene_id}</div>
        <div>Range: {segment.start_ms}ms - {segment.end_ms}ms</div>
        <div>Status: {segment.muted ? '🔇 Muted' : '🔊 Audio'}</div>
      </div>
      <video
        src={`${sourceUrl}#t=${start},${end}`}
        muted={segment.muted}
        controls
        playsInline
        preload="metadata"
        onTimeUpdate={keepInRange}
        onSeeked={keepInRange}
        style={{ width: '100%', height: '140px', backgroundColor: '#000', borderRadius: '4px', objectFit: 'contain' }}
      />
    </div>
  );
}
