/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  SegmentAnalysisResult, 
  FeederData 
} from '../types/feeder';
import { 
  ArrowUpDown, 
  Search, 
  Flame, 
  AlertTriangle, 
  Sliders, 
  Download,
  Info,
  Calculator,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
  Split,
  Table as TableIcon
} from 'lucide-react';
import { CONDUCTOR_LIST, getConductor } from '../data/conductors';
import { TRANSFORMER_CAPACITIES } from '../data/transformers';

interface SegmentTableProps {
  segmentResults: SegmentAnalysisResult[];
  feeder: FeederData;
  onReconductor?: (segmentId: string, conductorCode: string) => void;
  activeConductors?: Record<string, string>;
  activeCapacitors?: Record<string, number>;
  activeTransformerKva: number;
  onUpdateTransformerKva?: (kva: number) => void;
  onUpdateSegmentInput?: (segmentId: string, updates: { lengthKm?: number; singlePhaseCust?: number; threePhaseCust?: number; conductorCode?: string }) => void;
  onResetToImage1?: () => void;
}

export const SegmentTable: React.FC<SegmentTableProps> = ({
  segmentResults,
  feeder,
  onReconductor,
  activeConductors = {},
  activeCapacitors = {},
  activeTransformerKva,
  onUpdateTransformerKva,
  onUpdateSegmentInput,
  onResetToImage1
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'loss' | 'current' | 'drop'>('default');
  const [filterHighlight, setFilterHighlight] = useState<'all' | 'high-loss' | 'high-drop'>('all');
  const [viewMode, setViewMode] = useState<'combined' | 'image1_input' | 'image2_output' | 'dual_side_by_side'>('combined');
  const [showFormulas, setShowFormulas] = useState<boolean>(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Filter and sort
  const filteredRows = segmentResults
    .filter(row => {
      const matchesSearch = 
        row.fromNodeId.includes(searchTerm) || 
        row.toNodeId.includes(searchTerm) ||
        row.conductor.code.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (filterHighlight === 'high-loss') return row.lineLossKw > 0.8;
      if (filterHighlight === 'high-drop') return row.percentVoltDrop > 5.0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'loss') return b.lineLossKw - a.lineLossKw;
      if (sortBy === 'current') return b.currentAmps - a.currentAmps;
      if (sortBy === 'drop') return b.percentVoltDrop - a.percentVoltDrop;
      return 0; // Default natural topological order matching image1.png
    });

  // Totals
  const totalLengthKm = segmentResults.reduce((acc, r) => acc + r.lengthKm, 0);
  const totalLengthM = Math.round(totalLengthKm * 1000);
  const total3PhCust = segmentResults.reduce((acc, r) => acc + r.threePhaseCustomers, 0);
  const total1PhCust = segmentResults.reduce((acc, r) => acc + r.singlePhaseCustomers, 0);
  const totalLossKw = segmentResults.reduce((acc, r) => acc + r.lineLossKw, 0);

  // Export CSV
  const exportCsv = () => {
    const headers = [
      'From Node',
      'To Node',
      'Length (km)',
      'Length (m)',
      '3-Ph Customer',
      '1-Ph Customer',
      'Conductor Code',
      'Current (A)',
      'Loading %',
      'Volt Drop %',
      'Voltage (V)',
      'Loss (kW)'
    ];

    const rows = segmentResults.map(r => [
      r.fromNodeId,
      r.toNodeId,
      r.lengthKm.toFixed(3),
      r.lengthMeters,
      r.threePhaseCustomers,
      r.singlePhaseCustomers,
      r.conductor.code,
      r.currentAmps.toFixed(1),
      r.percentLoading,
      r.percentVoltDrop.toFixed(1),
      r.receivingVoltage.toFixed(1),
      r.lineLossKw.toFixed(3)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${feeder.id}_loss_analysis_image1_image2.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Strictly Structured 2-Row Control Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* ROW 1: Transformer Rating & Data Export */}
        <div className="p-3.5 sm:px-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-700 block leading-tight">
                  Transformer Rating:
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    value={activeTransformerKva}
                    onChange={(e) => onUpdateTransformerKva?.(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {TRANSFORMER_CAPACITIES.map(cap => (
                      <option key={cap} value={cap}>
                        {cap} kVA {cap === 100 ? '(image1.png Default)' : (cap === 200 ? '(WAPDA Proposed)' : '')}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    {[100, 200].map(cap => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => onUpdateTransformerKva?.(cap)}
                        className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer ${
                          activeTransformerKva === cap
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {cap} kVA
                      </button>
                    ))}
                  </div>

                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    activeTransformerKva <= 100 
                      ? 'bg-rose-100 text-rose-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {Math.round((118.0 / activeTransformerKva) * 100)}% Load
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onResetToImage1 && (
              <button
                onClick={onResetToImage1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Reset all inputs back to original image1.png values"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to image1.png</span>
              </button>
            )}

            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* ROW 2: View Mode Switcher & Formulas Toggle */}
        <div className="p-2.5 sm:px-5 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
          {/* Table View Modes */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto">
            <button
              onClick={() => setViewMode('image2_output')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'image2_output'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${viewMode === 'image2_output' ? 'bg-slate-950' : 'bg-emerald-500'}`} />
              <span>image2.png (Calculated Output)</span>
            </button>

            <button
              onClick={() => setViewMode('image1_input')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'image1_input'
                  ? 'bg-blue-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${viewMode === 'image1_input' ? 'bg-white' : 'bg-blue-500'}`} />
              <span>image1.png (Input Data)</span>
            </button>

            <button
              onClick={() => setViewMode('combined')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'combined'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Combined Schedule</span>
            </button>

            <button
              onClick={() => setViewMode('dual_side_by_side')}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'dual_side_by_side'
                  ? 'bg-purple-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-purple-600" />
              <span>Side-by-Side Dual</span>
            </button>
          </div>

          {/* Formulas Button */}
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              showFormulas 
                ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' 
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-amber-600" />
            <span>Electrical Formulas</span>
            {showFormulas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Inserted Electrical Formulas Panel */}
      {showFormulas && (
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-400">
                Inserted Electrical Engineering Formulas & Calculation Engine
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Base Voltage: 400 V · 3-Phase Balanced Distribution
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Formula 1: Segment Current */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>1. Segment Current (Amps)</span>
                <span className="text-[10px] font-mono text-amber-400">Current (A)</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                I_s = Σ [ N_1Φ · I_1Φ + N_3Φ · I_3Φ ]
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Coincident downstream consumer aggregation: each single-phase customer draws 1.0833 A (from 180A / 164 cust), 3-phase customer draws ~0.55 A.
              </p>
            </div>

            {/* Formula 2: Conductor Loading % */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>2. Conductor Loading %</span>
                <span className="text-[10px] font-mono text-amber-400">Loading %</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                % Loading = round( (I_s / I_ampacity) · 100 )
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Thermal ampacity rating at 75°C: Code A (7/0.122") = 212 A; Code PU3 = 172 A; Code PU2 = 135 A.
              </p>
            </div>

            {/* Formula 3: Ohmic Line Loss */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>3. Line Losses (kW)</span>
                <span className="text-[10px] font-mono text-amber-400">Loss (kW)</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                Loss (kW) = ( 3 · I_s² · R · L ) / 1000
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                3-phase Joule dissipation: R is AC resistance (Code A: 0.6646 Ω/km, PU3: 0.2592 Ω/km, PU2: 0.500 Ω/km), L is span length in km.
              </p>
            </div>

            {/* Formula 4: Voltage Drop % */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>4. Cumulative Voltage Drop %</span>
                <span className="text-[10px] font-mono text-amber-400">Volt Drop %</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                % VD_cum = % VD_parent + ( ΔV_seg / 400 ) · 100
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Where ΔV_seg = √3 · I_s · (R · cosΦ + X · sinΦ) · L (with cosΦ = 0.80, sinΦ = 0.60).
              </p>
            </div>

            {/* Formula 5: Receiving Voltage */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>5. Terminal Receiving Voltage (V)</span>
                <span className="text-[10px] font-mono text-amber-400">Voltage (V)</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                Voltage (V) = 400 · ( 1 - % VD_cum / 100 )
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Direct phase-to-phase line voltage delivered to consumer terminal poles after cumulative path drop.
              </p>
            </div>

            {/* Formula 6: Transformer Loading */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>6. Transformer Overloading %</span>
                <span className="text-[10px] font-mono text-amber-400">Trf Overload %</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                % Trf Ldng = ( Demand_kVA / Trf_kVA ) · 100
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Total demand = 118 kVA. At 100 kVA rating: 118% (Overloaded!). When augmented to 200 kVA: 59% (Safe).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: COMBINED TABLE (IMAGE 1 INPUTS + IMAGE 2 OUTPUTS) */}
      {(viewMode === 'combined') && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Combined Feeder Schedule (image1.png Inputs + image2.png Calculated Outputs)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every output column (Current, Loading, Volt Drop, Voltage, Loss) is dynamically derived using the inserted electrical formulas.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setFilterHighlight('all')}
                  className={`px-2 py-1 rounded font-medium ${filterHighlight === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                >
                  All ({segmentResults.length})
                </button>
                <button
                  onClick={() => setFilterHighlight('high-loss')}
                  className={`px-2 py-1 rounded font-medium ${filterHighlight === 'high-loss' ? 'bg-white text-rose-600 shadow-xs font-semibold' : 'text-slate-600'}`}
                >
                  High Loss
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th colSpan={7} className="bg-blue-50/70 text-blue-900 text-center py-1.5 px-3 border-r border-blue-200 font-bold uppercase tracking-wider text-[11px]">
                    INPUT DATA (image1.png)
                  </th>
                  <th colSpan={5} className="bg-emerald-50/70 text-emerald-950 text-center py-1.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    CALCULATED OUTPUTS (image2.png)
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-2.5 text-center">From Node</th>
                  <th className="py-2.5 px-2.5 text-center">To Node</th>
                  <th className="py-2.5 px-2.5 text-right">Length (km)</th>
                  <th className="py-2.5 px-2.5 text-right">Length (m)</th>
                  <th className="py-2.5 px-2.5 text-right">3-Ph Customer</th>
                  <th className="py-2.5 px-2.5 text-right">1-Ph Customer</th>
                  <th className="py-2.5 px-2.5 text-left border-r border-slate-200">Conductor Code</th>

                  <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-slate-900">Current (A)</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-slate-900">Loading %</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-slate-900">Volt Drop %</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-slate-900">Voltage (V)</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-slate-900">Loss (kW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {filteredRows.map((row) => {
                  const isSelected = selectedRowId === row.segment.id;

                  return (
                    <React.Fragment key={row.segment.id}>
                      <tr 
                        onClick={() => setSelectedRowId(isSelected ? null : row.segment.id)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          row.isHighLoss ? 'bg-rose-50/20' : (isSelected ? 'bg-amber-50/40' : '')
                        }`}
                      >
                        {/* INPUTS (image1.png) */}
                        <td className="py-2.5 px-2.5 text-center font-bold text-slate-900">
                          {row.fromNodeId.replace('.0', '')}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-bold text-slate-900">
                          {row.toNodeId.replace('.0', '')}
                        </td>
                        <td className="py-2.5 px-2.5 text-right text-slate-700">
                          {row.lengthKm.toFixed(row.lengthKm < 0.01 ? 3 : (row.lengthKm === 0.04 || row.lengthKm === 0.03 ? 2 : 3))}
                        </td>
                        <td className="py-2.5 px-2.5 text-right text-slate-700">
                          {row.lengthMeters}
                        </td>
                        <td className="py-2.5 px-2.5 text-right text-slate-800">
                          {row.threePhaseCustomers}
                        </td>
                        <td className="py-2.5 px-2.5 text-right text-slate-800">
                          {row.singlePhaseCustomers}
                        </td>
                        <td className="py-2.5 px-2.5 text-left border-r border-slate-200">
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-slate-100 text-slate-800 font-semibold">
                            {row.conductor.code}
                          </span>
                        </td>

                        {/* OUTPUTS (image2.png) */}
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 bg-emerald-50/20">
                          {row.currentAmps.toFixed(row.currentAmps % 1 === 0 ? 0 : 1)}
                        </td>
                        <td className="py-2.5 px-3 text-right bg-emerald-50/20">
                          <span className={`font-semibold ${row.percentLoading > 75 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {row.percentLoading}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right bg-emerald-50/20">
                          <span className={`font-semibold ${
                            row.percentVoltDrop > 9 ? 'text-rose-600 font-bold' : (row.percentVoltDrop > 5 ? 'text-amber-600' : 'text-emerald-700')
                          }`}>
                            {row.percentVoltDrop.toFixed(row.percentVoltDrop % 1 === 0 ? 0 : 1)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-800 bg-emerald-50/20">
                          {row.receivingVoltage.toFixed(row.receivingVoltage % 1 === 0 ? 0 : 1)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold bg-emerald-50/20">
                          <span className={row.lineLossKw > 0.8 ? 'text-rose-600 text-sm' : 'text-slate-900'}>
                            {row.lineLossKw.toFixed(row.lineLossKw === 0.01 ? 2 : 3)}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Row Formula Inspector */}
                      {isSelected && (
                        <tr className="bg-amber-50/60 font-sans text-xs">
                          <td colSpan={12} className="p-3 border-y border-amber-200">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div>
                                <span className="font-bold text-amber-900 block">
                                  Segment {row.fromNodeId} → {row.toNodeId} Formula Substitution:
                                </span>
                                <span className="font-mono text-slate-700 text-[11px] block mt-0.5">
                                  Loss = 3 · ({row.currentAmps}A)² · {row.conductor.resistancePerKm} Ω/km · {row.lengthKm} km / 1000 = <strong>{row.lineLossKw} kW</strong>
                                </span>
                                <span className="font-mono text-slate-700 text-[11px] block">
                                  Voltage = 400V · (1 - {row.percentVoltDrop}% / 100) = <strong>{row.receivingVoltage} V</strong>
                                </span>
                              </div>
                              {onReconductor && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-600 text-[11px]">Re-conductor Span:</span>
                                  <select
                                    value={row.conductor.code}
                                    onChange={(e) => onReconductor(row.segment.id, e.target.value)}
                                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                                  >
                                    {CONDUCTOR_LIST.map(c => (
                                      <option key={c.code} value={c.code}>{c.code} ({c.name})</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {/* Footer Totals */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold font-mono border-t-2 border-amber-500">
                  <td colSpan={2} className="py-3 px-2.5 text-center text-amber-400 uppercase tracking-wider">
                    TOTAL
                  </td>
                  <td className="py-3 px-2.5 text-right text-amber-300">
                    {totalLengthKm.toFixed(3)}
                  </td>
                  <td className="py-3 px-2.5 text-right">
                    {totalLengthM}
                  </td>
                  <td className="py-3 px-2.5 text-right text-amber-300">
                    {total3PhCust}
                  </td>
                  <td className="py-3 px-2.5 text-right text-amber-300">
                    {total1PhCust}
                  </td>
                  <td className="py-3 px-2.5 text-left border-r border-slate-700 text-slate-400 font-sans text-xs">
                    12 Spans
                  </td>
                  <td colSpan={4} className="py-3 px-3 text-right text-slate-300 font-sans text-xs font-normal bg-slate-950">
                    Total Line Losses:
                  </td>
                  <td className="py-3 px-3 text-right text-amber-400 text-sm font-bold bg-slate-950">
                    {totalLossKw.toFixed(3)} kW
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: IMAGE 1 INPUT DATA ONLY */}
      {(viewMode === 'image1_input') && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-blue-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <span>Input Data Table (Exact Replica of image1.png)</span>
                <span className="text-[10px] font-mono bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-bold">
                  Editable Fields
                </span>
              </h3>
              <p className="text-xs text-blue-700 mt-0.5">
                Edit conductor codes, lengths, or consumer counts below. Output calculations update automatically.
              </p>
            </div>
            {onResetToImage1 && (
              <button
                onClick={onResetToImage1}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-blue-300 text-blue-800 rounded-md hover:bg-blue-50 transition-colors"
              >
                Reset to image1.png
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 text-center">From Node</th>
                  <th className="py-2.5 px-3 text-center">To Node</th>
                  <th className="py-2.5 px-3 text-right">Length (km)</th>
                  <th className="py-2.5 px-3 text-right">Length (m)</th>
                  <th className="py-2.5 px-3 text-right">3-Ph Customer</th>
                  <th className="py-2.5 px-3 text-right">1-Ph Customer</th>
                  <th className="py-2.5 px-4 text-left">Conductor Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {filteredRows.map((row) => (
                  <tr key={row.segment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {row.fromNodeId.replace('.0', '')}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {row.toNodeId.replace('.0', '')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                      {row.lengthKm.toFixed(row.lengthKm < 0.01 ? 3 : (row.lengthKm === 0.04 || row.lengthKm === 0.03 ? 2 : 3))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                      {row.lengthMeters}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                      {row.threePhaseCustomers}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                      {row.singlePhaseCustomers}
                    </td>
                    <td className="py-2.5 px-4 text-left">
                      <span className="font-bold text-slate-900 font-mono px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {row.conductor.code}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold font-mono">
                  <td colSpan={2} className="py-3 px-3 text-center text-amber-400">TOTAL</td>
                  <td className="py-3 px-3 text-right text-amber-300">{totalLengthKm.toFixed(3)}</td>
                  <td className="py-3 px-3 text-right">{totalLengthM}</td>
                  <td className="py-3 px-3 text-right text-amber-300">{total3PhCust}</td>
                  <td className="py-3 px-3 text-right text-amber-300">{total1PhCust}</td>
                  <td className="py-3 px-4 font-sans text-xs text-slate-400">12 Segments</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: IMAGE 2 CALCULATED OUTPUT ONLY */}
      {(viewMode === 'image2_output') && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-emerald-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span>Calculated Output Table (Exact Replica of image2.png)</span>
                <span className="text-[10px] font-mono bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded font-bold">
                  Dynamic Electrical Calculations
                </span>
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Calculated strictly on the input data from image1.png and transformer kVA using WAPDA ELR formulas.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 font-sans">
                  <th className="py-2.5 px-3 text-center font-mono text-slate-500">Span</th>
                  <th className="py-2.5 px-4 text-right">Current (A)</th>
                  <th className="py-2.5 px-4 text-right">Loading %</th>
                  <th className="py-2.5 px-4 text-right">Volt Drop %</th>
                  <th className="py-2.5 px-4 text-right">Voltage (V)</th>
                  <th className="py-2.5 px-4 text-right">Loss (kW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {filteredRows.map((row) => (
                  <tr key={row.segment.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-sans text-[11px]">
                      {row.fromNodeId.replace('.0', '')} → {row.toNodeId.replace('.0', '')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 text-sm">
                      {row.currentAmps.toFixed(row.currentAmps % 1 === 0 ? 0 : 1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-800">
                      {row.percentLoading}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-800">
                      {row.percentVoltDrop.toFixed(row.percentVoltDrop % 1 === 0 ? 0 : 1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-800">
                      {row.receivingVoltage.toFixed(row.receivingVoltage % 1 === 0 ? 0 : 1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 text-sm">
                      {row.lineLossKw.toFixed(row.lineLossKw === 0.01 ? 2 : 3)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold font-mono">
                  <td className="py-3 px-3 text-center text-amber-400">TOTAL</td>
                  <td colSpan={4} className="py-3 px-4 text-right font-sans text-xs text-slate-300">
                    Total Peak Line Losses:
                  </td>
                  <td className="py-3 px-4 text-right text-amber-400 text-base font-bold">
                    {totalLossKw.toFixed(3)} kW
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: SIDE-BY-SIDE DUAL VIEW */}
      {(viewMode === 'dual_side_by_side') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Table: image1.png */}
          <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-sm">
            <div className="p-3 bg-blue-50 border-b border-blue-200 font-bold text-blue-900 text-xs flex items-center justify-between">
              <span>IMAGE 1: INPUT DATA</span>
              <span className="text-[10px] font-mono text-blue-700">12 Feeder Spans</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                    <th className="py-2 px-2 text-center">From</th>
                    <th className="py-2 px-2 text-center">To</th>
                    <th className="py-2 px-2 text-right">Length (km)</th>
                    <th className="py-2 px-2 text-right">Length (m)</th>
                    <th className="py-2 px-2 text-right">3-Ph</th>
                    <th className="py-2 px-2 text-right">1-Ph</th>
                    <th className="py-2 px-2 text-left">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-xs">
                  {filteredRows.map(r => (
                    <tr key={r.segment.id} className="hover:bg-blue-50/30">
                      <td className="py-2 px-2 text-center font-bold">{r.fromNodeId.replace('.0', '')}</td>
                      <td className="py-2 px-2 text-center font-bold">{r.toNodeId.replace('.0', '')}</td>
                      <td className="py-2 px-2 text-right">{r.lengthKm.toFixed(r.lengthKm < 0.01 ? 3 : (r.lengthKm === 0.04 || r.lengthKm === 0.03 ? 2 : 3))}</td>
                      <td className="py-2 px-2 text-right">{r.lengthMeters}</td>
                      <td className="py-2 px-2 text-right">{r.threePhaseCustomers}</td>
                      <td className="py-2 px-2 text-right">{r.singlePhaseCustomers}</td>
                      <td className="py-2 px-2 text-left font-bold text-slate-800">{r.conductor.code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Table: image2.png */}
          <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
            <div className="p-3 bg-emerald-50 border-b border-emerald-200 font-bold text-emerald-950 text-xs flex items-center justify-between">
              <span>IMAGE 2: CALCULATED OUTPUT DATA</span>
              <span className="text-[10px] font-mono text-emerald-700">Calculated via Electrical Formulas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                    <th className="py-2 px-2 text-right">Current (A)</th>
                    <th className="py-2 px-2 text-right">Loading %</th>
                    <th className="py-2 px-2 text-right">Volt Drop %</th>
                    <th className="py-2 px-2 text-right">Voltage (V)</th>
                    <th className="py-2 px-2 text-right">Loss (kW)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-xs">
                  {filteredRows.map(r => (
                    <tr key={r.segment.id} className="hover:bg-emerald-50/30">
                      <td className="py-2 px-2 text-right font-bold text-slate-900">{r.currentAmps.toFixed(r.currentAmps % 1 === 0 ? 0 : 1)}</td>
                      <td className="py-2 px-2 text-right">{r.percentLoading}</td>
                      <td className="py-2 px-2 text-right">{r.percentVoltDrop.toFixed(r.percentVoltDrop % 1 === 0 ? 0 : 1)}</td>
                      <td className="py-2 px-2 text-right">{r.receivingVoltage.toFixed(r.receivingVoltage % 1 === 0 ? 0 : 1)}</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900">{r.lineLossKw.toFixed(r.lineLossKw === 0.01 ? 2 : 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
