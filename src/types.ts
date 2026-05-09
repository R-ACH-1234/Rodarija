/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GenerationRequest {
  text: string;
}

export interface GenerationResponse {
  audioBase64: string;
  transcript?: string;
}

export interface HistoryItem {
  id: string;
  text: string;
  audioBase64?: string; // Optional since we use blob now
  audioBlob?: Blob; // Added for IndexedDB storage
  mimeType?: string;
  audioUrl?: string;
  timestamp: number;
  duration?: number; // Duration in seconds
}

export interface SoundEffect {
  id: string;
  name: string;
  category: string;
  duration: string;
  url: string;
  icon: string;
}

export interface TimelineItem {
  id: string;
  effect: SoundEffect;
  startTime: number; // in seconds
  volume: number;
}
