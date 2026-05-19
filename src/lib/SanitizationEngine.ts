import { TranscriptSegment } from '../types';

export class SanitizationEngine {
  /**
   * Applies destructive filters to a transcript segment array.
   * Strips ambient noise, speaker tags, and normalizes whitespace.
   */
  public static sanitize(segments: TranscriptSegment[]): TranscriptSegment[] {
    const ambientPattern = /(?:\[[^\]]*\]|\([^)]*\))/g;
    const speakerTagPattern = /^[A-Za-z0-9\s]+:\s*/gm;
    const whitespacePattern = /\s+/g;

    const cleanedSegments: TranscriptSegment[] = [];

    for (const segment of segments) {
      let text = segment.text;

      // 1. Strip Ambient Descriptions [Music], (laughter), etc.
      text = text.replace(ambientPattern, '');

      // 2. Strip Speaker Tags
      text = text.replace(speakerTagPattern, '');

      // 3. Normalize Whitespace (collapse spaces/newlines into a single space, trim edges)
      text = text.replace(whitespacePattern, ' ').trim();

      // Only push segments that aren't empty after sanitization
      if (text.length > 0) {
        cleanedSegments.push({
          ...segment,
          text
        });
      }
    }

    return cleanedSegments;
  }
}
