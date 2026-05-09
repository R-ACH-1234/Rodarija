//@ts-ignore
import * as lamejs from 'lamejs';

/**
 * Converts an AudioBuffer to an MP3 Blob.
 */
export async function audioBufferToMp3(audioBuffer: AudioBuffer, kbps: number = 128): Promise<Blob> {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  
  // Get the base library
  const lib = (lamejs as any).default || lamejs;
  
    // Identify the core library object (lamejs often puts everything under 'lame' or 'lamejs')
    const l = lib.lamejs || lib.lame || lib;

    // VERY AGGRESSIVE GLOBAL INJECTION
    // Some versions of lamejs are built to look for these in the global scope
    const globalContext = (typeof window !== 'undefined' ? window : globalThis) as any;
    
    const wrapEnum = (obj: any) => {
      if (!obj) return obj;
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'number') {
          const val = obj[key];
          obj[key] = {
            valueOf: () => val,
            ordinal: () => val,
            getValue: () => val,
            toString: () => key
          };
        }
      });
      return obj;
    };

    const MPEGMode = wrapEnum(l.MPEGMode || lib.MPEGMode || { STEREO: 0, JOINT_STEREO: 1, DUAL_CHANNEL: 2, MONO: 3 });
    const Lame = l.Lame || lib.Lame || l;
    
    globalContext.MPEGMode = MPEGMode;
    globalContext.Lame = Lame;
    globalContext.Presets = l.Presets || lib.Presets || {};
    globalContext.Bitrate = l.Bitrate || lib.Bitrate || {};
    globalContext.VbrMode = wrapEnum(l.VbrMode || lib.VbrMode || { vbr_off: 0, vbr_mt: 1, vbr_rh: 2, vbr_abr: 3, vbr_mtrh: 4 });
    
    // List of internal classes that often need to be global
    const classes = [
      'BitStream', 'Bitstream', 'Quantize', 'QuantizePVT', 
      'Tables', 'ShortBlock', 'Huffman', 'L3Side', 'Takehiro', 'NewMDCT'
    ];
    
    classes.forEach(cls => {
      let val = l[cls] || lib[cls] || (lib.lamejs && lib.lamejs[cls]) || (lib.lame && lib.lame[cls]);
      if (cls === 'VbrMode' && !val) val = { vbr_off: 0, vbr_mt: 1, vbr_rh: 2, vbr_abr: 3, vbr_mtrh: 4 };
      if (val) {
        globalContext[cls] = val;
      }
    });

    // CRITICAL FIX: The "BitStream.EQ is not a function" error
    const bitstream = globalContext.BitStream || globalContext.Bitstream || {};
    if (typeof bitstream.EQ !== 'function') {
      const foundEQ = l.EQ || lib.EQ || (l.BitStream && l.BitStream.EQ);
      bitstream.EQ = typeof foundEQ === 'function' ? foundEQ : () => 0;
    }
    globalContext.BitStream = bitstream;
    globalContext.Bitstream = bitstream;

  // Get the Mp3Encoder constructor
  const Mp3Encoder = l.Mp3Encoder || lib.Mp3Encoder || ((window as any).Lame && (window as any).Lame.Mp3Encoder);
  
  if (!Mp3Encoder) {
    throw new Error("LAME Mp3Encoder not found. Check if lamejs is installed correctly.");
  }

  let mp3encoder;
  try {
    mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
  } catch (e) {
    console.error("Mp3Encoder init failed:", e);
    throw new Error(`Mp3Encoder initialization failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  const mp3Data: any[] = [];
  const sampleSize = 1152; // LAME standard frame size

  // Helper to convert Float32 to Int16
  const toInt16 = (float32: Float32Array): Int16Array => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        // Clamp and scale
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  };

  if (channels === 1) {
    const samples = toInt16(audioBuffer.getChannelData(0));
    for (let i = 0; i < samples.length; i += sampleSize) {
      const chunk = samples.subarray(i, i + sampleSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));
    }
  } else {
    // Stereo
    const left = toInt16(audioBuffer.getChannelData(0));
    const right = toInt16(audioBuffer.getChannelData(1));
    for (let i = 0; i < left.length; i += sampleSize) {
      const leftChunk = left.subarray(i, i + sampleSize);
      const rightChunk = right.subarray(i, i + sampleSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));
    }
  }

  // Use the correct flush() method to finalize the stream
  const finalBuf = mp3encoder.flush();
  if (finalBuf.length > 0) {
    mp3Data.push(new Int8Array(finalBuf));
  }

  return new Blob(mp3Data, { type: 'audio/mpeg' });
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const buffer_view = new ArrayBuffer(length);
  const view = new DataView(buffer_view);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0; // scale to 16-bit signed
      view.setInt16(pos, sample, true); // update pos
      pos += 2;
    }
    offset++;
  }

  return new Blob([buffer_view], { type: 'audio/wav' });
}

