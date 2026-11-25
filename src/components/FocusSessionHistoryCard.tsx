import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Clock,
  Flame,
  CalendarDays,
  CloudRain,
  Trees,
  Radio,
  Sparkles,
  Waves,
  Flame as FireplaceIcon,
  VolumeX,
  Trash2,
  CheckCircle2,
  SkipForward,
  History,
  X,
} from 'lucide-react';
import { AmbientSoundType, ClockSettings, FocusSessionRecord } from '../types';
import { PomodoroController } from '../hooks/usePomodoro';
import {
  calculateFocusStreak,
  DailyProductivePoint,
  formatMinutesAsDuration,
  getDailyProductiveSeries,
  getMostUsedFocusSound,
  toLocalDateKey,
} from '../utils/focusHistory';
import { triggerHaptic } from '../utils/audio';

interface FocusSessionHistoryCardProps {
  settings: ClockSettings;
  pomodoro: PomodoroController;
  showFeedback: (msg: string) => void;
}

const SOUND_META: Record<
  AmbientSoundType,
  {
    label: string;
    icon: React.FC<{ className?: string }>;
    badgeClass: string;
  }
> = {
  rain: {
    label: 'Sommerregen',
    icon: CloudRain,
    badgeClass: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
  },
  forest: {
    label: 'Wald & Vögel',
    icon: Trees,
    badgeClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
  },
  white_noise: {
    label: 'Weißes Rauschen',
    icon: Radio,
    badgeClass: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
  },
  pink_noise: {
    label: 'Rosa Rauschen',
    icon: Sparkles,
    badgeClass: 'text-pink-300 bg-pink-500/15 border-pink-500/30',
  },
  waves: {
    label: 'Meereswellen',
    icon: Waves,
    badgeClass: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
  },
  fireplace: {
    label: 'Kaminfeuer',
    icon: FireplaceIcon,
    badgeClass: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
  },
  none: {
    label: 'Stumm',
    icon: VolumeX,
    badgeClass: 'text-slate-300 bg-slate-800/80 border-slate-700/60',
  },
};

// Generates a smooth, strictly monotonic horizontal-tangent cubic path that never overshoots below baseline
function buildSmoothLinePath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

function formatYAxisTick(minutes: number): string {
  if (minutes === 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

function formatSessionTimestamp(timestampMs: number, todayKey: string): string {
  const recKey = toLocalDateKey(timestampMs);
  const d = new Date(timestampMs);
  const timeStr = d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (recKey === todayKey) {
    return `Heute, ${timeStr}`;
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (recKey === toLocalDateKey(yesterday.getTime())) {
    return `Gestern, ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${dateStr} · ${timeStr}`;
}

export const FocusSessionHistoryCard: React.FC<FocusSessionHistoryCardProps> = ({
  settings,
  pomodoro,
  showFeedback,
}) => {
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const history = pomodoro.sessionHistory;
  const locale = 'de-DE';

  const series = useMemo(
    () => getDailyProductiveSeries(history, rangeDays, locale),
    [history, rangeDays, locale]
  );

  const stats = useMemo(() => {
    const todayPoint = series[series.length - 1] || {
      totalMinutes: 0,
      sessionCount: 0,
    };
    const totalRangeMinutes = series.reduce((sum, p) => sum + p.totalMinutes, 0);
    const totalRangeSessions = series.reduce((sum, p) => sum + p.sessionCount, 0);
    const maxDailyMinutes = series.reduce((max, p) => Math.max(max, p.totalMinutes), 0);
    const avgMinutesPerDay = Math.round(totalRangeMinutes / series.length);
    const streak = calculateFocusStreak(history);
    const topSound = getMostUsedFocusSound(history);

    return {
      todayMinutes: todayPoint.totalMinutes,
      todaySessions: todayPoint.sessionCount,
      totalRangeMinutes,
      totalRangeSessions,
      maxDailyMinutes,
      avgMinutesPerDay,
      streak,
      topSound,
    };
  }, [series, history]);

  // Chart geometry inside SVG viewBox
  const chartGeom = useMemo(() => {
    const width = 560;
    const height = 196;
    const padLeft = 40;
    const padRight = 16;
    const padTop = 18;
    const padBottom = 30;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;
    const baselineY = padTop + plotHeight;

    // Choose a clean Y-axis ceiling (minimum 60m when empty or small, else rounded up to neat multiple)
    const rawMax = stats.maxDailyMinutes;
    let yMax = 60;
    if (rawMax > 60) {
      const step = rawMax <= 180 ? 30 : 60;
      yMax = Math.ceil(rawMax / step) * step;
    } else if (rawMax > 30) {
      yMax = 60;
    } else if (rawMax > 0) {
      yMax = Math.max(30, Math.ceil(rawMax / 15) * 15);
    }

    const coords = series.map((pt, idx) => {
      const x =
        series.length <= 1
          ? padLeft + plotWidth / 2
          : padLeft + (idx / (series.length - 1)) * plotWidth;
      const y = baselineY - (pt.totalMinutes / yMax) * plotHeight;
      return { x, y, point: pt };
    });

    const linePath = buildSmoothLinePath(coords);
    const areaPath =
      coords.length > 0
        ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${coords[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`
        : '';

    const yTicks = [0, 0.333, 0.666, 1].map((ratio) => {
      const val = Math.round(yMax * ratio);
      const y = baselineY - ratio * plotHeight;
      return { val, y };
    });

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotWidth,
      plotHeight,
      baselineY,
      yMax,
      coords,
      linePath,
      areaPath,
      yTicks,
    };
  }, [series, stats.maxDailyMinutes]);

  const inspectedIndex =
    activePointIndex !== null && activePointIndex >= 0 && activePointIndex < series.length
      ? activePointIndex
      : null;
  const inspectedPoint: DailyProductivePoint | null =
    inspectedIndex !== null ? series[inspectedIndex] : null;
  const inspectedCoord =
    inspectedIndex !== null ? chartGeom.coords[inspectedIndex] : null;

  const todayKey = useMemo(() => toLocalDateKey(Date.now()), []);
  const recentSessions = useMemo(() => history.slice(0, 8), [history]);

  const handleDeleteEntry = (record: FocusSessionRecord) => {
    if (settings.vibrationEnabled) triggerHaptic(10);
    pomodoro.deleteHistoryEntry(record.id);
    showFeedback('Eintrag aus dem Fokus-Verlauf entfernt');
  };

  const handleClearAll = () => {
    if (settings.vibrationEnabled) triggerHaptic(15);
    pomodoro.clearHistory();
    setConfirmClear(false);
    setActivePointIndex(null);
    showFeedback('Fokus-Verlauf vollständig geleert');
  };

  const topSoundMeta = stats.topSound ? SOUND_META[stats.topSound] : null;

  return (
    <div
      id="focus-session-history-card"
      className="rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800/90 p-5 shadow-lg space-y-4"
    >
      {/* Header & Range Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                Fokus-Session-Verlauf
              </span>
              {history.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-semibold border border-slate-700/70">
                  {history.length} {history.length === 1 ? 'Session' : 'Sessions'}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 block mt-0.5">
              Tägliche produktive Fokuszeit aus abgeschlossenen Pomodoro-Sessions
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Zeitraum auswählen"
          className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800/80"
        >
          {([7, 14, 30] as const).map((days) => {
            const active = rangeDays === days;
            return (
              <button
                key={days}
                type="button"
                onClick={() => {
                  if (settings.vibrationEnabled) triggerHaptic(8);
                  setRangeDays(days);
                  setActivePointIndex(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {days}T
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Heute</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm sm:text-base font-bold text-white tabular-nums">
            {formatMinutesAsDuration(stats.todayMinutes)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.todaySessions} {stats.todaySessions === 1 ? 'Session' : 'Sessions'}
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>{rangeDays} Tage gesamt</span>
            <CalendarDays className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-sm sm:text-base font-bold text-white tabular-nums">
            {formatMinutesAsDuration(stats.totalRangeMinutes)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Ø {stats.avgMinutesPerDay} Min/Tag
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Fokus-Serie</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm sm:text-base font-bold text-white tabular-nums">
            {stats.streak} {stats.streak === 1 ? 'Tag' : 'Tage'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {topSoundMeta ? `Favorit: ${topSoundMeta.label}` : 'Noch kein Favorit'}
          </div>
        </div>
      </div>

      {/* Line Chart Panel */}
      <div className="rounded-xl bg-slate-950/75 border border-slate-800/80 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2 min-h-[22px]">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Produktive Fokuszeit pro Tag
          </span>

          {inspectedPoint ? (
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/35 text-[11px]">
              <span className="text-slate-300 font-medium">{inspectedPoint.fullDateLabel}:</span>
              <span className="font-bold text-cyan-200 tabular-nums">
                {formatMinutesAsDuration(inspectedPoint.totalMinutes)}
              </span>
              <span className="text-slate-400">
                ({inspectedPoint.sessionCount})
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-500">
              {stats.maxDailyMinutes > 0
                ? `Spitze: ${formatMinutesAsDuration(stats.maxDailyMinutes)} / Tag`
                : 'Tippe auf einen Tag für Details'}
            </span>
          )}
        </div>

        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${chartGeom.width} ${chartGeom.height}`}
            className="w-full h-auto overflow-visible select-none"
            role="img"
            aria-label="Liniendiagramm der täglichen produktiven Fokuszeit"
            onMouseLeave={() => setActivePointIndex(null)}
          >
            <defs>
              <linearGradient id="focusChartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
                <stop offset="85%" stopColor="#0ea5e9" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="focusChartLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>

            {/* Horizontal Y-Axis Gridlines & Labels */}
            {chartGeom.yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={chartGeom.padLeft}
                  y1={tick.y}
                  x2={chartGeom.width - chartGeom.padRight}
                  y2={tick.y}
                  stroke={i === 0 ? 'rgba(148, 163, 184, 0.22)' : 'rgba(148, 163, 184, 0.10)'}
                  strokeDasharray={i === 0 ? undefined : '3 4'}
                  strokeWidth={1}
                />
                <text
                  x={chartGeom.padLeft - 8}
                  y={tick.y + 3}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px] font-mono"
                >
                  {formatYAxisTick(tick.val)}
                </text>
              </g>
            ))}

            {/* Vertical Guide Line on Active Point */}
            {inspectedCoord && (
              <line
                x1={inspectedCoord.x}
                y1={chartGeom.padTop}
                x2={inspectedCoord.x}
                y2={chartGeom.baselineY}
                stroke="rgba(34, 211, 238, 0.4)"
                strokeDasharray="3 3"
                strokeWidth={1.25}
              />
            )}

            {/* Area Fill & Smooth Line */}
            {chartGeom.areaPath && (
              <path d={chartGeom.areaPath} fill="url(#focusChartAreaGrad)" />
            )}
            {chartGeom.linePath && (
              <path
                d={chartGeom.linePath}
                fill="none"
                stroke="url(#focusChartLineGrad)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points + Invisible Wide Hit Targets + X-Axis Labels */}
            {chartGeom.coords.map(({ x, y, point }, idx) => {
              const isActive = inspectedIndex === idx;
              const showLabel =
                rangeDays === 7 ||
                (rangeDays === 14 && (idx % 2 === 0 || idx === series.length - 1)) ||
                (rangeDays === 30 && (idx % 5 === 0 || idx === series.length - 1));

              const hasFocus = point.totalMinutes > 0;
              const hitWidth = Math.max(12, chartGeom.plotWidth / Math.max(1, series.length));

              return (
                <g key={point.dateKey}>
                  {showLabel && (
                    <text
                      x={x}
                      y={chartGeom.baselineY + 18}
                      textAnchor="middle"
                      className={`text-[10px] font-medium ${
                        point.isToday
                          ? 'fill-cyan-300 font-bold'
                          : isActive
                          ? 'fill-slate-200'
                          : 'fill-slate-500'
                      }`}
                    >
                      {point.isToday && rangeDays === 7 ? 'Heute' : point.shortLabel}
                    </text>
                  )}

                  {/* Outer glow ring when hovered/selected */}
                  {isActive && (
                    <circle
                      cx={x}
                      cy={y}
                      r={7}
                      fill="rgba(34, 211, 238, 0.22)"
                    />
                  )}

                  {/* Point dot */}
                  {(hasFocus || isActive || rangeDays === 7) && (
                    <circle
                      cx={x}
                      cy={y}
                      r={isActive ? 4.5 : hasFocus ? 3.5 : 2.2}
                      fill={isActive ? '#67e8f9' : hasFocus ? '#22d3ee' : '#334155'}
                      stroke={hasFocus || isActive ? '#0f172a' : 'none'}
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Interactive Hover/Tap Strip */}
                  <rect
                    x={x - hitWidth / 2}
                    y={chartGeom.padTop}
                    width={hitWidth}
                    height={chartGeom.plotHeight + 22}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setActivePointIndex(idx)}
                    onClick={() =>
                      setActivePointIndex((prev) => (prev === idx ? null : idx))
                    }
                  />
                </g>
              );
            })}
          </svg>

          {/* Subtle Empty Overlay when there are 0 productive minutes in selected range */}
          {stats.totalRangeMinutes === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-5">
              <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/70 text-center max-w-xs shadow-md">
                <p className="text-[11px] font-medium text-slate-300">
                  Noch keine Fokus-Sessions in den letzten {rangeDays} Tagen
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Starte eine Fokus-Session im Timer oben — abgeschlossene Durchläufe erscheinen hier automatisch.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions Log */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>Letzte Fokus-Sessions</span>
          </span>

          {history.length > 0 && (
            <div className="flex items-center gap-1.5">
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-[11px] text-slate-400 hover:text-rose-300 transition-colors px-2 py-0.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                >
                  Verlauf löschen
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] font-semibold text-rose-200 bg-rose-500/25 hover:bg-rose-500/40 border border-rose-500/40 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Wirklich löschen
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    aria-label="Löschen abbrechen"
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {recentSessions.length === 0 ? (
          <div className="rounded-xl bg-slate-950/40 border border-dashed border-slate-800/80 px-3.5 py-3 text-center text-[11px] text-slate-500">
            Noch keine aufgezeichneten Sessions vorhanden.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
            {recentSessions.map((rec) => {
              const soundMeta = SOUND_META[rec.sound] || SOUND_META.none;
              const SoundIcon = soundMeta.icon;
              return (
                <div
                  key={rec.id}
                  className="flex items-center justify-between gap-2.5 rounded-xl bg-slate-950/55 border border-slate-800/75 px-3 py-2 text-xs group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg border shrink-0 ${soundMeta.badgeClass}`}
                    >
                      <SoundIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200 truncate">
                          {soundMeta.label}
                        </span>
                        {rec.completed ? (
                          <span
                            title="Vollständig abgeschlossen"
                            className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-medium"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        ) : (
                          <span
                            title="Vorzeitig beendet"
                            className="inline-flex items-center gap-0.5 text-[10px] text-amber-400/90 font-medium"
                          >
                            <SkipForward className="w-3 h-3" />
                            <span>Teilweise</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {formatSessionTimestamp(rec.completedAt, todayKey)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-200 border border-cyan-500/25 tabular-nums">
                      {rec.durationMinutes} Min
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(rec)}
                      title="Session entfernen"
                      aria-label="Session entfernen"
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
