import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Timer,
  CloudRain,
  Trees,
  Radio,
  Sparkles,
  Waves,
  Flame,
  VolumeX,
  Volume2,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Coffee,
  Sun,
  Check,
  Square,
} from 'lucide-react';
import {
  AmbientSoundType,
  ClockSettings,
  PomodoroBreakAmbientBehavior,
  PomodoroPhase,
  PomodoroSoundType,
} from '../types';
import { PomodoroController } from '../hooks/usePomodoro';
import { MaterialSwitch } from './ui/MaterialSwitch';
import { triggerHaptic } from '../utils/audio';
import { playPomodoroAlert, requestNotificationPermission } from '../utils/pomodoroAudio';

interface AudioFocusTimerCardProps {
  settings: ClockSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<ClockSettings>>;
  pomodoro: PomodoroController;
  isZenMode: boolean;
  showFeedback: (msg: string) => void;
}

const SOUND_OPTIONS: {
  id: AmbientSoundType;
  shortLabel: string;
  title: string;
  icon: React.FC<{ className?: string }>;
  accent: string;
}[] = [
  {
    id: 'rain',
    shortLabel: 'Regen',
    title: 'Sanfter Sommerregen',
    icon: CloudRain,
    accent: 'text-cyan-400',
  },
  {
    id: 'forest',
    shortLabel: 'Wald',
    title: 'Wald & Vogelgezwitscher',
    icon: Trees,
    accent: 'text-emerald-400',
  },
  {
    id: 'white_noise',
    shortLabel: 'Weißes Rauschen',
    title: 'Weißes Rauschen',
    icon: Radio,
    accent: 'text-purple-400',
  },
  {
    id: 'pink_noise',
    shortLabel: 'Rosa Rauschen',
    title: 'Rosa Rauschen',
    icon: Sparkles,
    accent: 'text-pink-400',
  },
  {
    id: 'waves',
    shortLabel: 'Wellen',
    title: 'Meeresrauschen & Wellen',
    icon: Waves,
    accent: 'text-sky-400',
  },
  {
    id: 'fireplace',
    shortLabel: 'Kamin',
    title: 'Gemütliches Kaminfeuer',
    icon: Flame,
    accent: 'text-amber-400',
  },
  {
    id: 'none',
    shortLabel: 'Stumm',
    title: 'Kein Hintergrundklang',
    icon: VolumeX,
    accent: 'text-slate-400',
  },
];

const QUICK_SCHEDULES: {
  sound: AmbientSoundType;
  minutes: number;
  label: string;
  soundName: string;
}[] = [
  { sound: 'rain', minutes: 25, label: 'Regen · 25 Min', soundName: 'Sanfter Sommerregen' },
  { sound: 'forest', minutes: 25, label: 'Wald · 25 Min', soundName: 'Wald & Vogelgezwitscher' },
  { sound: 'white_noise', minutes: 50, label: 'Weißes Rauschen · 50 Min', soundName: 'Weißes Rauschen' },
  { sound: 'waves', minutes: 15, label: 'Wellen · 15 Min', soundName: 'Meeresrauschen' },
  { sound: 'fireplace', minutes: 45, label: 'Kaminfeuer · 45 Min', soundName: 'Kaminfeuer' },
];

export const AudioFocusTimerCard: React.FC<AudioFocusTimerCardProps> = ({
  settings,
  onUpdateSettings,
  pomodoro,
  isZenMode,
  showFeedback,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';
  });

  const {
    phase,
    timeLeft,
    totalDuration,
    isRunning,
    completedSessions,
    currentCycle,
    progressPercent,
    silencedAlert,
    dismissSilencedAlert,
    start,
    pause,
    reset,
    skip,
    switchPhase,
    scheduleAndStartSession,
    stopSession,
  } = pomodoro;

  const config = settings.pomodoro;
  const syncAmbient = config.syncAmbientWithTimer ?? true;
  const focusSound = config.focusAmbientSound ?? 'rain';
  const breakBehavior = config.breakAmbientBehavior ?? 'pause';
  const breakSound = config.breakAmbientSound ?? 'waves';

  const formatMinutesSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const phaseMeta = {
    work: {
      label: 'Fokus-Session',
      badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      bar: '#f43f5e',
      glow: 'from-rose-500/20 to-amber-500/10',
      icon: Flame,
    },
    shortBreak: {
      label: 'Kurze Pause',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      bar: '#10b981',
      glow: 'from-emerald-500/20 to-teal-500/10',
      icon: Coffee,
    },
    longBreak: {
      label: 'Lange Pause',
      badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      bar: '#06b6d4',
      glow: 'from-cyan-500/20 to-blue-500/10',
      icon: Sun,
    },
  }[phase];

  const PhaseIcon = phaseMeta.icon;

  // Determine which sound is scheduled for the active phase
  const scheduledPhaseSoundId: AmbientSoundType = !syncAmbient
    ? 'none'
    : phase === 'work'
    ? focusSound
    : breakBehavior === 'pause'
    ? 'none'
    : breakBehavior === 'switch'
    ? breakSound
    : focusSound;

  const scheduledSoundMeta = SOUND_OPTIONS.find((s) => s.id === scheduledPhaseSoundId) || SOUND_OPTIONS[6];
  const ScheduledSoundIcon = scheduledSoundMeta.icon;

  const handleTogglePlay = () => {
    if (settings.vibrationEnabled) triggerHaptic(15);
    if (isRunning) {
      pause();
      showFeedback(
        syncAmbient
          ? 'Fokus-Timer & Hintergrundklang pausiert'
          : 'Fokus-Timer pausiert'
      );
    } else {
      start();
      if (syncAmbient && scheduledPhaseSoundId !== 'none') {
        showFeedback(
          `Fokus-Timer gestartet: ${scheduledSoundMeta.shortLabel} (${Math.ceil(timeLeft / 60)} Min.)`
        );
      } else {
        showFeedback('Fokus-Timer gestartet');
      }
    }
  };

  const handleReset = () => {
    if (settings.vibrationEnabled) triggerHaptic(10);
    reset();
    showFeedback('Fokus-Timer zurückgesetzt');
  };

  const handleSkip = () => {
    if (settings.vibrationEnabled) triggerHaptic(15);
    skip();
  };

  const handleSwitchPhase = (newPhase: PomodoroPhase) => {
    if (settings.vibrationEnabled) triggerHaptic(10);
    switchPhase(newPhase);
  };

  const handleTestAlertSound = () => {
    if (settings.vibrationEnabled) triggerHaptic(15);
    const { played, silencedByZen } = playPomodoroAlert(
      config.soundAlert,
      config.soundVolume,
      isZenMode,
      config.silenceInZenMode
    );
    if (silencedByZen) {
      showFeedback('🔕 Signalton stummgeschaltet (Zen-Modus aktiv)');
    } else if (played) {
      showFeedback(`Signalton "${config.soundAlert}" abgespielt`);
    } else {
      showFeedback('Signalton ist auf "Stumm" gestellt');
    }
  };

  const handleRequestNotifications = async () => {
    if (settings.vibrationEnabled) triggerHaptic(12);
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      showFeedback('Desktop-Benachrichtigungen aktiviert');
    } else if (perm === 'denied') {
      showFeedback('Benachrichtigungen im Browser blockiert');
    }
  };

  return (
    <div
      id="audio-focus-timer-card"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/90 p-5 shadow-xl space-y-5"
    >
      {/* Subtle Ambient Glow */}
      <div
        className={`absolute -top-24 right-0 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-40 bg-gradient-to-bl ${phaseMeta.glow}`}
      />

      {/* Silenced Zen Alert Banner */}
      {silencedAlert && (
        <div className="relative z-10 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BellOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] font-medium">
              Signalton beim Phasenwechsel wurde durch den aktiven Zen-Modus stummgeschaltet.
            </span>
          </div>
          <button
            type="button"
            onClick={dismissSilencedAlert}
            className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-semibold cursor-pointer shrink-0"
          >
            OK
          </button>
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl border transition-all ${
              isRunning
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-md shadow-rose-500/10'
                : 'bg-slate-800/80 text-slate-300 border-slate-700/60'
            }`}
          >
            <Timer className={`w-5 h-5 ${isRunning ? 'animate-pulse text-rose-400' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white tracking-wide">
                Fokus-Timer & Klang-Planer
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Pomodoro
              </span>
              {isRunning && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-semibold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LÄUFT
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 block mt-0.5">
              Plane zeitgesteuerte Klang-Sessions (z. B. Regen für 25 Min.)
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-bold text-slate-200 block">
            Zyklus {currentCycle}/{config.longBreakInterval}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {completedSessions} {completedSessions === 1 ? 'Session' : 'Sessions'}
          </span>
        </div>
      </div>

      {/* Quick Schedule Presets */}
      <div className="relative z-10 space-y-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Schnell-Planung (1 Klick zum Starten)
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_SCHEDULES.map((preset) => {
            const soundMeta = SOUND_OPTIONS.find((s) => s.id === preset.sound)!;
            const PresetIcon = soundMeta.icon;
            const isActivePreset =
              isRunning &&
              phase === 'work' &&
              focusSound === preset.sound &&
              config.workDuration === preset.minutes;

            return (
              <button
                key={`${preset.sound}-${preset.minutes}`}
                type="button"
                onClick={() => {
                  if (settings.vibrationEnabled) triggerHaptic(15);
                  scheduleAndStartSession(preset.sound, preset.minutes, preset.soundName);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                  isActivePreset
                    ? 'bg-blue-600/30 text-white border-blue-400/60 shadow-sm'
                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
                }`}
              >
                <PresetIcon className={`w-3.5 h-3.5 ${soundMeta.accent}`} />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Countdown Display & Controls Box */}
      <div className="relative z-10 rounded-2xl bg-slate-950/70 border border-slate-800/90 p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${phaseMeta.badge}`}
          >
            <PhaseIcon className="w-3.5 h-3.5" />
            <span>{phaseMeta.label}</span>
          </span>

          {/* Scheduled Sound Indicator Pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              syncAmbient && scheduledPhaseSoundId !== 'none'
                ? 'bg-cyan-500/10 text-cyan-200 border-cyan-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <ScheduledSoundIcon
              className={`w-3.5 h-3.5 ${
                syncAmbient && scheduledPhaseSoundId !== 'none'
                  ? scheduledSoundMeta.accent
                  : 'text-slate-500'
              }`}
            />
            <span>
              {syncAmbient
                ? scheduledPhaseSoundId === 'none'
                  ? phase === 'work'
                    ? 'Kein Fokus-Klang'
                    : 'Pause: Stille'
                  : `Klang: ${scheduledSoundMeta.shortLabel}`
                : 'Klang-Sync aus'}
            </span>
          </div>
        </div>

        {/* Big Countdown */}
        <div className="flex flex-col items-center justify-center py-1">
          <div
            id="audio-pomodoro-countdown"
            className="text-5xl sm:text-6xl font-mono font-extrabold tracking-tight text-white tabular-nums drop-shadow-md"
          >
            {formatMinutesSeconds(timeLeft)}
          </div>

          <div className="w-full max-w-sm mt-3 h-2 rounded-full bg-slate-800/90 overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: phaseMeta.bar,
              }}
            />
          </div>

          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span>Geplant: {Math.round(totalDuration / 60)} Min.</span>
            <span>•</span>
            <span>Fortschritt: {Math.round(progressPercent)}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            title="Phase zurücksetzen"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="audio-pomodoro-toggle-btn"
            type="button"
            onClick={handleTogglePlay}
            className={`px-7 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 text-white shadow-lg active:scale-95 transition-all cursor-pointer ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/40'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pausieren</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Session starten</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            title="Zur nächsten Phase springen"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 active:scale-95 transition-all cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {(config.enabled || isRunning) && (
            <button
              type="button"
              onClick={() => {
                if (settings.vibrationEnabled) triggerHaptic(12);
                stopSession();
                showFeedback('Fokus-Timer beendet');
              }}
              title="Fokus-Session komplett beenden"
              className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}
        </div>

        {/* Phase Switcher */}
        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/70">
          <button
            type="button"
            onClick={() => handleSwitchPhase('work')}
            className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
              phase === 'work'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Fokus ({config.workDuration}m)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPhase('shortBreak')}
            className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
              phase === 'shortBreak'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Pause ({config.shortBreakDuration}m)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPhase('longBreak')}
            className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
              phase === 'longBreak'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Erholung ({config.longBreakDuration}m)
          </button>
        </div>
      </div>

      {/* Scheduled Sound & Focus Duration Configuration */}
      <div className="relative z-10 space-y-4 bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80">
        {/* Sync Toggle */}
        <MaterialSwitch
          label="Hintergrundklang mit Timer koppeln"
          description="Startet und pausiert den gewählten Ambient-Sound automatisch mit dem Fokus-Timer"
          checked={syncAmbient}
          onChange={(checked) => {
            onUpdateSettings((p) => ({
              ...p,
              pomodoro: { ...p.pomodoro, syncAmbientWithTimer: checked },
            }));
            showFeedback(
              checked
                ? 'Klang-Synchronisation mit Fokus-Timer aktiviert'
                : 'Klang-Synchronisation deaktiviert'
            );
          }}
        />

        {/* Focus Sound Selector */}
        {syncAmbient && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Klang für Fokus-Session</span>
              <span className="text-[11px] text-cyan-400 font-medium">
                {SOUND_OPTIONS.find((s) => s.id === focusSound)?.title}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {SOUND_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = focusSound === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (settings.vibrationEnabled) triggerHaptic(8);
                      onUpdateSettings((p) => ({
                        ...p,
                        pomodoro: { ...p.pomodoro, focusAmbientSound: opt.id },
                      }));
                      showFeedback(`Fokus-Klang: ${opt.title}`);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-white border-cyan-400/50 shadow-sm'
                        : 'bg-slate-900/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${opt.accent}`} />
                    <span className="truncate">{opt.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Focus Duration Slider + Presets */}
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Dauer der Fokus-Session</span>
            <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              {config.workDuration} Min.
            </span>
          </div>
          <input
            id="audio-focus-duration-slider"
            type="range"
            min={5}
            max={90}
            step={5}
            value={config.workDuration}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onUpdateSettings((p) => ({
                ...p,
                pomodoro: { ...p.pomodoro, workDuration: val },
              }));
            }}
            className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            {[10, 15, 20, 25, 30, 45, 50, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  if (settings.vibrationEnabled) triggerHaptic(8);
                  onUpdateSettings((p) => ({
                    ...p,
                    pomodoro: { ...p.pomodoro, workDuration: mins },
                  }));
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  config.workDuration === mins
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Break Sound Behavior */}
        {syncAmbient && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <span className="text-xs font-semibold text-slate-200 block">
              Klang-Verhalten während der Pause
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'pause', label: 'Pausieren', desc: 'Stille Pause' },
                  { id: 'continue', label: 'Weiterspielen', desc: 'Durchgehend' },
                  { id: 'switch', label: 'Wechseln', desc: 'Pausenklang' },
                ] as { id: PomodoroBreakAmbientBehavior; label: string; desc: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    onUpdateSettings((p) => ({
                      ...p,
                      pomodoro: { ...p.pomodoro, breakAmbientBehavior: mode.id },
                    }))
                  }
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    breakBehavior === mode.id
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold">{mode.label}</div>
                  <div className="text-[10px] opacity-75">{mode.desc}</div>
                </button>
              ))}
            </div>

            {breakBehavior === 'switch' && (
              <div className="pt-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">Klang in der Pause:</span>
                <select
                  value={breakSound}
                  onChange={(e) =>
                    onUpdateSettings((p) => ({
                      ...p,
                      pomodoro: {
                        ...p.pomodoro,
                        breakAmbientSound: e.target.value as AmbientSoundType,
                      },
                    }))
                  }
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {SOUND_OPTIONS.filter((o) => o.id !== 'none').map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expandable Advanced Pomodoro Settings */}
      <div className="relative z-10 border-t border-slate-800/80 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white py-1 cursor-pointer transition-colors"
        >
          <span>Erweiterte Timer-, Signalton- & Zen-Optionen</span>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4 pt-3 border-t border-slate-800/60">
            {/* Break Durations & Cycle Interval */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Kurze Pause</span>
                  <span className="font-bold text-emerald-400">{config.shortBreakDuration} Min.</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={config.shortBreakDuration}
                  onChange={(e) =>
                    onUpdateSettings((p) => ({
                      ...p,
                      pomodoro: { ...p.pomodoro, shortBreakDuration: parseInt(e.target.value, 10) },
                    }))
                  }
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Lange Pause</span>
                  <span className="font-bold text-cyan-400">{config.longBreakDuration} Min.</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={45}
                  step={5}
                  value={config.longBreakDuration}
                  onChange={(e) =>
                    onUpdateSettings((p) => ({
                      ...p,
                      pomodoro: { ...p.pomodoro, longBreakDuration: parseInt(e.target.value, 10) },
                    }))
                  }
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Rounds before Long Break */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Lange Pause nach Runden:</span>
              <div className="flex items-center gap-1.5">
                {[2, 3, 4, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((p) => ({
                        ...p,
                        pomodoro: { ...p.pomodoro, longBreakInterval: num },
                      }))
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      config.longBreakInterval === num
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            {/* Automation Switches */}
            <div className="divide-y divide-slate-800/60">
              <MaterialSwitch
                label="Mini-Timer auf der Hauptuhr anzeigen"
                description="Kompakte Status-Leiste mit Restzeit und aktivem Klang auf dem Bildschirm"
                checked={config.showWidgetOnClock ?? true}
                onChange={(checked) =>
                  onUpdateSettings((p) => ({
                    ...p,
                    pomodoro: { ...p.pomodoro, showWidgetOnClock: checked },
                  }))
                }
              />
              <MaterialSwitch
                label="Pausen automatisch starten"
                description="Wechselt nach Ende der Fokus-Session direkt in die Pause"
                checked={config.autoStartBreaks ?? true}
                onChange={(checked) =>
                  onUpdateSettings((p) => ({
                    ...p,
                    pomodoro: { ...p.pomodoro, autoStartBreaks: checked },
                  }))
                }
              />
              <MaterialSwitch
                label="Nächsten Fokus automatisch starten"
                description="Startet nach Ende der Pause direkt die nächste Fokus-Session"
                checked={config.autoStartWork ?? false}
                onChange={(checked) =>
                  onUpdateSettings((p) => ({
                    ...p,
                    pomodoro: { ...p.pomodoro, autoStartWork: checked },
                  }))
                }
              />
              <MaterialSwitch
                label="Zen-Modus bei Fokus automatisch aktivieren"
                description="Blendet Bedienelemente für maximale Konzentration aus"
                checked={config.autoZenModeDuringWork ?? false}
                onChange={(checked) =>
                  onUpdateSettings((p) => ({
                    ...p,
                    pomodoro: { ...p.pomodoro, autoZenModeDuringWork: checked },
                  }))
                }
              />
              <MaterialSwitch
                label="Signaltöne im Zen-Modus stummschalten"
                description="Unterdrückt Wecktöne bei Phasenwechsel im Zen-Modus"
                checked={config.silenceInZenMode ?? true}
                onChange={(checked) =>
                  onUpdateSettings((p) => ({
                    ...p,
                    pomodoro: { ...p.pomodoro, silenceInZenMode: checked },
                  }))
                }
              />
            </div>

            {/* Completion Alert Chime */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Signalton bei Session-Ende</span>
                </span>
                <button
                  type="button"
                  onClick={handleTestAlertSound}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Testen</span>
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'chime' as PomodoroSoundType, label: 'Glockenspiel' },
                  { id: 'bell' as PomodoroSoundType, label: 'Klangschale' },
                  { id: 'gong' as PomodoroSoundType, label: 'Zen-Gong' },
                  { id: 'digital' as PomodoroSoundType, label: 'Digital' },
                  { id: 'none' as PomodoroSoundType, label: 'Stumm' },
                ].map((snd) => (
                  <button
                    key={snd.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((p) => ({
                        ...p,
                        pomodoro: { ...p.pomodoro, soundAlert: snd.id },
                      }))
                    }
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center ${
                      config.soundAlert === snd.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                    }`}
                  >
                    {snd.label}
                  </button>
                ))}
              </div>

              {config.soundAlert !== 'none' && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Signal-Lautstärke</span>
                    <span className="font-mono text-slate-200">
                      {Math.round((config.soundVolume ?? 0.65) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={config.soundVolume ?? 0.65}
                    onChange={(e) =>
                      onUpdateSettings((p) => ({
                        ...p,
                        pomodoro: { ...p.pomodoro, soundVolume: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Browser Notification Permission */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Desktop-Benachrichtigung bei Ablauf
                </span>
                {notificationPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleRequestNotifications}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Erlauben
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <Check className="w-3 h-3" />
                    Aktiv
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
