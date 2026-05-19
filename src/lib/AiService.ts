export class AiService {
  private static readonly MODEL = 'gpt-4.1-nano';
  private static readonly BASE_URL = 'https://api.openai.com/v1/chat/completions';

  /**
   * Helper to make direct HTTP POST request to the OpenAI API.
   */
  private static async generate(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${response.status}`;
      throw new Error(`OpenAI API Error: ${errMsg}`);
    }

    const data = await response.json();
    const generatedText = data?.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error('Invalid response format received from OpenAI API');
    }

    return generatedText;
  }

  /**
   * Purges filler context, transitional phrases, and verbal stumbles from the transcript text.
   */
  public static async purgeFiller(transcriptText: string, apiKey: string): Promise<string> {
    const systemPrompt = `You are a professional transcript editor.
Take the provided raw transcript and refine it by:
1. Purging all verbal stumbles, stutters, and filler words (e.g., "like", "uh", "you know", "umm", "basically").
2. Stripping away transitional boilerplate and off-topic jokes that add no informational value.
3. Collapsing repetitions and smoothing out sentence structures into clean, coherent, and grammatically correct prose.
4. Preserving the exact factual content and meaning of the speaker—do not add new information.
5. Formatting the resulting text in clean, readable paragraphs.`;

    const userPrompt = `Raw Transcript:\n${transcriptText}\n\nRefined Prose:`;

    return this.generate(systemPrompt, userPrompt, apiKey);
  }

  /**
   * Generates a structured Markdown executive summary with key takeaways and bullet points.
   */
  public static async generateSummary(transcriptText: string, apiKey: string): Promise<string> {
    const systemPrompt = `You are an expert technical writer.
Analyze the provided transcript and generate a highly polished executive summary in Markdown format.
The summary MUST include:
1. A concise, one-sentence high-level overview.
2. A structured section titled "## Key Takeaways" with detailed bullet points summarizing the core arguments or steps explained in the video.
3. A section titled "## Summary Notes" which provides a cohesive paragraph synthesis of the main topics discussed.`;

    const userPrompt = `Transcript:\n${transcriptText}\n\nStructured Markdown Summary:`;

    return this.generate(systemPrompt, userPrompt, apiKey);
  }
}
