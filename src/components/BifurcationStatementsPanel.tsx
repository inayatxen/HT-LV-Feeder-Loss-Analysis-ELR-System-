/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BifurcationFourStatementDossier, 
  BifurcationZoneAnalysisStatement,
  SegmentAnalysisResult 
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
  Gauge,
  Table,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle
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
  const { existYear0, existYear5, t1Year0, t1Year5, t2Year0, t2Year5, combinedYear0, combinedYear5, reliefBenefits } = dossier;

  // Active view in interactive mode
  const [activeNodeTab, setActiveNodeTab] = useState<
    'all' | 'exist_yr0' | 'exist_yr5' | 't1_yr0' | 't1_yr5' | 't2_yr0' | 't2_yr5' | 'compare_0yr' | 'compare_5yr'
  >('all');
  const [expandedSection, setExpandedSection] = useState<{
    overview: boolean;
    nodeStatements: boolean;
    matrixTable: boolean;
  }>({
    overview: true,
    nodeStatements: true,
    matrixTable: true
  });

  const renderStatementCard = (stmt: BifurcationZoneAnalysisStatement, bgTheme: 'amber' | 'blue' | 'purple') => {
    if (!stmt) return null;
    const isExist = stmt.transformerId === 'EXIST';
    const isT1 = stmt.transformerId === 'T1';
    const isYr0 = stmt.year === 0;

    const headerGradient = isExist
      ? (isYr0 ? 'bg-amber-900 text-white' : 'bg-slate-900 text-amber-300')
      : isT1
        ? (isYr0 ? 'bg-blue-900 text-white' : 'bg-slate-900 text-blue-300')
        : (isYr0 ? 'bg-purple-900 text-white' : 'bg-slate-900 text-purple-300');

    const badgeClass = isExist
      ? (isYr0 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-amber-950 text-amber-200 border-amber-700')
      : isT1
        ? (isYr0 ? 'bg-blue-800 text-blue-100 border-blue-700' : 'bg-blue-950 text-blue-300 border-blue-800')
        : (isYr0 ? 'bg-purple-800 text-purple-100 border-purple-700' : 'bg-purple-950 text-purple-300 border-purple-800');

    return (
      <div className={`rounded-xl border ${
        isExist ? 'border-amber-300' : isT1 ? 'border-blue-200' : 'border-purple-200'
      } bg-white overflow-hidden shadow-xs flex flex-col justify-between print:border-slate-400 print:shadow-none`}>
        {/* Statement Header */}
        <div className={`p-3.5 ${headerGradient} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-bold font-mono text-xs">
              {isExist ? 'EX' : stmt.transformerId}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs">
                  {isExist 
                    ? 'Exist Line (Baseline Feeder)' 
                    : isT1 
                      ? 'Proposed-1 Line (Main T-1)' 
                      : 'Proposed-2 Line (New T-2)'}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${badgeClass}`}>
                  {stmt.year === 0 ? '0 Yr (Present)' : '5 Yrs (Compounded)'}
                </span>
              </div>
              <span className="text-[10px] opacity-80 block">
                {stmt.capacityKva} kVA @ {isExist || isT1 ? 'Substation Node 0.0' : `Node ${dossier.transformerNodeId || dossier.bifurcationNodeId}`}
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
              <span className="text-[10px] text-slate-500 block">({stmt.worstVoltageVolts} V @ Node {stmt.worstVoltageDropNodeId.replace('.0', '')})</span>
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

  // Node Analysis Schedule Table Generator for a Single Statement
  const renderNodeAnalysisTable = (
    stmt: BifurcationZoneAnalysisStatement,
    titleLabel: string,
    themeColor: 'amber' | 'blue' | 'purple'
  ) => {
    if (!stmt) return null;
    const isYr0 = stmt.year === 0;
    const isAmber = themeColor === 'amber';
    const isBlue = themeColor === 'blue';
    const segments = stmt.segmentResults || [];

    const totalCust1Ph = segments.reduce((sum, s) => sum + s.singlePhaseCustomers, 0);
    const totalCust3Ph = segments.reduce((sum, s) => sum + s.threePhaseCustomers, 0);
    const totalLengthM = segments.reduce((sum, s) => sum + s.lengthMeters, 0);
    const totalLossKw = segments.reduce((sum, s) => sum + s.lineLossKw, 0);
    const totalEnergyKwh = stmt.annualEnergyLossKwh;

    const bannerBg = isAmber
      ? (isYr0 ? 'bg-amber-900' : 'bg-slate-900')
      : isBlue
        ? (isYr0 ? 'bg-blue-900' : 'bg-slate-900')
        : (isYr0 ? 'bg-purple-900' : 'bg-slate-900');

    return (
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs print:rounded-none print:border-slate-800 print-avoid-break mb-6">
        {/* Table Title Banner */}
        <div className={`px-4 py-3 ${bannerBg} text-white flex flex-wrap items-center justify-between gap-2`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-6 h-6 rounded-md bg-white/10 flex items-center justify-center font-mono font-bold text-xs ${
              isAmber ? 'text-amber-300' : isBlue ? 'text-blue-300' : 'text-purple-300'
            }`}>
              {isAmber ? 'EX' : stmt.transformerId}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm tracking-wide uppercase">
                  NODE ANALYSIS: {titleLabel}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${isYr0 ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950'}`}>
                  {isYr0 ? '0 Year (Current Peak)' : 'After 5 Years (+5% Compounded)'}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 font-sans block mt-0.5">
                {stmt.transformerName} · Total Spans: <strong>{stmt.spansCount}</strong> · Total Demand: <strong>{stmt.demandKva} kVA ({stmt.currentAmps} A)</strong>
              </span>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <div className={`font-bold ${stmt.isOverloaded ? 'text-rose-300' : 'text-emerald-300'}`}>
              {stmt.transformerLoadingPercent > 0 ? `Loading: ${stmt.transformerLoadingPercent}%` : `Current: ${stmt.currentAmps} A`}
            </div>
            <span className="text-[10px] text-slate-300">
              Worst Drop: -{stmt.worstVoltageDropPercent}% ({stmt.worstVoltageVolts}V @ {stmt.worstVoltageDropNodeId.replace('.0', '')})
            </span>
          </div>
        </div>

        {/* Node-by-Node Load Flow Schedule */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-xs border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                <th className="py-2.5 px-2 text-center w-8">#</th>
                <th className="py-2.5 px-2 text-center">Span (From → To)</th>
                <th className="py-2.5 px-2 text-right">Length (m)</th>
                <th className="py-2.5 px-2 text-right">1-Ph Cust</th>
                <th className="py-2.5 px-2 text-right">3-Ph Cust</th>
                <th className="py-2.5 px-2.5 text-left font-sans">Conductor</th>
                <th className="py-2.5 px-2.5 text-right">Downstream Load</th>
                <th className="py-2.5 px-2 text-right">Current (A)</th>
                <th className="py-2.5 px-2 text-right">Span Drop (V)</th>
                <th className="py-2.5 px-2 text-right">Cum. Drop %</th>
                <th className="py-2.5 px-2 text-right">End Voltage (V)</th>
                <th className="py-2.5 px-2 text-right bg-amber-50/70 text-amber-950">Loss (kW)</th>
                <th className="py-2.5 px-2 text-center font-sans">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {segments.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-4 text-center text-slate-500 font-sans">
                    No segments assigned to this transformer zone.
                  </td>
                </tr>
              ) : (
                segments.map((seg, idx) => {
                  const isCriticalDrop = seg.percentVoltDrop > 9.0;
                  const isHighLoss = seg.lineLossKw > 0.8;
                  const spanFrom = seg.fromNodeId.replace('.0', '');
                  const spanTo = seg.toNodeId.replace('.0', '');

                  return (
                    <tr 
                      key={seg.segment.id || `${seg.fromNodeId}-${seg.toNodeId}-${idx}`} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-2 px-2 text-center text-slate-400 font-sans text-[10px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {spanFrom} → {spanTo}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {seg.lengthMeters} m
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-slate-700">
                        {seg.singlePhaseCustomers}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-purple-700">
                        {seg.threePhaseCustomers}
                      </td>
                      <td className="py-2 px-2.5 text-left font-sans text-[11px]">
                        <span className="font-semibold text-slate-900">
                          {seg.conductor.name}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-right font-semibold text-slate-900">
                        {seg.downstreamKva.toFixed(1)} kVA
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-blue-900">
                        {seg.currentAmps.toFixed(1)} A
                      </td>
                      <td className="py-2 px-2 text-right text-slate-700">
                        {seg.voltDropVolts.toFixed(1)} V
                      </td>
                      <td className={`py-2 px-2 text-right font-bold ${
                        isCriticalDrop ? 'text-rose-600 bg-rose-50/60' : 'text-slate-900'
                      }`}>
                        -{seg.percentVoltDrop.toFixed(1)}%
                      </td>
                      <td className={`py-2 px-2 text-right font-bold ${
                        seg.receivingVoltage < 210 ? 'text-rose-600 bg-rose-50/60' : 'text-slate-900'
                      }`}>
                        {seg.receivingVoltage.toFixed(1)} V
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-amber-700 bg-amber-50/50">
                        {seg.lineLossKw.toFixed(3)}
                      </td>
                      <td className="py-2 px-2 text-center font-sans text-[10px]">
                        {isCriticalDrop ? (
                          <span className="px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Low Volt
                          </span>
                        ) : isHighLoss ? (
                          <span className="px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            High Loss
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold">
                <td colSpan={2} className="py-2.5 px-3 text-center text-amber-400 font-sans uppercase tracking-wider text-xs">
                  {titleLabel} TOTALS
                </td>
                <td className="py-2.5 px-2 text-right text-amber-300">
                  {totalLengthM} m ({stmt.zoneLengthKm} km)
                </td>
                <td className="py-2.5 px-2 text-right">
                  {totalCust1Ph}
                </td>
                <td className="py-2.5 px-2 text-right text-purple-300">
                  {totalCust3Ph}
                </td>
                <td className="py-2.5 px-2.5 text-left font-sans text-[11px]">
                  {stmt.spansCount} Spans
                </td>
                <td className="py-2.5 px-2.5 text-right text-amber-300">
                  {stmt.demandKva} kVA ({stmt.demandKw} kW)
                </td>
                <td className="py-2.5 px-2 text-right text-blue-300">
                  {stmt.currentAmps} A
                </td>
                <td className="py-2.5 px-2 text-right">
                  -
                </td>
                <td className="py-2.5 px-2 text-right text-rose-300">
                  Max: -{stmt.worstVoltageDropPercent}%
                </td>
                <td className="py-2.5 px-2 text-right text-emerald-300">
                  Min: {stmt.worstVoltageVolts} V
                </td>
                <td className="py-2.5 px-2 text-right text-amber-300 bg-slate-950">
                  {stmt.lineLossKw} kW
                </td>
                <td className="py-2.5 px-2 text-center text-emerald-400 font-sans text-[10px]">
                  {stmt.annualEnergyLossKwh.toLocaleString()} kWh/yr
                </td>
              </tr>
            </tfoot>
          </table>
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
                Dual-Zone Node Analysis: Exist, Proposed-1 & Proposed-2 Lines
              </h2>
              <span className="bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase print:text-slate-900 print:border-slate-700">
                0 Years & 5 Years Compounded
              </span>
            </div>
            <p className="text-xs text-slate-300 print:text-slate-600 mt-0.5">
              Node-by-node electrical load flow and technical performance of Exist, Proposed-1 (T-1), and Proposed-2 (T-2) lines at Year 0 vs after 5 Years ({dossier.growthRatePercent}% annual growth).
            </p>
          </div>
        </div>

        {onOpenPrintReport && (
          <button
            onClick={onOpenPrintReport}
            className="no-print flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print All Node Analyses</span>
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
          THE SIX ANALYSIS STATEMENTS (OVERVIEW CARDS)
         ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>6 Engineering Analysis Statements (Exist, Proposed-1, Proposed-2)</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Cut-Off: <strong>Node {dossier.bifurcationNodeId}</strong> · T-2 Substation: <strong>{dossier.additionalTransformerKva} kVA @ Node {dossier.transformerNodeId || dossier.bifurcationNodeId}</strong>
          </span>
        </div>

        <div className="space-y-4">
          {/* Section A: Exist Line (Baseline) */}
          <div>
            <div className="text-[11px] font-bold text-amber-950 mb-1.5 flex items-center justify-between bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                EXIST LINE (BASELINE RADIAL FEEDER - PRE-BIFURCATION)
              </span>
              <span className="text-[10px] text-amber-800 font-mono">Un-bifurcated System</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold text-slate-600 mb-1">EXIST LINE @ 0 YEAR (CURRENT PEAK)</div>
                {renderStatementCard(existYear0, 'amber')}
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-600 mb-1">EXIST LINE AFTER 5 YEARS (+{dossier.growthRatePercent}%/YR COMPOUNDED)</div>
                {renderStatementCard(existYear5, 'amber')}
              </div>
            </div>
          </div>

          {/* Section B: Proposed-1 Line (Main T-1 Zone) */}
          <div>
            <div className="text-[11px] font-bold text-blue-950 mb-1.5 flex items-center justify-between bg-blue-50/80 px-2.5 py-1 rounded border border-blue-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                PROPOSED-1 LINE (MAIN TRANSFORMER T-1 ZONE UP TO CUT-OFF)
              </span>
              <span className="text-[10px] text-blue-800 font-mono">Trunk Section ({t1Year0.spansCount} Spans)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold text-slate-600 mb-1">PROPOSED-1 @ 0 YEAR (CURRENT PEAK)</div>
                {renderStatementCard(t1Year0, 'blue')}
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-600 mb-1">PROPOSED-1 AFTER 5 YEARS (+{dossier.growthRatePercent}%/YR COMPOUNDED)</div>
                {renderStatementCard(t1Year5, 'blue')}
              </div>
            </div>
          </div>

          {/* Section C: Proposed-2 Line (Additional T-2 Zone) */}
          <div>
            <div className="text-[11px] font-bold text-purple-950 mb-1.5 flex items-center justify-between bg-purple-50/80 px-2.5 py-1 rounded border border-purple-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                PROPOSED-2 LINE (NEW ADDITIONAL TRANSFORMER T-2 BIFURCATED ZONE)
              </span>
              <span className="text-[10px] text-purple-800 font-mono">Bifurcated Branch ({t2Year0.spansCount} Spans)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold text-slate-600 mb-1">PROPOSED-2 @ 0 YEAR (COMMISSIONING)</div>
                {renderStatementCard(t2Year0, 'purple')}
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-600 mb-1">PROPOSED-2 AFTER 5 YEARS (+{dossier.growthRatePercent}%/YR COMPOUNDED)</div>
                {renderStatementCard(t2Year5, 'purple')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          NODE-BY-NODE ANALYSIS STATEMENTS (NODE TABLES)
         ======================================================== */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-purple-700" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Node Analysis Schedules: Exist, Proposed-1 & Proposed-2 Lines
            </h3>
          </div>

          {/* Statement Tab Switcher in Interactive Mode */}
          <div className="no-print flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveNodeTab('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeNodeTab === 'all'
                  ? 'bg-purple-700 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All 6 Schedules
            </button>
            <button
              type="button"
              onClick={() => setActiveNodeTab('exist_yr0')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeNodeTab === 'exist_yr0'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-amber-950 hover:bg-amber-50'
              }`}
            >
              Exist (0 Yr)
            </button>
            <button
              type="button"
              onClick={() => setActiveNodeTab('exist_yr5')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeNodeTab === 'exist_yr5'
                  ? 'bg-amber-800 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-amber-950 hover:bg-amber-50'
              }`}
            >
              Exist (5 Yrs)
            </button>
            <button
              type="button"
              onClick={() => setActiveNodeTab('t1_yr0')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeNodeTab === 't1_yr0'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-blue-900 hover:bg-blue-50'
              }`}
            >
              Proposed-1 (0 Yr)
            </button>
            <button
              type="button"
              onClick={() => setActiveNodeTab('t1_yr5')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeNodeTab === 't1_yr5'
                  ? 'bg-blue-800 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-blue-900 hover:bg-blue-50'
              }`}
            >
              Proposed-1 (5 Yrs)
            </button>
            <button
              type="button"
              onClick={() => setActiveNodeTab('t2_yr0')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeNodeTab === 't2_yr0'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-purple-900 hover:bg-purple-50'
              }`}
            >
              Proposed-2 (0 Yr)
            </button>
            <button
              type="button"
              onClick={() => setActiveNodeTab('t2_yr5')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeNodeTab === 't2_yr5'
                  ? 'bg-purple-800 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-purple-900 hover:bg-purple-50'
              }`}
            >
              Proposed-2 (5 Yrs)
            </button>
          </div>
        </div>

        {/* 1. Exist Line 0 Year */}
        {(activeNodeTab === 'all' || activeNodeTab === 'exist_yr0' || isPrintView) && existYear0 && (
          <div>
            {renderNodeAnalysisTable(existYear0, 'EXIST LINE (0 YEAR / CURRENT PEAK)', 'amber')}
          </div>
        )}

        {/* 2. Exist Line 5 Years */}
        {(activeNodeTab === 'all' || activeNodeTab === 'exist_yr5' || isPrintView) && existYear5 && (
          <div>
            {renderNodeAnalysisTable(existYear5, 'EXIST LINE (AFTER 5 YEARS / +5% COMPOUNDED)', 'amber')}
          </div>
        )}

        {/* 3. Proposed-1 Line 0 Year */}
        {(activeNodeTab === 'all' || activeNodeTab === 't1_yr0' || isPrintView) && (
          <div>
            {renderNodeAnalysisTable(t1Year0, 'PROPOSED-1 LINE: T-1 MAIN ZONE (0 YEAR)', 'blue')}
          </div>
        )}

        {/* 4. Proposed-1 Line 5 Years */}
        {(activeNodeTab === 'all' || activeNodeTab === 't1_yr5' || isPrintView) && (
          <div>
            {renderNodeAnalysisTable(t1Year5, 'PROPOSED-1 LINE: T-1 MAIN ZONE (AFTER 5 YEARS)', 'blue')}
          </div>
        )}

        {/* 5. Proposed-2 Line 0 Year */}
        {(activeNodeTab === 'all' || activeNodeTab === 't2_yr0' || isPrintView) && (
          <div>
            {renderNodeAnalysisTable(t2Year0, 'PROPOSED-2 LINE: T-2 BIFURCATED ZONE (0 YEAR)', 'purple')}
          </div>
        )}

        {/* 6. Proposed-2 Line 5 Years */}
        {(activeNodeTab === 'all' || activeNodeTab === 't2_yr5' || isPrintView) && (
          <div>
            {renderNodeAnalysisTable(t2Year5, 'PROPOSED-2 LINE: T-2 BIFURCATED ZONE (AFTER 5 YEARS)', 'purple')}
          </div>
        )}
      </div>

      {/* ========================================================
          COMPREHENSIVE 6-STATEMENT MASTER COMPARATIVE MATRIX (TABLE)
         ======================================================== */}
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs print:rounded-none">
        <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="font-bold uppercase tracking-wider">
              Comparative Analysis Matrix: Exist vs Proposed-1 vs Proposed-2 Line
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-300">
            0 Years vs After 5 Years Compounded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-2.5 font-sans">Parameter / Metric</th>
                <th className="p-2.5 text-right bg-amber-50 text-amber-950">Exist (0 Yr)</th>
                <th className="p-2.5 text-right bg-amber-100 text-amber-950">Exist (5 Yrs)</th>
                <th className="p-2.5 text-right bg-blue-50 text-blue-950">P-1 (0 Yr)</th>
                <th className="p-2.5 text-right bg-blue-100 text-blue-950">P-1 (5 Yrs)</th>
                <th className="p-2.5 text-right bg-purple-50 text-purple-950">P-2 (0 Yr)</th>
                <th className="p-2.5 text-right bg-purple-100 text-purple-950">P-2 (5 Yrs)</th>
                <th className="p-2.5 text-right bg-emerald-50 text-emerald-950 font-bold">Total P-1+P-2 (0 Yr)</th>
                <th className="p-2.5 text-right bg-emerald-100 text-emerald-950 font-bold">Total P-1+P-2 (5 Yrs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2.5 font-sans font-semibold text-slate-800">Transformer Rating (kVA)</td>
                <td className="p-2.5 text-right font-bold text-amber-900">{existYear0 ? existYear0.capacityKva : '-'} kVA</td>
                <td className="p-2.5 text-right font-bold text-amber-900">{existYear5 ? existYear5.capacityKva : '-'} kVA</td>
                <td className="p-2.5 text-right font-bold text-blue-800">{t1Year0.capacityKva} kVA</td>
                <td className="p-2.5 text-right font-bold text-blue-800">{t1Year5.capacityKva} kVA</td>
                <td className="p-2.5 text-right font-bold text-purple-800">{t2Year0.capacityKva} kVA</td>
                <td className="p-2.5 text-right font-bold text-purple-800">{t2Year5.capacityKva} kVA</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{combinedYear0.totalCapacityKva} kVA</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{combinedYear5.totalCapacityKva} kVA</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-sans font-semibold text-slate-800">Peak Demand (kVA)</td>
                <td className="p-2.5 text-right text-amber-900 font-bold">{existYear0 ? existYear0.demandKva : '-'}</td>
                <td className="p-2.5 text-right text-amber-900 font-bold">{existYear5 ? existYear5.demandKva : '-'}</td>
                <td className="p-2.5 text-right text-blue-900">{t1Year0.demandKva}</td>
                <td className="p-2.5 text-right text-blue-900">{t1Year5.demandKva}</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year0.demandKva}</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year5.demandKva}</td>
                <td className="p-2.5 text-right font-bold">{combinedYear0.totalDemandKva}</td>
                <td className="p-2.5 text-right font-bold">{combinedYear5.totalDemandKva}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-semibold text-slate-800">Source Current (Amperes)</td>
                <td className="p-2.5 text-right text-amber-900 font-bold">{existYear0 ? `${existYear0.currentAmps} A` : '-'}</td>
                <td className="p-2.5 text-right text-amber-900 font-bold">{existYear5 ? `${existYear5.currentAmps} A` : '-'}</td>
                <td className="p-2.5 text-right text-blue-900">{t1Year0.currentAmps} A</td>
                <td className="p-2.5 text-right text-blue-900">{t1Year5.currentAmps} A</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year0.currentAmps} A</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year5.currentAmps} A</td>
                <td className="p-2.5 text-right font-bold">{(t1Year0.currentAmps + t2Year0.currentAmps).toFixed(1)} A</td>
                <td className="p-2.5 text-right font-bold">{(t1Year5.currentAmps + t2Year5.currentAmps).toFixed(1)} A</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-sans font-semibold text-slate-800">Transformer Loading %</td>
                <td className={`p-2.5 text-right font-bold ${existYear0 && existYear0.isOverloaded ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {existYear0 ? `${existYear0.transformerLoadingPercent}%` : '-'}
                </td>
                <td className={`p-2.5 text-right font-bold ${existYear5 && existYear5.isOverloaded ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {existYear5 ? `${existYear5.transformerLoadingPercent}%` : '-'}
                </td>
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
                <td className="p-2.5 text-right font-bold text-slate-900">
                  {Math.round((combinedYear0.totalDemandKva / combinedYear0.totalCapacityKva) * 100)}%
                </td>
                <td className="p-2.5 text-right font-bold text-slate-900">
                  {Math.round((combinedYear5.totalDemandKva / combinedYear5.totalCapacityKva) * 100)}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-semibold text-slate-800">Worst Voltage Drop %</td>
                <td className="p-2.5 text-right font-bold text-amber-950">
                  {existYear0 ? `-${existYear0.worstVoltageDropPercent}%` : '-'}
                </td>
                <td className="p-2.5 text-right font-bold text-amber-950">
                  {existYear5 ? `-${existYear5.worstVoltageDropPercent}%` : '-'}
                </td>
                <td className="p-2.5 text-right text-slate-900">-{t1Year0.worstVoltageDropPercent}%</td>
                <td className="p-2.5 text-right text-slate-900">-{t1Year5.worstVoltageDropPercent}%</td>
                <td className="p-2.5 text-right text-slate-900">-{t2Year0.worstVoltageDropPercent}%</td>
                <td className="p-2.5 text-right text-slate-900">-{t2Year5.worstVoltageDropPercent}%</td>
                <td className="p-2.5 text-right font-bold">-{combinedYear0.worstVoltageDropPercent}%</td>
                <td className="p-2.5 text-right font-bold">-{combinedYear5.worstVoltageDropPercent}%</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-sans font-semibold text-slate-800">End Receiving Voltage (V)</td>
                <td className="p-2.5 text-right font-bold text-amber-950">{existYear0 ? `${existYear0.worstVoltageVolts} V` : '-'}</td>
                <td className="p-2.5 text-right font-bold text-amber-950">{existYear5 ? `${existYear5.worstVoltageVolts} V` : '-'}</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{t1Year0.worstVoltageVolts} V</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{t1Year5.worstVoltageVolts} V</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{t2Year0.worstVoltageVolts} V</td>
                <td className="p-2.5 text-right font-bold text-slate-900">{t2Year5.worstVoltageVolts} V</td>
                <td className="p-2.5 text-right font-bold text-emerald-800">{combinedYear0.worstVoltageVolts} V</td>
                <td className="p-2.5 text-right font-bold text-emerald-800">{combinedYear5.worstVoltageVolts} V</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-semibold text-slate-800">Line Loss (kW)</td>
                <td className="p-2.5 text-right font-bold text-rose-700">{existYear0 ? existYear0.lineLossKw : '-'}</td>
                <td className="p-2.5 text-right font-bold text-rose-700">{existYear5 ? existYear5.lineLossKw : '-'}</td>
                <td className="p-2.5 text-right font-bold text-amber-700">{t1Year0.lineLossKw}</td>
                <td className="p-2.5 text-right font-bold text-amber-700">{t1Year5.lineLossKw}</td>
                <td className="p-2.5 text-right font-bold text-amber-700">{t2Year0.lineLossKw}</td>
                <td className="p-2.5 text-right font-bold text-amber-700">{t2Year5.lineLossKw}</td>
                <td className="p-2.5 text-right font-bold text-amber-800">{combinedYear0.totalLineLossKw}</td>
                <td className="p-2.5 text-right font-bold text-amber-800">{combinedYear5.totalLineLossKw}</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-sans font-semibold text-slate-800">Total Power Loss (kW)</td>
                <td className="p-2.5 text-right font-bold text-rose-800">{existYear0 ? existYear0.totalPowerLossKw : '-'}</td>
                <td className="p-2.5 text-right font-bold text-rose-800">{existYear5 ? existYear5.totalPowerLossKw : '-'}</td>
                <td className="p-2.5 text-right text-slate-900">{t1Year0.totalPowerLossKw}</td>
                <td className="p-2.5 text-right text-slate-900">{t1Year5.totalPowerLossKw}</td>
                <td className="p-2.5 text-right text-slate-900">{t2Year0.totalPowerLossKw}</td>
                <td className="p-2.5 text-right text-slate-900">{t2Year5.totalPowerLossKw}</td>
                <td className="p-2.5 text-right font-bold">{combinedYear0.totalPowerLossKw}</td>
                <td className="p-2.5 text-right font-bold">{combinedYear5.totalPowerLossKw}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-semibold text-slate-800">Annual Energy Loss (kWh)</td>
                <td className="p-2.5 text-right font-bold text-rose-900">{existYear0 ? existYear0.annualEnergyLossKwh.toLocaleString() : '-'}</td>
                <td className="p-2.5 text-right font-bold text-rose-900">{existYear5 ? existYear5.annualEnergyLossKwh.toLocaleString() : '-'}</td>
                <td className="p-2.5 text-right text-slate-900">{t1Year0.annualEnergyLossKwh.toLocaleString()}</td>
                <td className="p-2.5 text-right text-slate-900">{t1Year5.annualEnergyLossKwh.toLocaleString()}</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year0.annualEnergyLossKwh.toLocaleString()}</td>
                <td className="p-2.5 text-right text-purple-900">{t2Year5.annualEnergyLossKwh.toLocaleString()}</td>
                <td className="p-2.5 text-right font-bold text-slate-950">{combinedYear0.annualEnergyLossKwh.toLocaleString()}</td>
                <td className="p-2.5 text-right font-bold text-slate-950">{combinedYear5.annualEnergyLossKwh.toLocaleString()}</td>
              </tr>
              <tr className="bg-slate-100 font-bold">
                <td className="p-2.5 font-sans text-slate-900">Annual Loss Cost ({currencySymbol})</td>
                <td className="p-2.5 text-right text-rose-950 font-extrabold">{existYear0 ? existYear0.annualLossCostPkr.toLocaleString() : '-'}</td>
                <td className="p-2.5 text-right text-rose-950 font-extrabold">{existYear5 ? existYear5.annualLossCostPkr.toLocaleString() : '-'}</td>
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
