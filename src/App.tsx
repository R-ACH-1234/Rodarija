/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Mic2, 
  Send, 
  Play, 
  Pause, 
  Trash2, 
  Youtube, 
  Sparkles, 
  Volume2,
  VolumeX,
  Music,
  Headphones,
  Clock,
  Menu,
  X,
  Share2,
  Settings2,
  Zap,
  Sliders,
  Download,
  Video,
  FileAudio,
  Info,
  LayoutDashboard,
  Library,
  History,
  Users,
  HelpCircle,
  Sun,
  Moon,
  Upload,
  UploadCloud,
  ChevronRight,
  MoreVertical,
  Check,
  Search,
  Music2,
  Mic,
  Circle,
  Square,
  Loader2
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";
import { generateYouTuberAudio, VoiceSettings, summarizeScript, transcribeAudio } from "./services/geminiService";
import { HistoryItem } from "./types";
import { audioBufferToMp3, audioBufferToWav } from "./lib/audioConverter";
import { saveHistoryItem, getAllHistoryItems, deleteHistoryItem, clearOldItems, clearAllHistoryItems } from "./lib/db";
import { base64ToBlob, generateId } from "./lib/utils";
import { VoiceDiscovery, VoiceTalent } from "./components/VoiceDiscovery";
import { SoundEffects, SoundEffect as SoundEffectType } from "./components/SoundEffects";
import { AudioTimeline } from "./components/AudioTimeline";
import { TimelineItem } from "./types";

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const AVAILABLE_VOICES = [
  { id: "v_01", name: "Rachid (Popular)", description: "Confident & Journalistic (Official/News)", icon: "👨‍💼" },
  { id: "Achernar", name: "Achernar", description: "Professional & Smooth (Business/News)", icon: "🎙️" },
  { id: "Nova", name: "Nova", description: "Energetic & Fresh (Lifestyle/Vlogs)", icon: "✨" },
  { id: "Ursa", name: "Ursa", description: "Warm & Caring (Wellness/Stories)", icon: "🐻" },
  { id: "Vega", name: "Vega", description: "Bright & Direct (News/Updates)", icon: "🌟" },
  { id: "Pegasus", name: "Pegasus", description: "High Energy (Sports/Hype)", icon: "🐎" },
  { id: "Orbit", name: "Orbit", description: "Deep & Technical (Sci-Fi/Tech)", icon: "🪐" },
  { id: "Lyra", name: "Lyra", description: "Clear & Academic (Tutorials)", icon: "📚" },
  { id: "Orion", name: "Orion", description: "Narrative & Bold (Documentaries)", icon: "🌌" },
  { id: "Zubenelgenubi", name: "Zubenelgenubi", description: "Deep & Cinematic (Stories)", icon: "✨" },
  { id: "Eclipse", name: "Eclipse", description: "Mysterious & Deep (True Crime/Mystery)", icon: "🌑" },
  { id: "Capella", name: "Capella", description: "Soft & Conversational (Vlogs/Stories)", icon: "🍃" },
];

const AVAILABLE_MUSIC = [
  { id: "none", name: "No Music", description: "Voice only", icon: "🔇", url: null },
  { id: "vlog", name: "Vlog Vibes", description: "Upbeat Energy", icon: "🎧", url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Tours/Enthusiast/Tours_-_01_-_Enthusiast.mp3" }, 
  { id: "lofi", name: "Lo-Fi Chill", description: "Relaxing Beats", icon: "🌙", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" }, 
  { id: "urban", name: "Urban Energy", description: "Deep & Powerful", icon: "🏙️", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" }, 
  { id: "happy", name: "Happy Times", description: "Acoustic Pop", icon: "☀️", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3" }, 
];

const QUICK_PHRASES = [
  { label: "Rachid Test", text: "اختبار تقني لصوت رشيد" },
  { label: "Greeting", text: "Salam l-khout, m-rhba bikom f-vlog jdid dial l-youm!" },
  { label: "CTA", text: "Ma-t-n-saw-ch l'like u l'partage, u khalli chi comment-aire chi n-adi!" },
  { label: "Hype", text: "L-youma ghadi n-warrikom chi h-aja k-h-ayaliya u m-out-i-vante!" },
  { label: "Reaction", text: "Chof had-chi ra ma-ym-k-n-ch, d-ak-chi s-3ib b-zaf m-t-ik-on-ch!" },
  { label: "Energy", text: "D-ak-chi n-adi k-naddi, s-m-3 l-had l'energy ra-ha t-ay-r-a!" },
  { label: "Outro", text: "T-hallau f-ras-kom u n-t-chaufau f-vlog jdid inchaAllah, besslama!" },
];

export default function App() {
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'studio' | 'library' | 'settings' | 'discovery'>('studio');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [sharingItem, setSharingItem] = useState<HistoryItem | null>(null);
  const [isSharedIconVisible, setIsSharedIconVisible] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);
  const [error, setError] = useState<{ message: string; type: 'error' | 'warning' } | null>(null);
  const [isBuffering, setIsBuffering] = useState<string | null>(null);
  const [activeGenerations, setActiveGenerations] = useState<{ id: string; text: string }[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [currentVoiceDuration, setCurrentVoiceDuration] = useState<number>(0);
  const [originalVoiceBlob, setOriginalVoiceBlob] = useState<Blob | null>(null);
  const [isMixing, setIsMixing] = useState(false);
  const [showSFX, setShowSFX] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);
  const [cloningStatus, setCloningStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const [clonedSample, setClonedSample] = useState<string | null>(localStorage.getItem('cloned_voice_sample') || null);
  
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [exportingVideoId, setExportingVideoId] = useState<string | null>(null);
  const [exportingMp3Id, setExportingMp3Id] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    pitch: 0,
    speed: 1.0,
    energy: 0.85,
    voiceName: "v_01",
    bgMusic: "none",
    musicVolume: 0.15,
    voiceVolume: 1.0,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio Context & Nodes for Effects
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // Initialize Web Audio graph
  const initAudioContext = () => {
    if (audioCtxRef.current) return;
    if (!audioRef.current) return;

    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // Nodes
      const source = ctx.createMediaElementSource(audioRef.current);
      const masterGain = ctx.createGain();

      source.connect(masterGain);
      masterGain.connect(ctx.destination);

      // Save refs
      sourceNodeRef.current = source;
      masterGainRef.current = masterGain;
    } catch (err) {
      console.error("Web Audio API not supported or failed to init:", err);
    }
  };

  // Update volume based on master gain if needed, but we use audioRef.current.volume mostly
  // Master gain is here just to complete the graph or for future master control
  useEffect(() => {
    if (!audioCtxRef.current || !masterGainRef.current) return;
    masterGainRef.current.gain.setTargetAtTime(volume, audioCtxRef.current.currentTime, 0.05);
  }, [volume]);

  // Auto-save logic
  useEffect(() => {
    const savedScript = localStorage.getItem('studio_script_draft');
    if (savedScript && !text) {
      setText(savedScript);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (text) {
        localStorage.setItem('studio_script_draft', text);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [text]);

  // Handle recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleTranscription(audioBlob);
        
        // Stop all tracks in the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError({ message: "Ahya! Ma-9darnach n-sta3mlo l-micro dialek. Chof l-permissions dial l-browser.", type: 'warning' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Temporarily nullify the onstop to avoid transcription
      mediaRecorderRef.current.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setError(null);
    try {
      const transcribedText = await transcribeAudio(audioBlob);
      if (transcribedText) {
        setText(prev => prev ? `${prev}\n${transcribedText}` : transcribedText);
      }
    } catch (err: any) {
      console.error("Transcription failed:", err);
      if (err?.message?.includes("Service Temporarily Unavailable")) {
        setError({ message: "L-Gemini m-chargi d-aba, ma-9derch y-trancribi. Tsena chwiya u jarreb.", type: 'warning' });
      } else if (err?.message?.includes("API Quota Exceeded")) {
        setError({ message: "Ahya! Quota dial transcription tsala. Khallih y-rtah chwiya.", type: 'error' });
      } else {
        setError({ message: "Smeh lina, ma-9darnach n-f-hmo ach golti. 3awed jarreb chi m-ra khora.", type: 'error' });
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle tab switch - pause audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(null);
    }
  }, [activeTab]);

  // Sync audio progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setPlaybackTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      setPlaybackDuration(duration);
      
      // Update history item duration in state if missing
      if (isPlaying) {
        setHistory(prev => prev.map(item => {
          if (item.id === isPlaying && (!item.duration || item.duration === 0)) {
            return { ...item, duration };
          }
          return item;
        }));
      }
    };

    const handleEnded = () => {
      setIsPlaying(null);
      setPlaybackTime(0);
      setPlaybackDuration(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isPlaying]);

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setPlaybackTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    setVolume(prev => {
      const newVal = prev > 0 ? 0 : 0.8;
      if (audioRef.current) audioRef.current.volume = newVal;
      return newVal;
    });
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  // Handle theme change
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0] as File;
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        simulateUpload(file);
      } else {
        setError({ message: "Smeh lina, ghir l-audio u l-video li mqboulin hna.", type: 'warning' });
      }
    }
  };

  const simulateUpload = (file: File) => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          
          // Actually set the music after "uploading"
          if (file.type.startsWith('audio/')) {
            if (voiceSettings.customMusicUrl) {
              URL.revokeObjectURL(voiceSettings.customMusicUrl);
            }
            const url = URL.createObjectURL(file);
            setVoiceSettings(prevSettings => ({
              ...prevSettings,
              bgMusic: 'custom',
              customMusicUrl: url
            }));
          }

          setTimeout(() => setUploadProgress(null), 1000);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedAutoPlay = localStorage.getItem("darija_vlog_autoplay");
    if (savedAutoPlay !== null) {
      setAutoPlay(savedAutoPlay === "true");
    }
  }, []);

  // Save autoPlay preference
  useEffect(() => {
    localStorage.setItem("darija_vlog_autoplay", autoPlay.toString());
  }, [autoPlay]);

  const sampleRate = 44100; // Standard sample rate

  const mixAudio = async (voiceBlob: Blob, musicUrl: string | null, settings: VoiceSettings, effects: TimelineItem[] = []) => {
    // Determine which music URL to use
    const finalMusicUrl = settings.customMusicUrl || musicUrl;
    
    // If no music and no effects and no timeline, return original blob
    if (!finalMusicUrl && effects.length === 0) return voiceBlob;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const voiceArrayBuffer = await voiceBlob.arrayBuffer();
      const voiceBuffer = await audioCtx.decodeAudioData(voiceArrayBuffer);

      let musicBuffer: AudioBuffer | null = null;
      if (finalMusicUrl) {
        try {
          const isExternal = finalMusicUrl.startsWith('http');
          const urlsToTry = isExternal ? [
            `https://corsproxy.io/?${encodeURIComponent(finalMusicUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(finalMusicUrl)}`
          ] : [finalMusicUrl];
          
          let musicArrayBuffer: ArrayBuffer | null = null;
          
          for (const url of urlsToTry) {
            try {
              const musicResponse = await fetch(url);
              if (musicResponse.ok) {
                musicArrayBuffer = await musicResponse.arrayBuffer();
                if (musicArrayBuffer.byteLength > 0) break;
              }
            } catch (e) {
              console.warn(`Failed fetch via ${url}`, e);
            }
          }
          
          if (!musicArrayBuffer) {
            throw new Error("Music buffer is empty or all fetches failed");
          }
          
          musicBuffer = await audioCtx.decodeAudioData(musicArrayBuffer);
        } catch (me) {
          console.error("Music load failed:", me);
        }
      }

      // Load all effect buffers
      const effectBuffers: { item: TimelineItem; buffer: AudioBuffer }[] = [];
      for (const item of effects) {
        try {
          const isExternalEffect = item.effect.url.startsWith('http');
          const effectUrlsToTry = isExternalEffect ? [
            `https://corsproxy.io/?${encodeURIComponent(item.effect.url)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(item.effect.url)}`
          ] : [item.effect.url];
          
          let arrayBuf: ArrayBuffer | null = null;
          
          for (const url of effectUrlsToTry) {
             try {
                const res = await fetch(url);
                if (res.ok) {
                  arrayBuf = await res.arrayBuffer();
                  if (arrayBuf.byteLength > 0) break;
                }
             } catch (e) {
                console.warn(`Failed fetch effect via ${url}`, e);
             }
          }
          
          if (!arrayBuf) throw new Error("Could not load effect " + item.effect.url);

          const buf = await audioCtx.decodeAudioData(arrayBuf);
          effectBuffers.push({ item, buffer: buf });
        } catch (ee) {
          console.error(`Failed to load SFX ${item.effect.name}:`, ee);
        }
      }

      // Create an offline context to render the mix
      // Find max duration
      let maxDuration = voiceBuffer.duration;
      effectBuffers.forEach(({ item, buffer }) => {
        maxDuration = Math.max(maxDuration, item.startTime + buffer.duration);
      });

      const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * maxDuration), sampleRate);

      // --- VOICE CHAIN ---
      const voiceSource = offlineCtx.createBufferSource();
      voiceSource.buffer = voiceBuffer;

      const voiceGain = offlineCtx.createGain();
      voiceGain.gain.value = settings.voiceVolume ?? 1.0;

      let lastNode: AudioNode = voiceSource;
      lastNode.connect(voiceGain);
      voiceGain.connect(offlineCtx.destination);

      // --- MUSIC CHAIN ---
      if (musicBuffer) {
        const musicSource = offlineCtx.createBufferSource();
        musicSource.buffer = musicBuffer;
        musicSource.loop = true;
        const musicGain = offlineCtx.createGain();
        musicGain.gain.value = settings.musicVolume || 0.15;
        musicSource.connect(musicGain);
        musicGain.connect(offlineCtx.destination);
        musicSource.start(0);
      }

      // --- EFFECTS CHAIN ---
      effectBuffers.forEach(({ item, buffer }) => {
        const sfxSource = offlineCtx.createBufferSource();
        sfxSource.buffer = buffer;
        const sfxGain = offlineCtx.createGain();
        sfxGain.gain.value = item.volume;
        sfxSource.connect(sfxGain);
        sfxGain.connect(offlineCtx.destination);
        sfxSource.start(item.startTime);
      });

      voiceSource.start(0);

      const renderedBuffer = await offlineCtx.startRendering();
      
      // Convert rendered buffer to WAV
      return audioBufferToWav(renderedBuffer);
    } catch (e) {
      console.error("Audio processing failed, falling back to voice only", e);
      return voiceBlob;
    }
  };

  // Load history from IndexedDB on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const items = await getAllHistoryItems();
        // Hydrate audio URLs from stored blobs
        const hydrated = items.map(item => {
          if (item.audioBlob) {
            const url = URL.createObjectURL(item.audioBlob);
            return { ...item, audioUrl: url };
          }
          // Fallback for legacy base64 if it still exists
          if (item.audioBase64) {
            const blob = base64ToBlob(item.audioBase64, item.mimeType || "audio/mpeg");
            if (blob) {
              const url = URL.createObjectURL(blob);
              return { ...item, audioUrl: url };
            }
          }
          return item;
        });
        setHistory(hydrated.sort((a, b) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error("Failed to load history from DB", e);
        // Fallback to legacy localStorage if available
        const saved = localStorage.getItem("darija_vlog_history");
        if (saved) {
          try {
            const parsed: HistoryItem[] = JSON.parse(saved);
            setHistory(parsed);
          } catch (le) {
            console.error("LocalStorage fallback failed", le);
          }
        }
      }
    };
    loadHistory();
  }, []);

  const handleCustomMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError({ message: "Smeh lina, ghir l-audio li mqboulin hna bash t-dir background music.", type: 'warning' });
      return;
    }

    if (voiceSettings.customMusicUrl) {
      URL.revokeObjectURL(voiceSettings.customMusicUrl);
    }

    const url = URL.createObjectURL(file);
    setVoiceSettings(prev => ({
      ...prev,
      bgMusic: 'custom',
      customMusicUrl: url
    }));
  };

  const clearCustomMusic = () => {
    if (voiceSettings.customMusicUrl) {
      URL.revokeObjectURL(voiceSettings.customMusicUrl);
    }
    setVoiceSettings(prev => ({
      ...prev,
      bgMusic: 'none',
      customMusicUrl: undefined
    }));
  };

  const handleVoiceCloneUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCloningStatus('uploading');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setCloningStatus('processing');
        setTimeout(() => {
          const result = event.target?.result as string;
          setClonedSample(result);
          localStorage.setItem('cloned_voice_sample', result);
          setCloningStatus('done');
          setVoiceSettings(prev => ({ ...prev, voiceName: 'custom' }));
          
          setTimeout(() => setCloningStatus('idle'), 3000);
        }, 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearVoiceClone = () => {
    setClonedSample(null);
    localStorage.removeItem('cloned_voice_sample');
    if (voiceSettings.voiceName === 'custom') {
      setVoiceSettings(prev => ({ ...prev, voiceName: 'Achernar' }));
    }
    setCloningStatus('idle');
  };

  const handleSummarize = async () => {
    if (!text.trim() || isSummarizing) return;
    
    setIsSummarizing(true);
    setError(null);
    try {
      const summary = await summarizeScript(text);
      setText(summary);
    } catch (error) {
      console.error("Summarization error:", error);
      setError({ 
        message: "Ma-9darnach n-summariziw l-text. Jarreb chwiya akhor.", 
        type: 'error' 
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const addPhrase = (phrase: string) => {
    setText(prev => prev ? `${prev} ${phrase}` : phrase);
  };

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return;

    const pendingId = generateId();
    setIsGenerating(true);
    setError(null);
    setActiveGenerations(prev => [...prev, { id: pendingId, text }]);
    
    try {
      const audioResult = await generateYouTuberAudio(text, voiceSettings);
      
      const voiceBlob = base64ToBlob(audioResult.data, audioResult.mimeType);
      if (!voiceBlob) throw new Error("Could not create audio blob");
      setOriginalVoiceBlob(voiceBlob);
      
      // Detect voice duration before mixing
      let voiceDuration = 0;
      try {
        const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const voiceArrayBuf = await voiceBlob.arrayBuffer();
        const voiceAudioBuf = await tempCtx.decodeAudioData(voiceArrayBuf);
        voiceDuration = voiceAudioBuf.duration;
        setCurrentVoiceDuration(voiceDuration);
        tempCtx.close();
      } catch (de) {
        console.error("Voice duration detection failed", de);
      }

      // Mix and Process Audio
      const selectedMusic = AVAILABLE_MUSIC.find(m => m.id === voiceSettings.bgMusic);
      const mixedBlob = await mixAudio(voiceBlob, selectedMusic?.url || null, voiceSettings, timeline);
      
      const audioUrl = URL.createObjectURL(mixedBlob);

      // Convert mixed blob back to base64 for persistence
      const reader = new FileReader();
      const mixedBase64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(mixedBlob);
      });
      const mixedBase64 = await mixedBase64Promise;
      
      // Detect duration
      let duration = 0;
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuf = await mixedBlob.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        duration = audioBuf.duration;
        ctx.close();
      } catch (de) {
        console.error("Duration detection failed during generation", de);
      }
      
      const newItem: HistoryItem = {
        id: pendingId,
        text: text,
        audioBase64: mixedBase64,
        mimeType: "audio/wav",
        audioUrl: audioUrl,
        timestamp: Date.now(),
        duration,
      };

      setPreviewItem(newItem);
    } catch (error: any) {
      console.error("Generation error:", error);
      
      // Improved quota error detection for different object shapes
      const isQuotaError = 
        error?.status === "RESOURCE_EXHAUSTED" ||
        error?.code === 429 ||
        error?.error?.code === 429 ||
        error?.error?.status === "RESOURCE_EXHAUSTED" ||
        error?.message?.includes("429") ||
        error?.message?.includes("quota") ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.error?.message?.includes("quota") ||
        JSON.stringify(error).includes("429") ||
        JSON.stringify(error).includes("RESOURCE_EXHAUSTED");

      const isPrepaymentError = 
        error?.message?.includes("prepayment credits") ||
        JSON.stringify(error).includes("prepayment credits");

      const isAuthError = 
        error?.message?.includes("API key not valid") ||
        error?.message?.includes("API_KEY_INVALID") ||
        error?.message?.includes("403") ||
        error?.message?.toLowerCase().includes("permission denied") ||
        JSON.stringify(error).includes("API_KEY_INVALID");

      if (isAuthError && window.aistudio?.openSelectKey) {
        setIsGenerating(false);
        setActiveGenerations(prev => prev.filter(g => g.id !== pendingId));
        await window.aistudio.openSelectKey();
        return; // Stop here, the user can try again after selecting the key
      }

      if (isPrepaymentError) {
        setError({ 
          message: "Mouchkil f-l'account dial AI Studio! L-credits dialek t-salaw (Prepayment credits depleted). Khassk t-chouf l-billing dialk f-https://ai.studio/ bach t-kammel.", 
          type: 'error' 
        });
      } else if (isQuotaError || error?.message?.includes("API Quota Exceeded")) {
        setError({ 
          message: "Ahya! L-studio 3ya chwiya (Quota reached). L-Gemini 3ya mn l-khraza, khallih y-rtah chwiya u rje3 mn b3d bash t-kammel l-studio dialek. Ila b9a had l-mouchkil, chouf l-API key dialk f-settings.", 
          type: 'error' 
        });
      } else if (error?.message?.includes("safety filters")) {
        setError({ 
          message: "Ahya! Had l-hadra b-hal ila fiha chi hadra khayba. L-Gemini ma-bghach y-goulha. Jarreb chi haja khra.", 
          type: 'warning' 
        });
      } else if (error?.message?.includes("Service Temporarily Unavailable")) {
        setError({ 
          message: "L-Gemini d-aba m-chargi b-zaf (High demand). Tsena chi swiya u 3awed jarreb.", 
          type: 'warning' 
        });
      } else {
        setError({ 
          message: error?.message || "Ahya! Ma-9darnach n-sawbo l-vlog. 3awed jarreb chwiya akhor, imken chi mouchkil f-l'internet.", 
          type: 'error' 
        });
      }
    } finally {
      setIsGenerating(false);
      setActiveGenerations(prev => prev.filter(g => g.id !== pendingId));
    }
  };

  const handlePlay = (id: string, url: string | undefined) => {
    if (!url) {
      alert("Audio not available.");
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    // Ensure Web Audio context is initialized
    initAudioContext();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (isPlaying === id) {
      audio.pause();
      setIsPlaying(null);
    } else {
      // 1. Pause current playback
      audio.pause();
      
      // 2. Set new source
      // Don't use removeAttribute('src') here as it can cause "media removed" errors if followed immediately by play()
      audio.src = url;
      
      // 3. Load and Play
      audio.load();
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          // AbortError is common if user clicks rapidly, we can ignore it
          if (e.name !== "AbortError") {
            console.error("Playback failed:", e);
          }
          setIsPlaying(null);
        });
      }
      setIsPlaying(id);
    }
  };

  const handleShare = async (item: HistoryItem, type: 'native' | 'copy' = 'native') => {
    if (type === 'copy') {
      try {
        await navigator.clipboard.writeText(`${item.text}\n\nGenerated by DarijaVlog AI: ${window.location.href}`);
        setIsSharedIconVisible(item.id);
        setTimeout(() => setIsSharedIconVisible(null), 2000);
        setSharingItem(null);
      } catch (err) {
        console.error("Failed to copy text", err);
        setError({ message: "Ma-bghach y-t-copia l-text. Dirha rassek!", type: 'error' });
      }
      return;
    }

    if (!navigator.share) {
      handleShare(item, 'copy');
      return;
    }

    try {
      // If we have the audio blob, we can try sharing the file
      if (item.audioUrl) {
        const response = await fetch(item.audioUrl);
        const blob = await response.blob();
        const extension = (item.mimeType?.includes("wav") || item.mimeType?.includes("pcm")) ? "wav" : "mp3";
        const file = new File([blob], `darija-vlog-${item.id.slice(0, 5)}.${extension}`, { type: extension === "wav" ? "audio/wav" : "audio/mpeg" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'DarijaVlog AI',
            text: item.text,
            files: [file],
          });
        } else {
          await navigator.share({
            title: 'DarijaVlog AI',
            text: item.text,
            url: window.location.href,
          });
        }
      } else {
        await navigator.share({
          title: 'DarijaVlog AI',
          text: item.text,
          url: window.location.href,
        });
      }
      setSharingItem(null);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Error sharing", error);
        setError({ message: "Ma-9darnach n-partagiw l-vlog. Jarreb n-copy l-text.", type: 'warning' });
      }
    }
  };

  const handleRemix = async () => {
    if (!originalVoiceBlob || isMixing) return;
    setIsMixing(true);
    try {
      const selectedMusic = AVAILABLE_MUSIC.find(m => m.id === voiceSettings.bgMusic);
      const mixedBlob = await mixAudio(originalVoiceBlob, selectedMusic?.url || null, voiceSettings, timeline);
      const audioUrl = URL.createObjectURL(mixedBlob);

      // Detect duration
      let duration = 0;
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuf = await mixedBlob.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        duration = audioBuf.duration;
        ctx.close();
      } catch (de) {
        console.error("Duration detection failed during remix", de);
      }

      const reader = new FileReader();
      const mixedBase64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(mixedBlob);
      });
      const mixedBase64 = await mixedBase64Promise;

      if (previewItem) {
        setPreviewItem({
          ...previewItem,
          audioUrl,
          audioBase64: mixedBase64,
          duration
        });
      }
    } catch (err) {
      console.error("Remix failed:", err);
      setError({ message: "Ahya! Ma-9darnach n-3awdo n-mixiw l-audio. Chof l'internet dialek.", type: 'error' });
    } finally {
      setIsMixing(false);
    }
  };
  const deleteHistory = async (id: string) => {
    const item = history.find(h => h.id === id);
    if (item?.audioUrl) {
      URL.revokeObjectURL(item.audioUrl);
    }
    
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (isPlaying === id) {
        audioRef.current?.pause();
        setIsPlaying(null);
      }
    } catch (e) {
      console.error("Failed to delete item from DB", e);
    }
  };

  const handleClearHistory = async () => {
    if (history.length === 0) return;
    
    if (window.confirm("Are you sure you want to clear all your saved media history? This action cannot be undone.")) {
      try {
        await clearAllHistoryItems();
        // Revoke all existing URLs
        history.forEach(item => {
          if (item.audioUrl) URL.revokeObjectURL(item.audioUrl);
        });
        setHistory([]);
        if (isPlaying) {
          audioRef.current?.pause();
          setIsPlaying(null);
        }
      } catch (e) {
        console.error("Failed to clear history", e);
      }
    }
  };

  const handleShareCurrentText = async () => {
    if (!text.trim()) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DarijaVlog AI Script',
          text: text,
          url: window.location.href,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("Error sharing text", error);
          setError({ message: "Ma-9darnach n-partagiw l-hdra. Jarreb t-copyha.", type: 'warning' });
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setIsSharedIconVisible("current-input");
        setTimeout(() => setIsSharedIconVisible(null), 2000);
      } catch (err) {
        console.error("Failed to copy text", err);
        setError({ message: "Ma-9darnach n-copyiw l-hdra. Dirha rassek!", type: 'error' });
      }
    }
  };

  const handleDownload = (item: HistoryItem) => {
    if (!item.audioUrl) {
      alert("Audio not available for download.");
      return;
    }
    
    setDownloadingIds(item.id);
    
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = item.audioUrl!;
      const extension = (item.mimeType?.includes("wav") || item.mimeType?.includes("pcm")) ? "wav" : "mp3";
      a.download = `darija-vlog-${item.id.slice(0, 5)}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadingIds(null);
    }, 500);
  };

  const handleDownloadMp3 = async (item: HistoryItem) => {
    if (!item.audioUrl || exportingMp3Id) return;
    
    setExportingMp3Id(item.id);
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(item.audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const mp3Blob = await audioBufferToMp3(audioBuffer);
      const mp3Url = URL.createObjectURL(mp3Blob);
      
      const a = document.createElement("a");
      a.href = mp3Url;
      a.download = `darija-vlog-studio-${item.id.slice(0, 5)}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(mp3Url), 100);
      setExportingMp3Id(null);
    } catch (err) {
      console.error("MP3 export failed", err);
      setError({ message: "Ma-9darnach n-sawbo l-MP3. Jarreb chwiya akhor.", type: 'error' });
      setExportingMp3Id(null);
    }
  };

  const exportToVideo = async (item: HistoryItem) => {
    if (!item.audioUrl || exportingVideoId) return;
    
    setExportingVideoId(item.id);
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(item.audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Setup Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d')!;
      
      // Setup Audio for playback during recording
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      // We don't connect to destination to avoid speaker output while recording
      
      // MediaRecorder Setup
      const stream = canvas.captureStream(30); // 30 FPS
      const audioStream = audioContext.createMediaStreamDestination();
      source.connect(audioStream);
      
      const tracks = [...stream.getVideoTracks(), ...audioStream.stream.getAudioTracks()];
      const combinedStream = new MediaStream(tracks);
      
      // Check for supported mime type
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
        ? 'video/webm;codecs=vp9,opus' 
        : 'video/webm';
        
      const recorder = new MediaRecorder(combinedStream, {
        mimeType
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `darija-vlog-${item.id.slice(0, 5)}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setExportingVideoId(null);
      };
      
      recorder.start();
      source.start(0);
      
      // Visualizer Loop
      const draw = () => {
        if (source.onended === null) {
          source.onended = () => {
            recorder.stop();
            audioContext.close();
          };
        }
        
        if (recorder.state === 'inactive') return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Background
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(0, 0, 1280, 720);
        
        // Dynamic Glow based on audio
        let avg = 0;
        for(let i=0; i<bufferLength; i++) avg += dataArray[i];
        avg /= bufferLength;
        
        const glowGrad = ctx.createRadialGradient(640, 360, 0, 640, 360, 400 + avg);
        glowGrad.addColorStop(0, `rgba(255, 69, 0, ${avg/400})`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, 1280, 720);

        // Visualizer Bars
        const barWidth = (1280 / bufferLength);
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * 400;
          
          const grad = ctx.createLinearGradient(0, 720, 0, 720 - barHeight);
          grad.addColorStop(0, '#ff4500');
          grad.addColorStop(1, '#ff8c00');
          
          ctx.fillStyle = grad;
          ctx.fillRect(x, 720 - barHeight, barWidth - 2, barHeight);
          
          x += barWidth;
        }
        
        // Text Overlay
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 60px Inter, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DarijaVlog AI', 640, 300);
        
        ctx.font = '30px Inter, Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const words = item.text.split(' ');
        let line = '';
        let y = 400;
        for(let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + ' ';
          if (testLine.length > 40 && n > 0) {
            ctx.fillText(line, 640, y);
            line = words[n] + ' ';
            y += 40;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 640, y);
        ctx.shadowBlur = 0;

        // Progress bar
        const progress = (audioContext.currentTime / audioBuffer.duration);
        ctx.fillStyle = '#ff4500';
        ctx.fillRect(0, 710, 1280 * progress, 10);

        requestAnimationFrame(draw);
      };
      
      draw();
      
    } catch (err) {
      console.error("Video export failed", err);
      setError({ message: "Ma-9darnach n-sawbo l-video. Jarreb chwiya akhor.", type: 'error' });
      setExportingVideoId(null);
    }
  };

  const handleConfirmPreview = async () => {
    if (!previewItem || history.some(h => h.id === previewItem.id)) return;
    
    try {
      // Get the actual blob to store it efficiently and calculate duration
      let blobToStore: Blob | undefined;
      let duration = previewItem.duration;

      if (previewItem.audioUrl) {
        const response = await fetch(previewItem.audioUrl);
        blobToStore = await response.blob();
        
        // Try to get duration if not present
        if (!duration) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuf = await blobToStore.arrayBuffer();
            const audioBuf = await ctx.decodeAudioData(arrayBuf);
            duration = audioBuf.duration;
            ctx.close();
          } catch (de) {
            console.error("Duration detection failed", de);
          }
        }
      }

      const itemToSave = { 
        ...previewItem,
        duration,
        audioBlob: blobToStore,
        audioBase64: undefined // Don't store large base64 anymore
      };

      await saveHistoryItem(itemToSave, blobToStore);
      await clearOldItems(50); // Keep last 50 items

      setHistory((prev) => [itemToSave, ...prev]);
      setText("");
      if (autoPlay) {
        handlePlay(itemToSave.id, itemToSave.audioUrl);
      }
      setPreviewItem(null);
    } catch (e) {
      console.error("Failed to save item to DB", e);
      setError({ message: "Ma-9darnach n-sifto l-vlog l-library. Jarreb chwiya akhor.", type: 'error' });
    }
  };

  const handleDiscardPreview = () => {
    if (previewItem?.audioUrl) {
      URL.revokeObjectURL(previewItem.audioUrl);
    }
    setPreviewItem(null);
  };

  const handleAddEffect = (sfx: SoundEffectType) => {
    const newItem: TimelineItem = {
      id: generateId(),
      effect: sfx,
      startTime: 0,
      volume: 0.8
    };
    setTimeline(prev => [...prev, newItem]);
  };

  const removeTimelineItem = (id: string) => {
    setTimeline(prev => prev.filter(item => item.id !== id));
  };

  const updateTimelineItem = (id: string, updates: Partial<TimelineItem>) => {
    setTimeline(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handlePreviewVoice = async (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();
    if (isPreviewing) return;
    
    try {
      setIsPreviewing(voiceId);
      const previewText = "Hello! This is a test of my voice persona. What do you think?";
      const response = await generateYouTuberAudio(previewText, {
        ...voiceSettings,
        voiceName: voiceId,
        energy: 0.7,
        pitch: 0,
        speed: 1.0
      });
      
      const blob = base64ToBlob(response.data, response.mimeType);
      if (!blob) throw new Error("Could not create audio blob");
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setIsPreviewing(null);
        URL.revokeObjectURL(audioUrl);
      };
      await audio.play();
    } catch (err) {
      console.error("Preview failed:", err);
      setIsPreviewing(null);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row overflow-hidden ${theme} ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'} transition-colors duration-300`}>
      <audio 
        ref={audioRef} 
        onEnded={() => {
          setIsPlaying(null);
          setIsBuffering(null);
        }}
        onWaiting={() => setIsBuffering(isPlaying)}
        onPlaying={() => setIsBuffering(null)}
        onLoadStart={() => isPlaying && setIsBuffering(isPlaying)}
        onCanPlay={() => isBuffering === isPlaying && setIsBuffering(null)}
        onError={(e) => {
          const target = e.target as HTMLAudioElement;
          console.error("Audio Element Error:", {
            code: target.error?.code,
            message: target.error?.message,
            src: target.src.substring(0, 50) + "..."
          });
          setIsPlaying(null);
          setIsBuffering(null);
        }}
      />

      {/* Mobile Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 z-[60] h-20 md:hidden flex items-center justify-around border-t backdrop-blur-xl ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-100'} px-6 safe-area-pb`}>
        <button 
          onClick={() => setActiveTab('studio')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'studio' ? 'text-indigo-500 scale-110' : 'opacity-40 hover:opacity-100'}`}
        >
          <div className={`p-2 rounded-xl ${activeTab === 'studio' ? 'bg-indigo-500/10' : ''}`}>
            <Mic2 className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Studio</span>
        </button>
        <button 
          onClick={() => setActiveTab('discovery')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'discovery' ? 'text-indigo-500 scale-110' : 'opacity-40 hover:opacity-100'}`}
        >
          <div className={`p-2 rounded-xl ${activeTab === 'discovery' ? 'bg-indigo-500/10' : ''}`}>
            <Search className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Discover</span>
        </button>
        <button 
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'library' ? 'text-indigo-500 scale-110' : 'opacity-40 hover:opacity-100'}`}
        >
          <div className={`p-2 rounded-xl relative ${activeTab === 'library' ? 'bg-indigo-500/10' : ''}`}>
            <Library className="w-6 h-6" />
            {history.length > 0 && activeTab !== 'library' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                {history.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Clips</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-indigo-500 scale-110' : 'opacity-40 hover:opacity-100'}`}
        >
          <div className={`p-2 rounded-xl ${activeTab === 'settings' ? 'bg-indigo-500/10' : ''}`}>
            <Settings2 className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Tune</span>
        </button>
      </nav>

      {/* Sidebar Navigation (Desktop only) */}
      <aside className={`hidden md:flex fixed inset-y-0 left-0 z-50 w-64 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out border-r ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mic2 className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight">DarijaVlog <span className="text-indigo-500">Studio</span></h1>
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">AI Powered</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2">
            <button 
              onClick={() => setActiveTab('studio')}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'studio' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800 opacity-60 hover:opacity-100'}`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Studio</span>
              </div>
              {activeTab === 'studio' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
            <button 
              onClick={() => setActiveTab('discovery')}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'discovery' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800 opacity-60 hover:opacity-100'}`}
            >
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5" />
                <span className="font-medium">Discovery</span>
              </div>
              {activeTab === 'discovery' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'library' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800 opacity-60 hover:opacity-100'}`}
            >
              <div className="flex items-center gap-3">
                <Library className="w-5 h-5" />
                <span className="font-medium">Saved Media</span>
              </div>
              {history.length > 0 && activeTab !== 'library' && (
                <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {history.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800 opacity-60 hover:opacity-100'}`}
            >
              <Settings2 className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
          </nav>

          {/* User Profile / Status */}
          <div className={`p-4 mx-4 mb-6 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Plan</p>
                <p className="text-xs font-bold truncate">Pro Moroccan</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="w-2/3 h-full bg-indigo-500" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className={`h-16 md:h-20 px-4 md:px-8 flex items-center justify-between border-b ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white/80 border-slate-100'} backdrop-blur-md z-20`}>
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mic2 className="text-white w-4 h-4" />
            </div>
            <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] opacity-60">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 md:p-2.5 rounded-xl transition-all bg-slate-100 dark:bg-slate-800 hover:scale-105 active:scale-95"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" /> : <Moon className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />}
            </button>
            <div className="h-6 md:h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
            <div className="flex items-center gap-2 md:gap-3 pl-1 md:pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] md:text-xs font-bold">Youtuber Pro</p>
                <p className="text-[8px] md:text-[10px] opacity-30 uppercase tracking-tighter">Verified Studio</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/40" />
            </div>
          </div>
        </header>

        {/* Dynamic Canvas Container */}
        <div className="flex-1 overflow-y-auto studio-grid p-6 relative">
          <AnimatePresence mode="wait">
            {activeTab === 'discovery' && (
              <motion.div
                key="discovery"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl mx-auto pb-32 md:pb-20"
              >
                <VoiceDiscovery 
                  selectedVoiceId={voiceSettings.voiceName}
                  onSelectVoice={(talent) => {
                    setVoiceSettings(prev => ({ ...prev, voiceName: talent.id }));
                    setActiveTab('studio');
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'studio' && (
              <motion.div 
                key="studio"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-32 md:pb-20"
              >
                {/* Hero Header */}
                <div className="space-y-2">
                  <h3 className="text-2xl md:text-4xl font-display font-black tracking-tight italic">
                    Sajjel <span className="text-indigo-600">Vlog</span> dialek m3ana!
                  </h3>
                  <p className="text-xs md:text-sm opacity-50 font-medium leading-relaxed">Use AI to generate professional Moroccan Darija voiceovers for your videos.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Script Input */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className={`p-1 rounded-[2rem] md:rounded-3xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} shadow-xl`}>
                      <div className="relative">
                        <textarea
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Ex: Salam l'khout! Lyouma ghadi n-warikom chi haja nadiya..."
                          className="w-full h-48 md:h-64 p-5 md:p-6 bg-transparent resize-none focus:outline-none text-base md:text-lg font-medium placeholder:opacity-20"
                        />
                        
                        {/* Recording Overlay */}
                        <AnimatePresence>
                          {(isRecording || isTranscribing) && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-20 rounded-[2rem] md:rounded-3xl bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                            >
                              {isRecording ? (
                                <>
                                  <div className="relative mb-6">
                                    <motion.div 
                                      animate={{ scale: [1, 1.2, 1] }} 
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                      className="w-24 h-24 md:w-32 md:h-32 bg-red-500/10 rounded-full flex items-center justify-center"
                                    >
                                      <Mic className="w-10 h-10 md:w-12 md:h-12 text-red-500" />
                                    </motion.div>
                                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full animate-pulse uppercase tracking-widest">
                                      Rec
                                    </div>
                                  </div>
                                  <h4 className="text-xl md:text-2xl font-display font-black tracking-tight mb-2 italic">Dwi m3a l-khraza...</h4>
                                  <p className="text-3xl md:text-4xl font-mono font-black mb-8 text-red-500">{formatRecordingTime(recordingDuration)}</p>
                                  
                                  <div className="flex gap-3 md:gap-4">
                                    <button 
                                      onClick={cancelRecording}
                                      className="px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-sm md:text-base hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                                    >
                                      Annuler
                                    </button>
                                    <button 
                                      onClick={stopRecording}
                                      className="px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl bg-red-500 text-white font-bold text-sm md:text-base hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/30 flex items-center gap-2"
                                    >
                                      <Square className="w-4 h-4 fill-current" />
                                      Habes u Transcribe
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-24 h-24 md:w-32 md:h-32 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                                    <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-indigo-500 animate-spin" />
                                  </div>
                                  <h4 className="text-xl md:text-2xl font-display font-black tracking-tight mb-2 italic">Kansm3o lik chwiya...</h4>
                                  <p className="text-xs md:text-sm opacity-50 font-medium">L-khraza gha-itranscribi d-akchi li golti d-aba...</p>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 flex items-center gap-2 md:gap-3">
                          <button
                            onClick={startRecording}
                            disabled={isRecording || isTranscribing}
                            className={`p-2.5 md:p-3 rounded-full transition-all group relative ${
                              isRecording 
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-110 active:scale-90'
                            }`}
                            title="Record your voice"
                          >
                            <Mic className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[9px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Dwi b-femmek
                            </span>
                          </button>
                          
                          <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                          
                          {text.length > 300 && (
                            <button
                              onClick={handleSummarize}
                              disabled={isSummarizing}
                              className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl bg-indigo-500/10 text-indigo-500 text-[8px] md:text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-1 md:gap-2"
                            >
                              {isSummarizing ? (
                                <div className="w-2.5 h-2.5 md:w-3 md:h-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                              ) : (
                                <Sliders className="w-2.5 md:w-3 h-2.5 md:h-3" />
                              )}
                              Shorten
                            </button>
                          )}
                          <span className="px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-[8px] md:text-[10px] font-mono opacity-40">
                            {text.length}
                          </span>
                        </div>
                      </div>
                      
                      {/* Quick Phrases */}
                      <div className="p-3 md:p-4 border-t border-slate-50 dark:border-slate-800 flex flex-wrap gap-1.5 md:gap-2">
                        <span className="text-[9px] md:text-[10px] font-bold opacity-30 uppercase tracking-widest w-full mb-0.5">Quick Add:</span>
                        {QUICK_PHRASES.map((phrase, idx) => (
                          <button
                            key={idx}
                            onClick={() => addPhrase(phrase.text)}
                            className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] md:text-xs font-bold opacity-60 hover:opacity-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all border border-transparent hover:border-indigo-500/30"
                          >
                            {phrase.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 md:gap-4">
                      <button
                        onClick={handleGenerate}
                        disabled={!text.trim() || isGenerating}
                        className={`flex-1 h-14 md:h-16 rounded-xl md:rounded-2xl font-display font-black text-sm md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all shadow-lg ${
                          !text.trim() || isGenerating
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:scale-[1.01] active:scale-[0.99]'
                        }`}
                      >
                        {isGenerating ? (
                          <>
                            <div className="w-4 h-4 md:w-5 md:h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                            <span className="hidden sm:inline">Generating Studio Audio...</span>
                            <span className="sm:hidden">Saber...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 md:w-5 md:h-5" />
                            <span>Sawweb l-Vlog</span>
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => setText('')}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 group transition-all"
                      >
                        <Trash2 className="w-5 h-5 opacity-30 group-hover:opacity-100 group-hover:text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Upload & Tuning */}
                  <div className="space-y-6">
                    {/* Modern Upload Section */}
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative group h-40 md:h-48 rounded-[2rem] md:rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-5 md:p-6 text-center cursor-pointer overflow-hidden ${
                        isDragging 
                          ? 'border-indigo-500 bg-indigo-500/5' 
                          : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <input 
                        type="file" 
                        id="file-upload" 
                        className="hidden" 
                        onChange={(e) => e.target.files && simulateUpload(e.target.files[0])}
                        accept="audio/*,video/*"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 transition-all ${isDragging ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                          <Upload className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <p className="text-xs md:text-sm font-bold tracking-tight mb-0.5 md:mb-1">Add Background Audio</p>
                        <p className="text-[8px] md:text-[10px] opacity-40 uppercase font-bold">Drag & Drop or Tap to Browse</p>
                      </label>

                      {/* Progress Bar Overlay */}
                      {uploadProgress !== null && uploadProgress > 0 && (
                        <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 md:p-8 z-10 transition-opacity">
                          <p className="text-[10px] md:text-xs font-bold mb-2 md:mb-3">Uploading {uploadProgress}%</p>
                          <div className="w-full h-1.5 md:h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              className="h-full bg-indigo-500"
                            />
                          </div>
                          <p className="text-[8px] md:text-[10px] uppercase font-bold opacity-40">Mixing with AI Engine...</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Settings Panel */}
                    <div className={`p-5 md:p-6 rounded-[2rem] md:rounded-3xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} shadow-lg space-y-5 md:space-y-6`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-indigo-500" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Volume Mixer</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Auto</span>
                          <button
                            onClick={() => setAutoPlay(!autoPlay)}
                            className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-all duration-300 ${autoPlay ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <motion.div 
                              className={`w-3 h-3 rounded-full bg-white shadow-sm`}
                              animate={{ x: autoPlay ? 16 : 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-1 items-end h-4 pb-0.5">
                        <div className={`w-1 h-2 rounded-full ${voiceSettings.bgMusic !== 'none' ? 'bg-indigo-500/40 animate-pulse' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                        <div className={`w-1 h-3 rounded-full ${voiceSettings.bgMusic !== 'none' ? 'bg-indigo-500/70 animate-pulse delay-75' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                      </div>

                      {/* Advanced Audio Settings */}
                      <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-indigo-500" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Advanced Audio Settings</h4>
                        </div>
                        
                        {/* Pitch Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold opacity-40 uppercase">
                            <span>Pitch: {voiceSettings.pitch}</span>
                          </div>
                          <input 
                            type="range" min="-20" max="20" step="1"
                            value={voiceSettings.pitch}
                            onChange={(e) => setVoiceSettings(p => ({ ...p, pitch: parseFloat(e.target.value) }))}
                            className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>

                        {/* Speed Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold opacity-40 uppercase">
                            <span>Speed: {voiceSettings.speed.toFixed(2)}x</span>
                          </div>
                          <input 
                            type="range" min="0.25" max="4.0" step="0.25"
                            value={voiceSettings.speed}
                            onChange={(e) => setVoiceSettings(p => ({ ...p, speed: parseFloat(e.target.value) }))}
                            className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>

                        {/* Energy Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold opacity-40 uppercase">
                            <span>Energy: {Math.round(voiceSettings.energy * 100)}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="1" step="0.05"
                            value={voiceSettings.energy}
                            onChange={(e) => setVoiceSettings(p => ({ ...p, energy: parseFloat(e.target.value) }))}
                            className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Voice Volume Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">
                          <div className="flex items-center gap-2">
                            <Mic2 className="w-3 h-3" />
                            <label>Voice Balance</label>
                          </div>
                          <span className="text-indigo-500">{Math.round((voiceSettings.voiceVolume || 1.0) * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1.5" step="0.01"
                          value={voiceSettings.voiceVolume ?? 1.0}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, voiceVolume: parseFloat(e.target.value) }))}
                          className="w-full h-1.5 accent-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Music Volume Slider */}
                      <div className="space-y-2 md:space-y-3">
                        <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">
                          <div className="flex items-center gap-2">
                            <Music className="w-3 h-3" />
                            <label>Music Background</label>
                          </div>
                          <span className="text-indigo-500">{Math.round((voiceSettings.musicVolume || 0) * 200)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="0.5" step="0.01"
                          value={voiceSettings.musicVolume || 0}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, musicVolume: parseFloat(e.target.value) }))}
                          className="w-full h-1.5 accent-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <button 
                        onClick={() => setShowSFX(!showSFX)}
                        className={`w-full py-2.5 md:py-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${showSFX ? 'bg-indigo-600 text-white border-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <Music2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Sound FX Library
                      </button>
                      <button 
                        onClick={() => setActiveTab('settings')}
                        className="w-full py-2.5 md:py-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                        <Settings2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Advanced Audio FX
                      </button>
                    </div>
                  </div>

                  {/* SFX Library and Timeline */}
                  {showSFX && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4"
                    >
                      <div className="lg:col-span-1">
                        <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} shadow-lg h-full`}>
                          <h4 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            SFX Library
                          </h4>
                          <SoundEffects theme={theme} onAddEffect={handleAddEffect} />
                        </div>
                      </div>

                      <div className="lg:col-span-2">
                        <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} shadow-lg h-full`}>
                          <AudioTimeline 
                            theme={theme}
                            voiceDuration={currentVoiceDuration || (previewItem?.duration || 0)}
                            items={timeline}
                            onUpdateItem={updateTimelineItem}
                            onRemoveItem={removeTimelineItem}
                            onAddItem={(effect, startTime) => {
                              const newItem: TimelineItem = {
                                id: generateId(),
                                effect: effect as any,
                                startTime,
                                volume: 0.8
                              };
                              setTimeline(prev => [...prev, newItem]);
                            }}
                          />
                          
                          {timeline.length > 0 && originalVoiceBlob && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end"
                            >
                              <button
                                onClick={handleRemix}
                                disabled={isMixing}
                                className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all ${
                                  isMixing 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-95'
                                }`}
                              >
                                {isMixing ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Mixing...
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                    Apply Timeline Changes
                                  </>
                                )}
                              </button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'library' && (
              <motion.div 
                key="library"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-6xl mx-auto pb-32 md:pb-20 px-2 md:px-0"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div className="space-y-1">
                    <h3 className="text-2xl md:text-3xl font-display font-black tracking-tight uppercase">Saved <span className="text-indigo-600">Media</span></h3>
                    <p className="text-xs md:text-sm opacity-50 font-medium">Manage and export your generated Moroccan vlogs.</p>
                  </div>
                  <div className="self-start md:self-auto flex items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-500 text-[10px] md:text-xs font-bold border border-indigo-500/20">
                      <History className="w-4 h-4" />
                      {history.length} Clips
                    </div>
                    {history.length > 0 && (
                      <button 
                        onClick={handleClearHistory}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] md:text-xs font-black uppercase tracking-widest border border-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear History
                      </button>
                    )}
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center p-12 md:p-20 rounded-[2.5rem] md:rounded-[3rem] border-2 border-dashed ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                    <Library className="w-12 h-12 md:w-16 md:h-16 opacity-10 mb-4 md:mb-6" />
                    <p className="text-sm md:text-lg font-bold opacity-30 italic text-center">No media here yet. Start creating in the studio!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {history.map((item) => (
                      <motion.div
                        layout
                        key={item.id}
                        className={`group relative p-1 rounded-[2rem] md:rounded-[2.5rem] border-2 transition-all ${
                          isPlaying === item.id 
                            ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-500/20' 
                            : `${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} hover:border-indigo-400/50`
                        }`}
                      >
                        <div className={`p-5 md:p-6 h-full flex flex-col ${isPlaying === item.id ? 'text-white' : ''}`}>
                          <div className="flex items-center gap-3 mb-4 md:mb-5">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl border flex flex-col items-center justify-center transition-colors ${
                              isPlaying === item.id 
                                ? 'bg-white/20 border-white/30 text-white' 
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-indigo-600'
                            }`}>
                              <span className="text-[7px] md:text-[8px] font-black uppercase leading-none opacity-60 mb-0.5">
                                {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short' })}
                              </span>
                              <span className="text-sm md:text-base font-black leading-none">
                                {new Date(item.timestamp).getDate()}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1 opacity-40 mb-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest leading-none">
                                  Generated at
                                </span>
                              </div>
                              <span className={`text-[10px] md:text-xs font-black tracking-tight ${isPlaying === item.id ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                            
                            {/* Duration Indicator */}
                            {(item.duration || (isPlaying === item.id && playbackDuration)) && (
                              <div className={`ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                isPlaying === item.id 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                              }`}>
                                <Clock className="w-2.5 h-2.5 opacity-50" />
                                {formatTime(item.duration || (isPlaying === item.id ? playbackDuration : 0))}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-h-[60px] md:min-h-[80px]">
                            <p className={`text-xs md:text-sm font-bold leading-relaxed line-clamp-3 ${isPlaying === item.id ? 'text-white' : 'opacity-70'}`}>
                              "{item.text}"
                            </p>
                          </div>

                          {/* Progress/Seek Bar */}
                          {isPlaying === item.id && (
                            <div className="mt-4 px-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <input 
                                  type="range"
                                  min="0"
                                  max={playbackDuration || 0}
                                  value={playbackTime || 0}
                                  onChange={handleSeek}
                                  className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-white ${
                                    isPlaying === item.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                                  }`}
                                />
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={toggleMute}
                                    className="p-1 hover:bg-white/10 rounded-md transition-colors"
                                  >
                                    {volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-white/60" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
                                  </button>
                                  <input 
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-12 h-1 rounded-lg appearance-none cursor-pointer bg-white/20 accent-white"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-between text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60 text-white">
                                <span>{formatTime(playbackTime)}</span>
                                <span>{formatTime(playbackDuration)}</span>
                              </div>
                            </div>
                          )}

                          <div className="mt-5 md:mt-6 flex items-center justify-between gap-1.5 md:gap-2">
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <button 
                                onClick={() => handlePlay(item.id, item.audioUrl)}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${
                                  isPlaying === item.id 
                                    ? 'bg-white text-indigo-600' 
                                    : 'bg-indigo-600 text-white hover:scale-105 active:scale-95'
                                }`}
                              >
                                {isBuffering === item.id ? (
                                  <div className={`w-4 h-4 md:w-5 md:h-5 border-2 rounded-full animate-spin ${isPlaying === item.id ? 'border-indigo-600/20 border-t-indigo-600' : 'border-white/20 border-t-white'}`} />
                                ) : (
                                  isPlaying === item.id ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />
                                )}
                              </button>
                              <button 
                                onClick={() => setSharingItem(item)}
                                className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${isPlaying === item.id ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-60 hover:opacity-100'}`}
                              >
                                <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                              <button 
                                onClick={() => handleDownload(item)}
                                className={`flex w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl items-center justify-center transition-all ${isPlaying === item.id ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-60 hover:opacity-100'}`}
                                title="Download WAV"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDownloadMp3(item)}
                                disabled={!!exportingMp3Id}
                                className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${
                                  isPlaying === item.id 
                                    ? 'bg-white/10 hover:bg-white/20' 
                                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-60 hover:opacity-100'
                                } ${exportingMp3Id === item.id ? 'animate-pulse text-indigo-500' : ''}`}
                                title="Export as MP3"
                              >
                                {exportingMp3Id === item.id ? (
                                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                ) : (
                                  <FileAudio className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                )}
                              </button>
                              <button 
                                onClick={() => exportToVideo(item)}
                                className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${isPlaying === item.id ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-60 hover:opacity-100'}`}
                              >
                                {exportingVideoId === item.id ? (
                                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                ) : (
                                  <Video className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                )}
                              </button>
                            </div>
                            <button 
                              onClick={() => deleteHistory(item.id)}
                              className={`p-2 rounded-lg transition-all ${isPlaying === item.id ? 'hover:bg-white/20 text-white/60 hover:text-white' : 'text-slate-300 dark:text-slate-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto pb-32 md:pb-20 mt-4 px-2"
              >
                <div className="space-y-8 md:space-y-12">
                  {/* Voice Selector Section */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                        <Users className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <h3 className="text-lg md:text-xl font-display font-black tracking-tight uppercase">Voice Personas</h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
                      {AVAILABLE_VOICES.map((voice) => (
                        <div key={voice.id} className="relative group">
                          <button
                            onClick={() => setVoiceSettings(prev => ({ ...prev, voiceName: voice.id }))}
                            className={`w-full flex flex-col items-center justify-center p-3 md:p-4 rounded-3xl transition-all border-2 h-full ${
                              voiceSettings.voiceName === voice.id 
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                                : `${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} opacity-60 hover:opacity-100`
                            }`}
                          >
                            <span className="text-xl md:text-2xl mb-1">{voice.icon}</span>
                            <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">{voice.name}</span>
                            <p className="hidden md:block text-[8px] uppercase font-bold opacity-40 text-center w-full truncate px-2 mt-1">{voice.description}</p>
                          </button>
                          
                          <button
                            onClick={(e) => handlePreviewVoice(e, voice.id)}
                            disabled={isPreviewing === voice.id}
                            className={`absolute top-2 right-2 p-1.5 rounded-full transition-all scale-0 group-hover:scale-100 ${
                              voiceSettings.voiceName === voice.id
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md'
                            } ${isPreviewing === voice.id ? 'animate-pulse' : ''}`}
                            title="Listen Sample"
                          >
                            {isPreviewing === voice.id ? (
                              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Play className="w-3 h-3 fill-current" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Music Background Section */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-indigo-600 text-white">
                        <Music className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <h3 className="text-lg md:text-xl font-display font-black tracking-tight uppercase">Music Background</h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
                      {AVAILABLE_MUSIC.map((music) => (
                        <button
                          key={music.id}
                          onClick={() => setVoiceSettings(prev => ({ ...prev, bgMusic: music.id, customMusicUrl: undefined }))}
                          className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-3xl transition-all border-2 ${
                            voiceSettings.bgMusic === music.id 
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                              : `${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} opacity-60 hover:opacity-100`
                          }`}
                        >
                          <span className="text-xl md:text-2xl mb-1">{music.icon}</span>
                          <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">{music.name}</span>
                        </button>
                      ))}
                      
                      <div className="relative group">
                        <input 
                          type="file" 
                          id="custom-music-upload" 
                          accept="audio/*" 
                          className="hidden" 
                          onChange={handleCustomMusicUpload}
                        />
                        <label
                          htmlFor="custom-music-upload"
                          className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-3xl h-full transition-all border-2 border-dashed cursor-pointer ${
                            voiceSettings.bgMusic === 'custom'
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                              : `${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} opacity-60 hover:opacity-100 hover:border-indigo-400`
                          }`}
                        >
                          {voiceSettings.bgMusic === 'custom' ? (
                            <div className="flex flex-col items-center">
                              <span className="text-xl md:text-2xl mb-1">💿</span>
                              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Custom</span>
                              <button 
                                onClick={(e) => { e.preventDefault(); clearCustomMusic(); }}
                                className="mt-1 p-1 hover:bg-black/20 rounded-lg transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="w-5 h-5 md:w-6 md:h-6 mb-1" />
                              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Upload own</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="max-w-md">
                      <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">
                        <label>Background Volume</label>
                        <span className="text-indigo-500">{Math.round((voiceSettings.musicVolume || 0) * 200)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="0.5" step="0.01"
                        value={voiceSettings.musicVolume}
                        onChange={(e) => setVoiceSettings(prev => ({ ...prev, musicVolume: parseFloat(e.target.value) }))}
                        className="w-full h-2 accent-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </section>

                  {/* Voice Cloning Section */}
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                          <Mic2 className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <h3 className="text-lg md:text-xl font-display font-black tracking-tight uppercase">Voice Cloning Studio</h3>
                      </div>
                      {clonedSample && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
                          <Check className="w-3 h-3" />
                          Model Ready
                        </span>
                      )}
                    </div>

                    <div className={`p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'} relative overflow-hidden`}>
                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-indigo-500/30 flex items-center justify-center bg-indigo-500/5 relative">
                          {cloningStatus === 'uploading' || cloningStatus === 'processing' ? (
                            <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                          ) : clonedSample ? (
                            <div className="relative">
                              <span className="text-4xl">🤴</span>
                              <div className="absolute -bottom-1 -right-1 p-1.5 bg-green-500 rounded-full text-white ring-4 ring-slate-900/50">
                                <Check className="w-3 h-3" />
                              </div>
                            </div>
                          ) : (
                            <Mic2 className="w-10 h-10 md:w-12 md:h-12 text-indigo-500/30" />
                          )}
                          
                          {(cloningStatus === 'uploading' || cloningStatus === 'processing') && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px] rounded-full">
                              <span className="text-[10px] font-black uppercase text-indigo-600 animate-pulse">{cloningStatus}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-4 text-center md:text-left">
                          <div>
                            <h4 className="text-base md:text-lg font-black leading-tight">
                              {clonedSample ? 'Your Cloned Voice is Ready' : 'Clone Your Own Voice'}
                            </h4>
                            <p className="text-xs md:text-sm font-medium opacity-50 mt-1 max-w-md">
                              {clonedSample 
                                ? "We've fine-tuned a voice model based on your sample. Select 'Custom' in the personas to use it."
                                : "Upload a 15-30 second clear audio sample of yourself speaking Moroccan Darija to create your personalized YouTuber persona."}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <input 
                              type="file" id="voice-clone-upload" accept="audio/*" className="hidden"
                              onChange={handleVoiceCloneUpload}
                              disabled={cloningStatus !== 'idle' && cloningStatus !== 'done'}
                            />
                            {!clonedSample ? (
                              <label 
                                htmlFor="voice-clone-upload"
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 cursor-pointer flex items-center gap-2"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Start Cloning
                              </label>
                            ) : (
                              <>
                                <button 
                                  onClick={() => setVoiceSettings(prev => ({ ...prev, voiceName: 'custom' }))}
                                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    voiceSettings.voiceName === 'custom'
                                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                                      : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
                                  }`}
                                >
                                  {voiceSettings.voiceName === 'custom' ? <Check className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                  {voiceSettings.voiceName === 'custom' ? 'Selected' : 'Use Cloned Voice'}
                                </button>
                                <button 
                                  onClick={clearVoiceClone}
                                  className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Model
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Grid overlap decoration */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    </div>
                  </section>

                  {/* Tuning Sliders */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-indigo-600 text-white">
                        <Sliders className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <h3 className="text-lg md:text-xl font-display font-black tracking-tight uppercase">Master Tuning</h3>
                    </div>

                    <div className={`p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} shadow-xl grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12`}>
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">
                          <label>Pitch Contrast</label>
                          <span className="text-indigo-500">{voiceSettings.pitch > 0 ? `+${voiceSettings.pitch}` : voiceSettings.pitch}</span>
                        </div>
                        <input 
                          type="range" min="-10" max="10" step="1"
                          value={voiceSettings.pitch}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, pitch: parseInt(e.target.value) }))}
                          className="w-full h-2 accent-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[7px] md:text-[8px] opacity-30 font-bold uppercase tracking-tighter">
                          <span>Deep Bass</span>
                          <span>High Treble</span>
                        </div>
                      </div>

                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">
                          <label>Generation Speed</label>
                          <span className="text-indigo-500">{voiceSettings.speed}x</span>
                        </div>
                        <input 
                          type="range" min="0.5" max="2.0" step="0.1"
                          value={voiceSettings.speed}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                          className="w-full h-2 accent-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[7px] md:text-[8px] opacity-30 font-bold uppercase tracking-tighter">
                          <span>Slow/Relaxed</span>
                          <span>Fast/Hype</span>
                        </div>
                      </div>

                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">
                          <label>Vlog Energy</label>
                          <span className="text-indigo-500">{Math.round(voiceSettings.energy * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0.1" max="1.0" step="0.05"
                          value={voiceSettings.energy}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, energy: parseFloat(e.target.value) }))}
                          className="w-full h-2 accent-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[7px] md:text-[8px] opacity-30 font-bold uppercase tracking-tighter">
                          <span>Chill Vlog</span>
                          <span>Pro Youtuber</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Global Modals */}
      <AnimatePresence>
        {sharingItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-md p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-500/10 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                  <Share2 className="text-indigo-500 w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-xl md:text-2xl font-display font-black tracking-tight mb-3 md:mb-4">Partager m3a s-habek?</h3>
                <p className="opacity-40 text-xs md:text-sm mb-6 md:mb-8 leading-relaxed font-bold">
                  Ghadi t-partager had l'vlog f'Google wala social media. Izih!
                </p>
                
                <div className="w-full space-y-2 md:space-y-3">
                  <button 
                    onClick={() => handleShare(sharingItem, 'native')}
                    className="w-full h-12 md:h-14 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-bold md:text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Native Share
                  </button>
                  <button 
                    onClick={() => handleShare(sharingItem, 'copy')}
                    className={`w-full h-12 md:h-14 rounded-xl md:rounded-2xl font-bold md:text-lg transition-all flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200 opacity-60 hover:opacity-100'}`}
                  >
                    Copy Link
                  </button>
                  <button 
                    onClick={() => setSharingItem(null)}
                    className="w-full h-10 bg-transparent opacity-30 font-bold text-xs md:text-sm hover:opacity-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {previewItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-lg p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-500/10 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                  <Sparkles className="text-indigo-500 w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-xl md:text-2xl font-display font-black tracking-tight mb-1 md:mb-2 italic">Sma3 had l-khraza!</h3>
                {previewItem.duration && (
                  <div className="flex items-center gap-1 opacity-50 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(previewItem.duration)}</span>
                  </div>
                )}
                <div className="w-full bg-slate-50 dark:bg-slate-800/40 rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8 text-[11px] md:text-sm opacity-70 line-clamp-3 leading-relaxed font-bold">
                  "{previewItem.text}"
                </div>

                <button 
                  onClick={() => handlePlay(previewItem.id, previewItem.audioUrl)}
                  className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all mb-4 md:mb-6 ${
                    isPlaying === previewItem.id 
                      ? 'bg-indigo-600 text-white scale-110 shadow-xl shadow-indigo-500/30' 
                      : 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20'
                  }`}
                >
                  {isBuffering === previewItem.id ? (
                    <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  ) : (
                    isPlaying === previewItem.id ? <Pause className="w-8 h-8 md:w-10 md:h-10 fill-current" /> : <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-1" />
                  )}
                </button>

                {/* Progress/Seek Bar for Preview */}
                {isPlaying === previewItem.id && (
                  <div className="w-full max-w-sm px-1 space-y-4 mb-8 md:mb-10">
                    <div className="space-y-2">
                      <input 
                        type="range"
                        min="0"
                        max={playbackDuration || 0}
                        value={playbackTime || 0}
                        onChange={handleSeek}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-indigo-600"
                      />
                      <div className="flex justify-between text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">
                        <span>{formatTime(playbackTime)}</span>
                        <span>{formatTime(playbackDuration)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 px-4">
                      <button 
                        onClick={toggleMute}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        {volume === 0 ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
                      </button>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-24 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-indigo-600"
                      />
                      <span className="text-[10px] font-black opacity-30 w-8">{Math.round(volume * 100)}%</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mb-8 mt-0">
                  <button 
                    onClick={() => handleDownload(previewItem)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download WAV</span>
                  </button>
                  <button 
                    onClick={() => handleDownloadMp3(previewItem)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                  >
                    <FileAudio className="w-3 h-3" />
                    <span>Export MP3</span>
                  </button>
                </div>
                
                <div className="w-full grid grid-cols-2 gap-3 md:gap-4">
                  <button 
                    onClick={handleConfirmPreview}
                    className="h-12 md:h-14 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-bold text-sm md:text-lg hover:scale-[1.02] transition-all"
                  >
                    Save Studio
                  </button>
                  <button 
                    onClick={handleDiscardPreview}
                    className="h-12 md:h-14 bg-red-500/10 text-red-500 rounded-xl md:rounded-2xl font-bold text-sm md:text-lg hover:bg-red-500/20 transition-all"
                  >
                    Let It Go
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {/* Error Modal */}
        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-sm p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border shadow-2xl text-center ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6 ${error.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                {error.type === 'error' ? (
                  <X className="w-8 h-8" />
                ) : (
                  <div className="w-8 h-8 font-black text-2xl flex items-center justify-center">!</div>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-display font-black tracking-tight mb-3">
                {error.type === 'error' ? 'Mouchkil!' : 'Rodd Balek!'}
              </h3>
              <p className="opacity-60 text-sm mb-8 leading-relaxed font-bold">
                {error.message}
              </p>
              
              { (error.message.includes("quota") || error.message.includes("prepayment") || error.message.includes("API key")) && (
                <button 
                  onClick={() => {
                    setError(null);
                    if (window.aistudio?.openSelectKey) {
                      window.aistudio.openSelectKey();
                    } else {
                      setActiveTab('settings');
                    }
                  }}
                  className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl font-bold flex items-center justify-center transition-all bg-indigo-600 text-white hover:bg-indigo-700 mb-3 gap-2"
                >
                  <Settings2 className="w-4 h-4" />
                  Beddel API Key / Billing
                </button>
              )}

              <button 
                onClick={() => setError(null)}
                className={`w-full h-12 md:h-14 rounded-xl md:rounded-2xl font-bold flex items-center justify-center transition-all ${
                  error.type === 'error' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-yellow-500 text-white hover:bg-yellow-600'
                }`}
              >
                Safi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


