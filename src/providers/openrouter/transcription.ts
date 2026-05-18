import { env } from '../../config/index.js';
import { MODELS } from './models.js';

export async function transcribeAudio(
  audioBuffer: Buffer,
  format: string = 'ogg',
): Promise<string> {
  const base64Audio = audioBuffer.toString('base64');

  const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.OPENROUTER_SITE_URL,
      'X-Title': env.OPENROUTER_SITE_NAME,
    },
    body: JSON.stringify({
      model: MODELS.WHISPER,
      input_audio: {
        data: base64Audio,
        format,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Transcription failed ${response.status}: ${text}`);
  }

  const data = await response.json() as { text: string };
  return data.text;
}
