import { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { Segment, SourceFile } from '../types';

interface MainPlayerProps {
  segments: Segment[];
  sourceFiles: SourceFile[];
}

export function MainPlayer({ segments, sourceFiles }: MainPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('Waiting to start...');
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef<boolean>(false);

  useEffect(() => {
    if (processingRef.current) return;
    processingRef.current = true;

    const stitchVideos = async () => {
      const ffmpeg = new FFmpeg();
      try {
        setError(null);
        setStatus('Initializing FFmpeg...');
        setProgress(0.05);

        // Load FFmpeg.wasm from public CDN
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        setStatus('Downloading source segments...');
        setProgress(0.15);

        // Find and download unique source files
        const uniqueSources = Array.from(new Set(segments.map(s => s.source_id)));
        const fileMap: Record<string, string> = {}; // source_id -> virtual filename

        for (let i = 0; i < uniqueSources.length; i++) {
          const sourceId = uniqueSources[i];
          const sourceFile = sourceFiles.find(sf => sf.source_id === sourceId);
          if (!sourceFile) {
            throw new Error(`Source file metadata not found for ID: ${sourceId}`);
          }

          const filename = `input_${i}.mp4`;
          fileMap[sourceId] = filename;

          setStatus(`Downloading source ${i + 1}/${uniqueSources.length}...`);
          setProgress(0.15 + (i / uniqueSources.length) * 0.15); // Scale up to 30%

          await ffmpeg.writeFile(filename, await fetchFile(sourceFile.url));
        }

        setStatus('Compiling Stitching Pipeline...');
        setProgress(0.35);

        // Build FFmpeg Filter Complex to Trim, Normalize (1280x720, 48000Hz), and Concat
        let filterComplex = '';
        let concatInputs = '';
        const args: string[] = [];

        // Add all inputs to the command args in order of their occurrence in unique list
        for (let i = 0; i < uniqueSources.length; i++) {
          args.push('-i', `input_${i}.mp4`);
        }

        segments.forEach((segment, idx) => {
          // Find which input index corresponds to this segment's source_id
          const inputIdx = uniqueSources.indexOf(segment.source_id);
          const startS = segment.start_ms / 1000;
          const endS = segment.end_ms / 1000;

          // Video Filter: Trim, Set PTS, and Scale/Crop to 1280x720 (Center-Crop)
          filterComplex += `[${inputIdx}:v]trim=start=${startS}:end=${endS},setpts=PTS-STARTPTS,scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[v${idx}];`;

          // Audio Filter: Trim, Set PTS, Resample to 48000Hz, and Mute if necessary
          if (segment.muted) {
            filterComplex += `[${inputIdx}:a]atrim=start=${startS}:end=${endS},asetpts=PTS-STARTPTS,volume=0,aresample=48000[a${idx}];`;
          } else {
            filterComplex += `[${inputIdx}:a]atrim=start=${startS}:end=${endS},asetpts=PTS-STARTPTS,aresample=48000[a${idx}];`;
          }

          concatInputs += `[v${idx}][a${idx}]`;
        });

        // Add concat stream mapping
        filterComplex += `${concatInputs}concat=n=${segments.length}:v=1:a=1[outv][outa]`;

        // Assemble all args
        args.push(
          '-filter_complex', filterComplex,
          '-map', '[outv]',
          '-map', '[outa]',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-c:a', 'aac',
          'output.mp4'
        );

        setStatus('Rendering Stitched Video...');
        setProgress(0.40);

        // Track progress (scale 40% to 95%)
        ffmpeg.on('progress', ({ progress: p }) => {
          setProgress(0.40 + p * 0.55);
        });

        await ffmpeg.exec(args);

        setStatus('Generating Final MP4 Buffer...');
        setProgress(0.96);

        const data = await ffmpeg.readFile('output.mp4');
        const blob = new Blob([data as BlobPart], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);

        setVideoUrl(url);
        setStatus('Stitching Complete!');
        setProgress(1);
      } catch (err: unknown) {
        console.error('Stitching failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('Stitching Failed');
      } finally {
        processingRef.current = false;
      }
    };

    stitchVideos();
  }, [segments, sourceFiles]);

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
        width: '100%',
        height: '420px',
        backgroundColor: '#000',
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        border: '1px solid #333'
      }}>
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ color: error ? '#f44336' : '#888', textAlign: 'center', padding: '20px' }}>
            {error ? (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Rendering Error</div>
                <div style={{ fontSize: '0.85em', fontFamily: 'monospace' }}>{error}</div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>{status}</div>
                <div style={{
                  width: '200px',
                  height: '6px',
                  backgroundColor: '#333',
                  borderRadius: '3px',
                  margin: '0 auto',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    backgroundColor: '#10B981',
                    transition: 'width 0.3s ease-i-out'
                  }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
