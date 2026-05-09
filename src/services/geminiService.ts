/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

function handleGeminiError(error: any, context: string): never {
  console.error(`${context} Error:`, error);
  
  if (error?.status === 403 || error?.message?.includes("403") || error?.message?.includes("PERMISSION_DENIED")) {
    throw new Error("API Key Permission Denied (403): Please check your API key in settings and ensure it has access to the required models.");
  }
  
  throw error;
}

const SYSTEM_INSTRUCTIONS = `
You are a charismatic Moroccan YouTuber. Your voice must sound 100% human, natural, and energetic. Avoid any robotic or formal Arabic (MSA) tones, and strictly use Moroccan Darija.

Key Style Instructions:
- Persona: Act like a tech or lifestyle YouTuber talking directly to his 'fam' or 'followers'. Use a warm, friendly, and highly engaging tone.
- Natural Fillers: Occasionally use natural Moroccan Darija fillers like 'الخوت', 'شوفوا', 'فهمتوني؟', 'كيفما كتشوفوا', 'المهم', 'صافي؟' to enhance the human feel.
- Pronunciation & Vowels: Moroccans tend to drop short vowels (Sukoon heavy). Ensure words are pronounced fast and without excessive vocalization (e.g., 'Ktab' not 'Kitab', 'Mshit' not 'Mashayt').
- Pronunciation of (ق): Pronounce it naturally according to Darija. Keep standard 'Qaf' (ق) in words like 'Qra' (read), but use the hard 'G' (ڭ) in words like 'Galo' (they said).
- Moroccan Numbers & Currency: 11 is 'Hdash', 12 is 'Tnash', 15 is 'Khmstash', 100 is 'Mya', 1000 is 'Alf'. Currency is 'Dirham'.

When generating audio, follow these rules for "Ultra-Natural" sound:
- Pacing: Speak at a natural Moroccan conversational speed (fast), but include natural pauses for breath between sentences.
`;

export interface VoiceSettings {
  pitch: number; // -20 to 20
  speed: number; // 0.25 to 4.0
  energy: number; // 0 to 1
  voiceName: string; 
  bgMusic?: string; // URL or ID of background music
  customMusicUrl?: string; // User uploaded music URL
  musicVolume?: number; // 0 to 1
  voiceVolume?: number; // 0 to 1
}

export interface AudioResponse {
  data: string;
  mimeType: string;
}

export async function summarizeScript(text: string): Promise<string> {
  const execute = async (attempt = 0): Promise<string> => {
    try {
      const systemInstruction = `You are an expert Moroccan Darija content creator and linguistic editor. 
      Summarize the provided script for a short vlog while keeping it natural, energetic, and 100% in Moroccan Darija. 
      
      STRICT RULES:
      - AVOID Modern Standard Arabic (MSA) at all costs. Use terms like 'daba' instead of 'alan', 'walaynni' instead of 'lakin', 'bzaf' instead of 'kathiran'.
      - Use authentic Moroccan YouTuber fillers: 'l-khout', 'fhmtouni', 'mohim', 'kifma katchoufou'.
      - Keep the energy HIGH and the vibe 'Vlog-style'.
      - If the input is too formal, rewrite it to sound like "Street Darija" but professional.
      - Return ONLY the summarized Darija text.`;

      const response = await getAi().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [{
            text: `${systemInstruction}\n\nInput Text: ${text}`
          }]
        }],
        config: {
          temperature: 0.7,
          topP: 0.95,
        },
      });

      const summarizedText = response.text;
      
      if (!summarizedText) {
        throw new Error("No summary received from Gemini");
      }

      return summarizedText.trim();
    } catch (error: any) {
      const isRetryable = error?.status === 500 || error?.status === 503 || error?.status === 429 || error?.message?.includes("500") || error?.message?.includes("503") || error?.message?.includes("429") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("Internal Server Error");
      
      if (attempt < 3 && isRetryable) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        return execute(attempt + 1);
      }

      handleGeminiError(error, "Summarization");
    }
  };

  return execute();
}

export async function generateYouTuberAudio(text: string, settings: VoiceSettings): Promise<AudioResponse> {
  const execute = async (attempt = 0): Promise<AudioResponse> => {
    try {
      const systemInstruction = `
  You are a charismatic Moroccan YouTuber, a master of 'Darija Vlog' style.
  
  Linguistic Authenticity:
  - ZERO Modern Standard Arabic (MSA). Speak like a friend in a cafe.
  - Use "wach" for questions, "achni" for what, "haka" for like this, "daba" for now.
  
  Key Style Instructions:
  - Persona: Viral YouTuber talking to his 'fam'. Warm, fast-paced, and engaging.
  - Natural Fillers: Use 'wa l-khout', 'choufou m3aya', 'f-had l-vlog', 'mousiba k-hla' where appropriate.
  - Phonetics: Drop vowels aggressively (Sukoon-heavy). Speak 'Ktab' (fast), 'Mchit' (sharp).
  
  Style Guidelines for this specific generation:
  - Energy Level: ${settings.energy > 0.7 ? 'VERY HIGH ENERGY, shouting with excitement' : settings.energy < 0.3 ? 'Chill, low energy, relaxed' : 'Energetic and charismatic'}.
  - Speaking Speed: ${settings.speed > 1.2 ? 'Fast, rapid-fire delivery' : settings.speed < 0.8 ? 'Slow, deliberate pacing' : 'Natural conversational speed'}.
  
  CRITICAL: Do NOT include ANY emojis in your response. The TTS engine will crash to a 500 error if it encounters emojis. Output plain text ONLY.

  Generation Goal: 
  Rewrite the provided text naturally and energetically as this persona. Output ONLY the spoken text, directly in Darija, no quotes, no extra text.
  `;

      // Map user requested names to actual prebuilt voices
      const voiceMap: Record<string, string> = {
        'Nova': 'Charon',
        'Ursa': 'Kore',
        'Vega': 'Zephyr',
        'Pegasus': 'Fenrir',
        'Rachid': 'Charon', 
        'v_01': 'Charon', 
        'Orbit': 'Puck',
        'Lyra': 'Charon', 
        'Orion': 'Fenrir',
        'Eclipse': 'Puck',
        'Achernar': 'Kore', 
        'Capella': 'Zephyr',
        'custom': 'Puck' 
      };

      const actualVoice = voiceMap[settings.voiceName] || settings.voiceName || 'Puck';

      // Step 1: Rewrite the text
      const rewriteResponse = await getAi().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: text }] }],
        config: { systemInstruction: systemInstruction, temperature: 0.8 }
      });
      
      const rewrittenText = rewriteResponse.text || text;

      // Step 2: Generate TTS
      const response = await getAi().models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: rewrittenText,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: actualVoice },
            },
          },
          temperature: Math.min(settings.energy, 1.0),
          topP: 0.95,
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error("No candidates received from Gemini. The request might have been blocked or failed without error details.");
      }

      if (candidate.finishReason === 'SAFETY') {
        throw new Error("Generation blocked by safety filters. Please try rephrasing your text to be more 'clean'.");
      }

      const parts = candidate.content?.parts;
      const part = parts?.find(p => p.inlineData);
      
      if (!part?.inlineData?.data) {
        // Log parts for debugging
        console.warn("Missing audio in response parts:", JSON.stringify(parts));
        throw new Error("No audio data received from Gemini. The model returned a response but it didn't contain audio data.");
      }

      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "audio/pcm"
      };
    } catch (error: any) {
      const isRetryable = error?.status === 500 || error?.status === 503 || error?.status === 429 || error?.message?.includes("500") || error?.message?.includes("503") || error?.message?.includes("429") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("Internal Server Error");
      
      if (attempt < 3 && isRetryable) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        return execute(attempt + 1);
      }

      handleGeminiError(error, "Gemini TTS");
    }
  };

  return execute();
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const execute = async (attempt = 0): Promise<string> => {
    try {
      // Convert Blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Data = await base64Promise;

      const response = await getAi().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: audioBlob.type || "audio/wav"
              }
            },
            {
              text: "Transcribe this audio. If it's in Moroccan Darija, write it exactly as spoken. If there's background noise, just ignore it and focus on the speech. Return ONLY the transcribed text."
            }
          ]
        }],
        config: {
          temperature: 0.4,
          topP: 0.95,
        },
      });

      const transcription = response.text;
      if (!transcription) {
        throw new Error("No transcription received from Gemini");
      }

      return transcription.trim();
    } catch (error: any) {
      const isRetryable = error?.status === 500 || error?.status === 503 || error?.status === 429 || error?.message?.includes("500") || error?.message?.includes("503") || error?.message?.includes("429") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("Internal Server Error");
      
      if (attempt < 3 && isRetryable) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        return execute(attempt + 1);
      }

      handleGeminiError(error, "Transcription");
    }
  };

  return execute();
}
