/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FeederData, ForecastYearResult } from '../types/feeder';
import { generateGrowthForecast } from '../utils/elrEngine';
import { TrendingUp, AlertTriangle, ShieldCheck, ArrowRight, Calendar, Info } from 'lucide-react';

interface ForecastingViewProps {
  feeder: FeederData;
  activeConductors?: Record<string, string>;
  activeCapacitors?: Record<string, number>;
}

export const ForecastingView: React.FC<ForecastingViewProps> = ({
  feeder,
  activeConductors,
  activeCapacitors
}) => {
  const [growthRatePercent, setGrowthRatePercent] = useState<number>(feeder.annualGrowthRatePercent || 5.0);
  const [forecastHorizon, setForecastHorizon] = useState<number>(5);

  const forecast = generateGrowthForecast(feeder, forecastHorizon, growthRatePercent, {
    customConductors: activeConductors,
    customCapacitors: activeCapacitors
  });

  const year0 = forecast[0];
  const year5 = forecast[Math.min(5, forecast.length - 1)];
  const tariff = feeder.tariffPerKwh || 38.5;

  return (
    <div className="space-y-6">
      {/* Forecasting Parameter Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>WAPDA 5-YEAR PLANNING MODULE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Distribution Feeder Multi-Year Load Growth Projection
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Simulates annual consumer demand compound growth and its quadratic impact on line losses and transformer thermal loading.
          </p>
        </div>

        {/* Sliders Box */}
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
              <span>Planning Horizon:</span>
              <span className="font-mono text-slate-800 font-bold">{forecastHorizon} Years</span>
            </div>
            <div className="flex items-center gap-1">
              {[3, 5, 8, 10].map(yr => (
                <button
                  key={yr}
                  onClick={() => setForecastHorizon(yr)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
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

        {/* Card 2: Existing 100 kVA Transformer Loading */}
        <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block mb-1">
            100 kVA Transformer Loading
          </span>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-xl font-bold text-rose-700">{year0.existingLoadingPercent}%</span>
            <ArrowRight className="w-4 h-4 text-rose-400" />
            <span className="text-2xl font-bold text-rose-800">{year5.existingLoadingPercent}%</span>
          </div>
          <span className="text-xs text-rose-700 font-semibold mt-1 block">
            Severe thermal breakdown risk without upgrade
          </span>
        </div>

        {/* Card 3: Proposed 200 kVA Transformer Loading */}
        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
            Proposed 200 kVA Loading
          </span>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-xl font-bold text-emerald-700">{year0.proposedLoadingPercent}%</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <span className="text-2xl font-bold text-emerald-800">{year5.proposedLoadingPercent}%</span>
          </div>
          <span className="text-xs text-emerald-700 font-semibold mt-1 block">
            Comfortably within safe 80% boundary
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
            +{(year5.annualEnergyLossKwh - year0.annualEnergyLossKwh).toLocaleString()} kWh/yr dissipation increase
          </span>
        </div>
      </div>

      {/* Year by Year Detailed Schedule */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>Year-by-Year Energy Loss & Loading Trajectory</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Growth Rate: {growthRatePercent}% compounded annually
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 font-sans">
                <th className="py-2.5 px-4">Timeline</th>
                <th className="py-2.5 px-4 text-right">Feeder Demand (kVA)</th>
                <th className="py-2.5 px-4 text-right">Feeder Current (A)</th>
                <th className="py-2.5 px-4 text-right">100 kVA Loading (%)</th>
                <th className="py-2.5 px-4 text-right">200 kVA Loading (%)</th>
                <th className="py-2.5 px-4 text-right">Peak Line Loss (kW)</th>
                <th className="py-2.5 px-4 text-right">Annual Energy Loss (kWh)</th>
                <th className="py-2.5 px-4 text-right">Power Loss Ratio</th>
                <th className="py-2.5 px-4 text-right">Annual Financial Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {forecast.map((row) => {
                const isOver = row.existingLoadingPercent > 100;
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
                          Paper Benchmark
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-900 font-bold">
                      {row.demandKva}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-700">
                      {row.currentAmps.toFixed(1)} A
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={`font-bold ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>
                        {row.existingLoadingPercent}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                      {row.proposedLoadingPercent}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-amber-600">
                      {row.lineLossesKw.toFixed(3)} kW
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {row.annualEnergyLossKwh.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      {row.percentPowerLoss}%
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
          <span>Engineering Loss Acceleration Principle</span>
        </h4>
        <div className="mt-3 text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            As demonstrated in Table 1 of the WAPDA study, while demand grows by 28% over 5 years (from 118 kVA to 151 kVA), feeder line losses do not grow linearly—they escalate by over <strong>63%</strong> (from 7.7 kW to 12.555 kW) and energy losses jump from 18,693 kWh to 30,445 kWh.
          </p>
          <p className="font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-amber-300">
            P_loss(t) = 3 · [I(0) · (1 + g)^t]² · R = P_loss(0) · (1 + g)^(2t)
          </p>
          <p>
            This quadratic growth makes proactive transformer replacement and conductor augmentation in Year 1 or 2 far more economical than delaying until post-overload burnout.
          </p>
        </div>
      </div>
    </div>
  );
};
