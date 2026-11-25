import React from 'react';
import { Wind, Eye, Sparkles, Sliders, Check } from 'lucide-react';
import { BreathingTechniqueId, ClockSettings, GuidedBreathingConfig } from '../types';
import { DEFAULT_GUIDED_BREATHING_CONFIG } from '../utils/presets';
import { MaterialSwitch } from './ui/MaterialSwitch';
import { triggerHaptic } from '../utils/audio';
import { BREATHING_TECHNIQUES, BreathingTechniqueDef } from './GuidedBreathingOverlay';

interface GuidedBreathingSettingsCardProps {
  settings: ClockSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<ClockSettings>>;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  showFeedback: (msg: string) => void;
}

const BREATH_COLOR_PRESETS = [
  { id: 'auto', label: 'Akzentfarbe', hex: undefined, preview: '#38bdf8' },
  { id: 'cyan', label: 'Atem-Cyan', hex: '#22d3ee', preview: '#22d3ee' },
  { id: 'indigo', label: 'Abend-Indigo', hex: '#818cf8', preview: '#818cf8' },
  { id: 'emerald', label: 'Wald-Smaragd', hex: '#34d399', preview: '#34d399' },
  { id: 'rose', label: 'Sanft-Rosa', hex: '#f472b6', preview: '#f472b6' },
  { id: 'amber', label: 'Warm-Gold', hex: '#fbbf24', preview: '#fbbf24' },
];

export const GuidedBreathingSettingsCard: React.FC<GuidedBreathingSettingsCardProps> = ({
  settings,
  onUpdateSettings,
  isZenMode = false,
  onToggleZenMode,
  showFeedback,
}) => {
  const cfg: GuidedBreathingConfig = settings.guidedBreathing || DEFAULT_GUIDED_BREATHING_CONFIG;

  const updateConfig = (patch: Partial<GuidedBreathingConfig>) => {
    onUpdateSettings((prev) => ({
      ...prev,
      guidedBreathing: {
        ...(prev.guidedBreathing || DEFAULT_GUIDED_BREATHING_CONFIG),
        ...patch,
      },
    }));
  };

  const handleToggleEnabled = (enabled: boolean) => {
    if (settings.vibrationEnabled) triggerHaptic(15);
    updateConfig({ enabled });
    showFeedback(
      enabled
        ? 'Guided Breathing mit Zen-Modus synchronisiert'
        : 'Guided Breathing im Zen-Modus deaktiviert'
    );
  };

  const handleSelectTechnique = (tech: BreathingTechniqueDef) => {
    if (settings.vibrationEnabled) triggerHaptic(10);
    updateConfig({ technique: tech.id });
    showFeedback(`Atem-Rhythmus "${tech.name} (${tech.shortRatio})" gewählt`);
  };

  return (
    <div
      id="guided-breathing-settings-card"
      className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-4 transition-all duration-200"
    >
      {/* Header & Sync Switch */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors border ${
              cfg.enabled
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/35'
                : 'bg-white/5 text-slate-400 border-white/5'
            }`}
          >
            <Wind className={`w-5 h-5 ${cfg.enabled && isZenMode ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Guided Breathing (Zen-Modus)
              {cfg.enabled && isZenMode && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/35 font-semibold">
                  Aktiv im Zen-Modus
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Expandierende & kontrahierende Partikel-Atemübung, synchronisiert mit dem Zen-Modus.
            </p>
          </div>
        </div>

        <MaterialSwitch
          id="guided-breathing-switch"
          checked={cfg.enabled}
          onChange={handleToggleEnabled}
          vibrationEnabled={settings.vibrationEnabled}
        />
      </div>

      {/* Technique Selector */}
      <div
        className={`space-y-3 transition-opacity duration-200 ${
          cfg.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'
        }`}
      >
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-300 block">
            Atem-Rhythmus auswählen
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.values(BREATHING_TECHNIQUES) as BreathingTechniqueDef[]).map((tech) => {
              const selected = cfg.technique === tech.id;
              return (
                <button
                  key={tech.id}
                  id={`breathing-technique-${tech.id}`}
                  type="button"
                  onClick={() => handleSelectTechnique(tech)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    selected
                      ? 'bg-cyan-500/15 border-cyan-400/50 text-white shadow-sm'
                      : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-800/80 hover:border-white/15'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate">{tech.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-cyan-300 border border-white/10 shrink-0">
                        {tech.shortRatio}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                      {tech.description}
                    </span>
                  </div>
                  {selected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Phase Cue Toggle */}
        <div className="rounded-xl bg-slate-900/50 border border-white/5 px-1">
          <MaterialSwitch
            label="Atem-Hinweise einblenden"
            description='Zeigt "Einatmen", "Halten" und "Ausatmen" samt Sekundentakt unten an'
            checked={cfg.showPhaseCue}
            onChange={(showPhaseCue) => updateConfig({ showPhaseCue })}
            vibrationEnabled={settings.vibrationEnabled}
          />
        </div>

        {/* Particle Intensity Slider */}
        <div className="p-3 rounded-xl bg-slate-900/50 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sichtbarkeit & Leuchtkraft</span>
            </span>
            <span className="font-mono font-bold text-cyan-300">{cfg.intensity}%</span>
          </div>
          <input
            type="range"
            min="30"
            max="100"
            step="5"
            value={cfg.intensity}
            onChange={(e) => updateConfig({ intensity: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Color Swatches */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Farbton der Atem-Partikel</span>
          </span>
          <div className="flex items-center gap-1.5">
            {BREATH_COLOR_PRESETS.map((preset) => {
              const isSelected =
                preset.hex === undefined
                  ? !cfg.particleColor
                  : cfg.particleColor?.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  aria-label={preset.label}
                  onClick={() => {
                    if (settings.vibrationEnabled) triggerHaptic(8);
                    updateConfig({ particleColor: preset.hex });
                    showFeedback(`Atem-Farbe: ${preset.label}`);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'border-white scale-110 shadow-md'
                      : 'border-white/20 hover:scale-105'
                  }`}
                  style={{
                    backgroundColor:
                      preset.hex === undefined ? settings.accentColor || preset.preview : preset.preview,
                  }}
                >
                  {preset.hex === undefined && (
                    <span className="text-[8px] font-bold text-slate-950 leading-none">A</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Preview / Zen Sync Action */}
      {onToggleZenMode && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
          <span className="text-slate-400">
            Wird automatisch beim Umschalten des Zen-Modus (Taste <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[10px]">Z</kbd>) ein- & ausgeblendet.
          </span>
          <button
            type="button"
            onClick={() => {
              if (settings.vibrationEnabled) triggerHaptic(12);
              if (!isZenMode && !cfg.enabled) {
                updateConfig({ enabled: true });
              }
              onToggleZenMode();
            }}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
              isZenMode
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 hover:bg-cyan-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isZenMode ? 'Zen beenden' : 'Im Zen-Modus testen'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
