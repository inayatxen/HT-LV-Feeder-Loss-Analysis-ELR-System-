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
  const isHtLine = feeder.type === 'HT' || feeder.category === 'HV' || summary.baseVoltage >= 1000;
  const isOverloaded = isHtLine ? summary.worstVoltageDropPercent > 5.0 : summary.isTransformerOverloaded;
  const tariff = feeder.tariffPerKwh || 38.5;
  const annualLossCost = Math.round(summary.annualEnergyLossKwh * tariff);
  const injectedKv = ((summary.injectedVoltageAtNode0 || summary.baseVoltage) / 1000).toFixed(2);
  const totalHtKva = summary.totalNodeKva || summary.totalSystemDemandKva;

  return (
    <div className="space-y-4">
      {/* Top Banner / Feeder Status Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className={`font-bold font-mono text-[11px] ${
              isHtLine 
                ? 'text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200' 
                : 'text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200'
            }`}>
              {isHtLine ? '11kV HT Network (From/To Nodes · Node KVA · Conductor)' : '400V LT Network'}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-medium text-slate-700">{feeder.substationName}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Node 0 Injected: <strong className="font-mono text-blue-700">{injectedKv} kV ({(summary.injectedVoltageAtNode0 || summary.baseVoltage).toLocaleString()} V)</strong></span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            {isHtLine && (
              <>
                <span>Total Node Load: <strong className="font-mono text-slate-800">{totalHtKva.toLocaleString()} kVA</strong></span>
                <span aria-hidden="true" className="text-slate-300">·</span>
              </>
            )}
            <span>PF: <strong className="font-mono text-slate-800">{summary.operatingPowerFactor}</strong></span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-emerald-800 font-medium">LF: <strong className="font-mono">{(summary.loadFactor * 100).toFixed(0)}%</strong> (LLF: {summary.lossLoadFactor})</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Length: <strong className="font-mono text-slate-800">{summary.totalCircuitLengthKm} km</strong></span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
            {summary.feederName}
          </h2>
        </div>

        {/* Feeder Health State Indicator */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {isHtLine ? (
            summary.worstVoltageDropPercent > 5.0 ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-lg text-xs font-medium w-full lg:w-auto">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">HT Line Voltage Drop Alert ({summary.worstVoltageDropPercent}% at Node {summary.worstVoltageDropNodeId})</span>
                  <span className="block text-[11px] text-amber-700">Voltage drop exceeds 5% WAPDA threshold from Node 0 injection ({injectedKv} kV)</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-900 px-3 py-2 rounded-lg text-xs font-medium w-full lg:w-auto">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                <div>
                  <span className="font-bold">11 kV HT Line Operating Optimally (Max Drop: {summary.worstVoltageDropPercent}%)</span>
                  <span className="block text-[11px] text-sky-700">Healthy line voltage profile maintained from Node 0 ({injectedKv} kV) to tail nodes</span>
                </div>
              </div>
            )
          ) : isOverloaded ? (
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
        {/* Metric 1: Source Current in Amps (HT) or Transformer Overloading (LT) */}
        {isHtLine ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Source Current (I_s)</span>
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-blue-900">
                {summary.totalSourceCurrentAmps}
              </span>
              <span className="text-xs font-bold text-blue-600">Amps (A)</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
              <span>Injected Voltage:</span>
              <span className="font-bold text-slate-800">{injectedKv} kV</span>
            </div>
          </div>
        ) : (
          <div className={`p-4 rounded-xl border transition-all ${
            isOverloaded 
              ? 'bg-rose-50/50 border-rose-200' 
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Transformer Loading</span>
              <Zap className={`w-4 h-4 ${isOverloaded ? 'text-rose-500' : 'text-slate-400'}`} />
            </div>
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
        )}

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
              {isHtLine 
                ? `${(summary.worstVoltageVolts / 1000).toFixed(3)} kV (${summary.worstVoltageVolts.toFixed(0)} V)`
                : `${summary.worstVoltageVolts} V`}
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
