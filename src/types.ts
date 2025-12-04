export interface SourceFile {
  source_id: number;
  asset_id: string;
  url: string;
  duration_sec: number;
  fps: number;
  duration_ms: number;
  dimension: {
    width: number;
    height: number;
  };
}

export interface Segment {
  scene_id: number;
  source_id: number;
  purpose: string;
  timecode: string;
  start_ms: number;
  end_ms: number;
  summary: string;
  duration_sec: number;
  muted: boolean;
}

export interface VideoCutdownResult {
  project_name: string;
  total_duration_sec: number;
  source_files: SourceFile[];
  segments: Segment[];
  cutdown_uuid: string;
  client_id: number;
  user_id: string;
  chat_id: string;
  total_scenes: number;
}

export interface SampleData {
  video_cutdown_result: VideoCutdownResult;
}
