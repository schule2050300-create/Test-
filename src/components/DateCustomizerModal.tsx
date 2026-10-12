import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  X,
  Type,
  Maximize2,
  Palette,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
} from 'lucide-react';
import {
  ClockSettings,
  ClockFont,
  DateFormat,
  DateStyle,
  DateCase,
  DateTracking,
  DateWeekdayFormat,
} from '../types';
import { triggerHaptic } from '../utils/audio';
import { formatClockDate } from '../utils/dateFormat';

interface DateCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClockSettings;
  onUpdateSettings: (updater: (prev: ClockSettings) => ClockSettings) => void;
  currentTime?: Date;
  offsetMs?: number;
}

// Curated date colors
const DATE_COLOR_SWATCHES = [
  { name: 'Klassisch Weiß', value: '#ffffff' },
  { name: 'Eisblau (Cyan)', value: '#38bdf8' },
  { name: 'Neon Türkis', value: '#06b6d4' },
  { name: 'Smaragdgrün', value: '#34d399' },
  { name: 'Sonnengelb', value: '#facc15' },
  { name: 'Bernsteingold', value: '#fbbf24' },
  { name: 'Vibrant Orange', value: '#f97316' },
  { name: 'Korallrot', value: '#fb7185' },
  { name: 'Magenta Pink', value: '#f472b6' },
  { name: 'Elektrisches Violett', value: '#c084fc' },
  { name: 'Königsblau', value: '#818cf8' },
  { name: 'Indigoblau', value: '#6366f1' },
  { name: 'Sanfte Minze', value: '#2dd4bf' },
  { name: 'Silbergrau', value: '#94a3b8' },
  { name: 'Schiefergrau', value: '#64748b' },
  { name: 'Warmes Beige', value: '#f5f5f4' },
];

export const DateCustomizerModal: React.FC<DateCustomizerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentTime,
  offsetMs = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'size' | 'format' | 'color' | 'style'>('size');

  const now = useMemo(() => {
    if (currentTime) return currentTime;
    const nowMs = Date.now() + (settings.useAtomicSync ? offsetMs : 0);
    return new Date(nowMs);
  }, [currentTime, settings.useAtomicSync, offsetMs]);

  // Generate preview of current date based on chosen settings using formatClockDate
  const datePreview = useMemo(() => {
    const locale = settings.appLanguage === 'en' ? 'en-US' : 'de-DE';
    const targetTimeZone =
      !settings.timeZone || settings.timeZone === 'Europe/Berlin'
        ? 'Europe/Berlin'
        : settings.timeZone === 'auto'
        ? undefined
        : settings.timeZone;

    return formatClockDate({
      date: now,
      dateFormat: settings.dateFormat,
      weekdayFormat: settings.dateWeekdayFormat,
      showDayOfWeek: settings.showDayOfWeek,
      customPattern: settings.dateCustomPattern,
      locale,
      timeZone: targetTimeZone,
    });
  }, [
    now,
    settings.dateFormat,
    settings.dateWeekdayFormat,
    settings.showDayOfWeek,
    settings.dateCustomPattern,
    settings.appLanguage,
    settings.timeZone,
  ]);

  const currentColor = settings.dateColor || settings.clockColor;
  const isInheritedColor = !settings.dateColor;
  const isAccentColor = settings.dateColor === settings.accentColor;

  const handleUpdate = (updater: (prev: ClockSettings) => ClockSettings) => {
    if (settings.vibrationEnabled) triggerHaptic(10);
    onUpdateSettings(updater);
  };

  const handleResetToDefault = () => {
    if (settings.vibrationEnabled) triggerHaptic(15);
    onUpdateSettings((prev) => ({
      ...prev,
      dateScale: 100,
      dateColor: undefined,
      dateFont: 'inherit',
      dateWeight: '300',
      dateStyle: 'minimal',
      dateCase: 'uppercase',
      dateTracking: 'wide',
      dateWeekdayFormat: 'long',
      showDayOfWeek: true,
      dateFormat: 'DD.MM.YYYY',
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-lg bg-slate-950/95 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 select-none max-h-[90vh]"
          style={{
            backdropFilter: `blur(${settings.backdropBlurIntensity ?? 16}px)`,
            WebkitBackdropFilter: `blur(${settings.backdropBlurIntensity ?? 16}px)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <span>Datums-Design & Größe</span>
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                </h3>
                <p className="text-xs text-slate-400">Passe Skalierung, Format, Schrift und Farben an</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetToDefault}
                title="Datumsdesign auf Standard zurücksetzen"
                aria-label="Zurücksetzen"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Schließen"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-4 bg-slate-900/50 border-b border-slate-800/80 flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Live-Vorschau
            </span>
            <div
              className={`p-3 rounded-2xl transition-all duration-200 text-center max-w-full overflow-hidden ${
                settings.dateStyle === 'glass-pill'
                  ? 'bg-white/10 border border-white/20 shadow-lg px-6 py-2.5 rounded-full'
                  : settings.dateStyle === 'bordered'
                  ? 'border border-sky-400/40 px-5 py-2 rounded-2xl bg-sky-950/20'
                  : ''
              }`}
              style={{
                color: currentColor,
                fontSize: `${Math.round(15 * ((settings.dateScale ?? 100) / 100))}px`,
                textShadow: '0 2px 10px rgba(0,0,0,0.4)',
                letterSpacing:
                  settings.dateTracking === 'wider'
                    ? '0.25em'
                    : settings.dateTracking === 'normal'
                    ? '0.05em'
                    : '0.15em',
                textTransform: settings.dateCase === 'normal' ? 'none' : 'uppercase',
                fontWeight: settings.dateWeight === 'inherit' ? 300 : Number(settings.dateWeight || 300),
              }}
            >
              {datePreview}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
              <span>Größe: <strong className="text-sky-300 font-mono">{settings.dateScale ?? 100}%</strong></span>
              <span>•</span>
              <span>Format: <strong className="text-slate-300">{settings.dateFormat}</strong></span>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="px-5 pt-3 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800/80">
              {[
                { id: 'size', label: 'Größe & Skalierung', icon: Maximize2 },
                { id: 'format', label: 'Format & Wochentag', icon: Calendar },
                { id: 'color', label: 'Farbe', icon: Palette },
                { id: 'style', label: 'Typografie & Stil', icon: Type },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* 1. GRÖSSE & SKALIERUNG */}
            {activeTab === 'size' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Datumsgröße anpassen</span>
                    <span className="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                      {settings.dateScale ?? 100}%
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-500">60%</span>
                    <input
                      id="date-scale-slider"
                      type="range"
                      min="60"
                      max="200"
                      step="5"
                      value={settings.dateScale ?? 100}
                      onChange={(e) =>
                        handleUpdate((p) => ({
                          ...p,
                          dateScale: parseInt(e.target.value, 10),
                        }))
                      }
                      className="flex-1 accent-sky-500 cursor-pointer"
                      aria-label="Datumsgröße Schieberegler"
                    />
                    <span className="text-[10px] font-mono text-slate-500">200%</span>
                  </div>

                  {/* Size Preset Buttons */}
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-400 block mb-2 font-medium">Schnell-Stufen</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { label: 'Kompakt', val: 75 },
                        { label: 'Standard', val: 100 },
                        { label: 'Mittel', val: 125 },
                        { label: 'Groß', val: 150 },
                        { label: 'Maximal', val: 180 },
                      ].map((preset) => {
                        const isSelected = (settings.dateScale ?? 100) === preset.val;
                        return (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => handleUpdate((p) => ({ ...p, dateScale: preset.val }))}
                            className={`py-1.5 px-1 rounded-xl text-center border text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500/25 border-sky-500/80 text-sky-200 shadow-sm'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <div>{preset.label}</div>
                            <div className="text-[10px] opacity-75 font-mono">{preset.val}%</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. FORMAT & WOCHENTAG */}
            {activeTab === 'format' && (
              <div className="space-y-4">
                {/* Datumsformat Presets */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
                  <span className="text-xs font-semibold text-slate-200 block">Datums-Schreibweise</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'DD.MM.YYYY', badge: 'TT.MM.JJJJ', label: '12.10.2026', hint: 'Klassisch Deutsch (Tag.Monat.Jahr)' },
                      { id: 'MM/DD/YYYY', badge: 'MM/TT/JJJJ', label: '10/12/2026', hint: 'US / International (Monat/Tag/Jahr)' },
                      { id: 'YYYY-MM-DD', badge: 'JJJJ-MM-TT', label: '2026-10-12', hint: 'ISO 8601 Norm (Jahr-Monat-Tag)' },
                      { id: 'D. MMMM YYYY', badge: 'T. MMMM JJJJ', label: '12. Oktober 2026', hint: 'Ausgeschriebener Monatsname' },
                      { id: 'D. MMM YYYY', badge: 'T. MMM JJJJ', label: '12. Okt. 2026', hint: 'Abgekürzter Monatsname' },
                      { id: 'DD.MM.YY', badge: 'TT.MM.JJ', label: '12.10.26', hint: 'Kompakt mit 2-stelligem Jahr' },
                      { id: 'custom', badge: 'Eigenes Muster', label: settings.dateCustomPattern || 'WWWW, TT.MM.JJJJ', hint: 'Frei konfigurierbare Platzhalter' },
                    ].map((fmt) => {
                      const isSelected = settings.dateFormat === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() =>
                            handleUpdate((p) => ({
                              ...p,
                              dateFormat: fmt.id as DateFormat,
                              dateCustomPattern:
                                fmt.id === 'custom' && !p.dateCustomPattern
                                  ? 'WWWW, TT.MM.JJJJ'
                                  : p.dateCustomPattern,
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500/25 border-sky-500/80 text-sky-200 shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-xs font-bold text-white px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/80">
                                {fmt.badge}
                              </span>
                              <span className="text-xs font-bold text-white truncate">{fmt.label}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-1">{fmt.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Eigene Format-Vorlage (Custom Pattern) */}
                {settings.dateFormat === 'custom' && (
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-2.5">
                    <span className="text-xs font-semibold text-sky-300 block">
                      Freies Formatmuster konfigurieren
                    </span>
                    <input
                      type="text"
                      value={settings.dateCustomPattern || ''}
                      onChange={(e) =>
                        handleUpdate((p) => ({ ...p, dateCustomPattern: e.target.value }))
                      }
                      placeholder="z.B. WWWW, TT.MM.JJJJ oder TT. MMMM JJJJ"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                    />

                    {/* Quick Token Chips */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {[
                        { token: 'WWWW', label: 'Wochentag voll' },
                        { token: 'WW', label: 'Wochentag kurz' },
                        { token: 'TT', label: 'Tag (02)' },
                        { token: 'T', label: 'Tag (2)' },
                        { token: 'MMMM', label: 'Monat voll' },
                        { token: 'MMM', label: 'Monat kurz' },
                        { token: 'MM', label: 'Monat (10)' },
                        { token: 'JJJJ', label: 'Jahr (2026)' },
                        { token: 'JJ', label: 'Jahr (26)' },
                      ].map((t) => (
                        <button
                          key={t.token}
                          type="button"
                          onClick={() => {
                            const cur = settings.dateCustomPattern || '';
                            handleUpdate((p) => ({
                              ...p,
                              dateCustomPattern: cur ? `${cur} ${t.token}` : t.token,
                            }));
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 hover:text-sky-200 border border-slate-700 text-[10px] font-mono cursor-pointer"
                        >
                          +{t.token}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wochentag Anzeige */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 block">Wochentag</span>
                    <span className="text-[10px] text-slate-400">Ausgeschrieben oder abgekürzt</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'long', label: 'Ausgeschrieben', sample: 'Montag' },
                      { id: 'short', label: 'Abgekürzt', sample: 'Mo.' },
                      { id: 'none', label: 'Ausblenden', sample: 'Ohne Wochentag' },
                    ].map((mode) => {
                      const current = settings.dateWeekdayFormat ?? (settings.showDayOfWeek ? 'long' : 'none');
                      const isSelected = current === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            handleUpdate((p) => ({
                              ...p,
                              dateWeekdayFormat: mode.id as DateWeekdayFormat,
                              showDayOfWeek: mode.id !== 'none',
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500/25 border-sky-500/80 text-sky-200 shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-xs font-bold">{mode.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{mode.sample}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. FARBE */}
            {activeTab === 'color' && (
              <div className="space-y-4">
                {/* Sync Mode Options */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdate((p) => ({ ...p, dateColor: undefined }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isInheritedColor
                        ? 'bg-sky-500/25 border-sky-500/80 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: settings.clockColor }}
                      />
                      <span className="text-xs font-bold text-slate-200">Wie Ziffern</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Automatisch synchron</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdate((p) => ({ ...p, dateColor: settings.accentColor }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isAccentColor
                        ? 'bg-sky-500/25 border-sky-500/80 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: settings.accentColor }}
                      />
                      <span className="text-xs font-bold text-slate-200">Wie Akzent</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Akzentfarbe nutzen</span>
                  </button>
                </div>

                {/* Color Swatches Grid */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-semibold text-slate-300 block">Farbpalette wählen</span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {DATE_COLOR_SWATCHES.map((swatch) => {
                      const isSelected = settings.dateColor === swatch.value;
                      return (
                        <button
                          key={swatch.value}
                          type="button"
                          onClick={() => handleUpdate((p) => ({ ...p, dateColor: swatch.value }))}
                          title={swatch.name}
                          className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                            isSelected
                              ? 'border-white bg-slate-800/90 shadow-md ring-2 ring-sky-400/40'
                              : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded-full shadow-inner border border-white/10"
                            style={{ backgroundColor: swatch.value }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Hex Color Input */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">Eigener HEX-Code:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => handleUpdate((p) => ({ ...p, dateColor: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        aria-label="Farbauswahl"
                      />
                      <input
                        type="text"
                        value={settings.dateColor || ''}
                        placeholder={settings.clockColor}
                        onChange={(e) => handleUpdate((p) => ({ ...p, dateColor: e.target.value }))}
                        className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white text-center focus:outline-none focus:border-sky-500"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. TYPOGRAFIE & STIL */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                {/* Visual Style (Badge / Pill) */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
                  <span className="text-xs font-semibold text-slate-200 block">Darstellungs-Stil</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'minimal', label: 'Minimal', hint: 'Klarer Text' },
                      { id: 'glass-pill', label: 'Glas-Pill', hint: 'Frosted Badge' },
                      { id: 'bordered', label: 'Umrandet', hint: 'Feine Kontur' },
                    ].map((style) => {
                      const isSelected = (settings.dateStyle ?? 'minimal') === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => handleUpdate((p) => ({ ...p, dateStyle: style.id as DateStyle }))}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500/25 border-sky-500/80 text-sky-200 shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-xs font-bold">{style.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{style.hint}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Schriftstärke */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
                  <span className="text-xs font-semibold text-slate-200 block">Schriftstärke</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: '300', label: 'Dünn (300)' },
                      { id: '400', label: 'Normal (400)' },
                      { id: '600', label: 'Halbfett (600)' },
                      { id: '700', label: 'Fett (700)' },
                    ].map((w) => {
                      const isSelected = (settings.dateWeight ?? '300') === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => handleUpdate((p) => ({ ...p, dateWeight: w.id as any }))}
                          className={`py-2 px-1 rounded-xl border text-center text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500/25 border-sky-500/80 text-sky-200 font-bold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Groß-/Kleinschreibung & Laufweite */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Schreibweise</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'uppercase', label: 'GROSS' },
                        { id: 'normal', label: 'Normal' },
                      ].map((c) => {
                        const isSelected = (settings.dateCase ?? 'uppercase') === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleUpdate((p) => ({ ...p, dateCase: c.id as DateCase }))}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500/30 border-sky-500 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Buchstabenabstand</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'normal', label: 'Standard' },
                        { id: 'wide', label: 'Weit' },
                        { id: 'wider', label: 'Sehr weit' },
                      ].map((tr) => {
                        const isSelected = (settings.dateTracking ?? 'wide') === tr.id;
                        return (
                          <button
                            key={tr.id}
                            type="button"
                            onClick={() => handleUpdate((p) => ({ ...p, dateTracking: tr.id as DateTracking }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500/30 border-sky-500 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {tr.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400">Änderungen werden live übernommen</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Fertig</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
