
export const base64ToBlob = (base64: string, mime: string = "audio/mpeg") => {
  try {
    const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    const binaryString = window.atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 1. Detect if it's already a WAV
    const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // RIFF
    if (isWav) return new Blob([bytes], { type: "audio/wav" });

    // 2. Detect if it's MP3
    const isMp3 = (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // ID3
                  (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0); // Sync word
    if (isMp3) return new Blob([bytes], { type: "audio/mpeg" });

    // 3. Detect if it's AAC/ADTS
    const isAac = bytes[0] === 0xFF && (bytes[1] & 0xF0) === 0xF0; // ADTS sync word
    if (isAac) return new Blob([bytes], { type: "audio/aac" });

    // 4. Default to PCM wrapping if it's Gemini (often raw L16 PCM at 24kHz)
    console.log(`Binary type not detected, wrapping as WAV. Reported mime: ${mime}`);
    return encodeWAV(bytes, 24000); 
  } catch (e) {
    console.error("Base64 conversion failed", e);
    return null;
  }
};

// Helper to create a WAV header for PCM data
const encodeWAV = (samples: Uint8Array, sampleRate: number) => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + samples.length, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM - Integer
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, samples.length, true);

  return new Blob([new Uint8Array(buffer), samples], { type: "audio/wav" });
};

export const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }
};
