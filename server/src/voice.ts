import { config } from './config';

export class MiniMaxTTS {
  private apiToken: string;
  private voiceId: string;
  private baseUrl = 'https://api.minimax.io/v1/t2a_v2';

  constructor() {
    this.apiToken = config.minimaxApiToken;
    this.voiceId = config.minimaxVoiceId;
  }

  async generateSpeech(text: string): Promise<Buffer | null> {
    try {
      if (!this.apiToken || !this.voiceId) {
        console.warn('MiniMax не настроен');
        return null;
      }
      if (text.length > 10000) return null;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'speech-2.6-turbo',
          text,
          stream: false,
          output_format: 'hex',
          voice_setting: { voice_id: this.voiceId, speed: 1.0, vol: 1.0, pitch: 0 },
          audio_setting: { sample_rate: 24000, bitrate: 128000, format: 'mp3', channel: 1 },
          language_boost: 'Russian',
        }),
      });

      if (!response.ok) return null;
      const data: any = await response.json();
      if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) return null;

      const audioHex = data.audio || data.data?.audio;
      if (!audioHex || typeof audioHex !== 'string') return null;

      const buffer = Buffer.from(audioHex, 'hex');
      return buffer.length >= 1000 ? buffer : null;
    } catch (error) {
      console.error('MiniMax TTS error:', error);
      return null;
    }
  }
}

export const minimaxTTS = new MiniMaxTTS();
