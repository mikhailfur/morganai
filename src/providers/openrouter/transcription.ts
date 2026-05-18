import { env } from '../../config/index.js';
import { MODELS } from './models.js';

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'voice.ogg',
): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), filename);
  formData.append('model', MODELS.WHISPER);

  const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': env.OPENROUTER_SITE_URL,
      'X-Title': env.OPENROUTER_SITE_NAME,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Transcription failed ${response.status}: ${text}`);
  }

  const data = await response.json() as { text: string };
  return data.text;
}
