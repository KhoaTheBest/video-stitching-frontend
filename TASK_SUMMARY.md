# Task Summary: Video Stitching with MediaBunny

## Project Overview
A React application that processes a list of video segments defined in a JSON configuration. It provides:
1.  **Segment Players**: Individual players for each trimmed video segment.
2.  **Main Player**: A single video player that stitches (concatenates) all segments into one seamless video.
3.  **JSON Editor**: A Monaco Editor interface to dynamically modify the segment configuration.

## Key Technologies
-   **Vite + React + TypeScript**: Core framework.
-   **MediaBunny**: High-performance browser-side media processing library (wraps WebCodecs).
-   **@monaco-editor/react**: For the configuration editor.

## Architecture & Implementation Details

### 1. SegmentPlayer (`src/components/SegmentPlayer.tsx`)
-   **Purpose**: Plays a single trimmed segment of a video.
-   **Implementation**:
    -   Uses `MediaBunny.Conversion` to fetch, trim (`trim: { start, end }`), and mute (`audio: { discard: true }`) the source video.
    -   Outputs to a `BufferTarget` which is converted to a Blob URL for playback in a standard `<video>` tag.
-   **Concurrency Handling**:
    -   Implemented a **queue system** in `App.tsx` (`processingIndex`) to ensure segments are processed one-by-one.
    -   Processing all segments simultaneously caused browser resource exhaustion (decoder limits) and network saturation.

### 2. MainPlayer (`src/components/MainPlayer.tsx`)
-   **Purpose**: Stitches all segments into one continuous MP4 file.
-   **Implementation**:
    -   Uses a custom pipeline with `Sinks` and `Sources` (lower-level API) instead of `Conversion`.
    -   **Pipeline Steps**:
        1.  Initialize Output (MP4) and Encoders (AVC Video, AAC Audio).
        2.  **Sample Rate Detection**: Probes the first unmuted segment to detect the audio sample rate (e.g., 44100Hz) to configure the encoder correctly. Mismatched rates caused WebCodecs crashes.
        3.  **Sequential Processing**: Iterates through segments.
        4.  **Video**: Decodes frames, filters by timestamp, and re-timestamps them to append to the output timeline.
        5.  **Audio**:
            -   If **Muted**: Generates explicit **silence samples** (zero-filled Float32Arrays) matching the target duration and sample rate. This prevents audio gaps which can cause player desync.
            -   If **Unmuted**: Decodes and re-timestamps original audio.
    -   **Performance**: Uses WebCodecs for hardware-accelerated encoding.

### 3. App State (`src/App.tsx`)
-   Manages `activeData` state parsed from the JSON editor.
-   Uses `resetKey` to force-remount players when configuration changes ("Execute" button).
-   Manages the processing queue for `SegmentPlayer`s.

## Configuration
-   **Vite Config**: Added `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers. These are **critical** for `SharedArrayBuffer` support, which is often required by media processing libraries (though MediaBunny core is largely main-thread/worker based, this ensures optimal environment).

## Usage
1.  Edit JSON in the left panel.
2.  Click **Execute** to apply changes and restart processing.
3.  Monitor progress bars for stitching and individual segment loading.
