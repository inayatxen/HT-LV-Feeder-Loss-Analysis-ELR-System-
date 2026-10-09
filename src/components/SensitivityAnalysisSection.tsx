/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FeederData, 
  FeederAnalysisSummary,
  BifurcationConfig 
} from '../types/feeder';
import { calculateFeederAnalysis } from '../utils/elrEngine';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3, 
  SlidersHorizontal,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { SensitivityAnalysisRecharts } from './SensitivityAnalysisRecharts';

interface SensitivityAnalysisSectionProps {
  feeder: FeederData;
  activeConductors: Record<string, string>;
  activeCapacitors: Record<string, number>;
  activeTransformerKva: number;
  activeInjectedVoltage?: number;
  activeLoadFactor?: number;
  onSetLoadFactor: (lf: number) => void;
  bifurcationConfig: BifurcationConfig;
  existingSummary: FeederAnalysisSummary;
  proposedSummary: FeederAnalysisSummary;
}

export const SensitivityAnalysisSection: React.FC<SensitivityAnalysisSectionProps> = ({
  feeder,
  activeConductors,
  activeCapacitors,
  activeTransformerKva,
  activeInjectedVoltage,
  activeLoadFactor,
  onSetLoadFactor,
  bifurcationConfig,
  existingSummary,
  proposedSummary
}) => {
  // 1. Sensitivity Controls State
  const initialLf = activeLoadFactor !== undefined 
    ? Math.min(1.0, Math.max(0.5, activeLoadFactor)) 
    : (feeder.loadFactor ? Math.min(1.0, Math.max(0.5, feeder.loadFactor)) : 0.60);

  const [sensitivityLf, setSensitivityLf] = useState<number>(initialLf);
  const [growthRatePercent, setGrowthRatePercent] = useState<number>(feeder.annualGrowthRatePercent || 5.0);
  const [targetReductionPercent, setTargetReductionPercent] = useState<number>(15.0); // WAPDA / NEPRA standard target: 15%
  const [selectedHorizonYear, setSelectedHorizonYear] = useState<number>(5);
  const [chartMode, setChartMode] = useState<'recharts' | 'trajectory' | 'lf_sweep' | 'matrix'>('recharts');
  const [syncWithWorkbench, setSyncWithWorkbench] = useState<boolean>(true);
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);

  const tariff = feeder.tariffPerKwh || 24.83;

  // Handle Load Factor change with optional workbench sync
  const handleLfChange = (newLf: number) => {
    const clamped = Math.min(1.0, Math.max(0.5, Number(newLf.toFixed(2))));
    setSensitivityLf(clamped);
    if (syncWithWorkbench) {
      onSetLoadFactor(clamped);
    }
  };

  // Quadratic Loss Load Factor: LLF = 0.2*LF + 0.8*LF^2
  const currentLlf = useMemo(() => {
    return Number((0.2 * sensitivityLf + 0.8 * Math.pow(sensitivityLf, 2)).toFixed(4));
  }, [sensitivityLf]);

  // 2. Trajectory Computation (Years 0 to 5) based on sensitivity LF & Growth Rate
  const trajectoryYears = [0, 1, 2, 3, 4, 5];
  const trajectoryData = useMemo(() => {
    return trajectoryYears.map((year) => {
      // Baseline run
      const baseResult = calculateFeederAnalysis(feeder, {
        loadFactorOverride: sensitivityLf,
        annualGrowthRate: growthRatePercent / 100,
        growthYears: year
      });

      // Proposed run with active interventions
      const propResult = calculateFeederAnalysis(feeder, {
        customConductors: activeConductors,
        customCapacitors: activeCapacitors,
        transformerOverrideKva: activeTransformerKva,
        voltageOverride: activeInjectedVoltage,
        loadFactorOverride: sensitivityLf,
        annualGrowthRate: growthRatePercent / 100,
        growthYears: year,
        bifurcation: bifurcationConfig
      });

      const baseKw = baseResult.totalLineLossKw;
      const propKw = propResult.totalLineLossKw;
      const baseKwh = baseResult.annualEnergyLossKwh;
      const propKwh = propResult.annualEnergyLossKwh;

      const savedKw = Math.max(0, baseKw - propKw);
      const savedKwh = Math.max(0, baseKwh - propKwh);
      const reductionPercent = baseKwh > 0 ? Number(((savedKwh / baseKwh) * 100).toFixed(1)) : 0;
      const isTargetMet = reductionPercent >= targetReductionPercent;
      const targetDelta = Number((reductionPercent - targetReductionPercent).toFixed(1));
      const moneySaved = Math.round(savedKwh * tariff);

      // Target threshold loss in kWh
      const targetAllowedKwh = Math.round(baseKwh * (1 - targetReductionPercent / 100));

      return {
        year,
        label: year === 0 ? 'Year 0 (Base)' : `Year ${year}`,
        baseKw,
        propKw,
        baseKwh,
        propKwh,
        savedKw,
        savedKwh,
        reductionPercent,
        targetReductionPercent,
        targetAllowedKwh,
        isTargetMet,
        targetDelta,
        moneySaved
      };
    });
  }, [
    feeder, 
    sensitivityLf, 
    growthRatePercent, 
    targetReductionPercent, 
    activeConductors, 
    activeCapacitors, 
    activeTransformerKva, 
    activeInjectedVoltage, 
    bifurcationConfig, 
    tariff
  ]);

  // Current Horizon Data Point
  const currentHorizonPoint = trajectoryData[selectedHorizonYear] || trajectoryData[5];

  // 3. Load Factor Sweep (0.50 to 1.00 at step 0.05) evaluated at selectedHorizonYear
  const lfSweepSteps = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00];
  const lfSweepData = useMemo(() => {
    return lfSweepSteps.map((lf) => {
      const baseResult = calculateFeederAnalysis(feeder, {
        loadFactorOverride: lf,
        annualGrowthRate: growthRatePercent / 100,
        growthYears: selectedHorizonYear
      });

      const propResult = calculateFeederAnalysis(feeder, {
        customConductors: activeConductors,
        customCapacitors: activeCapacitors,
        transformerOverrideKva: activeTransformerKva,
        voltageOverride: activeInjectedVoltage,
        loadFactorOverride: lf,
        annualGrowthRate: growthRatePercent / 100,
        growthYears: selectedHorizonYear,
        bifurcation: bifurcationConfig
      });

      const baseKwh = baseResult.annualEnergyLossKwh;
      const propKwh = propResult.annualEnergyLossKwh;
      const savedKwh = Math.max(0, baseKwh - propKwh);
      const reductionPercent = baseKwh > 0 ? Number(((savedKwh / baseKwh) * 100).toFixed(1)) : 0;
      const isTargetMet = reductionPercent >= targetReductionPercent;
      const llf = Number((0.2 * lf + 0.8 * Math.pow(lf, 2)).toFixed(4));
      const moneySaved = Math.round(savedKwh * tariff);

      return {
        lf,
        llf,
        baseKwh,
        propKwh,
        savedKwh,
        reductionPercent,
        isTargetMet,
        moneySaved
      };
    });
  }, [
    feeder, 
    growthRatePercent, 
    selectedHorizonYear, 
    targetReductionPercent, 
    activeConductors, 
    activeCapacitors, 
    activeTransformerKva, 
    activeInjectedVoltage, 
    bifurcationConfig, 
    tariff
  ]);

  // 4. Sensitivity Matrix: Load Factor (0.5 to 1.0) vs Growth Rate (2% to 10%)
  const matrixLfs = [0.50, 0.60, 0.70, 0.80, 0.90, 1.00];
  const matrixGrowths = [2.0, 4.0, 6.0, 8.0, 10.0];
  const matrixData = useMemo(() => {
    return matrixLfs.map((lf) => {
      const row = matrixGrowths.map((g) => {
        const baseResult = calculateFeederAnalysis(feeder, {
          loadFactorOverride: lf,
          annualGrowthRate: g / 100,
          growthYears: selectedHorizonYear
        });

        const propResult = calculateFeederAnalysis(feeder, {
          customConductors: activeConductors,
          customCapacitors: activeCapacitors,
          transformerOverrideKva: activeTransformerKva,
          voltageOverride: activeInjectedVoltage,
          loadFactorOverride: lf,
          annualGrowthRate: g / 100,
          growthYears: selectedHorizonYear,
          bifurcation: bifurcationConfig
        });

        const baseKwh = baseResult.annualEnergyLossKwh;
        const propKwh = propResult.annualEnergyLossKwh;
        const savedKwh = Math.max(0, baseKwh - propKwh);
        const reductionPercent = baseKwh > 0 ? Number(((savedKwh / baseKwh) * 100).toFixed(1)) : 0;
        const isTargetMet = reductionPercent >= targetReductionPercent;
        const moneySaved = Math.round(savedKwh * tariff);

        return {
          lf,
          growthRate: g,
          baseKwh,
          propKwh,
          savedKwh,
          reductionPercent,
          isTargetMet,
          moneySaved
        };
      });
      return { lf, cells: row };
    });
  }, [
    feeder, 
    selectedHorizonYear, 
    targetReductionPercent, 
    activeConductors, 
    activeCapacitors, 
    activeTransformerKva, 
    activeInjectedVoltage, 
    bifurcationConfig, 
    tariff
  ]);

  // 5. SVG Chart Coordinate Math
  // For Trajectory Chart
  const maxTrajectoryLoss = Math.max(...trajectoryData.map(d => d.baseKwh), 1000);
  const chartWidth = 720;
  const chartHeight = 240;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  // Trajectory points
  const trajectoryPoints = trajectoryData.map((d, index) => {
    const x = padLeft + (index / (trajectoryData.length - 1)) * plotWidth;
    const yBase = padTop + plotHeight - (d.baseKwh / (maxTrajectoryLoss * 1.15)) * plotHeight;
    const yProp = padTop + plotHeight - (d.propKwh / (maxTrajectoryLoss * 1.15)) * plotHeight;
    const yTarget = padTop + plotHeight - (d.targetAllowedKwh / (maxTrajectoryLoss * 1.15)) * plotHeight;
    return { x, yBase, yProp, yTarget, data: d, index };
  });

  const baseLinePath = trajectoryPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.yBase}` : `${acc} L ${p.x} ${p.yBase}`, '');
  const propLinePath = trajectoryPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.yProp}` : `${acc} L ${p.x} ${p.yProp}`, '');
  const targetLinePath = trajectoryPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.yTarget}` : `${acc} L ${p.x} ${p.yTarget}`, '');

  // Shaded savings area between baseline and proposed line
  const savingsAreaPath = `${baseLinePath} L ${trajectoryPoints[trajectoryPoints.length - 1].x} ${trajectoryPoints[trajectoryPoints.length - 1].yProp} ` +
    trajectoryPoints.slice().reverse().map(p => `L ${p.x} ${p.yProp}`).join(' ') + ' Z';

  // For LF Sweep Chart
  const maxSweepLoss = Math.max(...lfSweepData.map(d => d.baseKwh), 1000);
  const lfSweepPoints = lfSweepData.map((d, index) => {
    const x = padLeft + (index / (lfSweepData.length - 1)) * plotWidth;
    const yBase = padTop + plotHeight - (d.baseKwh / (maxSweepLoss * 1.15)) * plotHeight;
    const yProp = padTop + plotHeight - (d.propKwh / (maxSweepLoss * 1.15)) * plotHeight;
    const ySaved = padTop + plotHeight - (d.savedKwh / (maxSweepLoss * 1.15)) * plotHeight;
    return { x, yBase, yProp, ySaved, data: d, index };
  });

  const lfBaseLinePath = lfSweepPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.yBase}` : `${acc} L ${p.x} ${p.yBase}`, '');
  const lfPropLinePath = lfSweepPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.yProp}` : `${acc} L ${p.x} ${p.yProp}`, '');
  const lfSavingsPath = lfSweepPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.ySaved}` : `${acc} L ${p.x} ${p.ySaved}`, '');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
            <Activity className="w-4 h-4" />
            <span>SENSITIVITY ANALYSIS & LOSS REDUCTION TARGETS</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Operating Load Factor (0.5 – 1.0) & Annual Growth Sensitivity</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Dynamic Simulator
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Analyze the compound sensitivity of consumer duty cycle (Load Factor <code className="font-mono font-bold text-slate-700">0.50 – 1.00</code>) 
            and annual demand growth (<code className="font-mono font-bold text-slate-700">0 – 15%</code>) on technical loss reduction targets, energy savings, and financial feasibility.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => setChartMode('recharts')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              chartMode === 'recharts'
                ? 'bg-sky-600 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 bg-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            Recharts: LF vs Energy Loss
          </button>
          <button
            type="button"
            onClick={() => setChartMode('trajectory')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              chartMode === 'trajectory'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            5-Year Target Trajectory
          </button>
          <button
            type="button"
            onClick={() => setChartMode('lf_sweep')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              chartMode === 'lf_sweep'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            LF Sensitivity Curve (0.5–1.0)
          </button>
          <button
            type="button"
            onClick={() => setChartMode('matrix')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              chartMode === 'matrix'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
            Cross-Sensitivity Matrix
          </button>
        </div>
      </div>

      {/* Interactive Sliders & Presets Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-gradient-to-br from-slate-50 to-indigo-50/20 p-4 rounded-xl border border-slate-200">
        {/* Control 1: Load Factor Toggle (0.5 to 1.0) */}
        <div className="space-y-2 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" />
              1. Load Factor (LF) Toggle:
            </span>
            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs">
              {(sensitivityLf * 100).toFixed(0)}% (LF = {sensitivityLf.toFixed(2)})
            </span>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min="0.50"
              max="1.00"
              step="0.05"
              value={sensitivityLf}
              onChange={(e) => handleLfChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0.50 (Rural / 50%)</span>
              <span>0.75 (Mixed)</span>
              <span>1.00 (Flat 100%)</span>
            </div>
          </div>

          {/* Quick LF Presets */}
          <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold pt-1">
            {[
              { lf: 0.50, label: '0.50 Off-Peak' },
              { lf: 0.60, label: '0.60 WAPDA' },
              { lf: 0.70, label: '0.70 Suburban' },
              { lf: 0.80, label: '0.80 Comm.' },
              { lf: 0.90, label: '0.90 Indust.' },
              { lf: 1.00, label: '1.00 Flat Peak' }
            ].map(p => (
              <button
                key={p.lf}
                type="button"
                onClick={() => handleLfChange(p.lf)}
                className={`py-1 px-1 rounded border text-center transition-all cursor-pointer truncate ${
                  Math.abs(sensitivityLf - p.lf) < 0.02
                    ? 'bg-indigo-600 text-white border-indigo-700 font-bold shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                }`}
                title={`Set Load Factor to ${(p.lf * 100).toFixed(0)}%`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Loss Load Factor (LLF):</span>
            <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
              {currentLlf} (0.2LF + 0.8LF²)
            </span>
          </div>

          {/* Sync toggle */}
          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
            <span>Sync with Workbench LF:</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={syncWithWorkbench} 
                onChange={(e) => {
                  setSyncWithWorkbench(e.target.checked);
                  if (e.target.checked) onSetLoadFactor(sensitivityLf);
                }} 
                className="sr-only peer" 
              />
              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Control 2: Annual Growth Rate Toggle */}
        <div className="space-y-2 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              2. Annual Growth Rate:
            </span>
            <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs">
              {growthRatePercent.toFixed(1)}% / yr
            </span>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min="0.0"
              max="15.0"
              step="0.5"
              value={growthRatePercent}
              onChange={(e) => setGrowthRatePercent(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0% (Static)</span>
              <span>5.0% (Standard)</span>
              <span>15.0% (Rapid)</span>
            </div>
          </div>

          {/* Quick Growth Presets */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-semibold pt-1">
            {[
              { g: 2.0, label: '2.0% Rural Steady' },
              { g: 5.0, label: '5.0% WAPDA Std' },
              { g: 7.5, label: '7.5% Fast Urban' },
              { g: 10.0, label: '10.0% Industrial' }
            ].map(p => (
              <button
                key={p.g}
                type="button"
                onClick={() => setGrowthRatePercent(p.g)}
                className={`py-1 px-1.5 rounded border text-center transition-all cursor-pointer ${
                  Math.abs(growthRatePercent - p.g) < 0.1
                    ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">5-Yr Compound Multiplier:</span>
            <span className="font-mono font-bold text-amber-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
              {(Math.pow(1 + growthRatePercent / 100, 5)).toFixed(3)}× Demand ({(Math.pow(1 + growthRatePercent / 100, 10)).toFixed(3)}× I² Loss)
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
            <span>Evaluation Horizon:</span>
            <div className="flex items-center gap-1">
              {[1, 3, 5].map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedHorizonYear(yr)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                    selectedHorizonYear === yr 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Yr {yr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Control 3: Loss Reduction Target */}
        <div className="space-y-2 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-600" />
              3. Loss Reduction Target:
            </span>
            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
              {targetReductionPercent.toFixed(1)}% Reduction
            </span>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min="5.0"
              max="40.0"
              step="1.0"
              value={targetReductionPercent}
              onChange={(e) => setTargetReductionPercent(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>5% (Modest)</span>
              <span>15% (NEPRA/WAPDA)</span>
              <span>40% (Major ELR)</span>
            </div>
          </div>

          {/* Quick Target Presets */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-semibold pt-1">
            {[
              { t: 10.0, label: '10.0% Baseline' },
              { t: 15.0, label: '15.0% WAPDA Std' },
              { t: 20.0, label: '20.0% Aggressive' },
              { t: 25.0, label: '25.0% High Impact' }
            ].map(p => (
              <button
                key={p.t}
                type="button"
                onClick={() => setTargetReductionPercent(p.t)}
                className={`py-1 px-1.5 rounded border text-center transition-all cursor-pointer ${
                  Math.abs(targetReductionPercent - p.t) < 0.1
                    ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Status Indicator */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Yr {selectedHorizonYear} Target Status:</span>
            {currentHorizonPoint.isTargetMet ? (
              <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                MET (+{currentHorizonPoint.targetDelta}%)
              </span>
            ) : (
              <span className="font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px]">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                SHORTFALL ({currentHorizonPoint.targetDelta}%)
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 font-mono">
            <span>Simulated Reduction:</span>
            <span className="font-bold text-emerald-800">
              {currentHorizonPoint.reductionPercent}% ({currentHorizonPoint.savedKwh.toLocaleString()} kWh)
            </span>
          </div>
        </div>
      </div>

      {/* Target & Financial Impact Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium">Yr {selectedHorizonYear} Baseline Loss</div>
          <div className="text-base font-bold font-mono text-slate-800 mt-0.5">
            {currentHorizonPoint.baseKwh.toLocaleString()} <span className="text-xs font-normal text-slate-500">kWh/yr</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
            {currentHorizonPoint.baseKw.toFixed(2)} kW power loss
          </div>
        </div>

        <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
          <div className="text-[11px] text-emerald-800 font-medium">Yr {selectedHorizonYear} Proposed Loss</div>
          <div className="text-base font-bold font-mono text-emerald-950 mt-0.5">
            {currentHorizonPoint.propKwh.toLocaleString()} <span className="text-xs font-normal text-emerald-700">kWh/yr</span>
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5 font-mono">
            {currentHorizonPoint.propKw.toFixed(2)} kW power loss
          </div>
        </div>

        <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-200">
          <div className="text-[11px] text-indigo-800 font-medium">Net Reduction Saved</div>
          <div className="text-base font-bold font-mono text-indigo-950 mt-0.5">
            {currentHorizonPoint.savedKwh.toLocaleString()} <span className="text-xs font-normal text-indigo-700">kWh/yr</span>
          </div>
          <div className="text-[10px] font-bold text-indigo-700 mt-0.5">
            {currentHorizonPoint.reductionPercent}% reduction (Target: {targetReductionPercent}%)
          </div>
        </div>

        <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
          <div className="text-[11px] text-amber-800 font-medium">Annual Monetary Value</div>
          <div className="text-base font-bold font-mono text-amber-950 mt-0.5">
            Rs. {(currentHorizonPoint.moneySaved / 1000).toFixed(0)}k <span className="text-xs font-normal text-amber-700">/ yr</span>
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5 font-mono">
            @ Rs. {tariff.toFixed(2)} / kWh tariff
          </div>
        </div>
      </div>

      {/* DYNAMIC CHART VIEWPORT */}
      {chartMode === 'recharts' && (
        <SensitivityAnalysisRecharts
          feeder={feeder}
          activeConductors={activeConductors}
          activeCapacitors={activeCapacitors}
          activeTransformerKva={activeTransformerKva}
          activeInjectedVoltage={activeInjectedVoltage}
          activeLoadFactor={sensitivityLf}
          onSetLoadFactor={handleLfChange}
          bifurcationConfig={bifurcationConfig}
          existingSummary={existingSummary}
          proposedSummary={proposedSummary}
        />
      )}

      {chartMode === 'trajectory' && (
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-white shadow-inner space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Multi-Year Loss Reduction Trajectory & Target Threshold
                </span>
                <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                  LF = {sensitivityLf.toFixed(2)} | Growth = {growthRatePercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Displays quadratic compounding of losses over 5 years. Green shaded area represents energy saved by upgradation.
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-3 h-0.5 bg-rose-500" />
                Baseline Loss
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-0.5 bg-emerald-500" />
                Proposed Loss
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-3 h-0.5 border-t border-amber-400 border-dashed" />
                Target Ceiling ({targetReductionPercent}%)
              </span>
            </div>
          </div>

          {/* SVG Chart */}
          <div className="w-full overflow-x-auto">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-64 overflow-visible select-none"
            >
              <defs>
                <linearGradient id="sensSavingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
                const y = padTop + plotHeight * (1 - ratio);
                const val = Math.round(maxTrajectoryLoss * 1.15 * ratio);
                return (
                  <g key={ratio}>
                    <line 
                      x1={padLeft} 
                      y1={y} 
                      x2={chartWidth - padRight} 
                      y2={y} 
                      stroke="#334155" 
                      strokeWidth="1" 
                      strokeDasharray={ratio === 0 ? "0" : "2 2"} 
                    />
                    <text 
                      x={padLeft - 8} 
                      y={y + 3} 
                      textAnchor="end" 
                      fill="#94a3b8" 
                      fontSize="9" 
                      fontFamily="monospace"
                    >
                      {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} kWh
                    </text>
                  </g>
                );
              })}

              {/* Shaded Savings Area */}
              <path d={savingsAreaPath} fill="url(#sensSavingsGrad)" />

              {/* Target Threshold Allowed Loss (Dashed Amber Line) */}
              <path 
                d={targetLinePath} 
                fill="none" 
                stroke="#f59e0b" 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
              />

              {/* Baseline Curve (Rose) */}
              <path 
                d={baseLinePath} 
                fill="none" 
                stroke="#f43f5e" 
                strokeWidth="2.5" 
              />

              {/* Proposed Curve (Emerald) */}
              <path 
                d={propLinePath} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="2.5" 
              />

              {/* Data points & Interactive Hover Verticals */}
              {trajectoryPoints.map((p) => {
                const isSelected = selectedHorizonYear === p.data.year;
                const isHovered = hoveredDataIndex === p.index;

                return (
                  <g 
                    key={p.data.year}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredDataIndex(p.index)}
                    onMouseLeave={() => setHoveredDataIndex(null)}
                    onClick={() => setSelectedHorizonYear(p.data.year)}
                  >
                    {/* Hover Vertical Column */}
                    <rect 
                      x={p.x - 20} 
                      y={padTop} 
                      width={40} 
                      height={plotHeight} 
                      fill={isHovered || isSelected ? "#38bdf8" : "transparent"} 
                      fillOpacity={isHovered ? "0.15" : isSelected ? "0.08" : "0"} 
                    />

                    {/* Baseline Dot */}
                    <circle 
                      cx={p.x} 
                      cy={p.yBase} 
                      r={isHovered ? 5 : 4} 
                      fill="#f43f5e" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                    />

                    {/* Proposed Dot */}
                    <circle 
                      cx={p.x} 
                      cy={p.yProp} 
                      r={isHovered ? 5 : 4} 
                      fill="#10b981" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                    />

                    {/* Year Label */}
                    <text 
                      x={p.x} 
                      y={chartHeight - padBottom + 16} 
                      textAnchor="middle" 
                      fill={isSelected ? "#38bdf8" : "#94a3b8"} 
                      fontSize="10" 
                      fontFamily="monospace"
                      fontWeight={isSelected ? "bold" : "normal"}
                    >
                      {p.data.label}
                    </text>

                    {/* Percentage saved badge over bar */}
                    <text 
                      x={p.x} 
                      y={p.yProp - 10} 
                      textAnchor="middle" 
                      fill="#34d399" 
                      fontSize="9" 
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      -{p.data.reductionPercent}%
                    </text>
                  </g>
                );
              })}

              {/* Active / Hovered Tooltip Card */}
              {(() => {
                const activeIndex = hoveredDataIndex !== null ? hoveredDataIndex : selectedHorizonYear;
                const activeP = trajectoryPoints[activeIndex];
                if (!activeP) return null;

                const tooltipX = Math.min(Math.max(activeP.x - 90, padLeft), chartWidth - padRight - 180);
                const tooltipY = padTop + 8;

                return (
                  <g pointerEvents="none">
                    <rect 
                      x={tooltipX} 
                      y={tooltipY} 
                      width="180" 
                      height="86" 
                      rx="6" 
                      fill="#0f172a" 
                      stroke="#38bdf8" 
                      strokeWidth="1" 
                      fillOpacity="0.95" 
                      filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
                    />
                    <text x={tooltipX + 10} y={tooltipY + 16} fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      {activeP.data.label} (LF: {(sensitivityLf * 100).toFixed(0)}%)
                    </text>
                    <text x={tooltipX + 10} y={tooltipY + 32} fill="#f43f5e" fontSize="9" fontFamily="monospace">
                      • Base: {activeP.data.baseKwh.toLocaleString()} kWh ({activeP.data.baseKw.toFixed(1)} kW)
                    </text>
                    <text x={tooltipX + 10} y={tooltipY + 46} fill="#34d399" fontSize="9" fontFamily="monospace">
                      • Proposed: {activeP.data.propKwh.toLocaleString()} kWh ({activeP.data.propKw.toFixed(1)} kW)
                    </text>
                    <text x={tooltipX + 10} y={tooltipY + 60} fill="#facc15" fontSize="9" fontFamily="monospace">
                      • Target: {targetReductionPercent}% ({activeP.data.isTargetMet ? '✓ MET' : '✗ SHORTFALL'})
                    </text>
                    <text x={tooltipX + 10} y={tooltipY + 74} fill="#a7f3d0" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      • Saved: {activeP.data.savedKwh.toLocaleString()} kWh (Rs. {activeP.data.moneySaved.toLocaleString()})
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* LF SENSITIVITY SWEEP CURVE (0.5 to 1.0) */}
      {chartMode === 'lf_sweep' && (
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-white shadow-inner space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Load Factor (0.50 – 1.00) Sensitivity Spectrum @ Year {selectedHorizonYear}
                </span>
                <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                  Annual Growth = {growthRatePercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Shows how duty cycle variation from 0.50 (rural) to 1.00 (continuous 24/7 load) scales losses and energy savings quadratically.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-3 h-0.5 bg-rose-500" />
                Baseline Energy Loss
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-0.5 bg-emerald-500" />
                Proposed Energy Loss
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-3 h-0.5 bg-indigo-500" />
                Energy Saved (kWh)
              </span>
            </div>
          </div>

          {/* SVG Chart for LF Sweep */}
          <div className="w-full overflow-x-auto">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-64 overflow-visible select-none"
            >
              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
                const y = padTop + plotHeight * (1 - ratio);
                const val = Math.round(maxSweepLoss * 1.15 * ratio);
                return (
                  <g key={ratio}>
                    <line 
                      x1={padLeft} 
                      y1={y} 
                      x2={chartWidth - padRight} 
                      y2={y} 
                      stroke="#334155" 
                      strokeWidth="1" 
                      strokeDasharray={ratio === 0 ? "0" : "2 2"} 
                    />
                    <text 
                      x={padLeft - 8} 
                      y={y + 3} 
                      textAnchor="end" 
                      fill="#94a3b8" 
                      fontSize="9" 
                      fontFamily="monospace"
                    >
                      {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} kWh
                    </text>
                  </g>
                );
              })}

              {/* Baseline Curve */}
              <path 
                d={lfBaseLinePath} 
                fill="none" 
                stroke="#f43f5e" 
                strokeWidth="2.5" 
              />

              {/* Proposed Curve */}
              <path 
                d={lfPropLinePath} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="2.5" 
              />

              {/* Savings Curve */}
              <path 
                d={lfSavingsPath} 
                fill="none" 
                stroke="#818cf8" 
                strokeWidth="2.5" 
                strokeDasharray="3 3" 
              />

              {/* Interactive Points on Sweep */}
              {lfSweepPoints.map((p) => {
                const isCurrent = Math.abs(sensitivityLf - p.data.lf) < 0.02;

                return (
                  <g 
                    key={p.data.lf}
                    className="cursor-pointer"
                    onClick={() => handleLfChange(p.data.lf)}
                  >
                    {/* Active vertical guide if matches current LF */}
                    {isCurrent && (
                      <line 
                        x1={p.x} 
                        y1={padTop} 
                        x2={p.x} 
                        y2={chartHeight - padBottom} 
                        stroke="#818cf8" 
                        strokeWidth="1.5" 
                        strokeDasharray="3 3" 
                      />
                    )}

                    {/* Baseline Dot */}
                    <circle cx={p.x} cy={p.yBase} r="3.5" fill="#f43f5e" />
                    {/* Proposed Dot */}
                    <circle cx={p.x} cy={p.yProp} r="3.5" fill="#10b981" />
                    {/* Savings Dot */}
                    <circle 
                      cx={p.x} 
                      cy={p.ySaved} 
                      r={isCurrent ? 6 : 3.5} 
                      fill="#818cf8" 
                      stroke="#ffffff" 
                      strokeWidth={isCurrent ? "2" : "1"} 
                    />

                    {/* X-axis Label */}
                    <text 
                      x={p.x} 
                      y={chartHeight - padBottom + 16} 
                      textAnchor="middle" 
                      fill={isCurrent ? "#818cf8" : "#94a3b8"} 
                      fontSize="9" 
                      fontFamily="monospace"
                      fontWeight={isCurrent ? "bold" : "normal"}
                    >
                      {p.data.lf.toFixed(2)}
                    </text>

                    {/* Saved label */}
                    <text 
                      x={p.x} 
                      y={p.ySaved - 8} 
                      textAnchor="middle" 
                      fill="#818cf8" 
                      fontSize="8" 
                      fontFamily="monospace"
                    >
                      {p.data.savedKwh >= 1000 ? `${(p.data.savedKwh / 1000).toFixed(0)}k` : p.data.savedKwh}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* 2D CROSS-SENSITIVITY MATRIX / HEATMAP */}
      {chartMode === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs space-y-3">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                2D Cross-Sensitivity Heatmap: Load Factor (Rows) × Annual Growth Rate (Cols)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluated at Year {selectedHorizonYear} projection. Click any cell to immediately apply those parameters to the active workbench simulator.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ✓ Target Met (≥{targetReductionPercent}%)
              </span>
              <span className="flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                ✗ Shortfall (&lt;{targetReductionPercent}%)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-center text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60">
                  <th className="py-2.5 px-3 text-left font-sans font-bold text-slate-700">
                    Load Factor (LF) \ Growth:
                  </th>
                  {matrixGrowths.map(g => (
                    <th key={g} className="py-2.5 px-3 font-bold text-slate-800">
                      {g.toFixed(1)}% Growth
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.map(row => (
                  <tr key={row.lf} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 text-left font-sans font-semibold text-slate-900 bg-slate-50/40">
                      LF = {row.lf.toFixed(2)} ({(row.lf * 100).toFixed(0)}%)
                      <span className="text-[10px] text-slate-400 block font-mono">
                        LLF: {(0.2 * row.lf + 0.8 * Math.pow(row.lf, 2)).toFixed(3)}
                      </span>
                    </td>
                    {row.cells.map(cell => {
                      const isCurrentCell = 
                        Math.abs(sensitivityLf - cell.lf) < 0.02 && 
                        Math.abs(growthRatePercent - cell.growthRate) < 0.1;

                      return (
                        <td 
                          key={cell.growthRate}
                          onClick={() => {
                            handleLfChange(cell.lf);
                            setGrowthRatePercent(cell.growthRate);
                          }}
                          className={`py-2 px-2.5 cursor-pointer transition-all border ${
                            isCurrentCell ? 'ring-2 ring-indigo-500 font-bold' : ''
                          } ${
                            cell.isTargetMet 
                              ? 'bg-emerald-50/70 text-emerald-950 border-emerald-100 hover:bg-emerald-100' 
                              : 'bg-rose-50/60 text-rose-950 border-rose-100 hover:bg-rose-100'
                          }`}
                        >
                          <div className="font-bold text-[11px]">
                            {cell.reductionPercent}% Red.
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono">
                            {cell.savedKwh.toLocaleString()} kWh
                          </div>
                          <div className={`text-[9px] font-bold ${cell.isTargetMet ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {cell.isTargetMet ? '✓ TARGET MET' : '✗ SHORTFALL'}
                          </div>
                          <div className="text-[9px] text-slate-500">
                            Rs. {(cell.moneySaved / 1000).toFixed(0)}k
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Engineering Insights & Guidelines */}
      <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">
            WAPDA ELR Sensitivity Analysis Guidelines & NEPRA Standards:
          </p>
          <p className="text-[11px] leading-relaxed">
            1. Line loss energy saved is directly proportional to the Loss Load Factor (LLF = 0.2·LF + 0.8·LF²). A higher consumer duty cycle (LF = 0.8 to 1.0) multiplies the return-on-investment of conductor up-sizing and bifurcation by up to <strong>3.3×</strong> compared to low duty cycles.
            <br />
            2. Annual demand growth compounds line losses quadratically ((1+g)^2y). At 7.5% annual growth, unmitigated losses double within 5 years, making early bifurcation and HT extension highly cost-effective.
          </p>
        </div>
      </div>
    </div>
  );
};
