import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { X, Clock, GripHorizontal, Volume2, Plus, Music2 } from 'lucide-react';
import { TimelineItem, SoundEffect } from '../types';

interface AudioTimelineProps {
  voiceDuration: number;
  items: TimelineItem[];
  onUpdateItem: (id: string, updates: Partial<TimelineItem>) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: (effect: SoundEffect, startTime: number) => void;
  theme: 'light' | 'dark';
}

export const AudioTimeline: React.FC<AudioTimelineProps> = ({
  voiceDuration,
  items,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  theme
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const PIXELS_PER_SECOND = 40; // Base zoom level

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const totalDuration = Math.max(voiceDuration, ...items.map(i => i.startTime + 1), 10);
  const timelineWidth = totalDuration * PIXELS_PER_SECOND;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const startTime = Math.max(0, x / PIXELS_PER_SECOND);

    try {
      const effect: SoundEffect = JSON.parse(e.dataTransfer.getData('application/json'));
      onAddItem(effect, startTime);
    } catch (err) {
      console.error("Failed to parse dropped effect:", err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-black uppercase tracking-widest italic">Sequence Editor</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold opacity-40 uppercase">
          <span>Total: {totalDuration.toFixed(1)}s</span>
          <span>Zoom: {PIXELS_PER_SECOND}px/s</span>
        </div>
      </div>

      <div 
        ref={containerRef}
        className={`relative overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 min-h-[220px] rounded-3xl border border-dashed ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div style={{ width: timelineWidth + 100, minWidth: '100%' }} className="relative h-full py-4 px-8">
          {/* Timeline Ruler */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 pb-2">
            {Array.from({ length: Math.ceil(totalDuration) + 2 }).map((_, i) => (
              <div 
                key={i} 
                style={{ left: i * PIXELS_PER_SECOND + 32 }}
                className="absolute flex flex-col items-center gap-1"
              >
                <div className={`w-0.5 ${i % 5 === 0 ? 'h-3 bg-indigo-500' : 'h-1.5 bg-slate-300 dark:bg-slate-700'}`} />
                {i % 2 === 0 && <span className="text-[8px] font-black opacity-30">{i}s</span>}
              </div>
            ))}
          </div>

          {/* Voice Track */}
          <div className="relative h-12 mb-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-center group overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 px-3 flex items-center bg-indigo-500/10 border-r border-indigo-500/20">
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div 
              style={{ width: voiceDuration * PIXELS_PER_SECOND, marginLeft: 0 }}
              className="h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center px-3 relative shadow-lg shadow-indigo-500/20"
            >
              <div className="flex items-center gap-2">
                <Music2 className="w-3 h-3 text-white fill-current" />
                <span className="text-[10px] font-black text-white truncate">Main Voiceover</span>
              </div>
              {/* Waveform deco */}
              <div className="absolute right-4 flex items-end gap-0.5 opacity-30">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-0.5 bg-white rounded-full" style={{ height: Math.random() * 12 + 4 }} />
                ))}
              </div>
            </div>
          </div>

          {/* SFX Track Area */}
          <div className="min-h-[100px] relative">
            <div className="absolute inset-0 flex flex-col gap-2 opacity-[0.03] pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 w-full bg-slate-500 rounded-xl" />
              ))}
            </div>

            {items.map((item) => (
              <TimelineItemRow 
                key={item.id}
                item={item}
                pixelsPerSecond={PIXELS_PER_SECOND}
                onUpdate={(updates) => onUpdateItem(item.id, updates)}
                onRemove={() => onRemoveItem(item.id)}
                theme={theme}
              />
            ))}

            {items.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none italic text-xs font-bold">
                Drop sound effects here from the library
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TimelineItemRowProps {
  item: TimelineItem;
  pixelsPerSecond: number;
  onUpdate: (updates: Partial<TimelineItem>) => void;
  onRemove: () => void;
  theme: 'light' | 'dark';
}

const TimelineItemRow: React.FC<TimelineItemRowProps> = ({ item, pixelsPerSecond, onUpdate, onRemove, theme }) => {
  const x = useMotionValue(item.startTime * pixelsPerSecond);
  
  // Track visual position while dragging to update global state after drag ends
  // or use a more reactive approach if preferred.
  // For now, let's update state onDragEnd for performance.

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0 }}
      dragElastic={0}
      dragMomentum={false}
      style={{ x }}
      onDragEnd={(_, info) => {
        const newStartTime = Math.max(0, x.get() / pixelsPerSecond);
        onUpdate({ startTime: newStartTime });
      }}
      className="absolute h-10 flex items-center cursor-grab active:cursor-grabbing group z-10"
    >
      <div className={`h-8 min-w-[120px] rounded-xl border flex items-center px-2 gap-2 shadow-sm transition-colors ${
        theme === 'dark' 
          ? 'bg-slate-800 border-slate-700 group-hover:border-indigo-500' 
          : 'bg-white border-slate-200 group-hover:border-indigo-400'
      }`}>
        <div className="text-sm">{item.effect.icon}</div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="text-[9px] font-black truncate">{item.effect.name}</div>
          <div className="text-[7px] opacity-40 font-bold uppercase">{item.startTime.toFixed(1)}s</div>
        </div>
        
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 hover:bg-red-500 hover:text-white rounded-md transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
      
      {/* Volume indicator */}
      <div className="absolute -bottom-1 left-2 right-2 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-500" 
          style={{ width: `${item.volume * 100}%` }}
        />
      </div>
    </motion.div>
  );
};
