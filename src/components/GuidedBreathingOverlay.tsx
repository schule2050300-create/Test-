import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Wind, Pause, Play, X } from 'lucide-react';
import { BreathingTechniqueId, GuidedBreathingConfig } from '../types';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '#38bdf8').replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 56, g: 189, b: 248 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export type BreathPhaseType = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

export interface BreathingTechniqueDef {
  id: BreathingTechniqueId;
  name: string;
  shortRatio: string;
  description: string;
  inhaleSec: number;
  holdInSec: number;
  exhaleSec: number;
  holdOutSec: number;
}

export const BREATHING_TECHNIQUES: Record<BreathingTechniqueId, BreathingTechniqueDef> = {
  box: {
    id: 'box',
    name: 'Box Breathing',
    shortRatio: '4-4-4-4',
    description: 'Fokus & innere Balance',
    inhaleSec: 4,
    holdInSec: 4,
    exhaleSec: 4,
    holdOutSec: 4,
  },
  relax: {
    id: 'relax',
    name: '4-7-8 Entspannung',
    shortRatio: '4-7-8',
    description: 'Tiefe Beruhigung & Loslassen',
    inhaleSec: 4,
    holdInSec: 7,
    exhaleSec: 8,
    holdOutSec: 0,
  },
  coherent: {
    id: 'coherent',
    name: 'Kohärentes Atmen',
    shortRatio: '5.5s',
    description: 'Ruhiger gleichmäßiger Fluss',
    inhaleSec: 5.5,
    holdInSec: 0,
    exhaleSec: 5.5,
    holdOutSec: 0,
  },
  calm: {
    id: 'calm',
    name: 'Tiefer Ausatem',
    shortRatio: '4-2-6',
    description: 'Sanfter Stressabbau',
    inhaleSec: 4,
    holdInSec: 2,
    exhaleSec: 6,
    holdOutSec: 0,
  },
};

const PHASE_LABELS: Record<BreathPhaseType, string> = {
  inhale: 'Einatmen',
  holdIn: 'Atem halten',
  exhale: 'Ausatmen',
  holdOut: 'Ruhe halten',
};

interface BreathParticle {
  angle: number;
  ringIndex: number; // 0 = inner, 1 = middle, 2 = outer, 3 = floating aura
  radialOffset: number;
  size: number;
  baseAlpha: number;
  angularVelocity: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface GuidedBreathingOverlayProps {
  isZenMode: boolean;
  isScreensaverActive?: boolean;
  config?: GuidedBreathingConfig;
  accentColor?: string;
  ecoMode?: boolean;
  onChangeTechnique?: (technique: BreathingTechniqueId) => void;
  onDisableBreathing?: () => void;
}

function easeInOutSine(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t)));
}

function getCycleState(
  elapsedSec: number,
  tech: BreathingTechniqueDef
): {
  phase: BreathPhaseType;
  phaseProgress: number;
  remainingSec: number;
  breathLevel: number;
} {
  const totalSec =
    tech.inhaleSec + tech.holdInSec + tech.exhaleSec + tech.holdOutSec || 12;
  const t = ((elapsedSec % totalSec) + totalSec) % totalSec;

  if (t < tech.inhaleSec) {
    const p = t / tech.inhaleSec;
    return {
      phase: 'inhale',
      phaseProgress: p,
      remainingSec: Math.max(1, Math.ceil(tech.inhaleSec - t)),
      breathLevel: easeInOutSine(p),
    };
  }

  const afterInhale = t - tech.inhaleSec;
  if (tech.holdInSec > 0 && afterInhale < tech.holdInSec) {
    const p = afterInhale / tech.holdInSec;
    return {
      phase: 'holdIn',
      phaseProgress: p,
      remainingSec: Math.max(1, Math.ceil(tech.holdInSec - afterInhale)),
      breathLevel: 1 + 0.015 * Math.sin(p * Math.PI * 2),
    };
  }

  const afterHoldIn = afterInhale - tech.holdInSec;
  if (afterHoldIn < tech.exhaleSec) {
    const p = afterHoldIn / tech.exhaleSec;
    return {
      phase: 'exhale',
      phaseProgress: p,
      remainingSec: Math.max(1, Math.ceil(tech.exhaleSec - afterHoldIn)),
      breathLevel: 1 - easeInOutSine(p),
    };
  }

  const afterExhale = afterHoldIn - tech.exhaleSec;
  const holdOutDur = Math.max(0.001, tech.holdOutSec);
  const p = Math.min(1, afterExhale / holdOutDur);
  return {
    phase: 'holdOut',
    phaseProgress: p,
    remainingSec: Math.max(1, Math.ceil(tech.holdOutSec - afterExhale)),
    breathLevel: 0.008 * Math.sin(p * Math.PI * 2),
  };
}

export const GuidedBreathingOverlay: React.FC<GuidedBreathingOverlayProps> = ({
  isZenMode,
  isScreensaverActive = false,
  config,
  accentColor = '#38bdf8',
  ecoMode = false,
  onChangeTechnique,
  onDisableBreathing,
}) => {
  const enabled = config?.enabled ?? true;
  const techniqueId: BreathingTechniqueId = config?.technique ?? 'box';
  const showPhaseCue = config?.showPhaseCue ?? true;
  const intensity = Math.max(30, Math.min(100, config?.intensity ?? 75));
  const effectiveColor = config?.particleColor || accentColor || '#38bdf8';

  const isVisible = isZenMode && !isScreensaverActive && enabled;

  const [isPaused, setIsPaused] = useState(false);
  const [cueState, setCueState] = useState<{
    phase: BreathPhaseType;
    remainingSec: number;
    progressPercent: number;
  }>({
    phase: 'inhale',
    remainingSec: BREATHING_TECHNIQUES[techniqueId].inhaleSec,
    progressPercent: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const techniqueRef = useRef(BREATHING_TECHNIQUES[techniqueId]);
  techniqueRef.current = BREATHING_TECHNIQUES[techniqueId];
  const colorRef = useRef(effectiveColor);
  colorRef.current = effectiveColor;
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  const ecoModeRef = useRef(ecoMode);
  ecoModeRef.current = ecoMode;

  // Reset pause state whenever Zen Mode opens freshly
  useEffect(() => {
    if (isVisible) {
      setIsPaused(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let isRunning = true;
    let width = 0;
    let height = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, ecoMode ? 1 : 2);
    const resize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Create deterministic harmonic particle rings
    const particles: BreathParticle[] = [];
    const ringConfigs = [
      { ringIndex: 0, count: ecoMode ? 14 : 24, sizeBase: 2.0, speedBase: 0.14 },
      { ringIndex: 1, count: ecoMode ? 22 : 36, sizeBase: 2.8, speedBase: -0.09 },
      { ringIndex: 2, count: ecoMode ? 18 : 28, sizeBase: 2.1, speedBase: 0.06 },
      { ringIndex: 3, count: ecoMode ? 14 : 24, sizeBase: 3.2, speedBase: 0.04 },
    ];

    for (const rc of ringConfigs) {
      for (let i = 0; i < rc.count; i++) {
        const baseAngle = (i / rc.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
        particles.push({
          angle: baseAngle,
          ringIndex: rc.ringIndex,
          radialOffset: (Math.random() - 0.5) * (rc.ringIndex === 3 ? 52 : 18),
          size: rc.sizeBase + Math.random() * 1.8,
          baseAlpha: 0.35 + Math.random() * 0.55,
          angularVelocity: rc.speedBase + (Math.random() - 0.5) * 0.03,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 1.2 + Math.random() * 1.4,
        });
      }
    }

    let elapsedActiveSec = 0;
    let lastTimestamp = performance.now();
    let lastFrameDraw = 0;
    let lastCueUpdateMs = 0;

    const render = (now: number) => {
      if (!isRunning) return;

      if (ecoModeRef.current && now - lastFrameDraw < 31) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      lastFrameDraw = now;

      const dtSec = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      if (!isPausedRef.current && document.visibilityState !== 'hidden') {
        elapsedActiveSec += dtSec;
      }

      const tech = techniqueRef.current;
      const cycle = getCycleState(elapsedActiveSec, tech);

      // Update React cue UI at ~12Hz to avoid unnecessary re-renders
      if (now - lastCueUpdateMs > 80) {
        lastCueUpdateMs = now;
        const pct = Math.round(cycle.phaseProgress * 100);
        setCueState((prev) => {
          if (
            prev.phase === cycle.phase &&
            prev.remainingSec === cycle.remainingSec &&
            Math.abs(prev.progressPercent - pct) < 2
          ) {
            return prev;
          }
          return {
            phase: cycle.phase,
            remainingSec: cycle.remainingSec,
            progressPercent: pct,
          };
        });
      }

      const rgb = hexToRgb(colorRef.current || '#38bdf8');
      const intensityFactor = (intensityRef.current || 75) / 100;
      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);

      const minRadius = Math.max(95, minDim * 0.165);
      const maxRadius = Math.max(minRadius + 70, minDim * 0.405);
      const clampedLevel = Math.max(-0.02, Math.min(1.04, cycle.breathLevel));
      const mainRadius = minRadius + clampedLevel * (maxRadius - minRadius);

      ctx.clearRect(0, 0, width, height);

      // 1. Soft breathing radial glow behind the clock
      const haloRadius = mainRadius * 1.38;
      const haloGrad = ctx.createRadialGradient(cx, cy, minRadius * 0.25, cx, cy, haloRadius);
      const haloAlpha = (0.07 + 0.11 * Math.max(0, clampedLevel)) * intensityFactor;
      haloGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${haloAlpha})`);
      haloGrad.addColorStop(0.58, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${haloAlpha * 0.45})`);
      haloGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Primary & echo concentric breath guide rings
      const ringAlpha = (0.14 + 0.22 * Math.max(0, clampedLevel)) * intensityFactor;
      ctx.beginPath();
      ctx.arc(cx, cy, mainRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ringAlpha})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, mainRadius * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ringAlpha * 0.48})`;
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // 3. Expanding & contracting orbital particles
      const phaseSpeedMultiplier =
        cycle.phase === 'inhale'
          ? 1.35
          : cycle.phase === 'holdIn'
          ? 0.45
          : cycle.phase === 'exhale'
          ? -0.75
          : 0.2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!isPausedRef.current) {
          p.angle += p.angularVelocity * phaseSpeedMultiplier * dtSec;
          p.twinklePhase += p.twinkleSpeed * dtSec;
        }

        const ringMultiplier =
          p.ringIndex === 0
            ? 0.72
            : p.ringIndex === 1
            ? 1.0
            : p.ringIndex === 2
            ? 1.18
            : 0.92 + 0.28 * Math.sin(p.twinklePhase * 0.5);

        const r = Math.max(24, mainRadius * ringMultiplier + p.radialOffset * (0.55 + 0.45 * clampedLevel));
        const px = cx + Math.cos(p.angle) * r;
        const py = cy + Math.sin(p.angle) * r;

        const twinkle = 0.65 + 0.35 * Math.sin(p.twinklePhase);
        const breathBoost = 0.55 + 0.45 * Math.max(0, clampedLevel);
        const alpha = Math.min(0.95, p.baseAlpha * twinkle * breathBoost * intensityFactor);
        const dotRadius = p.size * (0.85 + 0.38 * Math.max(0, clampedLevel));

        // Outer soft particle bloom
        const bloomRadius = dotRadius * 3.1;
        const pGrad = ctx.createRadialGradient(px, py, 0, px, py, bloomRadius);
        pGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
        pGrad.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.38})`);
        pGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, bloomRadius, 0, Math.PI * 2);
        ctx.fill();

        // Crisp luminous core
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.9, alpha * 0.72)})`;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.8, dotRadius * 0.52), 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isVisible, techniqueId, ecoMode]);

  const activeTech = BREATHING_TECHNIQUES[techniqueId];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="guided-breathing-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: 'easeInOut' }}
          className="fixed inset-0 pointer-events-none z-[6]"
          aria-hidden={!showPhaseCue}
        >
          {/* Expanding / Contracting Particle Canvas */}
          <canvas
            ref={canvasRef}
            id="guided-breathing-canvas"
            className="fixed inset-0 w-full h-full pointer-events-none"
          />

          {/* Subtle Interactive Breathing Cue Pill (Bottom-Center in Zen Mode) */}
          {showPhaseCue && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
              <div
                id="guided-breathing-cue-pill"
                className="group flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-950/60 hover:bg-slate-950/85 backdrop-blur-xl border border-white/10 hover:border-white/20 shadow-xl transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full transition-transform duration-500 ${
                        isPaused
                          ? 'bg-slate-400'
                          : cueState.phase === 'inhale'
                          ? 'bg-cyan-400 scale-125 animate-pulse'
                          : cueState.phase === 'exhale'
                          ? 'bg-indigo-400 scale-90'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span className="text-xs sm:text-sm font-medium tracking-wide text-slate-100">
                      {isPaused ? 'Pausiert' : PHASE_LABELS[cueState.phase]}
                    </span>
                  </div>

                  {!isPaused && (
                    <span className="font-mono text-xs font-bold text-cyan-300 tabular-nums min-w-[1.5rem] text-center">
                      {cueState.remainingSec}s
                    </span>
                  )}

                  {/* Quick Hover Actions */}
                  <div className="hidden group-hover:flex items-center gap-1 pl-1.5 border-l border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsPaused((p) => !p)}
                      title={isPaused ? 'Atemübung fortsetzen' : 'Atemübung pausieren'}
                      aria-label={isPaused ? 'Atemübung fortsetzen' : 'Atemübung pausieren'}
                      className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>

                    {onDisableBreathing && (
                      <button
                        type="button"
                        onClick={onDisableBreathing}
                        title="Guided Breathing ausblenden"
                        aria-label="Guided Breathing ausblenden"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Ultra-thin Breath Phase Progress Bar */}
                <div className="w-full h-0.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${isPaused ? 0 : cueState.progressPercent}%`,
                      backgroundColor: effectiveColor,
                    }}
                  />
                </div>

                {/* Technique Quick Switcher (visible on hover) */}
                {onChangeTechnique && (
                  <div className="hidden group-hover:flex items-center gap-1 pt-0.5">
                    <Wind className="w-3 h-3 text-slate-400 mr-0.5" />
                    {(Object.values(BREATHING_TECHNIQUES) as BreathingTechniqueDef[]).map((tech) => {
                      const active = tech.id === activeTech.id;
                      return (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => onChangeTechnique(tech.id)}
                          title={`${tech.name}: ${tech.description}`}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          {tech.shortRatio}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
