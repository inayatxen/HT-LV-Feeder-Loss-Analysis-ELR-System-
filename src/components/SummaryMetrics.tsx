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
  Clock,
  Save,
  Calculator,
  Link2
} from 'lucide-react';
import { FeederAnalysisSummary, FeederData } from '../types/feeder';

interface SummaryMetricsProps {
  summary: FeederAnalysisSummary;
  feeder: FeederData;
  isProposedScenario?: boolean;
  onSaveUnifiedProject?: () => void;
  onOpenCostEstimation?: () => void;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({
  summary,
  feeder,
  isProposedScenario = false,
  onSaveUnifiedProject,
  onOpenCostEstimation
}) => {
  const isHtLine = feeder.type === 'HT' || feeder.category === 'HV' || summary.baseVoltage >= 1000;
  const isOverloaded = isHtLine ? summary.worstVoltageDropPercent > 5.0 : summary.isTransformerOverloaded;
  const tariff = feeder.tariffPerKwh || 24.83;
  const annualLossCost = Math.round(summary.annualEnergyLossKwh * tariff);
  const injectedKv = ((summary.injectedVoltageAtNode0 || summary.baseVoltage) / 1000).toFixed(2);
  const totalHtKva = summary.totalNodeKva || summary.totalSystemDemandKva;

  return (
    <div className="space-y-4">
      {/* Top Banner / Feeder Status Bar (3D Tactile Chassis) */}
      <div className="card-3d p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-bold font-mono text-[11px] text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-md border border-blue-300 shadow-2xs">
              WO: {feeder.workOrderNo || '26147126042'}
            </span>
            <span className={`font-bold font-mono text-[11px] shadow-2xs ${
              isHtLine 
                ? 'text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-300' 
                : 'text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300'
            }`}>
              {isHtLine ? '11kV HT Network (From/To Nodes · Node KVA · Conductor)' : '400V LT Network'}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-semibold text-slate-700">{feeder.substationName}</span>
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
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 drop-shadow-2xs">
            {summary.feederName}
          </h2>
        </div>

        {/* Feeder Health State Indicator */}
        <div className="flex items-center gap-2.5 sm:gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          {isHtLine ? (
            summary.worstVoltageDropPercent > 5.0 ? (
              <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-900 px-3.5 py-2 rounded-xl text-xs font-medium w-full lg:w-auto shadow-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">HT Line Voltage Drop Alert ({summary.worstVoltageDropPercent}% at Node {summary.worstVoltageDropNodeId})</span>
                  <span className="block text-[11px] text-amber-700">Voltage drop exceeds 5% WAPDA threshold from Node 0 injection ({injectedKv} kV)</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-300 text-sky-900 px-3.5 py-2 rounded-xl text-xs font-medium w-full lg:w-auto shadow-xs">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                <div>
                  <span className="font-bold">11 kV HT Line Operating Optimally (Max Drop: {summary.worstVoltageDropPercent}%)</span>
                  <span className="block text-[11px] text-sky-700">Healthy line voltage profile maintained from Node 0 ({injectedKv} kV) to tail nodes</span>
                </div>
              </div>
            )
          ) : isOverloaded ? (
            <div className="flex items-center gap-2 bg-gradient-to-r from-rose-50 to-red-50 border border-rose-300 text-rose-900 px-3.5 py-2 rounded-xl text-xs font-medium w-full lg:w-auto shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">CRITICAL: Transformer Overloaded ({summary.existingTransformerLoadingPercent}%)</span>
                <span className="block text-[11px] text-rose-700">Upgrade to {summary.proposedTransformerKva} kVA recommended by WAPDA ELR criteria</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 text-emerald-900 px-3.5 py-2 rounded-xl text-xs font-medium w-full lg:w-auto shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Transformer Operating Within Limits ({summary.existingTransformerLoadingPercent}%)</span>
                <span className="block text-[11px] text-emerald-700">Load is sustainable under rated thermal bounds</span>
              </div>
            </div>
          )}

          {/* Quick Unified Project & Cost Estimation Actions (3D Tactile Buttons) */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onSaveUnifiedProject && (
              <button
                type="button"
                onClick={onSaveUnifiedProject}
                className="btn-3d-emerald flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap"
                title="Save both 1. FLADIX Feeder Loss Analysis and 2. Line Cost Estimation together as One Project"
              >
                <Save className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                <span className="hidden sm:inline">Save as One Project</span>
                <span className="sm:hidden">Save</span>
              </button>
            )}

            {onOpenCostEstimation && (
              <button
                type="button"
                onClick={onOpenCostEstimation}
                className="btn-3d-blue flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap"
                title="Open and view linked Line Extension Cost Estimate (CSR-2026)"
              >
                <Calculator className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                <span className="hidden sm:inline">Linked Cost Estimate</span>
                <span className="sm:hidden">Cost Est.</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary 3D KPI Grid (Fits mobile, tablet, laptop, and ultra-wide screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Source Current in Amps (HT) or Transformer Overloading (LT) */}
        {isHtLine ? (
          <div className="card-3d p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-600">Source Current (I_s)</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shadow-inner">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-blue-950 tracking-tight">
                  {summary.totalSourceCurrentAmps}
                </span>
                <span className="text-xs font-bold text-blue-600">Amps (A)</span>
              </div>
            </div>
            <div className="panel-sunken-3d p-2 mt-3 flex items-center justify-between text-xs text-slate-600 font-mono">
              <span>Injected Voltage:</span>
              <span className="font-bold text-slate-900">{injectedKv} kV</span>
            </div>
          </div>
        ) : (
          <div className={`card-3d p-4 flex flex-col justify-between ${
            isOverloaded ? 'ring-2 ring-rose-400/50 bg-rose-50/20' : ''
          }`}>
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-600">Transformer Loading</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-inner border ${
                  isOverloaded ? 'bg-rose-50 border-rose-200' : 'bg-slate-100 border-slate-200'
                }`}>
                  <Zap className={`w-4 h-4 ${isOverloaded ? 'text-rose-600' : 'text-slate-600'}`} />
                </div>
              </div>
              {summary.bifurcationActive ? (
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums ${
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
                  <span className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${
                    isOverloaded ? 'text-rose-700' : 'text-slate-900'
                  }`}>
                    {summary.existingTransformerLoadingPercent}%
                  </span>
                  <span className="text-xs text-slate-500 truncate">
                    ({summary.totalSystemDemandKva}/{summary.existingTransformerKva} kVA)
                  </span>
                </div>
              )}
            </div>
            <div className="panel-sunken-3d p-2 mt-3 flex items-center justify-between text-xs text-slate-600 font-mono">
              {summary.bifurcationActive ? (
                <>
                  <span className="text-purple-900 font-semibold truncate">T2 Added @ Node {summary.bifurcationNodeId}:</span>
                  <span className="font-mono font-bold text-purple-700 shrink-0">
                    {summary.additionalTransformerKva} kVA
                  </span>
                </>
              ) : (
                <>
                  <span className="truncate">Proposed ({summary.proposedTransformerKva} kVA):</span>
                  <span className="font-mono font-bold text-emerald-600 shrink-0">
                    {summary.proposedTransformerLoadingPercent}%
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Metric 2: Total Feeder Line Losses */}
        <div className="card-3d p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-600">Total Line Losses</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shadow-inner">
                <TrendingDown className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
                {summary.totalLineLossKw}
              </span>
              <span className="text-xs font-bold text-slate-600">kW</span>
            </div>
          </div>
          <div className="panel-sunken-3d p-2 mt-3 flex items-center justify-between text-xs text-slate-600 font-mono">
            <span>Power Loss Ratio:</span>
            <span className="font-mono font-bold text-amber-700">
              {summary.percentPowerLoss}%
            </span>
          </div>
        </div>

        {/* Metric 3: Annual Energy Losses */}
        <div className="card-3d p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-600">Annual Energy Loss</span>
              <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center shadow-inner">
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
                {summary.annualEnergyLossKwh.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-600">kWh</span>
            </div>
          </div>
          <div className="panel-sunken-3d p-2 mt-3 flex items-center justify-between text-xs text-slate-600 font-mono">
            <span className="truncate">LLF: {summary.lossLoadFactor} ({(summary.loadFactor * 100).toFixed(0)}% LF)</span>
            <span className="font-mono font-bold text-sky-700 shrink-0">
              {summary.percentAnnualEnergyLoss}%
            </span>
          </div>
        </div>

        {/* Metric 4: Worst Voltage Drop */}
        <div className={`card-3d p-4 flex flex-col justify-between ${
          summary.worstVoltageDropPercent > 9.0 ? 'ring-2 ring-amber-400/50 bg-amber-50/20' : ''
        }`}>
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-600">Worst Voltage Drop</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shadow-inner">
                <Activity className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight ${
                summary.worstVoltageDropPercent > 9.0 ? 'text-amber-800' : 'text-slate-900'
              }`}>
                {summary.worstVoltageDropPercent}%
              </span>
              <span className="text-xs text-slate-500 truncate">
                at Node {summary.worstVoltageDropNodeId}
              </span>
            </div>
          </div>
          <div className="panel-sunken-3d p-2 mt-3 flex items-center justify-between text-xs text-slate-600 font-mono">
            <span className="truncate">Tail Voltage:</span>
            <span className="font-mono font-bold text-slate-900 shrink-0">
              {isHtLine 
                ? `${(summary.worstVoltageVolts / 1000).toFixed(2)} kV`
                : `${summary.worstVoltageVolts} V`}
            </span>
          </div>
        </div>

        {/* Metric 5: Economic Cost of Losses */}
        <div className="card-3d p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-600">Annual Loss Cost</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-inner">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-slate-600">{feeder.currencySymbol}</span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
                {annualLossCost.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="panel-sunken-3d p-2 mt-3 flex items-center justify-between text-xs text-slate-600 font-mono">
            <span>Rate Per KWH:</span>
            <span className="font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
              Rs. {tariff}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
