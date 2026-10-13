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
  Table as TableIcon,
  Layers,
  CheckCircle2,
  Maximize2,
  Minimize2
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
  activeInjectedVoltage?: number;
  onUpdateInjectedVoltage?: (volts: number) => void;
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
  activeInjectedVoltage,
  onUpdateInjectedVoltage,
  onUpdateSegmentInput,
  onResetToImage1
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'loss' | 'current' | 'drop'>('default');
  const [filterHighlight, setFilterHighlight] = useState<'all' | 'high-loss' | 'high-drop'>('all');
  const [subNetworkFilter, setSubNetworkFilter] = useState<'ALL' | 'T1' | 'T2'>('ALL');
  const [viewMode, setViewMode] = useState<'combined' | 'image1_input' | 'image2_output' | 'dual_side_by_side'>('combined');
  const [showFormulas, setShowFormulas] = useState<boolean>(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const isHtLine = feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000;
  const totalNodeKva = segmentResults.reduce((acc, r) => acc + (r.toNodeKva || 0), 0);

  // Check if bifurcation is active
  const hasBifurcation = segmentResults.some(r => r.fedByTransformer === 'T2');
  const t1Spans = segmentResults.filter(r => r.fedByTransformer === 'T1' || !r.isBifurcated);
  const t2Spans = segmentResults.filter(r => r.fedByTransformer === 'T2');

  // Sub-network statistics
  const t1LengthKm = t1Spans.reduce((acc, r) => acc + r.lengthKm, 0);
  const t1LossKw = t1Spans.reduce((acc, r) => acc + r.lineLossKw, 0);
  const t1SingleCust = t1Spans.reduce((acc, r) => acc + r.singlePhaseCustomers, 0);
  const t1ThreeCust = t1Spans.reduce((acc, r) => acc + r.threePhaseCustomers, 0);
  const t1NodeKva = t1Spans.reduce((acc, r) => acc + (r.toNodeKva || 0), 0);

  const t2LengthKm = t2Spans.reduce((acc, r) => acc + r.lengthKm, 0);
  const t2LossKw = t2Spans.reduce((acc, r) => acc + r.lineLossKw, 0);
  const t2SingleCust = t2Spans.reduce((acc, r) => acc + r.singlePhaseCustomers, 0);
  const t2ThreeCust = t2Spans.reduce((acc, r) => acc + r.threePhaseCustomers, 0);
  const t2NodeKva = t2Spans.reduce((acc, r) => acc + (r.toNodeKva || 0), 0);

  // Filter and sort
  const filteredRows = segmentResults
    .filter(row => {
      // Sub-network filter
      if (subNetworkFilter === 'T1') {
        if (row.fedByTransformer === 'T2') return false;
      } else if (subNetworkFilter === 'T2') {
        if (row.fedByTransformer !== 'T2') return false;
      }

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

  // Totals of active view
  const currentViewLengthKm = filteredRows.reduce((acc, r) => acc + r.lengthKm, 0);
  const currentViewLengthM = Math.round(currentViewLengthKm * 1000);
  const currentView3PhCust = filteredRows.reduce((acc, r) => acc + r.threePhaseCustomers, 0);
  const currentView1PhCust = filteredRows.reduce((acc, r) => acc + r.singlePhaseCustomers, 0);
  const currentViewLossKw = filteredRows.reduce((acc, r) => acc + r.lineLossKw, 0);

  // Overall Totals
  const totalLengthKm = segmentResults.reduce((acc, r) => acc + r.lengthKm, 0);
  const totalLengthM = Math.round(totalLengthKm * 1000);
  const total3PhCust = segmentResults.reduce((acc, r) => acc + r.threePhaseCustomers, 0);
  const total1PhCust = segmentResults.reduce((acc, r) => acc + r.singlePhaseCustomers, 0);
  const totalLossKw = segmentResults.reduce((acc, r) => acc + r.lineLossKw, 0);

  // Export CSV
  const exportCsv = () => {
    const headers = [
      'Sub-Network Zone',
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
      r.fedByTransformer === 'T2' ? 'T2 (Added Substation)' : 'T1 (Main Substation)',
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
    link.setAttribute("download", `${feeder.id}_loss_analysis_schedule.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={isFullScreen ? 'fixed inset-0 z-50 bg-slate-50 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-4 flex flex-col' : 'space-y-4'}>
      {/* Top Banner: Control Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* ROW 1: Transformer Rating & Sub-Network Selector */}
        <div className="p-3.5 sm:px-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex flex-wrap items-center gap-3">
            {isHtLine ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block leading-tight">
                      Injected Line Voltage at Node 0:
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {onUpdateInjectedVoltage ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.05"
                            min="1.0"
                            max="132"
                            value={Number(((activeInjectedVoltage || feeder.nominalVoltage) / 1000).toFixed(2))}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 11.0;
                              onUpdateInjectedVoltage(Math.round(val * 1000));
                            }}
                            className="w-18 bg-blue-50/70 border border-blue-300 rounded px-1.5 py-0.5 text-xs font-mono font-black text-blue-900 text-center focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-xs font-mono font-bold text-blue-700">kV ({((activeInjectedVoltage || feeder.nominalVoltage)).toLocaleString()} V)</span>
                        </div>
                      ) : (
                        <span className="font-mono font-black text-sm text-blue-700">
                          {((activeInjectedVoltage || feeder.nominalVoltage) / 1000).toFixed(2)} kV ({((activeInjectedVoltage || feeder.nominalVoltage)).toLocaleString()} V)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {onUpdateInjectedVoltage && (
                  <div className="flex flex-wrap items-center gap-1 border-l border-slate-200 pl-3">
                    <span className="text-[11px] text-slate-500 font-semibold mr-0.5">Quick Inject:</span>
                    {[
                      { label: '11.0 kV', v: 11000 },
                      { label: '11.2 kV', v: 11200 },
                      { label: '11.4 kV', v: 11400 },
                      { label: '11.5 kV', v: 11500 },
                      { label: '11.8 kV', v: 11800 }
                    ].map(p => {
                      const isSel = Math.abs((activeInjectedVoltage || feeder.nominalVoltage) - p.v) < 10;
                      return (
                        <button
                          key={p.v}
                          type="button"
                          onClick={() => onUpdateInjectedVoltage(p.v)}
                          className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer font-bold transition-all ${
                            isSel
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-bold">
                    Total HT Load: {totalNodeKva.toLocaleString()} kVA
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block leading-tight">
                    T-1 Transformer Rating:
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <select
                      value={activeTransformerKva}
                      onChange={(e) => onUpdateTransformerKva?.(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
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
                  </div>
                </div>
              </div>
            )}

            {hasBifurcation && (
              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
            )}

            {/* Sub-Network Switcher (All vs T1 vs T2) */}
            {hasBifurcation && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setSubNetworkFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    subNetworkFilter === 'ALL'
                      ? 'bg-white text-slate-950 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Lines ({segmentResults.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubNetworkFilter('T1')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    subNetworkFilter === 'T1'
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-300" />
                  <span>T-1 Substation ({t1Spans.length} Spans)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubNetworkFilter('T2')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    subNetworkFilter === 'T2'
                      ? 'bg-purple-600 text-white shadow-xs font-bold'
                      : 'text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-300" />
                  <span>T-2 Added Substation ({t2Spans.length} Spans)</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions (Reset & Export) */}
          <div className="flex items-center gap-2">
            {onResetToImage1 && (
              <button
                type="button"
                onClick={onResetToImage1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Reset network to exact Gulbhar Colony benchmark (image1.png)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset to image1.png</span>
              </button>
            )}

            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title={isFullScreen ? "Exit Full Screen" : "Display Table as Full Screen"}
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</span>
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
              <span>Calculated Output Schedule (image2.png)</span>
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
              <span>Input Data Form (image1.png)</span>
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
              <span>Side-by-Side Dual View</span>
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

      {/* Sub-Network Dual Substation Balance Cards (When Bifurcation is Active) */}
      {hasBifurcation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-200 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Transformer 1 (T-1 Main Substation Network)
              </span>
              <span className="font-mono text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                {t1Spans.length} Spans ({t1LengthKm.toFixed(3)} km)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-blue-200/70 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">1-Ph / 3-Ph Cust:</span>
                <span className="font-mono font-bold text-blue-950">{t1SingleCust} / {t1ThreeCust}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">T1 Line Loss:</span>
                <span className="font-mono font-bold text-blue-950">{t1LossKw.toFixed(3)} kW</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Backbone Relief:</span>
                <span className="font-mono font-bold text-emerald-700">Relieved by T-2</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50/50 p-4 rounded-xl border border-purple-200 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-purple-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                Transformer 2 (T-2 Added Substation Network)
              </span>
              <span className="font-mono text-purple-800 font-bold bg-purple-100 px-2 py-0.5 rounded text-[11px]">
                {t2Spans.length} Spans ({t2LengthKm.toFixed(3)} km)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-purple-200/70 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">1-Ph / 3-Ph Cust:</span>
                <span className="font-mono font-bold text-purple-950">{t2SingleCust} / {t2ThreeCust}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">T2 Line Loss:</span>
                <span className="font-mono font-bold text-purple-950">{t2LossKw.toFixed(3)} kW</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Sending Voltage:</span>
                <span className="font-mono font-bold text-purple-950">400 V (0% Drop)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inserted Electrical Formulas Panel */}
      {showFormulas && (
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-400">
                {isHtLine 
                  ? 'HT Line Electrical Engineering Formulas (Node 0 Line Voltage Injection & Backward-Forward Sweep)' 
                  : 'Inserted Electrical Engineering Formulas & Dual-Network Engine'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {isHtLine 
                ? `Node 0 Injected Line Voltage: ${((activeInjectedVoltage || feeder.nominalVoltage) / 1000).toFixed(2)} kV · 3-Phase HT Network` 
                : 'Base Voltage: 400 V · 3-Phase Balanced Distribution'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Formula 1 */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>{isHtLine ? '1. Node KVA & Backward Sweep' : '1. Segment Current (Amps)'}</span>
                <span className="text-[10px] font-mono text-amber-400">Current (A)</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                {isHtLine 
                  ? 'S_branch = Σ S_node (kVA); I_s = S_branch / (√3 · V_inj_kV)' 
                  : 'I_s = S_downstream / (√3 · V_kV)'}
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {isHtLine 
                  ? 'Backward sweep accumulates downstream Node KVA loads (DTRs). Line current I_s is derived from apparent load and injected line voltage at Node 0.' 
                  : 'Aggregated downstream apparent power: for T1 spans, only T1 customer branches are summed. For T2 spans, power starts fresh from T2 transformer source.'}
              </p>
            </div>

            {/* Formula 2 */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>{isHtLine ? '2. HT Ohmic Line Losses (kW)' : '2. Ohmic Line Loss (kW)'}</span>
                <span className="text-[10px] font-mono text-amber-400">Loss (kW)</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                Loss (kW) = ( 3 · I_s² · R · L · 1.15 ) / 1000
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {isHtLine 
                  ? 'Joule dissipation across HT conductor (DOG, PANTHER, RABBIT). R is conductor resistance (Ω/km) and L is span length in km.' 
                  : 'Joule dissipation: R is conductor resistance per km, L is span length in km. Line losses drop quadratically with reduced current.'}
              </p>
            </div>

            {/* Formula 3 */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>{isHtLine ? '3. Voltage Drop from Node 0 Injection' : '3. Voltage Drop & Restoration'}</span>
                <span className="text-[10px] font-mono text-amber-400">Volt Drop %</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                {isHtLine 
                  ? 'ΔV = √3 · I_s · (R·cosΦ + X·sinΦ); V_rx = V_from - ΔV' 
                  : '% VD_cum = % VD_parent + ( ΔV_seg / 400 ) · 100'}
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {isHtLine 
                  ? 'Line drop reduces the injected Node 0 voltage downstream. %VD is calculated from initial injected line voltage at Node 0.' 
                  : 'T2 bifurcated spans reset voltage drop to 0% at the new transformer injection node, eliminating terminal low-voltage violations.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* COMBINED TABLE (IMAGE 1 INPUTS + IMAGE 2 OUTPUTS) */}
      {(viewMode === 'combined') && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>
                  {isHtLine 
                    ? 'Combined HT Feeder Schedule (From, To, Length, Node KVA, Conductor → Calculated 11 kV Outputs)' 
                    : 'Combined Feeder Schedule (image1.png Inputs + image2.png Calculated Outputs)'}
                </span>
                {subNetworkFilter !== 'ALL' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    subNetworkFilter === 'T1' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'
                  }`}>
                    Showing {subNetworkFilter} Substation Spans Only
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isHtLine 
                  ? `Injected line voltage at Node 0: ${((activeInjectedVoltage || feeder.nominalVoltage) / 1000).toFixed(2)} kV. Direct Node KVA determines branch loads.` 
                  : 'Every output column (Current, Loading, Volt Drop, Voltage, Loss) is dynamically derived using the inserted electrical formulas.'}
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
                  className={`px-2 py-1 rounded font-medium cursor-pointer ${filterHighlight === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                >
                  All ({filteredRows.length})
                </button>
                <button
                  onClick={() => setFilterHighlight('high-loss')}
                  className={`px-2 py-1 rounded font-medium cursor-pointer ${filterHighlight === 'high-loss' ? 'bg-white text-rose-600 shadow-xs font-semibold' : 'text-slate-600'}`}
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
                  <th colSpan={isHtLine ? 7 : 8} className="bg-blue-50/70 text-blue-900 text-center py-1.5 px-3 border-r border-blue-200 font-bold uppercase tracking-wider text-[11px]">
                    {isHtLine 
                      ? `HT LINE INPUT PARAMETERS (From Node, To Node, Length, Node KVA, Conductor · Node 0 Inj: ${((activeInjectedVoltage || feeder.nominalVoltage)/1000).toFixed(2)} kV)` 
                      : 'INPUT DATA (image1.png)'}
                  </th>
                  <th colSpan={5} className="bg-emerald-50/70 text-emerald-950 text-center py-1.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    {isHtLine ? 'CALCULATED OUTPUTS (11 kV Load Flow)' : 'CALCULATED OUTPUTS (image2.png)'}
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-2.5 text-center">Zone</th>
                  <th className="py-2.5 px-2.5 text-center">From Node</th>
                  <th className="py-2.5 px-2.5 text-center">To Node</th>
                  <th className="py-2.5 px-2.5 text-right">Length (km)</th>
                  <th className="py-2.5 px-2.5 text-right">Length (m)</th>
                  {isHtLine ? (
                    <th className="py-2.5 px-2.5 text-right bg-blue-100/80 text-blue-950 font-extrabold">
                      Node KVA (Load)
                    </th>
                  ) : (
                    <>
                      <th className="py-2.5 px-2.5 text-right">3-Ph Cust</th>
                      <th className="py-2.5 px-2.5 text-right">1-Ph Cust</th>
                    </>
                  )}
                  <th className="py-2.5 px-2.5 text-left border-r border-slate-200">Conductor Code</th>

                  <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-slate-900">Current (A)</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-slate-900">Loading %</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-slate-900">Volt Drop %</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-slate-900">
                    {isHtLine ? 'Voltage (kV / V)' : 'Voltage (V)'}
                  </th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50/30 text-slate-900">Loss (kW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {filteredRows.map((row) => {
                  const isSelected = selectedRowId === row.segment.id;
                  const isT2 = row.fedByTransformer === 'T2';
                  const isTieCut = row.currentAmps === 0 && row.isBifurcated;

                  return (
                    <React.Fragment key={row.segment.id}>
                      <tr 
                        onClick={() => setSelectedRowId(isSelected ? null : row.segment.id)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          isTieCut 
                            ? 'bg-slate-100/70 text-slate-400' 
                            : (isT2 ? 'bg-purple-50/30' : (row.isHighLoss ? 'bg-rose-50/20' : (isSelected ? 'bg-amber-50/40' : '')))
                        }`}
                      >
                        {/* Sub-Network Zone Badge */}
                        <td className="py-2.5 px-2.5 text-center font-sans">
                          {isTieCut ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                              TIE OPEN
                            </span>
                          ) : isT2 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                              T-2 Added
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                              {isHtLine ? 'Main 11kV' : 'T-1 Main'}
                            </span>
                          )}
                        </td>

                        {/* INPUTS */}
                        <td className="py-2.5 px-2.5 text-center font-bold text-slate-900">
                          {row.fromNodeId.replace('.0', '')}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-bold text-slate-900">
                          {row.toNodeId.replace('.0', '')}
                        </td>
                        <td className="py-2.5 px-2.5 text-right text-slate-700">
                          {row.lengthKm.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right text-slate-700">
                          {row.lengthMeters}
                        </td>
                        {isHtLine ? (
                          <td className="py-2.5 px-2.5 text-right font-bold text-blue-900 bg-blue-50/30">
                            <span className="px-2 py-0.5 rounded bg-blue-100/80 border border-blue-200 text-blue-900 text-[11px]">
                              {(row.toNodeKva || 0).toLocaleString()} kVA
                            </span>
                          </td>
                        ) : (
                          <>
                            <td className="py-2.5 px-2.5 text-right text-slate-800">
                              {row.threePhaseCustomers}
                            </td>
                            <td className="py-2.5 px-2.5 text-right text-slate-800">
                              {row.singlePhaseCustomers}
                            </td>
                          </>
                        )}
                        <td className="py-2.5 px-2.5 text-left border-r border-slate-200">
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-slate-100 text-slate-800 font-semibold">
                            {row.conductor.code}
                          </span>
                        </td>

                        {/* OUTPUTS */}
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 bg-emerald-50/20">
                          {isTieCut ? '0.0 A' : `${row.currentAmps.toFixed(1)} A`}
                        </td>
                        <td className="py-2.5 px-3 text-right bg-emerald-50/20">
                          <span className={`font-semibold ${row.percentLoading > 75 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {isTieCut ? '0.0%' : `${row.percentLoading}%`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right bg-emerald-50/20">
                          <span className={`font-semibold ${
                            row.percentVoltDrop > 9 ? 'text-rose-600 font-bold' : (row.percentVoltDrop > 5 ? 'text-amber-600' : 'text-emerald-700')
                          }`}>
                            {isTieCut ? '0.0%' : `${row.percentVoltDrop.toFixed(1)}%`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-800 bg-emerald-50/20">
                          {isHtLine ? (
                            <span className="font-semibold text-slate-900">
                              {(row.receivingVoltage / 1000).toFixed(3)} kV <span className="text-[10px] text-slate-500 font-normal">({row.receivingVoltage.toFixed(0)} V)</span>
                            </span>
                          ) : (
                            `${row.receivingVoltage.toFixed(1)} V`
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold bg-emerald-50/20">
                          <span className={row.lineLossKw > 0.8 ? 'text-rose-600 text-sm' : 'text-slate-900'}>
                            {isTieCut ? '0.000 kW' : `${row.lineLossKw.toFixed(3)} kW`}
                          </span>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold font-mono">
                  <td colSpan={3} className="py-2.5 px-3 text-center text-amber-400 uppercase tracking-wider font-sans text-xs">
                    {subNetworkFilter === 'ALL' ? 'SYSTEM TOTAL' : `${subNetworkFilter} SUB-NETWORK TOTAL`}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-amber-300">
                    {currentViewLengthKm.toFixed(3)} km
                  </td>
                  <td className="py-2.5 px-2.5 text-right">
                    {currentViewLengthM} m
                  </td>
                  {isHtLine ? (
                    <td className="py-2.5 px-2.5 text-right text-blue-300 font-extrabold">
                      {totalNodeKva.toLocaleString()} kVA
                    </td>
                  ) : (
                    <>
                      <td className="py-2.5 px-2.5 text-right text-purple-300">
                        {currentView3PhCust}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-amber-300">
                        {currentView1PhCust}
                      </td>
                    </>
                  )}
                  <td className="py-2.5 px-2.5 text-slate-400 font-sans text-xs border-r border-slate-700">
                    {filteredRows.length} Spans
                  </td>

                  <td colSpan={4} className="py-2.5 px-3 text-right text-slate-400 font-sans text-xs">
                    Total Sub-Network Line Losses:
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 text-sm">
                    {currentViewLossKw.toFixed(3)} kW
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: IMAGE 1 INPUT TABLE ONLY */}
      {(viewMode === 'image1_input') && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-blue-50/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <span>
                {isHtLine 
                  ? 'Form Display A: HT Line Spans Input Data Table (From, To, Length, Node KVA, Conductor)' 
                  : 'Form Display A: Feeder Spans Input Data Table (image1.png)'}
              </span>
            </h3>
            <span className="text-xs font-mono text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-semibold">
              {filteredRows.length} Spans Displayed · {isHtLine ? `Total Load: ${totalNodeKva.toLocaleString()} kVA` : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-3 text-center">Zone</th>
                  <th className="py-2.5 px-3 text-center">From Node</th>
                  <th className="py-2.5 px-3 text-center">To Node</th>
                  <th className="py-2.5 px-3 text-right">Length (km)</th>
                  <th className="py-2.5 px-3 text-right">Length (m)</th>
                  {isHtLine ? (
                    <th className="py-2.5 px-3 text-right bg-blue-100/90 text-blue-950 font-extrabold">Node KVA (Load)</th>
                  ) : (
                    <>
                      <th className="py-2.5 px-3 text-right">3-Ph Customer</th>
                      <th className="py-2.5 px-3 text-right">1-Ph Customer</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-left">Conductor Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {filteredRows.map((row, idx) => (
                  <tr key={row.segment.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="py-2 px-3 text-center font-sans">
                      {row.fedByTransformer === 'T2' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900">
                          T-2 Added
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                          {isHtLine ? 'Main 11kV' : 'T-1 Main'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-slate-900">{row.fromNodeId.replace('.0', '')}</td>
                    <td className="py-2 px-3 text-center font-bold text-slate-900">{row.toNodeId.replace('.0', '')}</td>
                    <td className="py-2 px-3 text-right">{row.lengthKm.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right">{row.lengthMeters}</td>
                    {isHtLine ? (
                      <td className="py-2 px-3 text-right font-bold text-blue-900 bg-blue-50/40">
                        <span className="px-2 py-0.5 rounded bg-blue-100 border border-blue-200 font-bold">
                          {(row.toNodeKva || 0).toLocaleString()} kVA
                        </span>
                      </td>
                    ) : (
                      <>
                        <td className="py-2 px-3 text-right font-bold text-purple-700">{row.threePhaseCustomers}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{row.singlePhaseCustomers}</td>
                      </>
                    )}
                    <td className="py-2 px-3 text-left font-semibold text-slate-800 font-sans">{row.conductor.code}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold font-mono">
                  <td colSpan={3} className="py-2.5 px-3 text-center text-amber-400 font-sans text-xs">
                    TOTALS
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-300">{currentViewLengthKm.toFixed(3)} km</td>
                  <td className="py-2.5 px-3 text-right">{currentViewLengthM} m</td>
                  {isHtLine ? (
                    <td className="py-2.5 px-3 text-right text-blue-300 font-extrabold">{totalNodeKva.toLocaleString()} kVA</td>
                  ) : (
                    <>
                      <td className="py-2.5 px-3 text-right text-purple-300">{currentView3PhCust}</td>
                      <td className="py-2.5 px-3 text-right text-amber-300">{currentView1PhCust}</td>
                    </>
                  )}
                  <td className="py-2.5 px-3 text-slate-400 font-sans text-xs">{filteredRows.length} Spans</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: IMAGE 2 CALCULATED SCHEDULE ONLY */}
      {(viewMode === 'image2_output') && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-emerald-50/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <span>
                {isHtLine 
                  ? 'Form Display B: Calculated 11 kV Output Schedule' 
                  : 'Form Display B: Calculated Output Schedule (image2.png)'}
              </span>
            </h3>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
              Total Loss: {currentViewLossKw.toFixed(3)} kW
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-3 text-center">Zone</th>
                  <th className="py-2.5 px-3 text-center">From</th>
                  <th className="py-2.5 px-3 text-center">To</th>
                  <th className="py-2.5 px-3 text-right">Length (km)</th>
                  <th className="py-2.5 px-3 text-left">Code</th>
                  <th className="py-2.5 px-3 text-right bg-blue-50 font-bold text-blue-950">Current (A)</th>
                  <th className="py-2.5 px-3 text-right bg-purple-50 font-bold text-purple-950">Loading %</th>
                  <th className="py-2.5 px-3 text-right bg-rose-50 font-bold text-rose-950">Volt Drop %</th>
                  <th className="py-2.5 px-3 text-right">
                    {isHtLine ? 'Voltage (kV / V)' : 'Voltage (V)'}
                  </th>
                  <th className="py-2.5 px-3 text-right bg-amber-50 font-bold text-amber-950">Loss (kW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {filteredRows.map((row, idx) => (
                  <tr key={row.segment.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="py-2 px-3 text-center font-sans">
                      {row.fedByTransformer === 'T2' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900">
                          T-2
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                          {isHtLine ? 'Main 11kV' : 'T-1'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-slate-900">{row.fromNodeId.replace('.0', '')}</td>
                    <td className="py-2 px-3 text-center font-bold text-slate-900">{row.toNodeId.replace('.0', '')}</td>
                    <td className="py-2 px-3 text-right">{row.lengthKm.toFixed(3)}</td>
                    <td className="py-2 px-3 text-left font-sans text-slate-800">{row.conductor.code}</td>
                    <td className="py-2 px-3 text-right font-bold text-blue-700 bg-blue-50/30">{row.currentAmps.toFixed(1)}</td>
                    <td className="py-2 px-3 text-right font-bold bg-purple-50/30">{row.percentLoading}%</td>
                    <td className="py-2 px-3 text-right font-bold bg-rose-50/30 text-rose-700">{row.percentVoltDrop.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      {isHtLine 
                        ? `${(row.receivingVoltage / 1000).toFixed(3)} kV (${row.receivingVoltage.toFixed(0)} V)` 
                        : row.receivingVoltage.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-amber-700 bg-amber-50/30">{row.lineLossKw.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold font-mono">
                  <td colSpan={3} className="py-2.5 px-3 text-center text-amber-400 font-sans text-xs">
                    TOTALS
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-300">{currentViewLengthKm.toFixed(3)} km</td>
                  <td colSpan={5} className="py-2.5 px-3 text-right text-slate-400 font-sans text-xs">
                    Total Line Losses:
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 text-sm">{currentViewLossKw.toFixed(3)} kW</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: DUAL SIDE-BY-SIDE VIEW */}
      {(viewMode === 'dual_side_by_side') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Table A: Input Data */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-200 bg-blue-50 font-bold text-blue-950 text-xs">
              {isHtLine 
                ? 'Form Display A: HT Line Input Data (From, To, Length, Node KVA, Conductor)' 
                : 'Form Display A: Input Data (image1.png)'}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2 text-center">Zone</th>
                    <th className="py-2 px-2 text-center">Span</th>
                    <th className="py-2 px-2 text-right">Length (m)</th>
                    {isHtLine ? (
                      <th className="py-2 px-2 text-right bg-blue-100 text-blue-950 font-extrabold">Node KVA</th>
                    ) : (
                      <th className="py-2 px-2 text-right">3Φ / 1Φ</th>
                    )}
                    <th className="py-2 px-2 text-left">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredRows.map(r => (
                    <tr key={r.segment.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 text-center font-sans">
                        <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${r.fedByTransformer === 'T2' ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900'}`}>
                          {r.fedByTransformer || (isHtLine ? 'Main' : 'T1')}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center font-bold">{r.fromNodeId.replace('.0', '')} → {r.toNodeId.replace('.0', '')}</td>
                      <td className="py-1.5 px-2 text-right">{r.lengthMeters}</td>
                      {isHtLine ? (
                        <td className="py-1.5 px-2 text-right font-bold text-blue-900 bg-blue-50/40">
                          {(r.toNodeKva || 0).toLocaleString()} kVA
                        </td>
                      ) : (
                        <td className="py-1.5 px-2 text-right">{r.threePhaseCustomers} / {r.singlePhaseCustomers}</td>
                      )}
                      <td className="py-1.5 px-2 text-left font-sans">{r.conductor.code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table B: Calculated Output */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-200 bg-emerald-50 font-bold text-emerald-950 text-xs">
              {isHtLine 
                ? 'Form Display B: Calculated Output (11 kV Load Flow)' 
                : 'Form Display B: Calculated Output (image2.png)'}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2 text-center">Span</th>
                    <th className="py-2 px-2 text-right">Current (A)</th>
                    <th className="py-2 px-2 text-right">Volt Drop %</th>
                    <th className="py-2 px-2 text-right">
                      {isHtLine ? 'Voltage (kV / V)' : 'Voltage (V)'}
                    </th>
                    <th className="py-2 px-2 text-right">Loss (kW)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredRows.map(r => (
                    <tr key={r.segment.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 text-center font-bold">{r.fromNodeId.replace('.0', '')} → {r.toNodeId.replace('.0', '')}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-blue-700">{r.currentAmps.toFixed(1)}</td>
                      <td className="py-1.5 px-2 text-right text-rose-700 font-semibold">{r.percentVoltDrop.toFixed(1)}%</td>
                      <td className="py-1.5 px-2 text-right">
                        {isHtLine 
                          ? `${(r.receivingVoltage / 1000).toFixed(3)} kV` 
                          : r.receivingVoltage.toFixed(1)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-amber-700">{r.lineLossKw.toFixed(3)}</td>
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
