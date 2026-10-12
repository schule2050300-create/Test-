import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Sparkles,
  Check,
  Type,
  Maximize2,
  Sliders,
  HelpCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import {
  ClockSettings,
  DateFormat,
  DateWeekdayFormat,
  DateStyle,
} from '../types';
import { triggerHaptic } from '../utils/audio';
import { formatClockDate, DATE_FORMAT_PRESETS } from '../utils/dateFormat';
import { MaterialSwitch } from './ui/MaterialSwitch';

interface DateFormatSettingsCardProps {
  settings: ClockSettings;
  onUpdateSettings: (updater: (prev: ClockSettings) => ClockSettings) => void;
  showFeedback?: (msg: string) => void;
  currentTime?: Date;
  offsetMs?: number;
}

export const DateFormatSettingsCard: React.FC<DateFormatSettingsCardProps> = ({
  settings,
  onUpdateSettings,
  showFeedback,
  currentTime,
  offsetMs = 0,
}) => {
  const [showPatternHelp, setShowPatternHelp] = useState(false);

  const now = useMemo(() => {
    if (currentTime) return currentTime;
    const nowMs = Date.now() + (settings.useAtomicSync ? offsetMs : 0);
    return new Date(nowMs);
  }, [currentTime, settings.useAtomicSync, offsetMs]);

  const targetTimeZone =
    !settings.timeZone || settings.timeZone === 'Europe/Berlin'
      ? 'Europe/Berlin'
      : settings.timeZone === 'auto'
      ? undefined
      : settings.timeZone;

  const locale = settings.appLanguage === 'en' ? 'en-US' : 'de-DE';

  // Live formatted sample of the active date settings
  const livePreview = useMemo(() => {
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
    locale,
    targetTimeZone,
  ]);

  const handleUpdate = (updater: (prev: ClockSettings) => ClockSettings, feedbackMsg?: string) => {
    triggerHaptic(settings.vibrationEnabled);
    onUpdateSettings(updater);
    if (feedbackMsg && showFeedback) {
      showFeedback(feedbackMsg);
    }
  };

  const handleSelectFormat = (fmt: DateFormat) => {
    handleUpdate(
      (prev) => ({
        ...prev,
        dateFormat: fmt,
        // If switching to custom and no pattern exists, initialize with friendly default
        dateCustomPattern:
          fmt === 'custom' && !prev.dateCustomPattern
            ? 'WWWW, TT.MM.JJJJ'
            : prev.dateCustomPattern,
      }),
      `Datumsformat: ${fmt}`
    );
  };

  const handleSelectWeekday = (mode: DateWeekdayFormat) => {
    handleUpdate(
      (prev) => ({
        ...prev,
        dateWeekdayFormat: mode,
        showDayOfWeek: mode !== 'none',
      }),
      mode === 'long'
        ? 'Ausgeschriebener Wochentag aktiviert'
        : mode === 'short'
        ? 'Kurzer Wochentag aktiviert'
        : 'Wochentag ausgeblendet'
    );
  };

  const appendToken = (token: string) => {
    const current = settings.dateCustomPattern || '';
    const updated = current ? `${current} ${token}` : token;
    handleUpdate((prev) => ({
      ...prev,
      dateCustomPattern: updated,
    }));
  };

  // Helper samples for each preset based on today's real date
  const getPresetSample = (fmtId: DateFormat) => {
    return formatClockDate({
      date: now,
      dateFormat: fmtId,
      weekdayFormat: 'none',
      showDayOfWeek: false,
      locale,
      timeZone: targetTimeZone,
    });
  };

  const activeWeekdayMode: DateWeekdayFormat =
    settings.dateWeekdayFormat ?? (settings.showDayOfWeek ? 'long' : 'none');

  return (
    <div
      id="settings-date-format-card"
      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>Datumsformat & Wochentag</span>
              <Sparkles className="w-3 h-3 text-sky-400" />
            </h4>
            <p className="text-[11px] text-slate-400">
              Konfiguriere Format (TT.MM.JJJJ, MM/TT/JJJJ), ausgeschriebene Wochentage & Größe
            </p>
          </div>
        </div>

        {settings.showDate && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20">
            {settings.dateFormat}
          </span>
        )}
      </div>

      {/* Main Switch to toggle date display */}
      <div className="pt-1">
        <MaterialSwitch
          label="Datum auf der Hauptuhr anzeigen"
          description="Kalenderdatum unterhalb der großen Zeitanzeige einblenden"
          checked={settings.showDate}
          onChange={(val) => {
            handleUpdate(
              (prev) => ({ ...prev, showDate: val }),
              val ? 'Datum eingeblendet' : 'Datum ausgeblendet'
            );
          }}
        />
      </div>

      {settings.showDate && (
        <div className="space-y-4 pt-1">
          {/* Live Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col items-center justify-center gap-1.5 text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Echtzeit-Vorschau
            </span>
            <div
              className={`font-medium transition-all max-w-full overflow-hidden truncate px-3 py-1 ${
                settings.dateStyle === 'glass-pill'
                  ? 'bg-white/10 border border-white/20 px-4 py-1.5 rounded-full shadow-inner'
                  : settings.dateStyle === 'bordered'
                  ? 'border border-sky-400/40 px-3.5 py-1 rounded-xl bg-sky-950/20'
                  : ''
              }`}
              style={{
                color: settings.dateColor || settings.clockColor,
                fontSize: `${Math.max(13, Math.min(22, Math.round(15 * ((settings.dateScale ?? 100) / 100))))}px`,
                letterSpacing:
                  settings.dateTracking === 'wider'
                    ? '0.22em'
                    : settings.dateTracking === 'normal'
                    ? '0.04em'
                    : '0.12em',
                textTransform: settings.dateCase === 'normal' ? 'none' : 'uppercase',
              }}
            >
              {livePreview}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>Größe: <strong className="text-sky-300 font-mono">{settings.dateScale ?? 100}%</strong></span>
              <span>•</span>
              <span>Wochentag: <strong className="text-slate-300 font-medium">
                {activeWeekdayMode === 'long'
                  ? 'Ausgeschrieben'
                  : activeWeekdayMode === 'short'
                  ? 'Abgekürzt'
                  : 'Ausgeblendet'}
              </strong></span>
            </div>
          </div>

          {/* 1. Datums-Schreibweise (Presets) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Datums-Format wählen:</span>
              <span className="text-[10px] text-slate-400 font-normal">Klicke eine Variante an</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  id: 'DD.MM.YYYY' as DateFormat,
                  badge: 'TT.MM.JJJJ',
                  title: 'Deutscher Standard',
                  hint: 'Tag.Monat.Jahr mit führenden Nullen',
                },
                {
                  id: 'MM/DD/YYYY' as DateFormat,
                  badge: 'MM/TT/JJJJ',
                  title: 'US / International',
                  hint: 'Monat/Tag/Jahr mit Schrägstrich',
                },
                {
                  id: 'YYYY-MM-DD' as DateFormat,
                  badge: 'JJJJ-MM-TT',
                  title: 'ISO 8601 Norm',
                  hint: 'Internationales technisches Standardformat',
                },
                {
                  id: 'D. MMMM YYYY' as DateFormat,
                  badge: 'T. MMMM JJJJ',
                  title: 'Ausgeschriebener Monat',
                  hint: 'Vollständiger Monatsname (z.B. Oktober)',
                },
                {
                  id: 'D. MMM YYYY' as DateFormat,
                  badge: 'T. MMM JJJJ',
                  title: 'Abgekürzter Monat',
                  hint: 'Kompakte Monatsabkürzung (z.B. Okt.)',
                },
                {
                  id: 'DD.MM.YY' as DateFormat,
                  badge: 'TT.MM.JJ',
                  title: 'Kompaktes Jahr',
                  hint: '2-stelliges Kalenderjahr',
                },
                {
                  id: 'custom' as DateFormat,
                  badge: 'Eigenes Muster',
                  title: 'Frei konfigurierbar',
                  hint: 'Eigene Platzhalter (WWWW, TT, MM, JJJJ etc.)',
                },
              ].map((fmt) => {
                const isSelected = settings.dateFormat === fmt.id;
                const sampleDate = fmt.id === 'custom' ? (settings.dateCustomPattern || 'WWWW, TT.MM.JJJJ') : getPresetSample(fmt.id);

                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => handleSelectFormat(fmt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 group relative ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500 text-sky-100 ring-1 ring-sky-400/40 shadow-sm'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-white px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/80">
                          {fmt.badge}
                        </span>
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {fmt.title}
                        </span>
                      </div>
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Wählen
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="truncate pr-1">{fmt.hint}</span>
                      <span className="font-mono text-sky-300/90 font-medium shrink-0">
                        {sampleDate}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Wochentags-Darstellung (Ausgeschriebene Wochentage) */}
          <div className="space-y-2 pt-2 border-t border-slate-800/70">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Wochentags-Darstellung:
              </label>
              <span className="text-[10px] text-slate-400">
                Wird vor das Datum gesetzt
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'long' as DateWeekdayFormat,
                  label: 'Ausgeschrieben',
                  badge: 'WWWW',
                  example: new Intl.DateTimeFormat(locale, { timeZone: targetTimeZone, weekday: 'long' }).format(now),
                  desc: 'Vollständiger Wochentagsname',
                },
                {
                  id: 'short' as DateWeekdayFormat,
                  label: 'Abgekürzt',
                  badge: 'WW',
                  example: new Intl.DateTimeFormat(locale, { timeZone: targetTimeZone, weekday: 'short' }).format(now),
                  desc: 'Kurzkürzel (z.B. Mo., Di.)',
                },
                {
                  id: 'none' as DateWeekdayFormat,
                  label: 'Ausblenden',
                  badge: 'Ohne',
                  example: '–',
                  desc: 'Kein Wochentag im Datum',
                },
              ].map((opt) => {
                const isSelected = activeWeekdayMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectWeekday(opt.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500 text-sky-100 ring-1 ring-sky-400/40 shadow-sm'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-200">{opt.label}</span>
                    <span className="font-mono text-xs text-sky-400 font-semibold">{opt.example}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Eigene Format-Vorlage (Custom Pattern) */}
          {settings.dateFormat === 'custom' && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-sky-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" />
                  <span>Eigenes Datums-Muster</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPatternHelp(!showPatternHelp)}
                  className="text-[11px] text-slate-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showPatternHelp ? 'Hilfe schließen' : 'Platzhalter-Info'}</span>
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={settings.dateCustomPattern || ''}
                  onChange={(e) =>
                    handleUpdate((prev) => ({
                      ...prev,
                      dateCustomPattern: e.target.value,
                    }))
                  }
                  placeholder="z.B. WWWW, TT.MM.JJJJ oder TT. MMMM JJJJ"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>

              {/* Clickable Token Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 block font-medium">
                  Klicke auf einen Baustein zum Hinzufügen:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { token: 'WWWW', label: 'Wochentag voll (Montag)' },
                    { token: 'WW', label: 'Wochentag kurz (Mo)' },
                    { token: 'TT', label: 'Tag 2-stellig (02)' },
                    { token: 'T', label: 'Tag 1-stellig (2)' },
                    { token: 'MMMM', label: 'Monat voll (Oktober)' },
                    { token: 'MMM', label: 'Monat kurz (Okt)' },
                    { token: 'MM', label: 'Monat 2-stellig (10)' },
                    { token: 'JJJJ', label: 'Jahr 4-stellig (2026)' },
                    { token: 'JJ', label: 'Jahr 2-stellig (26)' },
                  ].map((t) => (
                    <button
                      key={t.token}
                      type="button"
                      onClick={() => appendToken(t.token)}
                      title={t.label}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-sky-500/20 text-slate-300 hover:text-sky-200 border border-slate-700/80 hover:border-sky-500/50 text-[11px] font-mono transition-all cursor-pointer active:scale-95"
                    >
                      +{t.token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Templates */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-medium">Schnell-Vorlagen:</span>
                {[
                  'WWWW, TT.MM.JJJJ',
                  'WWWW, TT. MMMM JJJJ',
                  'WW, TT.MM.JJ',
                  'TT.MM.JJJJ (WWWW)',
                ].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() =>
                      handleUpdate((prev) => ({
                        ...prev,
                        dateCustomPattern: tpl,
                      }))
                    }
                    className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-[10px] font-mono transition-all cursor-pointer"
                  >
                    {tpl}
                  </button>
                ))}
              </div>

              {showPatternHelp && (
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <div className="font-semibold text-slate-200">Verfügbare Token-Platzhalter:</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono">
                    <div>WWWW / EEEE = Wochentag ausgeschrieben</div>
                    <div>WW / EEE = Wochentag kurz</div>
                    <div>TT / DD = Tag 2-stellig (01-31)</div>
                    <div>T / D = Tag 1-stellig (1-31)</div>
                    <div>MMMM = Monat ausgeschrieben</div>
                    <div>MMM = Monat kurz</div>
                    <div>MM = Monat 2-stellig (01-12)</div>
                    <div>JJJJ / YYYY = Jahr 4-stellig</div>
                    <div>JJ / YY = Jahr 2-stellig</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Datumsgröße & Skalierung */}
          <div className="space-y-2 pt-2 border-t border-slate-800/70">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Datums-Größe & Skalierung</span>
              </span>
              <span className="font-mono text-sky-400 font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                {settings.dateScale ?? 100}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-500">60%</span>
              <input
                id="drawer-date-scale-slider"
                type="range"
                min="60"
                max="200"
                step="5"
                value={settings.dateScale ?? 100}
                onChange={(e) =>
                  handleUpdate((prev) => ({
                    ...prev,
                    dateScale: parseInt(e.target.value, 10),
                  }))
                }
                className="flex-1 accent-sky-500 cursor-pointer"
                aria-label="Datumsgröße Schieberegler"
              />
              <span className="text-[10px] font-mono text-slate-500">200%</span>
            </div>

            {/* Scale Presets */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
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
                    className={`py-1 px-1 rounded-xl text-center border text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/25 border-sky-500 text-sky-200'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className="block text-[9px] font-mono opacity-70">{preset.val}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Optischer Darstellungs-Stil */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/70">
            <span className="text-xs font-semibold text-slate-300 block">
              Optischer Darstellungs-Stil:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'minimal' as DateStyle, label: 'Minimal', hint: 'Klarer Text' },
                { id: 'glass-pill' as DateStyle, label: 'Glas-Pill', hint: 'Frosted Badge' },
                { id: 'bordered' as DateStyle, label: 'Umrandet', hint: 'Feine Kontur' },
              ].map((st) => {
                const isSelected = (settings.dateStyle ?? 'minimal') === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() =>
                      handleUpdate((p) => ({ ...p, dateStyle: st.id }))
                    }
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/25 border-sky-500 text-sky-200 ring-1 ring-sky-400/30'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{st.label}</div>
                    <div className="text-[10px] text-slate-400">{st.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Helpful Hint on direct clicking */}
          <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/20 text-[11px] text-sky-300 flex items-center gap-2">
            <span className="text-sm">💡</span>
            <p className="leading-snug">
              <strong>Direkt-Klick:</strong> Du kannst das Datum auf dem Hauptbildschirm auch einfach mit der Maus anklicken, um den Live-Farbeditor und die Schrifteinstellungen im Vollbild-Overlay zu öffnen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
