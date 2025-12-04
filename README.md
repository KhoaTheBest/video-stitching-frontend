# Stitching Video FE

A high-performance React application for stitching and processing video segments in the browser using [MediaBunny](https://github.com/Glitchbone/mediabunny) (WebCodecs).

## 🚀 Features

*   **Seamless Video Stitching**: Concatenates multiple video segments into a single MP4 file entirely in the browser.
*   **Intelligent Processing**:
    *   **Audio Resampling**: Automatically resamples mismatched audio (e.g., 96kHz to 48kHz) to ensure compatibility.
    *   **Smart Cropping**: Detects variable video dimensions and crops to the common intersection (center-crop) using high-performance `createImageBitmap` (GPU-accelerated).
    *   **Gap Handling**: Generates silence for muted segments to maintain perfect A/V sync.
*   **Interactive Configuration**:
    *   **JSON Editor**: Uses Monaco Editor to modify segment parameters (start/end times, mute status) in real-time.
    *   **Segment Preview**: Individual players for inspecting input segments.
*   **Performance**: Uses `OffscreenCanvas` and WebCodecs for non-blocking operations on the main thread (optimized with caching).

## 🛠️ Tech Stack

*   **Framework**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Media Engine**: [MediaBunny](https://github.com/Glitchbone/mediabunny) (WebCodecs wrapper)
*   **Editor**: [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/KhoaTheBest/video-stitching-frontend.git
    cd video-stitching-frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## 🔧 Configuration

The project requires specific HTTP headers for **SharedArrayBuffer** support (required by high-performance media libraries):

```javascript
// vite.config.ts
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
}
```

## 🧩 Architecture

*   **`MainPlayer.tsx`**: The core stitching engine. Handles the pipeline of decoding, transforming (crop/resample), and re-encoding.
*   **`SegmentPlayer.tsx`**: Handles preview of individual clips.
*   **`App.tsx`**: Manages application state and the JSON configuration.
*   **Optimizations**:
    *   **Input Caching**: Reuses `MediaBunny.Input` instances to minimize network requests for the same source file.
    *   **Robust Error Handling**: Skips invalid segments (e.g., start time > duration) to prevent crashes.

## 📄 License

This project is licensed under the MIT License.
