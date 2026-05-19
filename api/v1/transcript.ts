import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req: any, res: any) {
  // Set CORS headers if needed, otherwise rely on Vercel's defaults
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Vercel parses req.body automatically for POST JSON payloads
    const { videoId, preferredLanguage } = req.body || {};

    if (!videoId) {
      return res.status(400).json({ error: 'Missing videoId' });
    }

    try {
      // 1. Fetch transcript using the library
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, { lang: preferredLanguage || 'en' });
      
      // 2. Map payload to SDD constraints
      const segments = transcriptData.map((item) => ({
        text: item.text,
        start: item.offset / 1000.0, // Convert ms to seconds
        duration: item.duration / 1000.0 // Convert ms to seconds
      }));

      const payload = {
        videoId,
        languageCode: preferredLanguage || 'en',
        segments
      };

      return res.status(200).json(payload);
      
    } catch (libraryError: any) {
      console.error('Library failed to extract:', libraryError);
      
      // Map library failure to our strict UI diagnostic codes
      if (libraryError.message && libraryError.message.includes('Too many requests')) {
        return res.status(429).json({ error: 'HTTP_429_TOO_MANY_REQUESTS' });
      }

      return res.status(404).json({ error: 'ERR_NO_CAPTIONS_AVAILABLE' });
    }

  } catch (error) {
    console.error('API Handler Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
