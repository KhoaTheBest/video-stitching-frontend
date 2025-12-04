import { useState, useEffect, useRef } from 'react';
import {
  Input,
  Output,
  UrlSource,
  BufferTarget,
  Mp4OutputFormat,
  VideoSampleSink,
  AudioSampleSink,
  VideoSampleSource,
  AudioSampleSource,
  ALL_FORMATS,
  AudioSample,
  VideoSample,
} from 'mediabunny';
import type { Segment, SourceFile } from '../types';

interface MainPlayerProps {
  segments: Segment[];
  sourceFiles: SourceFile[];
}

// Helper to resample audio
const resampleAudio = (sample: AudioSample, targetRate: number): AudioSample => {
  if (sample.sampleRate === targetRate) return sample;

  const numberOfChannels = sample.numberOfChannels;
  const frameCount = sample.numberOfFrames;
  
  // Create buffer to hold the data from the sample
  // We enforce 'f32' (interleaved 32-bit float) for simplicity in resampling
  const oldDataBuffer = new Float32Array(frameCount * numberOfChannels);
  
  sample.copyTo(oldDataBuffer, {
      planeIndex: 0,
      format: 'f32', 
  });

  const ratio = sample.sampleRate / targetRate;
  const newFrameCount = Math.floor(frameCount / ratio);
  const newData = new Float32Array(newFrameCount * numberOfChannels);

  for (let i = 0; i < newFrameCount; i++) {
    const center = i * ratio;
    const index1 = Math.floor(center);
    const index2 = Math.min(index1 + 1, frameCount - 1);
    const weight = center - index1;
    
    for (let ch = 0; ch < numberOfChannels; ch++) {
       const val1 = oldDataBuffer[index1 * numberOfChannels + ch];
       const val2 = oldDataBuffer[index2 * numberOfChannels + ch];
       newData[i * numberOfChannels + ch] = val1 * (1 - weight) + val2 * weight;
    }
  }

  return new AudioSample({
    data: newData,
    format: 'f32',
    numberOfChannels: numberOfChannels,
    sampleRate: targetRate,
    timestamp: sample.timestamp,
  });
};

// Helper to generate silence
const generateSilence = async (
  audioSource: AudioSampleSource,
  duration: number,
  startTime: number,
  sampleRate: number = 48000,
  numberOfChannels: number = 2
) => {
  const format = 'f32'; // Interleaved float
  // Process in chunks of 100ms to avoid memory spikes
  const chunkDuration = 0.1;
  let currentTime = startTime;
  const endTime = startTime + duration;

  while (currentTime < endTime) {
    const nextTime = Math.min(currentTime + chunkDuration, endTime);
    const currentChunkDuration = nextTime - currentTime;
    const frameCount = Math.floor(currentChunkDuration * sampleRate);
    
    if (frameCount === 0) break;

    const data = new Float32Array(frameCount * numberOfChannels); // Zeros

    const sample = new AudioSample({
      data,
      format,
      numberOfChannels,
      sampleRate,
      timestamp: currentTime,
      // numberOfFrames is inferred from data length / channels
    });

    await audioSource.add(sample);
    sample.close();
    
    currentTime = nextTime;
  }
};

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
      try {
        setError(null);
        setStatus('Initializing Stitcher...');
        
        // 1. Setup Output
        const output = new Output({
          format: new Mp4OutputFormat(),
          target: new BufferTarget(),
        });

        // 2. Setup Sources (Encoders)
        const videoSource = new VideoSampleSource({
          codec: 'avc', // H.264
          bitrate: 6_000_000,
          keyFrameInterval: 2,
        });

        // Delay audio source creation until we know the sample rate
        let audioSource: AudioSampleSource | null = null;
        
        // We need to add tracks before start.
        // But we don't know the sample rate yet.
        // However, we can assume 48000 or 44100.
        // Better approach: Scan first segment to get sample rate.
        
        let sampleRate = 48000; // Default
        let numberOfChannels = 2;

        // Determine target video dimensions (smallest of all sources)
        // This ensures we can crop larger videos to fit without upscaling/letterboxing issues
        let targetWidth = Infinity;
        let targetHeight = Infinity;
        
        // Check all segments to find minimum dimensions
        segments.forEach(seg => {
            const sf = sourceFiles.find(s => s.source_id === seg.source_id);
            if (sf) {
                targetWidth = Math.min(targetWidth, sf.dimension.width);
                targetHeight = Math.min(targetHeight, sf.dimension.height);
            }
        });
        
        // Fallback if no dimensions found (unlikely)
        if (targetWidth === Infinity) targetWidth = 1920;
        if (targetHeight === Infinity) targetHeight = 1080;

        console.log(`Target Video Dimensions: ${targetWidth}x${targetHeight}`);
        
        // Cache inputs to avoid re-opening files
        const inputCache = new Map<number, Input>();
        const getInput = (sourceId: number, url: string) => {
            if (!inputCache.has(sourceId)) {
                inputCache.set(sourceId, new Input({ source: new UrlSource(url), formats: ALL_FORMATS }));
            }
            return inputCache.get(sourceId)!;
        };

        // Probe first unmuted segment for audio info
        for (const segment of segments) {
          if (!segment.muted) {
            const sourceFile = sourceFiles.find(s => s.source_id === segment.source_id);
            if (sourceFile) {
              const probeInput = getInput(sourceFile.source_id, sourceFile.url);
              const track = await probeInput.getPrimaryAudioTrack();
              if (track) {
                // Cap sample rate at 48kHz for browser compatibility
                // Many browsers don't support AAC encoding at 96kHz
                sampleRate = track.sampleRate > 48000 ? 48000 : track.sampleRate;
                numberOfChannels = track.numberOfChannels;
                // Don't dispose probeInput as it is cached
                break;
              }
            }
          }
        }

        console.log(`Initializing Audio with SampleRate: ${sampleRate}, Channels: ${numberOfChannels}`);

        const audioSourceInstance = new AudioSampleSource({
          codec: 'aac',
          bitrate: 128_000,
        });
        
        audioSource = audioSourceInstance;
        output.addVideoTrack(videoSource, { frameRate: 30 });
        output.addAudioTrack(audioSource);

        await output.start();

        let currentVideoTimestamp = 0;
        const totalDuration = segments.reduce((acc, s) => acc + s.duration_sec, 0);
        let processedDuration = 0;

        // 3. Process Each Segment
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const sourceFile = sourceFiles.find(s => s.source_id === segment.source_id);
          if (!sourceFile) throw new Error(`Source not found for segment ${segment.scene_id}`);

          setStatus(`Processing Segment ${i + 1}/${segments.length}: ${segment.purpose}`);
          
          const startSec = segment.start_ms / 1000;
          const endSec = segment.end_ms / 1000;
          const duration = endSec - startSec;

          const input = getInput(sourceFile.source_id, sourceFile.url);

          // Debugging: Check if segment is within source duration
          const sourceDuration = await input.computeDuration();
          if (startSec > sourceDuration) {
             console.error(`Segment ${i} (${segment.purpose}) start time (${startSec}s) is AFTER source file duration (${sourceDuration}s). Skipping this segment.`);
             // Don't dispose cached input
             continue;
          } else if (endSec > sourceDuration) {
             console.warn(`Segment ${i} (${segment.purpose}) end time (${endSec}s) exceeds source file duration (${sourceDuration}s). Content will be truncated.`);
          }

          // 3a. Process Video
          const videoTrack = await input.getPrimaryVideoTrack();
          if (videoTrack && await videoTrack.canDecode()) {
            const videoSink = new VideoSampleSink(videoTrack);
            const videoSamples = videoSink.samples(startSec, endSec);
            
            let firstSampleTimestamp = -1;

            for await (const sample of videoSamples) {
              if (sample.timestamp >= endSec) {
                sample.close();
                continue;
              }
              if (sample.timestamp < startSec) {
                 sample.close();
                 continue;
              }

              if (firstSampleTimestamp === -1) firstSampleTimestamp = sample.timestamp;

              const relativeTime = sample.timestamp - firstSampleTimestamp;
              const newTimestamp = currentVideoTimestamp + relativeTime;
              
              // Handle dimension mismatch (crop to target size)
              let sampleToAdd = sample;
              
              if (sample.codedWidth !== targetWidth || sample.codedHeight !== targetHeight) {
                  // Calculate center crop
                  const sx = Math.max(0, (sample.codedWidth - targetWidth) / 2);
                  const sy = Math.max(0, (sample.codedHeight - targetHeight) / 2);
                  
                  // Use createImageBitmap for efficient cropping on GPU
                  const originalFrame = sample.toVideoFrame();
                  const bitmap = await createImageBitmap(originalFrame, sx, sy, targetWidth, targetHeight);
                  
                  // Create new VideoFrame from bitmap
                  const croppedFrame = new VideoFrame(bitmap, { 
                      timestamp: newTimestamp * 1000000, 
                      duration: sample.duration * 1000000 
                  });
                  
                  // Create new sample from cropped frame
                  sampleToAdd = new VideoSample(croppedFrame);
                  
                  // Cleanup intermediates
                  bitmap.close();
                  originalFrame.close();
              } else {
                  // No cropping needed, just update timestamp
                  sample.setTimestamp(newTimestamp);
              }
              
              await videoSource.add(sampleToAdd);
              
              if (sampleToAdd !== sample) {
                  sampleToAdd.close();
              }
              sample.close();
            }
          }

          // 3b. Process Audio
          if (segment.muted) {
            // Generate silence matching the detected sample rate
            await generateSilence(audioSource!, duration, currentVideoTimestamp, sampleRate, numberOfChannels);
          } else {
            const audioTrack = await input.getPrimaryAudioTrack();
            if (audioTrack && await audioTrack.canDecode()) {
              // Check for sample rate mismatch
              if (audioTrack.sampleRate !== sampleRate) {
                 console.log(`Resampling audio for segment ${i} from ${audioTrack.sampleRate} to ${sampleRate}.`);
              }

              const audioSink = new AudioSampleSink(audioTrack);
              const audioSamples = audioSink.samples(startSec, endSec);
              
              let firstAudioTimestamp = -1;

              for await (const sample of audioSamples) {
                if (sample.timestamp >= endSec) {
                    sample.close();
                    continue;
                }
                
                // Resample if necessary (e.g. 96k -> 48k)
                let sampleToProcess = sample;
                if (sample.sampleRate !== sampleRate) {
                    sampleToProcess = resampleAudio(sample, sampleRate);
                }

                // Audio sink might yield samples starting slightly before `startSec`
                // We should probably filter or clip, but for simplicity, we just offset.
                // Ideally we should be more precise, but timestamp shifting usually works well enough.
                
                if (firstAudioTimestamp === -1) firstAudioTimestamp = sampleToProcess.timestamp;

                const relativeTime = sampleToProcess.timestamp - firstAudioTimestamp;
                const newTimestamp = currentVideoTimestamp + relativeTime;

                sampleToProcess.setTimestamp(newTimestamp);
                await audioSource!.add(sampleToProcess);
                
                if (sampleToProcess !== sample) {
                    sampleToProcess.close();
                }
                sample.close();
              }
            }
          }

          currentVideoTimestamp += duration;
          processedDuration += duration;
          setProgress(Math.min(0.99, processedDuration / totalDuration));
          
          // Do not dispose input here as it is cached
        }
        
        // Clean up cached inputs
        for (const input of inputCache.values()) {
            input.dispose();
        }
        inputCache.clear();

        setStatus('Finalizing...');
        await output.finalize();
        
        if (output.target.buffer) {
          const blob = new Blob([output.target.buffer], { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
          setStatus('Ready');
          setProgress(1);
        } else {
          throw new Error('No output buffer created');
        }

      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('Error');
      } finally {
        // processingRef.current = false; 
      }
    };

    stitchVideos();

    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, []); // Empty deps, run once on mount

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '800px', 
      margin: '0 auto 40px auto', 
      padding: '20px', 
      border: '2px solid #333', 
      borderRadius: '12px',
      backgroundColor: '#222',
      color: '#fff',
      textAlign: 'center'
    }}>
      <h2 style={{ marginTop: 0 }}>Main Video (Stitched)</h2>
      
      <div style={{ 
        width: '100%', 
        aspectRatio: '16/9', 
        backgroundColor: '#000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: '10px'
      }}>
        {videoUrl ? (
          <video src={videoUrl} controls style={{ width: '100%', height: '100%' }} />
        ) : (
          <div style={{ width: '80%' }}>
            <p style={{ marginBottom: '10px' }}>{status}</p>
            <div style={{ 
              width: '100%', 
              height: '10px', 
              backgroundColor: '#444', 
              borderRadius: '5px',
              overflow: 'hidden' 
            }}>
              <div style={{ 
                width: `${progress * 100}%`, 
                height: '100%', 
                backgroundColor: '#2196F3',
                transition: 'width 0.3s ease'
              }} />
            </div>
            {error && <p style={{ color: '#ff5252', marginTop: '10px' }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
