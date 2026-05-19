export class UrlParserModule {
  /**
   * Parses a given YouTube URL to extract the 11-character video ID.
   * Throws an error with message 'ERR_INVALID_URL' if the URL is not a recognized YouTube format.
   *
   * @param input The YouTube URL string
   * @returns The 11-character video ID
   */
  public static parseVideoId(input: string): string {
    if (!input || input.trim() === '') {
      throw new Error('ERR_INVALID_URL');
    }

    const trimmedInput = input.trim();

    // Standard Desktop Pattern: matches v= or &v= followed by anything except #, &, or ?
    const standardPattern = /(?:\?v=|\&v=)([^#\&\?]+)/;
    // Shortened Pattern: matches youtu.be/ followed by anything except #, &, or ?
    const shortenedPattern = /youtu\.be\/([^#\&\?]+)/;
    // Shorts Pattern: matches youtube.com/shorts/ followed by anything except #, &, or ?
    const shortsPattern = /youtube\.com\/shorts\/([^#\&\?]+)/;

    let match = trimmedInput.match(standardPattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }

    match = trimmedInput.match(shortenedPattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }

    match = trimmedInput.match(shortsPattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }

    throw new Error('ERR_INVALID_URL');
  }
}
