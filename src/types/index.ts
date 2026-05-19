export type VideoId = string;

export interface TranscriptSegment {
  text: string;
  start: number;     // Absolute offset in seconds
  duration: number;  // Display slice length in seconds
}

export interface TranscriptPayload {
  videoId: VideoId;
  languageCode: string;
  segments: TranscriptSegment[];
}

export interface CacheWrapper {
  timestampCached: number;
  payload: TranscriptPayload;
}
