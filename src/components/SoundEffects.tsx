import React, { useState, useRef, useEffect } from 'react';
import { Search, Play, Pause, Plus, Music2, Volume2, Trash2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface SoundEffect {
  id: string;
  name: string;
  category: string;
  duration: string;
  url: string;
  icon: string;
}

const SFX_LIBRARY: SoundEffect[] = [
  { id: 'bell', name: 'Classic Bell', category: 'Notification', duration: '1s', icon: '🔔', url: 'https://cdn.freesound.org/previews/273/273153_5123851-lq.mp3' },
  { id: 'pop', name: 'UI Pop', category: 'UI', duration: '0.5s', icon: '🫧', url: 'https://cdn.freesound.org/previews/411/411634_5121236-lq.mp3' },
  { id: 'applause', name: 'Applause', category: 'Reaction', duration: '3s', icon: '👏', url: 'https://cdn.freesound.org/previews/381/381353_1676145-lq.mp3' },
  { id: 'laugh', name: 'Sitcom Laugh', category: 'Reaction', duration: '2.5s', icon: '😂', url: 'https://cdn.freesound.org/previews/448/448181_9159316-lq.mp3' },
  { id: 'whoosh', name: 'Transition Whoosh', category: 'Transition', duration: '1s', icon: '💨', url: 'https://cdn.freesound.org/previews/612/612630_11861968-lq.mp3' },
  { id: 'scratch', name: 'Record Scratch', category: 'Effect', duration: '1.5s', icon: '💿', url: 'https://cdn.freesound.org/previews/353/353067_3176203-lq.mp3' },
  { id: 'drumroll', name: 'Drum Roll', category: 'Transition', duration: '2s', icon: '🥁', url: 'https://cdn.freesound.org/previews/264/264962_4981146-lq.mp3' },
  { id: 'fail', name: 'Wah Wah Wah', category: 'Reaction', duration: '2s', icon: '🎺', url: 'https://cdn.freesound.org/previews/175/175409_3244243-lq.mp3' },
  { id: 'success', name: 'Level Up', category: 'Notification', duration: '1.5s', icon: '🎮', url: 'https://cdn.freesound.org/previews/511/511484_2056262-lq.mp3' },
  { id: 'crickets', name: 'Crickets', category: 'Reaction', duration: '4s', icon: '🦗', url: 'https://cdn.freesound.org/previews/121/121511_2113262-lq.mp3' },
  { id: 'camera', name: 'Shutter Click', category: 'Effect', duration: '0.5s', icon: '📸', url: 'https://cdn.freesound.org/previews/536/536423_4921277-lq.mp3' },
  { id: 'horn', name: 'Air Horn', category: 'Reaction', duration: '2s', icon: '📢', url: 'https://cdn.freesound.org/previews/347/347171_2056262-lq.mp3' },
];

interface SoundEffectsProps {
  onAddEffect: (effect: SoundEffect) => void;
  theme: 'light' | 'dark';
}

export const SoundEffects: React.FC<SoundEffectsProps> = ({ onAddEffect, theme }) => {
  const [search, setSearch] = useState('');
  const [volumes, setVolumes] = useState<Record<string, number>>(SFX_LIBRARY.reduce((acc, sfx) => ({ ...acc, [sfx.id]: 0.5 }), {}));
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredSFX = SFX_LIBRARY.filter(sfx => 
    sfx.name.toLowerCase().includes(search.toLowerCase()) ||
    sfx.category.toLowerCase().includes(search.toLowerCase())
  );

  const togglePlay = async (sfx: SoundEffect) => {
    if (playingId === sfx.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        try {
          audioRef.current.src = `https://corsproxy.io/?${encodeURIComponent(sfx.url)}`;
          audioRef.current.volume = volumes[sfx.id] ?? 0.5;
          setPlayingId(sfx.id);
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error("SFX play failed:", err);
            setPlayingId(null);
          }
        }
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, sfx: SoundEffect) => {
    e.dataTransfer.setData('application/json', JSON.stringify(sfx));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
        <input 
          type="text"
          placeholder="Search sound effects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 focus:border-indigo-500' : 'bg-white border-slate-200 focus:border-indigo-500'} outline-none transition-all text-sm font-medium`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {filteredSFX.map((sfx) => (
          <div
            key={sfx.id}
            draggable
            onDragStart={(e) => handleDragStart(e, sfx)}
            className={`group p-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-100 hover:border-indigo-200'} flex items-center justify-between shadow-sm`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                {sfx.icon}
              </div>
              <div>
                <h4 className="text-xs font-bold truncate max-w-[120px]">{sfx.name}</h4>
                <p className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">{sfx.category} • {sfx.duration}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Volume2 className="w-2.5 h-2.5 opacity-30" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volumes[sfx.id] ?? 0.5}
                    onChange={(e) => setVolumes(prev => ({ ...prev, [sfx.id]: parseFloat(e.target.value) }))}
                    className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => togglePlay(sfx)}
                className={`p-2 rounded-lg transition-all ${playingId === sfx.id ? 'bg-indigo-500 text-white' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500'}`}
              >
                {playingId === sfx.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button 
                onClick={() => onAddEffect(sfx)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
                title="Add to sequence"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingId(null)}
        crossOrigin="anonymous"
      />
    </div>
  );
};
