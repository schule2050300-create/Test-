import React from 'react';
import {
  CloudLightning,
  MoonStar,
  Flame,
  Waves,
  Snowflake,
  Sparkles,
  Wand2,
  Check,
  Volume2,
  PowerOff,
} from 'lucide-react';
import { AmbientSoundType, ClockSettings, ParticleEffect } from '../types';
import { triggerHaptic } from '../utils/audio';

interface SoundscapeMoodsCardProps {
  settings: ClockSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<ClockSettings>>;
  showFeedback: (msg: string) => void;
}

export interface SoundscapeMoodPreset {
  id: string;
  name: string;
  subtitle: string;
  sound: AmbientSoundType;
  soundLabel: string;
  particleEffect: ParticleEffect;
  particleLabel: string;
  particleColor: string;
  particleSpeed: number;
  particleIntensity: number;
  icon: React.FC<{ className?: string }>;
  cardGradient: string;
  iconBadgeClass: string;
  activeBorderClass: string;
  swatchColors: [string, string];
}

export const SOUNDSCAPE_MOODS: SoundscapeMoodPreset[] = [
  {
    id: 'stormy',
    name: 'Stormy · Stürmisch',
    subtitle: 'Regen + Dunkle Sturm-Partikel',
    sound: 'rain',
    soundLabel: 'Sommerregen',
    particleEffect: 'rain',
    particleLabel: 'Schneller dunkler Regen',
    particleColor: '#475569',
    particleSpeed: 2.1,
    particleIntensity: 85,
    icon: CloudLightning,
    cardGradient: 'from-slate-800/80 via-slate-900/90 to-slate-950',
    iconBadgeClass: 'bg-slate-700/40 text-slate-300 border-slate-500/40',
    activeBorderClass: 'border-slate-400/70 ring-2 ring-slate-400/30',
    swatchColors: ['#334155', '#64748b'],
  },
  {
    id: 'calm',
    name: 'Calm · Ruhig',
    subtitle: 'Wald + Langsame Sterne',
    sound: 'forest',
    soundLabel: 'Wald & Vögel',
    particleEffect: 'stars',
    particleLabel: 'Langsame Sterne (0.35x)',
    particleColor: '#bae6fd',
    particleSpeed: 0.35,
    particleIntensity: 45,
    icon: MoonStar,
    cardGradient: 'from-emerald-950/50 via-slate-900/90 to-slate-950',
    iconBadgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35',
    activeBorderClass: 'border-emerald-400/60 ring-2 ring-emerald-500/25',
    swatchColors: ['#34d399', '#bae6fd'],
  },
  {
    id: 'cozy',
    name: 'Cozy · Kaminabend',
    subtitle: 'Kaminfeuer + Glühwürmchen',
    sound: 'fireplace',
    soundLabel: 'Kaminfeuer',
    particleEffect: 'fireflies',
    particleLabel: 'Warme Funken',
    particleColor: '#fb923c',
    particleSpeed: 0.7,
    particleIntensity: 65,
    icon: Flame,
    cardGradient: 'from-amber-950/45 via-slate-900/90 to-slate-950',
    iconBadgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/35',
    activeBorderClass: 'border-amber-400/60 ring-2 ring-amber-500/25',
    swatchColors: ['#f97316', '#fbbf24'],
  },
  {
    id: 'ocean',
    name: 'Oceanic · Tiefsee',
    subtitle: 'Meeresrauschen + Licht-Aura',
    sound: 'waves',
    soundLabel: 'Meereswellen',
    particleEffect: 'bubbles',
    particleLabel: 'Sanfte Blasen',
    particleColor: '#38bdf8',
    particleSpeed: 0.65,
    particleIntensity: 55,
    icon: Waves,
    cardGradient: 'from-sky-950/50 via-slate-900/90 to-slate-950',
    iconBadgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/35',
    activeBorderClass: 'border-sky-400/60 ring-2 ring-sky-500/25',
    swatchColors: ['#0284c7', '#38bdf8'],
  },
  {
    id: 'winter',
    name: 'Winter · Fokus-Schnee',
    subtitle: 'Weißes Rauschen + Schneeflocken',
    sound: 'white_noise',
    soundLabel: 'Weißes Rauschen',
    particleEffect: 'snow',
    particleLabel: 'Sanfter Schneefall',
    particleColor: '#e2e8f0',
    particleSpeed: 0.8,
    particleIntensity: 60,
    icon: Snowflake,
    cardGradient: 'from-indigo-950/45 via-slate-900/90 to-slate-950',
    iconBadgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/35',
    activeBorderClass: 'border-indigo-400/60 ring-2 ring-indigo-500/25',
    swatchColors: ['#818cf8', '#e2e8f0'],
  },
  {
    id: 'dreamy',
    name: 'Dreamy · Abenddunst',
    subtitle: 'Rosa Rauschen + Schwebender Staub',
    sound: 'pink_noise',
    soundLabel: 'Rosa Rauschen',
    particleEffect: 'dust',
    particleLabel: 'Lichtstaub (0.45x)',
    particleColor: '#f472b6',
    particleSpeed: 0.45,
    particleIntensity: 50,
    icon: Sparkles,
    cardGradient: 'from-rose-950/45 via-slate-900/90 to-slate-950',
    iconBadgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/35',
    activeBorderClass: 'border-pink-400/60 ring-2 ring-pink-500/25',
    swatchColors: ['#ec4899', '#f472b6'],
  },
];

export const SoundscapeMoodsCard: React.FC<SoundscapeMoodsCardProps> = ({
  settings,
  onUpdateSettings,
  showFeedback,
}) => {
  const ambient = settings.ambientSound;
  const isPlaying = Boolean(ambient?.isPlaying && ambient?.activeSound !== 'none');

  const isMoodMatched = (mood: SoundscapeMoodPreset) => {
    const speedMatch =
      Math.abs((settings.particleSpeed ?? 1.0) - mood.particleSpeed) < 0.05;
    const colorMatch =
      (settings.particleColor || '').toLowerCase() === mood.particleColor.toLowerCase();
    return (
      ambient?.activeSound === mood.sound &&
      settings.particleEffect === mood.particleEffect &&
      colorMatch &&
      speedMatch
    );
  };

  const activePlayingMood = SOUNDSCAPE_MOODS.find(
    (mood) => isPlaying && isMoodMatched(mood)
  );

  const handleApplyMood = (mood: SoundscapeMoodPreset) => {
    if (settings.vibrationEnabled) triggerHaptic(15);

    const alreadyActiveAndPlaying = isPlaying && isMoodMatched(mood);

    if (alreadyActiveAndPlaying) {
      onUpdateSettings((prev) => ({
        ...prev,
        ambientSound: {
          ...(prev.ambientSound || {
            activeSound: mood.sound,
            volume: 0.35,
            isPlaying: false,
            autoPlayOnStart: false,
          }),
          isPlaying: false,
        },
      }));
      showFeedback(`Mood "${mood.name}" pausiert`);
      return;
    }

    onUpdateSettings((prev) => ({
      ...prev,
      ambientSound: {
        ...(prev.ambientSound || {
          activeSound: mood.sound,
          volume: 0.35,
          isPlaying: true,
          autoPlayOnStart: false,
        }),
        activeSound: mood.sound,
        isPlaying: true,
      },
      particleEffect: mood.particleEffect,
      particleColor: mood.particleColor,
      particleSpeed: mood.particleSpeed,
      particleIntensity: mood.particleIntensity,
    }));

    showFeedback(`Mood "${mood.name}" aktiviert (${mood.subtitle})`);
  };

  const handleClearMood = () => {
    if (settings.vibrationEnabled) triggerHaptic(12);
    onUpdateSettings((prev) => ({
      ...prev,
      ambientSound: {
        ...(prev.ambientSound || {
          activeSound: 'none',
          volume: 0.35,
          isPlaying: false,
          autoPlayOnStart: false,
        }),
        activeSound: 'none',
        isPlaying: false,
      },
      particleEffect: 'none',
    }));
    showFeedback('Soundscape & Partikeleffekt beendet');
  };

  const hasAnyActiveEffect =
    isPlaying || (settings.particleEffect && settings.particleEffect !== 'none');

  return (
    <div
      id="soundscape-moods-card"
      className="rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800/90 p-5 shadow-lg space-y-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-sm">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                Soundscape Moods
              </span>
              {activePlayingMood && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 text-[10px] font-semibold border border-indigo-500/35">
                  <Volume2 className="w-3 h-3" />
                  {activePlayingMood.name.split('·')[0].trim()}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 block mt-0.5">
              Kombiniert Hintergrundklang & visuellen Partikeleffekt per Klick
            </span>
          </div>
        </div>

        {hasAnyActiveEffect && (
          <button
            type="button"
            id="soundscape-moods-reset"
            onClick={handleClearMood}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 border border-slate-700/70 hover:border-rose-500/40 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <PowerOff className="w-3.5 h-3.5" />
            <span>Alles aus</span>
          </button>
        )}
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {SOUNDSCAPE_MOODS.map((mood) => {
          const Icon = mood.icon;
          const matched = isMoodMatched(mood);
          const activeAndPlaying = matched && isPlaying;

          return (
            <button
              key={mood.id}
              id={`soundscape-mood-${mood.id}`}
              type="button"
              onClick={() => handleApplyMood(mood)}
              aria-pressed={activeAndPlaying}
              className={`relative rounded-xl border p-3.5 text-left transition-all cursor-pointer group bg-gradient-to-br ${mood.cardGradient} ${
                activeAndPlaying
                  ? `${mood.activeBorderClass} shadow-md`
                  : matched
                  ? 'border-slate-600/80 bg-slate-900/90'
                  : 'border-slate-800/85 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div
                  className={`p-2 rounded-xl border flex items-center justify-center ${mood.iconBadgeClass}`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-950/70 border border-slate-800/80">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: mood.swatchColors[0] }}
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: mood.swatchColors[1] }}
                    />
                  </span>

                  {activeAndPlaying && (
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>

              <div className="font-bold text-xs text-slate-100 group-hover:text-white transition-colors">
                {mood.name}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {mood.subtitle}
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 truncate">{mood.soundLabel}</span>
                <span className="text-slate-500 font-mono shrink-0">
                  {activeAndPlaying ? 'Aktiv · Pause' : mood.particleLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
