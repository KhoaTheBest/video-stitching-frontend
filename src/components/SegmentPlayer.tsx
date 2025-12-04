import { useState, useEffect, useRef } from 'react';
import { 
  Input, 
  Output, 
  Conversion, 
  UrlSource, 
  BufferTarget, 
  Mp4OutputFormat, 
  ALL_FORMATS 
} from 'mediabunny';
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
    let conversionInstance: Conversion | null = null;

    const processSegment = async () => {
      // Prevent double processing
      if (processingRef.current) return;
      processingRef.current = true;
      setError(null);
      setProgress(0);

      try {
        const input = new Input({
          source: new UrlSource(sourceUrl),
          formats: ALL_FORMATS,
        });

        const output = new Output({
          format: new Mp4OutputFormat(),
          target: new BufferTarget(),
        });

        // Convert ms to seconds
        const start = segment.start_ms / 1000;
        const end = segment.end_ms / 1000;

        conversionInstance = await Conversion.init({
          input,
          output,
          trim: { start, end },
          audio: segment.muted ? { discard: true } : {},
        });

        if (!conversionInstance.isValid) {
          throw new Error('Invalid conversion configuration: ' + JSON.stringify(conversionInstance.discardedTracks));
        }

        conversionInstance.onProgress = (p) => {
          if (mounted) setProgress(p);
        };

        // Add timeout to prevent hanging (60s)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Conversion timed out')), 60000)
        );

        await Promise.race([
          conversionInstance.execute(),
          timeoutPromise
        ]);

        if (output.target.buffer && output.target.buffer.byteLength > 0) {
          const blob = new Blob([output.target.buffer], { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
        } else {
          setError('Conversion produced empty result');
        }
        completedRef.current = true;
        processingRef.current = false;
        setTimeout(onComplete, 0);
      } catch (err: unknown) {
        console.error('Conversion failed:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
        // Even on error, we should move to next
        completedRef.current = true;
        processingRef.current = false;
        setTimeout(onComplete, 0);
      } finally {
        processingRef.current = false;
      }
    };

    processSegment();

    return () => {
      mounted = false;
      if (conversionInstance) {
        conversionInstance.cancel().catch(() => {});
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [segment, sourceUrl, canProcess, onComplete]);

  return (
    <div className="segment-player" style={{ 
      width: '300px',
      margin: '0', 
      border: '1px solid #444', 
      padding: '10px', 
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#252526', // Dark background
      color: '#fff'
    }}>
      <h3 style={{ fontSize: '1.1em', margin: '0 0 5px 0', color: '#fff' }}>{segment.purpose}</h3>
      <p style={{ fontSize: '0.9em', margin: '0 0 10px 0', height: '40px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ccc' }}>{segment.summary}</p>
      <p style={{ fontSize: '0.7em', color: '#aaa', margin: '0 0 10px 0' }}>
        Time: {segment.timecode} | Muted: {segment.muted ? 'Yes' : 'No'}
      </p>

      <div style={{ marginTop: 'auto', minHeight: '169px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', borderRadius: '4px', overflow: 'hidden' }}>
        {error ? (
          <div style={{ color: '#ff5252', padding: '10px', fontSize: '0.8em' }}>Error: {error}</div>
        ) : videoUrl ? (
          <video src={videoUrl} controls width="100%" style={{ maxHeight: '100%' }} />
        ) : canProcess || processingRef.current ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.8em', color: '#ccc' }}>Processing...</p>
            <div style={{ width: '150px', height: '8px', backgroundColor: '#444', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${progress * 100}%`, 
                  height: '100%', 
                  backgroundColor: '#4CAF50', 
                  transition: 'width 0.3s ease' 
                }} 
              />
            </div>
            <p>{Math.round(progress * 100)}%</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#666' }}>
            <p>Waiting in queue...</p>
          </div>
        )}
      </div>
    </div>
  );
}
