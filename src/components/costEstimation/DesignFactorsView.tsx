/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DesignFactorsConfig, ConstructionTemplate } from '../../types/costEstimation';
import { Sliders, RotateCcw, Save, CheckCircle2, Bookmark, FileCode, Info } from 'lucide-react';
import { DEFAULT_DESIGN_FACTORS, STANDARD_TEMPLATES } from '../../data/materialMaster';

interface DesignFactorsViewProps {
  factors: DesignFactorsConfig;
  templates: ConstructionTemplate[];
  onSaveFactors: (factors: DesignFactorsConfig) => void;
}

export const DesignFactorsView: React.FC<DesignFactorsViewProps> = ({
  factors,
  templates,
  onSaveFactors
}) => {
  const [localFactors, setLocalFactors] = useState<DesignFactorsConfig>({ ...factors });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveFactors(localFactors);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset all design factors to standard PESCO / WAPDA engineering guidelines?')) return;
    setLocalFactors({ ...DEFAULT_DESIGN_FACTORS });
    onSaveFactors({ ...DEFAULT_DESIGN_FACTORS });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Sliders className="w-4 h-4" />
            <span>ENGINEERING DESIGN CRITERIA</span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-500">WAPDA Distribution Code</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Design Factors & Standard Construction Templates
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure automatic quantity calculation rules: pole spacing, conductor sag & wastage allowance, insulator ratios, stay sets, and standard construction templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset to WAPDA Standards</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Design factors successfully updated! All new calculations will use these updated parameters.</span>
        </div>
      )}

      {/* Design Factors Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Pole Spans & Geometry */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-sm font-bold text-slate-900">Pole Spacing & Spans</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              HT 11kV Pole Spacing (Meters)
            </label>
            <input
              type="number"
              min="50"
              max="150"
              step="5"
              value={localFactors.htPoleSpacingMeters}
              onChange={(e) => setLocalFactors({ ...localFactors, htPoleSpacingMeters: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard: 100 meters (yields 10 poles per km).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              LT 400V Pole Spacing (Meters)
            </label>
            <input
              type="number"
              min="30"
              max="70"
              step="5"
              value={localFactors.ltPoleSpacingMeters}
              onChange={(e) => setLocalFactors({ ...localFactors, ltPoleSpacingMeters: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard: 45 meters (yields ~22 poles per km).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Terminal / Dead-End Poles per Line
            </label>
            <input
              type="number"
              min="1"
              max="6"
              value={localFactors.terminalPolesPerLine}
              onChange={(e) => setLocalFactors({ ...localFactors, terminalPolesPerLine: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard: 2 heavy terminal poles per line extension.
            </span>
          </div>
        </div>

        {/* Column 2: Conductor Allowances & Insulators */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-sm font-bold text-slate-900">Conductors & Insulators</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Conductor Sag, Jumper & Wastage Allowance (%)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={localFactors.conductorSagWastagePercent}
              onChange={(e) => setLocalFactors({ ...localFactors, conductorSagWastagePercent: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard: 3.5% allowance for catenary sag and jumper loop connections.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pin Insulators per Intermediate HT Pole
            </label>
            <input
              type="number"
              min="1"
              max="6"
              value={localFactors.pinInsulatorsPerHtPole}
              onChange={(e) => setLocalFactors({ ...localFactors, pinInsulatorsPerHtPole: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard: 3 pin insulators for 3-phase line.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Disc Insulator Strings per Terminal Pole
            </label>
            <input
              type="number"
              min="1"
              max="6"
              value={localFactors.discInsulatorsPerTerminalPole}
              onChange={(e) => setLocalFactors({ ...localFactors, discInsulatorsPerTerminalPole: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard: 3 tension disc strings for dead-end support.
            </span>
          </div>
        </div>

        {/* Column 3: Guying, Earthing & Logistics */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-sm font-bold text-slate-900">Guying, Earthing & Logistics</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Stay Sets per Kilometer of Line
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={localFactors.staySetsPerKm}
              onChange={(e) => setLocalFactors({ ...localFactors, staySetsPerKm: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard: 3 intermediate angle stays per km.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Earthing Interval (Every N-th Pole)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={localFactors.earthingIntervalPoles}
              onChange={(e) => setLocalFactors({ ...localFactors, earthingIntervalPoles: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard: Grounding earthing set installed every 5th pole.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Transportation Rate (PKR / km)
            </label>
            <input
              type="number"
              min="50"
              max="500"
              value={localFactors.transportRatePerKmDefault}
              onChange={(e) => setLocalFactors({ ...localFactors, transportRatePerKmDefault: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard heavy truck rate for hauling poles & material drums.
            </span>
          </div>
        </div>

        <div className="lg:col-span-3 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Design Factors Configuration</span>
          </button>
        </div>
      </form>

      {/* Standard Templates Showcase */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Bookmark className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900">Pre-Configured Construction Templates</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 space-y-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {tmpl.type.replace(/_/g, ' ')}
              </span>
              <h4 className="text-xs font-bold text-slate-900">{tmpl.name}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">{tmpl.description}</p>
              <div className="text-[11px] text-slate-600 font-mono pt-2 border-t border-slate-200 flex flex-col gap-1">
                <span>Conductor: <strong>{tmpl.standardConductorCode}</strong></span>
                <span>Poles: <strong>{tmpl.standardPoleCode}</strong></span>
                {tmpl.defaultTransformerKva && (
                  <span>Transformer: <strong>{tmpl.defaultTransformerKva} kVA</strong></span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
