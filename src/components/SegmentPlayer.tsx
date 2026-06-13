import { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { Segment } from '../types';

interface SegmentPlayerProps {
  segment: Segment;
  sourceUrl: string;
  canProcess: boolean;
  onComplete: () => void;
}

export function SegmentPlayer({ segment, sourceUrl, canProcess, onComplete }: SegmentPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!canProcess || completedRef.current) return;

    let mounted = true;
    const ffmpeg = new FFmpeg();

    const processSegment = async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      setError(null);
      setProgress(0);

      try {
        if (mounted) setProgress(0.1);

        // Load FFmpeg.wasm from public CDN
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        if (mounted) setProgress(0.3);

        // Fetch and write input file
        await ffmpeg.writeFile('input.mp4', await fetchFile(sourceUrl));
        if (mounted) setProgress(0.5);

        // Track progress (scale 50% to 90%)
        ffmpeg.on('progress', ({ progress: p }) => {
          if (mounted) setProgress(0.5 + p * 0.4);
        });

        const startS = (segment.start_ms / 1000).toString();
        const durationS = ((segment.end_ms - segment.start_ms) / 1000).toString();

        // Build command args
        const args = [
          '-ss', startS,
          '-i', 'input.mp4',
          '-t', durationS,
          '-c:v', 'libx264',
          '-preset', 'ultrafast'
        ];

        if (segment.muted) {
          args.push('-an');
        } else {
          args.push('-c:a', 'aac');
        }

        args.push('output.mp4');

        await ffmpeg.exec(args);
        if (mounted) setProgress(0.95);

        const data = await ffmpeg.readFile('output.mp4');
        const blob = new Blob([data as any], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);

        if (mounted) {
          setVideoUrl(url);
          setProgress(1);
        }

        completedRef.current = true;
        processingRef.current = false;
        setTimeout(onComplete, 0);
      } catch (err: unknown) {
        console.error('Segment processing failed:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
        completedRef.current = true;
        processingRef.current = false;
        setTimeout(onComplete, 0);
      }
    };

    processSegment();

    return () => {
      mounted = false;
    };
  }, [canProcess, sourceUrl, segment, onComplete]);

  return (
    <div style={{
      width: '260px',
      padding: '15px',
      border: '1px solid #444',
      borderRadius: '8px',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div style={{ fontSize: '0.85em', fontFamily: 'monospace' }}>
        <div>Scene: {segment.scene_id}</div>
        <div>Range: {segment.start_ms}ms - {segment.end_ms}ms</div>
        <div>Status: {segment.muted ? '🔇 Muted' : '🔊 Audio'}</div>
      </div>

      <div style={{
        width: '100%',
        height: '140px',
        backgroundColor: '#000',
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ color: error ? '#f44336' : '#888', fontSize: '0.85em', textAlign: 'center', padding: '10px' }}>
            {error ? `Error: ${error}` : canProcess ? `Processing: ${Math.round(progress * 100)}%` : 'Waiting in Queue...'}
          </div>
        )}
      </div>
    </div>
  );
}
