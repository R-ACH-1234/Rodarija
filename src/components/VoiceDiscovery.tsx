
import React, { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Check, 
  Star, 
  Clock, 
  Globe, 
  Award,
  Music2,
  Mic2,
  Volume2,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { generateYouTuberAudio } from "../services/geminiService";
import { base64ToBlob } from "../lib/utils";

export interface VoiceTalent {
  id: string;
  name: string;
  specialty: string;
  image: string;
  previewUrl: string;
  previewText: string;
  tags: string[];
  rating: number;
  experience: string;
  language: string;
}

const VOICE_TALENTS: VoiceTalent[] = [
  {
    id: "Achernar",
    name: "Achernar (Default)",
    specialty: "Professional & Smooth",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200",
    previewUrl: "",
    previewText: "السلام عليكم الخوت، اليوم غادي نهضرو على واحد الموضوع مهم بزاف اللي كيهم مستقبل التكنولوجيا في المغرب.",
    tags: ["Professional", "Business", "News"],
    rating: 4.9,
    experience: "15+ Years",
    language: "Moroccan Darija & Arabic"
  },
  {
    id: "Nova",
    name: "Nova",
    specialty: "Energetic & Fresh",
    image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200&h=200",
    previewUrl: "",
    previewText: "واااا فييين ا لدراري! اليوم فيديو جديد ومغامرة جديدة، تبعو معايا حتى اللخر حيت كاين ما يدار!",
    tags: ["Lifestyle", "Vlogs", "Energy"],
    rating: 4.8,
    experience: "7 Years",
    language: "Moroccan Darija"
  },
  {
    id: "Ursa",
    name: "Ursa",
    specialty: "Warm & Caring",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200",
    previewUrl: "",
    previewText: "فهاد الصباح المريح، بغيت نشارك معاكم واحد القصة اللي غيرات ليا حياتي، كنتمنى تفيدكم حتى نتوما.",
    tags: ["Wellness", "Stories", "Calm"],
    rating: 4.9,
    experience: "10 Years",
    language: "Moroccan Darija"
  },
  {
    id: "Vega",
    name: "Vega",
    specialty: "Bright & Direct",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200",
    previewUrl: "",
    previewText: "أخر الأخبار والمستجدات مباشرة من قلب الحدث، خليكم ديما على بال.",
    tags: ["News", "Updates", "Clear"],
    rating: 4.7,
    experience: "5 Years",
    language: "Moroccan Darija"
  },
  {
    id: "Pegasus",
    name: "Pegasus",
    specialty: "High Energy",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200",
    previewUrl: "",
    previewText: "واااا لݣول! ماركاوه الدراري! تفرجوا فهاد الروينة اللي وقعات اليوم فالتيران!",
    tags: ["Sports", "Hype", "Loud"],
    rating: 4.6,
    experience: "4 Years",
    language: "Moroccan Darija"
  },
  {
    id: "Orbit",
    name: "Orbit",
    specialty: "Deep & Technical",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200",
    previewUrl: "",
    previewText: "الدخول لعالم الذكاء الاصطناعي ماشي ساهل، ولكن اليوم غادي نبسطو ليكم كلشي بالتفصيل الممل.",
    tags: ["Tech", "Deep", "Sci-Fi"],
    rating: 4.8,
    experience: "12 Years",
    language: "Moroccan Darija & English"
  },
  {
    id: "Lyra",
    name: "Lyra",
    specialty: "Clear & Academic",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200&h=200",
    previewUrl: "",
    previewText: "مرحبا بيكم فهاد الدرس الجديد، اليوم غادي نتعلمو كيفاش نمونطيو فيديو احترافي غير بالتلفون ديالنا.",
    tags: ["Tutorials", "Education", "Direct"],
    rating: 4.9,
    experience: "8 Years",
    language: "Moroccan Darija"
  },
  {
    id: "Orion",
    name: "Orion",
    specialty: "Narrative & Bold",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200&h=200",
    previewUrl: "",
    previewText: "في قديم الزمان، كانت هاد المدينة كتعيش واحد الأسطورة اللي باقا كتردد حتى لدابا...",
    tags: ["Documentaries", "Bold", "Drama"],
    rating: 4.8,
    experience: "15 Years",
    language: "Moroccan Darija"
  },
  {
    id: "Eclipse",
    name: "Eclipse",
    specialty: "Mysterious & Deep",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200",
    previewUrl: "",
    previewText: "شنو كيتخبا ورا هاد الباب المسدود؟ تبعو معايا فهاد التحقيق باش نعرفو الحقيقة المرة.",
    tags: ["Mystery", "Crime", "Intense"],
    rating: 4.7,
    experience: "9 Years",
    language: "Moroccan Darija"
  },
  {
    id: "Capella",
    name: "Capella",
    specialty: "Soft & Conversational",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200&h=200",
    previewUrl: "",
    previewText: "هاي لبلبنات، اليوم غنشارك معاكم الروتين ديالي الصباحي، بزاف منكم سولوني عليه.",
    tags: ["Soft", "Vlogs", "Youthful"],
    rating: 4.9,
    experience: "6 Years",
    language: "Moroccan Darija"
  }
];

interface VoiceDiscoveryProps {
  onSelectVoice: (voice: VoiceTalent) => void;
  selectedVoiceId?: string;
}

export const VoiceDiscovery: React.FC<VoiceDiscoveryProps> = ({ onSelectVoice, selectedVoiceId }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    VOICE_TALENTS.forEach(v => {
      initial[v.id] = v.previewText;
    });
    return initial;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = async (voice: VoiceTalent) => {
    const id = voice.id;
    const currentText = editedTexts[id] || voice.previewText;
    
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    setLoadingId(id);
    try {
      // If we have a preview URL (e.g. cached or static), use it
      // Otherwise, generate it dynamically
      let finalUrl = voice.previewUrl;
      
      if (!finalUrl && currentText) {
        const response = await generateYouTuberAudio(currentText, {
          voiceName: voice.id,
          pitch: 0,
          speed: 1.0,
          energy: 0.85,
          bgMusic: "none",
          musicVolume: 0,
          voiceVolume: 1.0
        });
        
        const blob = base64ToBlob(response.data, response.mimeType);
        if (blob) {
          finalUrl = URL.createObjectURL(blob);
        }
      }

      if (audioRef.current && finalUrl) {
        audioRef.current.src = finalUrl;
        setLoadingId(null);
        setPlayingId(id);
        const playPromise = audioRef.current.play();
        
        // Revoke the URL after playback to avoid memory leaks if it was dynamic
        if (finalUrl.startsWith('blob:')) {
          audioRef.current.onended = () => {
            setPlayingId(null);
            URL.revokeObjectURL(finalUrl);
          };
        } else {
          audioRef.current.onended = () => setPlayingId(null);
        }
      }
    } catch (error: any) {
      console.error("Audio preview failed:", error);
      if (error?.message?.includes("API Quota Exceeded")) {
        alert("Ahya! Quota dial l-AI tsala. Khallih yred l-bal chwiya u rje3 mn b3d.");
      } else {
        alert("Smeh lina, chi mouchkil wqe3 f preview dial l-sout.");
      }
      setLoadingId(null);
      setPlayingId(null);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setPlayingId(null);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <audio ref={audioRef} className="hidden" />
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight italic uppercase">
            Voice Discovery
          </h2>
          <p className="text-slate-500 font-medium max-w-lg mt-2">
            Find the perfect narrator for your next viral hit. Professional talent, ready to speak your script.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
          <button className="px-4 py-2 rounded-xl bg-white dark:bg-slate-700 shadow-sm text-sm font-bold tracking-tight">Trending</button>
          <button className="px-4 py-2 rounded-xl text-sm font-bold tracking-tight opacity-50 hover:opacity-100 transition-opacity">Popular</button>
          <button className="px-4 py-2 rounded-xl text-sm font-bold tracking-tight opacity-50 hover:opacity-100 transition-opacity">New</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {VOICE_TALENTS.map((voice) => (
          <motion.div
            key={voice.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className={`group relative p-5 rounded-[2.5rem] border-2 transition-all duration-300 ${
              selectedVoiceId === voice.id 
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/20' 
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm'
            }`}
          >
            <div className="relative flex items-start gap-4 mb-6">
              <div className="relative">
                <img 
                  src={voice.image} 
                  alt={voice.name} 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-3xl object-cover shadow-lg"
                />
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedVoiceId === voice.id ? 'bg-white border-indigo-600' : 'bg-indigo-600 border-white dark:border-slate-800'
                }`}>
                  <Mic2 className={`w-3 h-3 ${selectedVoiceId === voice.id ? 'text-indigo-600' : 'text-white'}`} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold tracking-tight truncate">{voice.name}</h3>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg ${
                    selectedVoiceId === voice.id ? 'bg-white/20' : 'bg-yellow-400/10 text-yellow-600'
                  }`}>
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs font-black">{voice.rating}</span>
                  </div>
                </div>
                <p className={`text-xs font-bold uppercase tracking-widest opacity-60 mb-2 truncate ${
                  selectedVoiceId === voice.id ? 'text-white' : 'text-indigo-500'
                }`}>
                  {voice.specialty}
                </p>
                
                <div className="flex flex-wrap gap-1.5">
                  {voice.tags.slice(0, 2).map((tag) => (
                    <span 
                      key={tag} 
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedVoiceId === voice.id ? 'bg-white/10' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6 h-8">
              <button 
                onClick={() => togglePlay(voice)}
                disabled={loadingId === voice.id}
                className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${
                  selectedVoiceId === voice.id 
                    ? 'bg-white text-indigo-600' 
                    : playingId === voice.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 hover:bg-indigo-200'
                }`}
              >
                {loadingId === voice.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : playingId === voice.id ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
              
              <div className="flex-1 h-full flex items-center gap-1 pr-2">
                {playingId === voice.id ? (
                  <div className="flex items-center justify-center gap-0.5 w-full h-4">
                    {[1, 2, 3, 4, 5, 2, 4, 3, 1, 5, 2].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: ['20%', '80%', '40%', '100%', '30%'] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                        className={`w-1 rounded-full ${selectedVoiceId === voice.id ? 'bg-white/40' : 'bg-indigo-400/40'}`}
                        style={{ height: `${h * 20}%` }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-0.5 bg-slate-100 dark:bg-slate-800 rounded-full relative">
                    <div className={`absolute inset-y-0 left-0 w-0 bg-indigo-400 rounded-full group-hover:w-1/4 transition-all duration-700`} />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 text-[11px] font-bold opacity-70">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                <span>{voice.language}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5" />
                <span>{voice.experience}</span>
              </div>
            </div>

            <div className="mb-6 space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${selectedVoiceId === voice.id ? 'text-white' : ''}`}>
                Preview Script (Darija)
              </label>
              <textarea
                value={editedTexts[voice.id]}
                onChange={(e) => setEditedTexts(prev => ({ ...prev, [voice.id]: e.target.value }))}
                className={`w-full p-3 rounded-xl text-xs font-medium resize-none focus:ring-2 focus:ring-indigo-400 outline-none transition-all ${
                  selectedVoiceId === voice.id
                    ? 'bg-white/10 text-white placeholder-white/40 border-slate-400/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
                rows={3}
                placeholder="Write something in Darija..."
              />
            </div>

            <button
              onClick={() => onSelectVoice(voice)}
              className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                selectedVoiceId === voice.id 
                  ? 'bg-white text-indigo-600 shadow-lg' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:scale-95'
              }`}
            >
              {selectedVoiceId === voice.id ? (
                <>
                  <Check className="w-4 h-4" />
                  Voice Selected
                </>
              ) : (
                <>
                  Select This Voice
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      <div className={`mt-12 p-8 rounded-[3rem] border-2 border-dashed flex flex-col items-center text-center transition-all ${
        selectedVoiceId ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/5 dark:border-indigo-500/20' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/10 dark:border-slate-800'
      }`}>
        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm mb-4">
          <Volume2 className="w-8 h-8 text-indigo-500" />
        </div>
        <h4 className="text-xl font-display font-black tracking-tight mb-2 italic">Don't see what you need?</h4>
        <p className="text-slate-500 max-w-md text-sm font-medium mb-6">
          We add new talent every week. Tell us about the personality you're looking for and our AI will scout the perfect match.
        </p>
        <button className="px-8 py-3 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity">
          Request Custom Voice
        </button>
      </div>
    </div>
  );
};
