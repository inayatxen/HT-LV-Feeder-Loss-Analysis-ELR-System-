/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Zap, 
  AlertTriangle, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { FeederAnalysisSummary, FeederData } from '../types/feeder';

interface SummaryMetricsProps {
  summary: FeederAnalysisSummary;
  feeder: FeederData;
  isProposedScenario?: boolean;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({
  summary,
  feeder,
  isProposedScenario = false
}) => {
  const isOverloaded = summary.isTransformerOverloaded;
  const tariff = feeder.tariffPerKwh || 38.5;
  const annualLossCost = Math.round(summary.annualEnergyLossKwh * tariff);

  return (
    <div className="space-y-4">
      {/* Top Banner / Feeder Status Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className={`font-bold px-2 py-0.5 rounded text-[11px] font-mono ${
              feeder.category === 'HV' || feeder.type === 'HT' 
                ? 'bg-sky-100 text-sky-900 border border-sky-300' 
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              {feeder.category === 'HV' || feeder.type === 'HT' ? 'HV Analysis (11kV HT)' : 'LV Analysis (400V LT)'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{feeder.substationName}</span>
            <span aria-hidden="true">·</span>
            <span>Base Voltage: {summary.baseVoltage >= 1000 ? `${summary.baseVoltage / 1000} kV` : `${summary.baseVoltage} V`}</span>
            <span aria-hidden="true">·</span>
            <span>Power Factor: {summary.operatingPowerFactor}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-800 font-semibold">Load Factor: {(summary.loadFactor * 100).toFixed(0)}% (LLF: {summary.lossLoadFactor})</span>
            <span aria-hidden="true">·</span>
            <span>Circuit Length: {summary.totalCircuitLengthKm} km</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            {summary.feederName}
          </h2>
        </div>

        {/* Feeder Health State Indicator */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {isOverloaded ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-xs font-medium w-full lg:w-auto">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">CRITICAL: Transformer Overloaded ({summary.existingTransformerLoadingPercent}%)</span>
                <span className="block text-[11px] text-rose-600">Upgrade to {summary.proposedTransformerKva} kVA recommended by WAPDA ELR criteria</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg text-xs font-medium w-full lg:w-auto">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Transformer Operating Within Limits ({summary.existingTransformerLoadingPercent}%)</span>
                <span className="block text-[11px] text-emerald-600">Load is sustainable under rated thermal bounds</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (60-30-10 palette, single-elevation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Metric 1: Transformer Overloading */}
        <div className={`p-4 rounded-xl border transition-all ${
          isOverloaded 
            ? 'bg-rose-50/50 border-rose-200' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Transformer Loading</span>
            <Zap className={`w-4 h-4 ${isOverloaded ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          {/* Transformer Loading or Dual Substation Loading */}
          {summary.bifurcationActive ? (
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-bold font-mono tabular-nums ${
                summary.isTransformer1Overloaded ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                T1: {summary.transformer1LoadingPercent}%
              </span>
              <span className="text-xs font-mono font-bold text-purple-700">
                T2: {summary.transformer2LoadingPercent}%
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-mono tabular-nums ${
                isOverloaded ? 'text-rose-700' : 'text-slate-900'
              }`}>
                {summary.existingTransformerLoadingPercent}%
              </span>
              <span className="text-xs text-slate-500">
                ({summary.totalSystemDemandKva} / {summary.existingTransformerKva} kVA)
              </span>
            </div>
          )}
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            {summary.bifurcationActive ? (
              <>
                <span className="text-purple-900 font-semibold">T2 Added @ Node {summary.bifurcationNodeId}:</span>
                <span className="font-mono font-semibold text-purple-700">
                  {summary.additionalTransformerKva} kVA
                </span>
              </>
            ) : (
              <>
                <span>Proposed ({summary.proposedTransformerKva} kVA):</span>
                <span className="font-mono font-semibold text-emerald-600">
                  {summary.proposedTransformerLoadingPercent}%
                </span>
              </>
            )}
          </div>
        </div>

        {/* Metric 2: Total Feeder Line Losses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total Line Losses</span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {summary.totalLineLossKw}
            </span>
            <span className="text-xs font-semibold text-slate-600">kW</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Power Loss Ratio:</span>
            <span className="font-mono font-semibold text-amber-600">
              {summary.percentPowerLoss}%
            </span>
          </div>
        </div>

        {/* Metric 3: Annual Energy Losses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Annual Energy Loss</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {summary.annualEnergyLossKwh.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-600">kWh</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>LLF: <strong className="text-slate-700">{summary.lossLoadFactor}</strong> ({(summary.loadFactor * 100).toFixed(0)}% LF)</span>
            <span className="font-mono font-semibold text-sky-700">
              {summary.percentAnnualEnergyLoss}% Loss
            </span>
          </div>
        </div>

        {/* Metric 4: Worst Voltage Drop */}
        <div className={`p-4 rounded-xl border ${
          summary.worstVoltageDropPercent > 9.0 
            ? 'bg-amber-50/60 border-amber-200' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Worst Voltage Drop</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tabular-nums ${
              summary.worstVoltageDropPercent > 9.0 ? 'text-amber-800' : 'text-slate-900'
            }`}>
              {summary.worstVoltageDropPercent}%
            </span>
            <span className="text-xs text-slate-500">
              at Node {summary.worstVoltageDropNodeId}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Tail Terminal Voltage:</span>
            <span className="font-mono font-semibold text-slate-800">
              {summary.worstVoltageVolts} V
            </span>
          </div>
        </div>

        {/* Metric 5: Economic Cost of Losses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Annual Loss Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-slate-600">{feeder.currencySymbol}</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {annualLossCost.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Tariff Rate:</span>
            <span className="font-mono font-medium text-slate-700">
              {tariff} {feeder.currencySymbol}/kWh
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
