/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FeederData, ForecastYearResult, BifurcationConfig } from '../types/feeder';
import { generateGrowthForecast } from '../utils/elrEngine';
import { 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Calendar, 
  Info, 
  Split, 
  Zap, 
  Layers 
} from 'lucide-react';

interface ForecastingViewProps {
  feeder: FeederData;
  activeConductors?: Record<string, string>;
  activeCapacitors?: Record<string, number>;
  bifurcationConfig?: BifurcationConfig;
}

export const ForecastingView: React.FC<ForecastingViewProps> = ({
  feeder,
  activeConductors,
  activeCapacitors,
  bifurcationConfig
}) => {
  const [growthRatePercent, setGrowthRatePercent] = useState<number>(feeder.annualGrowthRatePercent || 5.0);
  const [forecastHorizon, setForecastHorizon] = useState<number>(5);
  const [activeSubNetworkView, setActiveSubNetworkView] = useState<'ALL' | 'T1' | 'T2'>('ALL');
  const [customTariff, setCustomTariff] = useState<number>(feeder.tariffPerKwh || 24.83);

  const forecast = generateGrowthForecast(feeder, forecastHorizon, growthRatePercent, {
    customConductors: activeConductors,
    customCapacitors: activeCapacitors,
    bifurcation: bifurcationConfig
  });

  const year0 = forecast[0];
  const year5 = forecast[Math.min(5, forecast.length - 1)];
  const tariff = customTariff || feeder.tariffPerKwh || 24.83;
  const isBifurcated = Boolean(bifurcationConfig?.enabled);

  return (
    <div className="space-y-6">
      {/* Forecasting Parameter Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>WAPDA 5-YEAR PLANNING & BIFURCATION FORECAST MODULE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Distribution Feeder Multi-Year Load Growth Projection
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Simulates annual consumer demand compound growth and quadratic impact on line losses, with dual-transformer (T-1 & T-2) loading trajectory analysis.
          </p>
        </div>

        {/* Controls Box */}
        <div className="flex flex-wrap items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full md:w-auto">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Annual Load Growth Factor:</span>
              <span className="font-mono text-amber-600 font-bold">{growthRatePercent}% / yr</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={growthRatePercent}
              onChange={(e) => setGrowthRatePercent(Number(e.target.value))}
              className="w-44 accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Rate Per KWH (Rupees):</span>
              <span className="font-mono text-emerald-700 font-bold">Rs. {customTariff.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                min="1.0"
                max="500"
                value={customTariff}
                onChange={(e) => setCustomTariff(parseFloat(e.target.value) || 24.83)}
                className="w-24 bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-xs text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] font-mono text-slate-500">Rs/kWh</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Planning Horizon:</span>
              <span className="font-mono text-slate-800 font-bold">{forecastHorizon} Years</span>
            </div>
            <div className="flex items-center gap-1">
              {[3, 5, 8, 10].map(yr => (
                <button
                  key={yr}
                  onClick={() => setForecastHorizon(yr)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    forecastHorizon === yr
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {yr}Y
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Network View Selector for Dual Substation */}
      {isBifurcated && (
        <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Split className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-950">
              Bifurcated Dual-Transformer Forecast Mode Active:
            </span>
            <span className="text-xs text-purple-800">
              (T-1: {feeder.existingTransformerKva} kVA · T-2: {bifurcationConfig?.transformerCapacityKva} kVA @ Node {bifurcationConfig?.bifurcationNodeId})
            </span>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-purple-200 text-xs">
            <button
              onClick={() => setActiveSubNetworkView('ALL')}
              className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                activeSubNetworkView === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-purple-900 hover:bg-purple-50'
              }`}
            >
              Combined System Total
            </button>
            <button
              onClick={() => setActiveSubNetworkView('T1')}
              className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                activeSubNetworkView === 'T1'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-blue-900 hover:bg-blue-50'
              }`}
            >
              T-1 Main Substation
            </button>
            <button
              onClick={() => setActiveSubNetworkView('T2')}
              className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                activeSubNetworkView === 'T2'
                  ? 'bg-purple-800 text-white shadow-xs font-bold'
                  : 'text-purple-900 hover:bg-purple-50'
              }`}
            >
              T-2 Added Substation
            </button>
          </div>
        </div>
      )}

      {/* High-Level Comparison Callout (Now vs Year 5) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Demand Growth */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            System Demand
          </span>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-xl font-bold text-slate-900">{year0.demandKva}</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="text-2xl font-bold text-amber-600">{year5.demandKva} kVA</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            +{((year5.demandKva / year0.demandKva - 1) * 100).toFixed(1)}% compound growth
          </span>
        </div>

        {/* Card 2: Main Transformer T-1 Loading */}
        <div className={`p-4 rounded-xl border shadow-xs ${
          (year5.t1LoadingPercent || year5.existingLoadingPercent) > 100
            ? 'bg-rose-50/60 border-rose-200'
            : 'bg-emerald-50/60 border-emerald-200'
        }`}>
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block mb-1">
            {isBifurcated ? `T-1 (${feeder.existingTransformerKva} kVA) Loading` : `${feeder.existingTransformerKva} kVA Trf Loading`}
          </span>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-xl font-bold text-slate-900">
              {isBifurcated ? year0.t1LoadingPercent : year0.existingLoadingPercent}%
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className={`text-2xl font-bold ${
              (year5.t1LoadingPercent || year5.existingLoadingPercent) > 100 ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              {isBifurcated ? year5.t1LoadingPercent : year5.existingLoadingPercent}%
            </span>
          </div>
          <span className="text-xs text-slate-600 font-semibold mt-1 block">
            {isBifurcated 
              ? (year5.t1LoadingPercent && year5.t1LoadingPercent <= 100 ? '✓ Relieved & Safe at Year 5' : 'Approaching threshold')
              : (year5.existingLoadingPercent > 100 ? 'Severe thermal overload without bifurcation' : 'Safe')}
          </span>
        </div>

        {/* Card 3: Additional Transformer T-2 Loading (or Proposed Upgrade) */}
        <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 shadow-xs">
          <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider block mb-1">
            {isBifurcated ? `T-2 (${bifurcationConfig?.transformerCapacityKva} kVA) Loading` : 'Proposed 200 kVA Loading'}
          </span>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-xl font-bold text-purple-900">
              {isBifurcated ? year0.t2LoadingPercent : year0.proposedLoadingPercent}%
            </span>
            <ArrowRight className="w-4 h-4 text-purple-400" />
            <span className="text-2xl font-bold text-purple-950">
              {isBifurcated ? year5.t2LoadingPercent : year5.proposedLoadingPercent}%
            </span>
          </div>
          <span className="text-xs text-purple-800 font-semibold mt-1 block">
            {isBifurcated ? 'Optimal load center supply at Node ' + (bifurcationConfig?.bifurcationNodeId || '3.0') : 'WAPDA standard upgrade'}
          </span>
        </div>

        {/* Card 4: Annual Energy Loss Growth */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Annual Energy Losses
          </span>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-xl font-bold text-slate-800">{year0.annualEnergyLossKwh.toLocaleString()}</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="text-2xl font-bold text-slate-900">{year5.annualEnergyLossKwh.toLocaleString()} kWh</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            +{(year5.annualEnergyLossKwh - year0.annualEnergyLossKwh).toLocaleString()} kWh/yr dissipation
          </span>
        </div>
      </div>

      {/* Year by Year Detailed Schedule */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>Multi-Year Load Growth & Transformer Loading Schedule</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Growth Rate: {growthRatePercent}% compounded annually
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 font-sans">
                <th className="py-2.5 px-4">Timeline</th>
                <th className="py-2.5 px-3 text-right">System Demand (kVA)</th>
                <th className="py-2.5 px-3 text-right">Source Current (A)</th>
                {isBifurcated ? (
                  <>
                    <th className="py-2.5 px-3 text-right bg-blue-50/70 text-blue-950 font-bold">
                      T-1 Load (kVA / %)
                    </th>
                    <th className="py-2.5 px-3 text-right bg-purple-50/70 text-purple-950 font-bold">
                      T-2 Load (kVA / %)
                    </th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/70 text-blue-950">
                      T-1 Line Loss (kW)
                    </th>
                    <th className="py-2.5 px-3 text-right bg-purple-50/70 text-purple-950">
                      T-2 Line Loss (kW)
                    </th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-3 text-right">100 kVA Loading (%)</th>
                    <th className="py-2.5 px-3 text-right">200 kVA Loading (%)</th>
                  </>
                )}
                <th className="py-2.5 px-3 text-right">Peak Power Loss (kW)</th>
                <th className="py-2.5 px-3 text-right">Annual Energy (kWh)</th>
                <th className="py-2.5 px-4 text-right">Annual Financial Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {forecast.map((row) => {
                const isOver = (row.t1LoadingPercent || row.existingLoadingPercent) > 100;
                return (
                  <tr 
                    key={row.year} 
                    className={`hover:bg-slate-50/80 transition-colors ${
                      row.year === 0 ? 'bg-slate-50/50 font-semibold' : (row.year === 5 ? 'bg-amber-50/30' : '')
                    }`}
                  >
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900 flex items-center gap-2">
                      <span>{row.year === 0 ? 'Current Baseline' : `Year +${row.year}`}</span>
                      {row.year === 5 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-semibold">
                          5-Year Horizon
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                      {row.demandKva}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {row.currentAmps.toFixed(1)} A
                    </td>

                    {isBifurcated ? (
                      <>
                        <td className="py-2.5 px-3 text-right bg-blue-50/30 font-bold text-blue-950">
                          {row.t1DemandKva} kVA ({row.t1LoadingPercent}%)
                        </td>
                        <td className="py-2.5 px-3 text-right bg-purple-50/30 font-bold text-purple-950">
                          {row.t2DemandKva} kVA ({row.t2LoadingPercent}%)
                        </td>
                        <td className="py-2.5 px-3 text-right bg-blue-50/30 text-blue-900 font-semibold">
                          {row.t1LineLossKw?.toFixed(3)} kW
                        </td>
                        <td className="py-2.5 px-3 text-right bg-purple-50/30 text-purple-900 font-semibold">
                          {row.t2LineLossKw?.toFixed(3)} kW
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-bold ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>
                            {row.existingLoadingPercent}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                          {row.proposedLoadingPercent}%
                        </td>
                      </>
                    )}

                    <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                      {row.lineLossesKw.toFixed(3)} kW
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {row.annualEnergyLossKwh.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-800">
                      {feeder.currencySymbol} {Math.round(row.annualEnergyLossKwh * tariff).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Engineering Explanatory Card */}
      <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800">
        <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span>Bifurcation & Quadratic Loss Reduction Principle</span>
        </h4>
        <div className="mt-3 text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            When a feeder is bifurcated and an additional transformer is installed at a load center, downstream current is removed from the primary backbone trunk:
          </p>
          <div className="font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-amber-300">
            P_loss,trunk = 3 · (I_trunk - I_bifurcated)² · R · L
          </div>
          <p>
            Because ohmic losses decrease with the <strong>square</strong> of the current, halving the current in upstream backbone spans reduces their line losses by up to <strong>75%</strong>, ensuring sustainable capacity through the entire 5-year growth window.
          </p>
        </div>
      </div>
    </div>
  );
};
