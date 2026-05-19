import { TranscriptPayload } from '../types';

export class FormatterEngine {
  /**
   * Converts a TranscriptPayload into a Markdown string.
   * Groups segments into paragraphs if the gap > 3 seconds.
   */
  public static toMarkdown(payload: TranscriptPayload): string {
    if (!payload.segments.length) return '';

    let result = '';
    let previousEnd = payload.segments[0].start + payload.segments[0].duration;

    for (let i = 0; i < payload.segments.length; i++) {
      const segment = payload.segments[i];
      
      if (i === 0) {
        result += segment.text;
      } else {
        const gap = segment.start - previousEnd;
        if (gap > 3.0) {
          result += `\n\n${segment.text}`;
        } else {
          result += ` ${segment.text}`;
        }
      }
      previousEnd = segment.start + segment.duration;
    }

    return result;
  }

  /**
   * Converts a TranscriptPayload into an HTML string.
   * Wraps paragraphs in semantic <p> tags.
   */
  public static toHtml(payload: TranscriptPayload): string {
    if (!payload.segments.length) return '';

    let html = '<p>';
    let previousEnd = payload.segments[0].start + payload.segments[0].duration;

    for (let i = 0; i < payload.segments.length; i++) {
      const segment = payload.segments[i];
      
      if (i === 0) {
        html += segment.text;
      } else {
        const gap = segment.start - previousEnd;
        if (gap > 3.0) {
          html += `</p>\n<p>${segment.text}`;
        } else {
          html += ` ${segment.text}`;
        }
      }
      previousEnd = segment.start + segment.duration;
    }

    html += '</p>';
    return html;
  }

  /**
   * Formats decimal seconds into HH:MM:SS,mmm SRT format.
   */
  private static formatSrtTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000);

    const pad = (num: number, size: number) => num.toString().padStart(size, '0');

    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
  }

  /**
   * Converts a TranscriptPayload into an SRT string.
   */
  public static toSrt(payload: TranscriptPayload): string {
    let srt = '';

    for (let i = 0; i < payload.segments.length; i++) {
      const segment = payload.segments[i];
      const startSrt = this.formatSrtTime(segment.start);
      const endSrt = this.formatSrtTime(segment.start + segment.duration);

      srt += `${i + 1}\n`;
      srt += `${startSrt} --> ${endSrt}\n`;
      srt += `${segment.text}\n\n`;
    }

    return srt.trim();
  }
}
