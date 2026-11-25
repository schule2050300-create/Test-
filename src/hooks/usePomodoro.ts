import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AmbientSoundType, ClockSettings, FocusSessionRecord, PomodoroPhase } from '../types';
import { playPomodoroAlert, sendPomodoroNotification } from '../utils/pomodoroAudio';
import {
  addFocusSessionRecord,
  clearFocusSessionHistory,
  deleteFocusSessionRecord,
  loadFocusHistory,
} from '../utils/focusHistory';

export interface UsePomodoroProps {
  settings: ClockSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<ClockSettings>>;
  isZenMode: boolean;
  onSetZenMode: (zen: boolean) => void;
  onShowFeedback?: (msg: string) => void;
}

export interface PomodoroController {
  phase: PomodoroPhase;
  timeLeft: number;
  totalDuration: number;
  isRunning: boolean;
  completedSessions: number;
  currentCycle: number;
  progressPercent: number;
  silencedAlert: boolean;
  dismissSilencedAlert: () => void;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  switchPhase: (phase: PomodoroPhase) => void;
  scheduleAndStartSession: (sound: AmbientSoundType, durationMinutes: number, label?: string) => void;
  stopSession: () => void;
  sessionHistory: FocusSessionRecord[];
  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;
}

const POMODORO_STORAGE_KEY = 'webclock_pomodoro_runtime_v1';

export function usePomodoro({
  settings,
  onUpdateSettings,
  isZenMode,
  onSetZenMode,
  onShowFeedback,
}: UsePomodoroProps): PomodoroController {
  const {
    workDuration = 25,
    shortBreakDuration = 5,
    longBreakDuration = 15,
    longBreakInterval = 4,
    autoStartBreaks = true,
    autoStartWork = false,
    autoZenModeDuringWork = false,
    exitZenModeOnBreak = false,
    silenceInZenMode = true,
    soundAlert = 'chime',
    soundVolume = 0.65,
    syncAmbientWithTimer = true,
    focusAmbientSound = 'rain',
    breakAmbientBehavior = 'pause',
    breakAmbientSound = 'waves',
  } = settings.pomodoro || {};

  // Retrieve initial runtime state or defaults
  const [phase, setPhase] = useState<PomodoroPhase>(() => {
    try {
      const saved = localStorage.getItem(POMODORO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phase && ['work', 'shortBreak', 'longBreak'].includes(parsed.phase)) {
          return parsed.phase;
        }
      }
    } catch {}
    return 'work';
  });

  const getDurationForPhase = useCallback(
    (p: PomodoroPhase) => {
      switch (p) {
        case 'work':
          return workDuration * 60;
        case 'shortBreak':
          return shortBreakDuration * 60;
        case 'longBreak':
          return longBreakDuration * 60;
      }
    },
    [workDuration, shortBreakDuration, longBreakDuration]
  );

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(POMODORO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.timeLeft === 'number' && parsed.timeLeft > 0) {
          return parsed.timeLeft;
        }
      }
    } catch {}
    return workDuration * 60;
  });

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(POMODORO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.completedSessions === 'number') {
          return parsed.completedSessions;
        }
      }
    } catch {}
    return 0;
  });

  const [silencedAlert, setSilencedAlert] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<FocusSessionRecord[]>(() =>
    loadFocusHistory()
  );

  // References for reliable interval timing across tab blurs & avoiding stale closures
  const targetEndTimeRef = useRef<number | null>(null);
  const timeLeftRef = useRef<number>(timeLeft);
  timeLeftRef.current = timeLeft;

  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;
  const isZenModeRef = useRef(isZenMode);
  isZenModeRef.current = isZenMode;
  const silenceInZenModeRef = useRef(silenceInZenMode);
  silenceInZenModeRef.current = silenceInZenMode;
  const activeAmbientSoundRef = useRef<AmbientSoundType>(
    settings.ambientSound?.activeSound ?? 'none'
  );
  activeAmbientSoundRef.current = settings.ambientSound?.activeSound ?? 'none';

  // Persist lightweight runtime state
  useEffect(() => {
    try {
      localStorage.setItem(
        POMODORO_STORAGE_KEY,
        JSON.stringify({
          phase,
          timeLeft,
          completedSessions,
        })
      );
    } catch {}
  }, [phase, timeLeft, completedSessions]);

  // If user adjusts durations in settings while paused, sync timeLeft
  const prevDurationsRef = useRef({ workDuration, shortBreakDuration, longBreakDuration });
  useEffect(() => {
    if (!isRunning) {
      const prev = prevDurationsRef.current;
      if (
        (phase === 'work' && prev.workDuration !== workDuration) ||
        (phase === 'shortBreak' && prev.shortBreakDuration !== shortBreakDuration) ||
        (phase === 'longBreak' && prev.longBreakDuration !== longBreakDuration)
      ) {
        setTimeLeft(getDurationForPhase(phase));
      }
    }
    prevDurationsRef.current = { workDuration, shortBreakDuration, longBreakDuration };
  }, [workDuration, shortBreakDuration, longBreakDuration, phase, isRunning, getDurationForPhase]);

  // Synchronize ambient sound playback with current Pomodoro phase & running state
  const syncAmbientForPhase = useCallback(
    (
      targetPhase: PomodoroPhase,
      shouldPlay: boolean,
      overrideFocusSound?: AmbientSoundType
    ) => {
      if (!syncAmbientWithTimer) return;

      onUpdateSettings((prev) => {
        const currentAmbient = prev.ambientSound || {
          activeSound: 'none',
          volume: 0.35,
          isPlaying: false,
          autoPlayOnStart: false,
        };
        const pomo = prev.pomodoro;
        const effectiveFocusSound =
          overrideFocusSound ?? pomo?.focusAmbientSound ?? 'rain';
        const effectiveBreakBehavior = pomo?.breakAmbientBehavior ?? 'pause';
        const effectiveBreakSound = pomo?.breakAmbientSound ?? 'waves';

        if (!shouldPlay) {
          if (!currentAmbient.isPlaying) return prev;
          return {
            ...prev,
            ambientSound: {
              ...currentAmbient,
              isPlaying: false,
            },
          };
        }

        if (targetPhase === 'work') {
          if (effectiveFocusSound === 'none') {
            return {
              ...prev,
              ambientSound: {
                ...currentAmbient,
                isPlaying: false,
              },
            };
          }
          return {
            ...prev,
            ambientSound: {
              ...currentAmbient,
              activeSound: effectiveFocusSound,
              isPlaying: true,
            },
          };
        }

        // Break phases (shortBreak / longBreak)
        if (effectiveBreakBehavior === 'pause') {
          return {
            ...prev,
            ambientSound: {
              ...currentAmbient,
              isPlaying: false,
            },
          };
        }

        if (effectiveBreakBehavior === 'switch') {
          if (effectiveBreakSound === 'none') {
            return {
              ...prev,
              ambientSound: {
                ...currentAmbient,
                isPlaying: false,
              },
            };
          }
          return {
            ...prev,
            ambientSound: {
              ...currentAmbient,
              activeSound: effectiveBreakSound,
              isPlaying: true,
            },
          };
        }

        // 'continue'
        if (effectiveFocusSound === 'none') {
          return prev;
        }
        return {
          ...prev,
          ambientSound: {
            ...currentAmbient,
            activeSound: effectiveFocusSound,
            isPlaying: true,
          },
        };
      });
    },
    [syncAmbientWithTimer, onUpdateSettings]
  );

  // If user switches focusAmbientSound while timer is actively running in work phase, apply live
  const prevFocusSoundRef = useRef<AmbientSoundType | undefined>(focusAmbientSound);
  useEffect(() => {
    if (prevFocusSoundRef.current !== focusAmbientSound) {
      prevFocusSoundRef.current = focusAmbientSound;
      if (isRunning && phase === 'work' && syncAmbientWithTimer) {
        syncAmbientForPhase('work', true, focusAmbientSound);
      }
    }
  }, [focusAmbientSound, isRunning, phase, syncAmbientWithTimer, syncAmbientForPhase]);

  // Phase transition handler
  const handlePhaseComplete = useCallback((isSkipped: boolean = false) => {
    const zenActive = isZenModeRef.current;
    const shouldSilence = silenceInZenModeRef.current;

    if (phase === 'work') {
      // Log completed or >= 1 min partial focus session into Focus Session History
      const effectiveSound: AmbientSoundType = syncAmbientWithTimer
        ? focusAmbientSound
        : activeAmbientSoundRef.current;

      if (!isSkipped) {
        const updatedHistory = addFocusSessionRecord({
          durationMinutes: workDuration,
          sound: effectiveSound,
          completed: true,
        });
        setSessionHistory(updatedHistory);
      } else {
        const elapsedSeconds = Math.max(0, workDuration * 60 - timeLeftRef.current);
        if (elapsedSeconds >= 60) {
          const updatedHistory = addFocusSessionRecord({
            durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
            sound: effectiveSound,
            completed: false,
          });
          setSessionHistory(updatedHistory);
        }
      }

      const nextCompleted = completedSessions + 1;
      setCompletedSessions(nextCompleted);

      const isLongBreak = nextCompleted % longBreakInterval === 0;
      const nextPhase: PomodoroPhase = isLongBreak ? 'longBreak' : 'shortBreak';
      const nextDuration = (isLongBreak ? longBreakDuration : shortBreakDuration) * 60;

      setPhase(nextPhase);
      setTimeLeft(nextDuration);
      timeLeftRef.current = nextDuration;

      // Zen mode integration: optionally exit Zen mode when break starts so user can relax
      if (exitZenModeOnBreak && zenActive) {
        onSetZenMode(false);
      }

      // Sync ambient sound for break (pause/stop if autoStartBreaks is false, or follow break behavior)
      syncAmbientForPhase(nextPhase, autoStartBreaks);

      // Audio & notification check (silenced if in Zen mode)
      const { silencedByZen } = playPomodoroAlert(soundAlert, soundVolume, zenActive, shouldSilence);
      sendPomodoroNotification(
        'Fokus-Session beendet!',
        isLongBreak ? 'Großartig! Zeit für eine lange Erholungspause.' : 'Zeit für eine kurze Pause.',
        zenActive,
        shouldSilence
      );

      if (silencedByZen) {
        setSilencedAlert(true);
        onShowFeedback?.('🔕 Signalton stummgeschaltet (Zen-Modus aktiv)');
      } else {
        onShowFeedback?.(
          isLongBreak
            ? '🎉 Fokus-Zyklus geschafft! Zeit für eine lange Pause.'
            : '☕ Fokus-Session beendet! Zeit für eine kurze Pause.'
        );
      }

      setIsRunning(autoStartBreaks);
      if (autoStartBreaks) {
        targetEndTimeRef.current = Date.now() + nextDuration * 1000;
      } else {
        targetEndTimeRef.current = null;
      }
    } else {
      // Break completed -> Transition to Work
      const nextPhase: PomodoroPhase = 'work';
      const nextDuration = workDuration * 60;

      setPhase(nextPhase);
      setTimeLeft(nextDuration);
      timeLeftRef.current = nextDuration;

      // Zen mode integration: automatically engage Zen mode during work if enabled
      if (autoZenModeDuringWork && !zenActive && autoStartWork) {
        onSetZenMode(true);
      }

      // Sync ambient sound for work (starts focus sound if autoStartWork is enabled, else pauses)
      syncAmbientForPhase('work', autoStartWork);

      // Audio & notification check (silenced if in Zen mode)
      const { silencedByZen } = playPomodoroAlert(soundAlert, soundVolume, zenActive, shouldSilence);
      sendPomodoroNotification(
        'Pause beendet!',
        'Bereit für die nächste Fokus-Session?',
        zenActive,
        shouldSilence
      );

      if (silencedByZen) {
        setSilencedAlert(true);
        onShowFeedback?.('🔕 Signalton stummgeschaltet (Zen-Modus aktiv)');
      } else {
        onShowFeedback?.('🎯 Pause beendet! Nächste Fokus-Session bereit.');
      }

      setIsRunning(autoStartWork);
      if (autoStartWork) {
        targetEndTimeRef.current = Date.now() + nextDuration * 1000;
      } else {
        targetEndTimeRef.current = null;
      }
    }
  }, [
    phase,
    completedSessions,
    longBreakInterval,
    longBreakDuration,
    shortBreakDuration,
    workDuration,
    exitZenModeOnBreak,
    autoZenModeDuringWork,
    autoStartBreaks,
    autoStartWork,
    soundAlert,
    soundVolume,
    onSetZenMode,
    onShowFeedback,
    syncAmbientForPhase,
    syncAmbientWithTimer,
    focusAmbientSound,
  ]);

  const handlePhaseCompleteRef = useRef(handlePhaseComplete);
  handlePhaseCompleteRef.current = handlePhaseComplete;

  // Main tick loop (does not recreate interval every second)
  useEffect(() => {
    if (!isRunning) {
      targetEndTimeRef.current = null;
      return;
    }

    if (!targetEndTimeRef.current) {
      targetEndTimeRef.current = Date.now() + timeLeftRef.current * 1000;
    }

    const interval = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const diffMs = targetEndTimeRef.current - Date.now();
      const nextSeconds = Math.max(0, Math.ceil(diffMs / 1000));

      setTimeLeft(nextSeconds);

      if (nextSeconds <= 0) {
        clearInterval(interval);
        targetEndTimeRef.current = null;
        handlePhaseCompleteRef.current(false);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Controls
  const start = useCallback(() => {
    if (phase === 'work' && autoZenModeDuringWork && !isZenMode) {
      onSetZenMode(true);
    }
    onUpdateSettings((prev) =>
      prev.pomodoro.enabled
        ? prev
        : { ...prev, pomodoro: { ...prev.pomodoro, enabled: true } }
    );
    syncAmbientForPhase(phase, true);
    targetEndTimeRef.current = Date.now() + timeLeftRef.current * 1000;
    setIsRunning(true);
  }, [phase, autoZenModeDuringWork, isZenMode, onSetZenMode, onUpdateSettings, syncAmbientForPhase]);

  const pause = useCallback(() => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    syncAmbientForPhase(phase, false);
  }, [phase, syncAmbientForPhase]);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const reset = useCallback(() => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    const dur = getDurationForPhase(phase);
    setTimeLeft(dur);
    timeLeftRef.current = dur;
    syncAmbientForPhase(phase, false);
  }, [phase, getDurationForPhase, syncAmbientForPhase]);

  const skip = useCallback(() => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    handlePhaseCompleteRef.current(true);
  }, []);

  const switchPhase = useCallback(
    (newPhase: PomodoroPhase) => {
      setIsRunning(false);
      targetEndTimeRef.current = null;
      setPhase(newPhase);
      const dur = getDurationForPhase(newPhase);
      setTimeLeft(dur);
      timeLeftRef.current = dur;
      syncAmbientForPhase(newPhase, false);
    },
    [getDurationForPhase, syncAmbientForPhase]
  );

  // Schedule and immediately start a timed ambient sound focus session (e.g. 'rain' for 25 min)
  const scheduleAndStartSession = useCallback(
    (sound: AmbientSoundType, durationMinutes: number, label?: string) => {
      const clampedMins = Math.max(1, Math.min(120, Math.round(durationMinutes)));
      const durationSeconds = clampedMins * 60;

      if (autoZenModeDuringWork && !isZenMode) {
        onSetZenMode(true);
      }

      onUpdateSettings((prev) => ({
        ...prev,
        pomodoro: {
          ...prev.pomodoro,
          enabled: true,
          workDuration: clampedMins,
          focusAmbientSound: sound,
          syncAmbientWithTimer: true,
        },
        ambientSound: {
          ...(prev.ambientSound || {
            activeSound: 'none',
            volume: 0.35,
            isPlaying: false,
            autoPlayOnStart: false,
          }),
          activeSound: sound,
          isPlaying: sound !== 'none',
        },
      }));

      setPhase('work');
      setTimeLeft(durationSeconds);
      timeLeftRef.current = durationSeconds;
      targetEndTimeRef.current = Date.now() + durationSeconds * 1000;
      setIsRunning(true);

      if (onShowFeedback) {
        onShowFeedback(
          label
            ? `Fokus-Session gestartet: ${label} (${clampedMins} Min.)`
            : `Fokus-Session gestartet (${clampedMins} Min.)`
        );
      }
    },
    [autoZenModeDuringWork, isZenMode, onSetZenMode, onUpdateSettings, onShowFeedback]
  );

  const stopSession = useCallback(() => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setPhase('work');
    const dur = workDuration * 60;
    setTimeLeft(dur);
    timeLeftRef.current = dur;
    onUpdateSettings((prev) => ({
      ...prev,
      pomodoro: {
        ...prev.pomodoro,
        enabled: false,
      },
      ambientSound: prev.pomodoro.syncAmbientWithTimer
        ? {
            ...prev.ambientSound,
            isPlaying: false,
          }
        : prev.ambientSound,
    }));
  }, [workDuration, onUpdateSettings]);

  const dismissSilencedAlert = useCallback(() => {
    setSilencedAlert(false);
  }, []);

  const deleteHistoryEntry = useCallback((id: string) => {
    const updated = deleteFocusSessionRecord(id);
    setSessionHistory(updated);
  }, []);

  const clearHistory = useCallback(() => {
    const updated = clearFocusSessionHistory();
    setSessionHistory(updated);
  }, []);

  const totalDuration = getDurationForPhase(phase);
  const progressPercent = Math.min(
    100,
    Math.max(0, ((totalDuration - timeLeft) / totalDuration) * 100)
  );
  const currentCycle = (completedSessions % longBreakInterval) + 1;

  return {
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
    toggle,
    reset,
    skip,
    switchPhase,
    scheduleAndStartSession,
    stopSession,
    sessionHistory,
    deleteHistoryEntry,
    clearHistory,
  };
}
