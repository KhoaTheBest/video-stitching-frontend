import { useEffect, useState } from 'react';
import { planStitch } from '../engine/plan';
import { stitch } from '../engine/stitch';
import type { VideoCutdownResult } from '../types';

interface MainPlayerProps {
  project: VideoCutdownResult;
}

const LIMITS = { maxSegments: Infinity, maxOutputSeconds: Infinity, maxShortSide: 720 };

export function MainPlayer({ project }: MainPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Waiting to start...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let url: string | null = null;

    (async () => {
      try {
        const plan = planStitch(project, LIMITS);
        const result = await stitch(plan, {
          signal: controller.signal,
          onProgress: (fraction, label) => {
            setProgress(fraction);
            setStatus(label);
          },
          onWarning: (message) => console.warn(message),
        });
        url = URL.createObjectURL(result.blob);
        setVideoUrl(url);
        setStatus('Stitching Complete!');
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Stitching failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('Stitching Failed');
      }
    })();

    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [project]);

  return (
    <div style={{
      padding: '20px',
      border: '1px solid #444',
      borderRadius: '8px',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      height: '100%',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ margin: 0, fontSize: '1.2em', color: '#10B981' }}>Stitched Output</h2>
      <div style={{
        width: '100%', height: '420px', backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333'
      }}>
        {videoUrl ? (
          <video src={videoUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ color: error ? '#f44336' : '#888', textAlign: 'center', padding: '20px' }}>
            {error ? (
              <div role="alert">
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Rendering Error</div>
                <div style={{ fontSize: '0.85em', fontFamily: 'monospace' }}>{error}</div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>{status}</div>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
                  style={{ width: '200px', height: '6px', backgroundColor: '#333', borderRadius: '3px', margin: '0 auto', overflow: 'hidden' }}>
                  <div style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: '#10B981', transition: 'width 0.3s ease-in-out' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {videoUrl && <a href={videoUrl} download="stitched.mp4" style={{ color: '#10B981' }}>Download MP4</a>}
    </div>
  );
}
