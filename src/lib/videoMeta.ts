import type { LocalVideoMeta } from '../engine/edit';

/** Reads size and duration of a local video file using the browser's own player. */
export function readVideoMeta(file: File, url: string): Promise<LocalVideoMeta> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      resolve({ name: file.name, width: video.videoWidth, height: video.videoHeight, durationSec: video.duration });
      video.removeAttribute('src');
      video.load();
    };
    video.onerror = () => reject(new Error(`${file.name} could not be opened. Try an MP4, MOV or WebM file.`));
    video.src = url;
  });
}
