/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BifurcationFourStatementDossier, 
  BifurcationZoneAnalysisStatement 
} from '../types/feeder';
import { 
  Split, 
  Zap, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  Printer, 
  Download, 
  DollarSign, 
  Users, 
  Activity,
  Layers,
  Sparkles,
  Gauge
} from 'lucide-react';

interface BifurcationStatementsPanelProps {
  dossier: BifurcationFourStatementDossier;
  currencySymbol?: string;
  onOpenPrintReport?: () => void;
  isPrintView?: boolean;
}

export const BifurcationStatementsPanel: React.FC<BifurcationStatementsPanelProps> = ({
  dossier,
  currencySymbol = 'PKR',
  onOpenPrintReport,
  isPrintView = false
}) => {
  const { t1Year0, t1Year5, t2Year0, t2Year5, combinedYear0, combinedYear5, reliefBenefits } = dossier;

  const renderStatementCard = (stmt: BifurcationZoneAnalysisStatement, bgTheme: 'blue' | 'purple') => {
    const isT1 = stmt.transformerId === 'T1';
    const isYr0 = stmt.year === 0;

    const headerGradient = isT1
      ? (isYr0 ? 'bg-blue-900 text-white' : 'bg-slate-900 text-blue-300')
      : (isYr0 ? 'bg-purple-900 text-white' : 'bg-slate-900 text-purple-300');

    const badgeClass = isT1
      ? (isYr0 ? 'bg-blue-800 text-blue-100 border-blue-700' : 'bg-blue-950 text-blue-300 border-blue-800')
      : (isYr0 ? 'bg-purple-800 text-purple-100 border-purple-700' : 'bg-purple-950 text-purple-300 border-purple-800');

    return (
      <div className={`rounded-xl border ${isT1 ? 'border-blue-200' : 'border-purple-200'} bg-white overflow-hidden shadow-xs flex flex-col justify-between print:border-slate-400 print:shadow-none`}>
        {/* Statement Header */}
        <div className={`p-3.5 ${headerGradient} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-bold font-mono text-xs">
              {stmt.transformerId}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs">
                  {stmt.transformerId === 'T1' ? 'Transformer T-1 (Main)' : 'Transformer T-2 (Added)'}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${badgeClass}`}>
                  {stmt.year === 0 ? 'Year 0 (Present)' : 'Year 5 (Forecast)'}
                </span>
              </div>
              <span className="text-[10px] opacity-80 block">
                {stmt.capacityKva} kVA @ {isT1 ? 'Substation Node 0.0' : `Injection Node ${dossier.bifurcationNodeId}`}
              </span>
            </div>
          </div>

          <div className="text-right font-mono">
            <div className={`text-xs font-bold ${stmt.isOverloaded ? 'text-rose-300' : 'text-emerald-300'}`}>
              {stmt.transformerLoadingPercent}% Load
            </div>
            <span className="text-[10px] opacity-75">
              {stmt.isOverloaded ? 'OVERLOADED' : 'SAFE'}
            </span>
          </div>
        </div>

        {/* Statement Parameters Table */}
        <div className="p-3.5 space-y-3 flex-1 text-xs">
          
          {/* Key Electrical Grid */}
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 font-sans block">Peak Demand:</span>
              <span className="font-bold text-slate-900">{stmt.demandKva} kVA</span>
              <span className="text-[10px] text-slate-500 block">({stmt.currentAmps} A)</span>
            </div>

            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 font-sans block">Worst Volt Drop:</span>
              <span className={`font-bold ${stmt.worstVoltageDropPercent > 9.0 ? 'text-rose-600' : 'text-slate-900'}`}>
                -{stmt.worstVoltageDropPercent}%
              </span>
              <span className="text-[10px] text-slate-500 block">({stmt.worstVoltageVolts} V @ {stmt.worstVoltageDropNodeId})</span>
            </div>

            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 font-sans block">Line Loss (kW):</span>
              <span className="font-bold text-amber-700">{stmt.lineLossKw} kW</span>
              <span className="text-[10px] text-slate-500 block">Trf Loss: {stmt.transformationLossKw} kW</span>
            </div>

            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 font-sans block">Annual Energy Loss:</span>
              <span className="font-bold text-slate-900">{stmt.annualEnergyLossKwh.toLocaleString()} kWh</span>
              <span className="text-[10px] text-slate-500 block">{currencySymbol} {stmt.annualLossCostPkr.toLocaleString()}</span>
            </div>
          </div>

          {/* Connected Network Extent */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Served Consumers:</span>
            <span className="font-mono font-semibold text-slate-900">
              {stmt.connected1PhCust} (1Φ) + {stmt.connected3PhCust} (3Φ) = <strong>{stmt.totalConnectedCust}</strong>
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>Zone Circuit Length:</span>
            <span className="font-mono font-semibold text-slate-900">
              {stmt.zoneLengthKm} km ({stmt.zoneLengthMeters} m in {stmt.spansCount} spans)
            </span>
          </div>
        </div>

        {/* Statement Footer Summary Tag */}
        <div className={`px-3.5 py-2 text-[11px] font-semibold border-t flex items-center justify-between ${
          stmt.isOverloaded 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
        }`}>
          <span>
            {stmt.isOverloaded ? 'Capacity Relief Required' : 'Thermal & Voltage Compliant'}
          </span>
          <span className="font-mono text-[10px]">
            {stmt.percentPowerLoss}% Power Loss
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner (Actionable in Interactive mode, Printable in Dossier) */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:bg-white print:text-slate-900 print:border-slate-800 print:p-3 print:rounded-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 print:border-slate-700 print:text-slate-900">
            <Split className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
                Line Bifurcation & T-2 Transformer Dual-Zone Analysis
              </h2>
              <span className="bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase print:text-slate-900 print:border-slate-700">
                4 Statements Active
              </span>
            </div>
            <p className="text-xs text-slate-300 print:text-slate-600 mt-0.5">
              Comparative engineering evaluation of Transformer 1 (T-1) & Transformer 2 (T-2) line portions at 0 Year vs after 5 Years ({dossier.growthRatePercent}% annual growth).
            </p>
          </div>
        </div>

        {onOpenPrintReport && (
          <button
            onClick={onOpenPrintReport}
            className="no-print flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print 4 Statements</span>
          </button>
        )}
      </div>

      {/* Highlights: Upstream Relief & Capital Savings Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
          <span className="text-purple-800 font-semibold block text-[11px]">T-1 Backbone Load Relieved:</span>
          <span className="text-lg font-black text-purple-950 font-mono mt-0.5 block">
            -{reliefBenefits.t1ReliefKva} kVA
          </span>
          <span className="text-[10px] text-purple-700">({reliefBenefits.t1CurrentReliefAmps} A current cut from head)</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
          <span className="text-emerald-800 font-semibold block text-[11px]">Yr 0 Peak Loss Reduction:</span>
          <span className="text-lg font-black text-emerald-950 font-mono mt-0.5 block">
            -{reliefBenefits.lossReductionKwYear0} kW
          </span>
          <span className="text-[10px] text-emerald-700">Immediate relief upon commissioning</span>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
          <span className="text-blue-800 font-semibold block text-[11px]">Yr 5 Annual Energy Saved:</span>
          <span className="text-lg font-black text-blue-950 font-mono mt-0.5 block">
            {reliefBenefits.annualEnergySavedKwhYear5.toLocaleString()} kWh
          </span>
          <span className="text-[10px] text-blue-700">Cumulative 5-year benefit</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
          <span className="text-amber-800 font-semibold block text-[11px]">Yr 5 Financial Savings:</span>
          <span className="text-lg font-black text-amber-950 font-mono mt-0.5 block">
            {currencySymbol} {reliefBenefits.annualFinancialSavingPkrYear5.toLocaleString()}
          </span>
          <span className="text-[10px] text-amber-700">At tariff of {currencySymbol} {dossier.tariffPerKwh}/kWh</span>
        </div>
      </div>

      {/* ========================================================
          THE FOUR ANALYSIS STATEMENTS (4-QUADRANT VIEW)
         ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>The 4 Engineering Analysis Statements</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Split Node: <strong>Node {dossier.bifurcationNodeId}</strong> · T-2: <strong>{dossier.additionalTransformerKva} kVA</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Statement 1 */}
          <div>
            <div className="text-[11px] font-bold text-blue-900 mb-1.5 flex items-center justify-between">
              <span>STATEMENT 1: T-1 ZONE AT 0 YEAR (PRESENT)</span>
              <span className="text-[10px] text-blue-600 font-mono">Trunk & Upstream Poles</span>
            </div>
            {renderStatementCard(t1Year0, 'blue')}
          </div>

          {/* Statement 2 */}
          <div>
            <div className="text-[11px] font-bold text-blue-900 mb-1.5 flex items-center justify-between">
              <span>STATEMENT 2: T-1 ZONE AFTER 5 YEARS (+{dossier.growthRatePercent}%/YR)</span>
              <span className="text-[10px] text-blue-600 font-mono">5-Year Growth Compounded</span>
            </div>
            {renderStatementCard(t1Year5, 'blue')}
          </div>

          {/* Statement 3 */}
          <div>
            <div className="text-[11px] font-bold text-purple-900 mb-1.5 flex items-center justify-between">
              <span>STATEMENT 3: T-2 ZONE AT 0 YEAR (COMMISSIONING)</span>
              <span className="text-[10px] text-purple-600 font-mono">Bifurcated Downstream Branch</span>
            </div>
            {renderStatementCard(t2Year0, 'purple')}
          </div>

          {/* Statement 4 */}
          <div>
            <div className="text-[11px] font-bold text-purple-900 mb-1.5 flex items-center justify-between">
              <span>STATEMENT 4: T-2 ZONE AFTER 5 YEARS (+{dossier.growthRatePercent}%/YR)</span>
              <span className="text-[10px] text-purple-600 font-mono">5-Year Growth Compounded</span>
            </div>
            {renderStatementCard(t2Year5, 'purple')}
          </div>
        </div>
      </div>

      {/* ========================================================
          COMPREHENSIVE 4-STATEMENT MASTER MATRIX (TABLE)
         ======================================================== */}
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs print:rounded-none">
        <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="font-bold uppercase tracking-wider">
              Comprehensive 4-Statement Comparative Matrix Table
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-300">
            WAPDA ELR Standard Evaluation Format
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-2.5 font-sans">Parameter / Metric</th>
                <th className="p-2.5 text-right bg-blue-50/70 text-blue-950">T-1 @ 0 Yr</th>
                <th className="p-2.5 text-right bg-blue-100/70 text-blue-950">T-1 @ 5 Yrs</th>
                <th className="p-2.5 text-right bg-purple-50/70 text-purple-950">T-2 @ 0 Yr</th>
                <th className="p-2.5 text-right bg-purple-100/70 text-purple-950">T-2 @ 5 Yrs</th>
                <th className="p-2.5 text-right bg-emerald-50/80 text-emerald-950 font-bold">Total @ 0 Yr</th>
                <th className="p-2.5 text-right bg-emerald-100/80 text-emerald-950 font-bold">Total @ 5 Yrs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2.5 font-sans font-semibold text-slate-800">Transformer Rating (kVA)</td>
                <td className="p-2.5 text-right font-bold text-blue-800">{t1Year0.capacityKva} kVA</td>
                <td className="p-2.5 text-right font-bold text-blue-800">{t1Year5.capacityKva} kVA</td>
                <td className="p-2.5 text-right font-bold text-purple-800">{t2Year0.capacityKva} kVA</td>
                <td className="p-2.5 text-right font-bold text-purple-800">{t2Year5.capacityKva} kVA</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{combinedYear0.totalCapacityKva} kVA</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{combinedYear5.totalCapacityKva} kVA</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-sans font-semibold text-slate-800">Peak Demand (kVA)</td>
                <td className="p-2.5 text-right text-blue-900">{t1Year0.demandKva}</td>
                <td className="p-2.5 text-right text-blue-900">{t1Year5.demandKva}</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year0.demandKva}</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year5.demandKva}</td>
                <td className="p-2.5 text-right font-bold">{combinedYear0.totalDemandKva}</td>
                <td className="p-2.5 text-right font-bold">{combinedYear5.totalDemandKva}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-semibold text-slate-800">Source Current (Amperes)</td>
                <td className="p-2.5 text-right text-blue-900">{t1Year0.currentAmps} A</td>
                <td className="p-2.5 text-right text-blue-900">{t1Year5.currentAmps} A</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year0.currentAmps} A</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year5.currentAmps} A</td>
                <td className="p-2.5 text-right font-bold">{(t1Year0.currentAmps + t2Year0.currentAmps).toFixed(1)} A</td>
                <td className="p-2.5 text-right font-bold">{(t1Year5.currentAmps + t2Year5.currentAmps).toFixed(1)} A</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-sans font-semibold text-slate-800">Transformer Loading %</td>
                <td className={`p-2.5 text-right font-bold ${t1Year0.isOverloaded ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {t1Year0.transformerLoadingPercent}%
                </td>
                <td className={`p-2.5 text-right font-bold ${t1Year5.isOverloaded ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {t1Year5.transformerLoadingPercent}%
                </td>
                <td className={`p-2.5 text-right font-bold ${t2Year0.isOverloaded ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {t2Year0.transformerLoadingPercent}%
                </td>
                <td className={`p-2.5 text-right font-bold ${t2Year5.isOverloaded ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {t2Year5.transformerLoadingPercent}%
                </td>
                <td className="p-2.5 text-right font-bold">
                  {Math.round((combinedYear0.totalDemandKva / combinedYear0.totalCapacityKva) * 100)}%
                </td>
                <td className="p-2.5 text-right font-bold">
                  {Math.round((combinedYear5.totalDemandKva / combinedYear5.totalCapacityKva) * 100)}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-semibold text-slate-800">Worst Voltage Drop %</td>
                <td className="p-2.5 text-right text-slate-900">-{t1Year0.worstVoltageDropPercent}%</td>
                <td className="p-2.5 text-right text-slate-900">-{t1Year5.worstVoltageDropPercent}%</td>
                <td className="p-2.5 text-right text-slate-900">-{t2Year0.worstVoltageDropPercent}%</td>
                <td className="p-2.5 text-right text-slate-900">-{t2Year5.worstVoltageDropPercent}%</td>
                <td className="p-2.5 text-right font-bold">-{combinedYear0.worstVoltageDropPercent}%</td>
                <td className="p-2.5 text-right font-bold">-{combinedYear5.worstVoltageDropPercent}%</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-sans font-semibold text-slate-800">End Receiving Voltage (V)</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{t1Year0.worstVoltageVolts} V</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{t1Year5.worstVoltageVolts} V</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{t2Year0.worstVoltageVolts} V</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{t2Year5.worstVoltageVolts} V</td>
                <td className="p-2.5 text-right font-bold text-emerald-800">{combinedYear0.worstVoltageVolts} V</td>
                <td className="p-2.5 text-right font-bold text-emerald-800">{combinedYear5.worstVoltageVolts} V</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-semibold text-slate-800">Line Loss (kW)</td>
                <td className="p-2.5 text-right font-bold text-amber-700">{t1Year0.lineLossKw}</td>
                <td className="p-2.5 text-right font-bold text-amber-700">{t1Year5.lineLossKw}</td>
                <td className="p-2.5 text-right font-bold text-amber-700">{t2Year0.lineLossKw}</td>
                <td className="p-2.5 text-right font-bold text-amber-700">{t2Year5.lineLossKw}</td>
                <td className="p-2.5 text-right font-bold text-amber-800">{combinedYear0.totalLineLossKw}</td>
                <td className="p-2.5 text-right font-bold text-amber-800">{combinedYear5.totalLineLossKw}</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-sans font-semibold text-slate-800">Total Power Loss (kW)</td>
                <td className="p-2.5 text-right text-slate-900">{t1Year0.totalPowerLossKw}</td>
                <td className="p-2.5 text-right text-slate-900">{t1Year5.totalPowerLossKw}</td>
                <td className="p-2.5 text-right text-slate-900">{t2Year0.totalPowerLossKw}</td>
                <td className="p-2.5 text-right text-slate-900">{t2Year5.totalPowerLossKw}</td>
                <td className="p-2.5 text-right font-bold">{combinedYear0.totalPowerLossKw}</td>
                <td className="p-2.5 text-right font-bold">{combinedYear5.totalPowerLossKw}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-semibold text-slate-800">Annual Energy Loss (kWh)</td>
                <td className="p-2.5 text-right text-slate-900">{t1Year0.annualEnergyLossKwh.toLocaleString()}</td>
                <td className="p-2.5 text-right text-slate-900">{t1Year5.annualEnergyLossKwh.toLocaleString()}</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year0.annualEnergyLossKwh.toLocaleString()}</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year5.annualEnergyLossKwh.toLocaleString()}</td>
                <td className="p-2.5 text-right font-bold text-slate-950">{combinedYear0.annualEnergyLossKwh.toLocaleString()}</td>
                <td className="p-2.5 text-right font-bold text-slate-950">{combinedYear5.annualEnergyLossKwh.toLocaleString()}</td>
              </tr>
              <tr className="bg-slate-100 font-bold">
                <td className="p-2.5 font-sans text-slate-900">Annual Loss Cost ({currencySymbol})</td>
                <td className="p-2.5 text-right text-blue-950">{t1Year0.annualLossCostPkr.toLocaleString()}</td>
                <td className="p-2.5 text-right text-blue-950">{t1Year5.annualLossCostPkr.toLocaleString()}</td>
                <td className="p-2.5 text-right text-purple-950">{t2Year0.annualLossCostPkr.toLocaleString()}</td>
                <td className="p-2.5 text-right text-purple-950">{t2Year5.annualLossCostPkr.toLocaleString()}</td>
                <td className="p-2.5 text-right text-emerald-950 font-extrabold">{combinedYear0.annualLossCostPkr.toLocaleString()}</td>
                <td className="p-2.5 text-right text-emerald-950 font-extrabold">{combinedYear5.annualLossCostPkr.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
