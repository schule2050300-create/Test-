import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Flame,
  Coffee,
  Sun,
  BellOff,
  Volume2,
  CloudRain,
  Trees,
  Radio,
  Sparkles,
  Waves,
} from 'lucide-react';
import { PomodoroController } from '../hooks/usePomodoro';
import { AmbientSoundType, ClockSettings } from '../types';
import { triggerHaptic } from '../utils/audio';

interface PomodoroFloatingWidgetProps {
  pomodoro: PomodoroController;
  settings: ClockSettings;
  isZenMode: boolean;
  onOpenPomodoroSettings: () => void;
  className?: string;
}

const AMBIENT_LABELS: Record<AmbientSoundType, string> = {
  none: '',
  rain: 'Regen',
  forest: 'Wald',
  white_noise: 'Weißes Rauschen',
  pink_noise: 'Rosa Rauschen',
  waves: 'Wellen',
  fireplace: 'Kamin',
};

const getAmbientIcon = (sound: AmbientSoundType) => {
  switch (sound) {
    case 'rain':
      return CloudRain;
    case 'forest':
      return Trees;
    case 'white_noise':
      return Radio;
    case 'pink_noise':
      return Sparkles;
    case 'waves':
      return Waves;
    case 'fireplace':
      return Flame;
    default:
      return Volume2;
  }
};

export const PomodoroFloatingWidget: React.FC<PomodoroFloatingWidgetProps> = ({
  pomodoro,
  settings,
  isZenMode,
  onOpenPomodoroSettings,
  className = '',
}) => {
  const {
    phase,
    timeLeft,
    totalDuration,
    isRunning,
    completedSessions,
    currentCycle,
    toggle,
    skip,
  } = pomodoro;

  const isSessionEngaged =
    Boolean(settings.pomodoro?.enabled) ||
    isRunning ||
    completedSessions > 0 ||
    timeLeft < totalDuration;

  if (!settings.pomodoro?.showWidgetOnClock || !isSessionEngaged) {
    return null;
  }

  const formatMinutesSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const phaseConfig = {
    work: {
      label: 'Fokus',
      color: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-500',
      icon: Flame,
    },
    shortBreak: {
      label: 'Pause',
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-500',
      icon: Coffee,
    },
    longBreak: {
      label: 'Erholung',
      color: 'text-cyan-400',
      border: 'border-cyan-500/30',
      dot: 'bg-cyan-500',
      icon: Sun,
    },
  }[phase];

  const PhaseIcon = phaseConfig.icon;
  const isSilenced = isZenMode && (settings.pomodoro.silenceInZenMode ?? true);
  const ambientActive =
    Boolean(settings.ambientSound?.isPlaying) &&
    settings.ambientSound?.activeSound !== 'none';
  const activeSoundType = settings.ambientSound?.activeSound || 'none';
  const AmbientIcon = getAmbientIcon(activeSoundType);
  const ambientLabel = AMBIENT_LABELS[activeSoundType];

  // In Zen mode, we keep the widget minimal, non-intrusive and semi-transparent
  return (
    <div
      id="pomodoro-floating-widget"
      className={`group transition-all duration-300 pointer-events-auto ${
        isZenMode
          ? 'opacity-40 hover:opacity-90 scale-95'
          : 'opacity-90 hover:opacity-100'
      } ${className}`}
    >
      <div
        style={{
          backdropFilter: `blur(${settings.backdropBlurIntensity ?? 16}px)`,
          WebkitBackdropFilter: `blur(${settings.backdropBlurIntensity ?? 16}px)`,
        }}
        className={`flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-full border shadow-lg transition-all ${
          isZenMode
            ? 'bg-slate-950/40 border-white/10 hover:border-white/20'
            : 'bg-slate-900/75 border-white/15 hover:border-white/30 hover:bg-slate-900/90'
        }`}
      >
        {/* Phase Pill / Icon & Click to open Audio Focus Timer */}
        <button
          type="button"
          onClick={() => {
            if (settings.vibrationEnabled) triggerHaptic(10);
            onOpenPomodoroSettings();
          }}
          title="Fokus-Timer & Audio-Einstellungen öffnen"
          className="flex items-center gap-1.5 cursor-pointer text-left focus:outline-none"
        >
          <span
            className={`w-2 h-2 rounded-full ${phaseConfig.dot} ${
              isRunning ? 'animate-pulse' : ''
            }`}
          />
          <PhaseIcon className={`w-3.5 h-3.5 ${phaseConfig.color}`} />
          <span className="text-xs font-bold tracking-tight text-slate-200 hidden sm:inline">
            {phaseConfig.label}
          </span>
        </button>

        {/* Big Digit Countdown */}
        <button
          type="button"
          onClick={() => {
            if (settings.vibrationEnabled) triggerHaptic(10);
            onOpenPomodoroSettings();
          }}
          className="font-mono text-sm sm:text-base font-extrabold tracking-tight text-white tabular-nums cursor-pointer hover:text-blue-300 transition-colors"
        >
          {formatMinutesSeconds(timeLeft)}
        </button>

        {/* Linked Ambient Sound Pill */}
        {ambientActive && ambientLabel && (
          <button
            type="button"
            onClick={() => {
              if (settings.vibrationEnabled) triggerHaptic(10);
              onOpenPomodoroSettings();
            }}
            title={`Aktiver Hintergrundklang: ${ambientLabel}`}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 text-[10px] font-semibold cursor-pointer hover:bg-cyan-500/25 transition-colors"
          >
            <AmbientIcon className="w-2.5 h-2.5 text-cyan-400" />
            <span>{ambientLabel}</span>
          </button>
        )}

        {/* Zen Silenced Status Badge */}
        {isSilenced && (
          <span
            title="Zen-Modus aktiv: Signalton stummgeschaltet"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold"
          >
            <BellOff className="w-2.5 h-2.5 text-indigo-400" />
            <span className="hidden md:inline">Stumm</span>
          </span>
        )}

        {/* Quick Cycle Indicator */}
        <div
          title={`Zyklus ${currentCycle} von ${settings.pomodoro.longBreakInterval}`}
          className="hidden md:flex items-center gap-1 px-1 text-[10px] text-slate-400 font-mono"
        >
          <span>
            {currentCycle}/{settings.pomodoro.longBreakInterval}
          </span>
        </div>

        {/* Quick Play/Pause Action */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (settings.vibrationEnabled) triggerHaptic(15);
            toggle();
          }}
          title={isRunning ? 'Fokus-Timer pausieren' : 'Fokus-Timer starten'}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isRunning
              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
          }`}
        >
          {isRunning ? (
            <Pause className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current ml-0.5" />
          )}
        </button>

        {/* Quick Skip Action */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (settings.vibrationEnabled) triggerHaptic(12);
            skip();
          }}
          title="Zur nächsten Phase springen"
          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <SkipForward className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
