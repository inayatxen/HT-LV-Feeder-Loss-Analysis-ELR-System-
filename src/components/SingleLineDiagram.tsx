/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FeederData, 
  FeederAnalysisSummary, 
  FeederNode, 
  SegmentAnalysisResult,
  BifurcationConfig,
  BifurcationFourStatementDossier
} from '../types/feeder';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Layers, 
  Zap, 
  Info, 
  Flame, 
  Sliders, 
  BatteryCharging, 
  SlidersHorizontal, 
  Split, 
  Move, 
  Printer, 
  Columns, 
  Sparkles, 
  GitFork,
  CheckCircle2,
  Table,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { calculateNonOverlappingSLDLayout } from '../utils/sldLayout';
import { FeederSLDViewer, SLDSchemeType } from './FeederSLDViewer';
import { BifurcationStatementsPanel } from './BifurcationStatementsPanel';

interface SingleLineDiagramProps {
  feeder: FeederData;
  summary: FeederAnalysisSummary;
  existingSummary?: FeederAnalysisSummary;
  bifurcationConfig?: BifurcationConfig;
  onUpdateBifurcation?: (config: BifurcationConfig) => void;
  bifurcationDossier?: BifurcationFourStatementDossier;
  onSelectNode?: (node: FeederNode) => void;
  onSelectSegment?: (segmentResult: SegmentAnalysisResult) => void;
  onQuickReconductor?: (segmentId: string, conductorCode: string) => void;
  onQuickCapacitor?: (nodeId: string, kvar: number) => void;
  activeCapacitors?: Record<string, number>;
  activeConductors?: Record<string, string>;
  onOpenPrintReport?: () => void;
}

export const SingleLineDiagram: React.FC<SingleLineDiagramProps> = ({
  feeder,
  summary,
  existingSummary,
  bifurcationConfig,
  onUpdateBifurcation,
  bifurcationDossier,
  onSelectNode,
  onSelectSegment,
  onQuickReconductor,
  onQuickCapacitor,
  activeCapacitors,
  activeConductors,
  onOpenPrintReport
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'standard' | 'voltage' | 'losses'>('standard');

  const isBifurcationActive = bifurcationConfig ? bifurcationConfig.enabled : (summary.bifurcationActive || false);
  const cutOffNodeId = bifurcationConfig ? bifurcationConfig.bifurcationNodeId : (summary.bifurcationNodeId || '3.0');
  const transformerNodeId = bifurcationConfig 
    ? (bifurcationConfig.transformerNodeId || bifurcationConfig.bifurcationNodeId) 
    : (summary.transformerNodeId || summary.bifurcationNodeId || '3.0');
  const transformerCapacityKva = bifurcationConfig 
    ? (bifurcationConfig.transformerCapacityKva || 100) 
    : (summary.additionalTransformerKva || 100);

  const [selectedScheme, setSelectedScheme] = useState<SLDSchemeType>(
    isBifurcationActive ? 'tri_scheme' : 'exist'
  );
  const [showNodeAnalysis, setShowNodeAnalysis] = useState<boolean>(true);

  // If bifurcation becomes enabled, auto-switch to 3-Scheme comparison map so all lines are shown
  useEffect(() => {
    if (isBifurcationActive && selectedScheme === 'exist') {
      setSelectedScheme('tri_scheme');
    }
  }, [isBifurcationActive]);

  const handleToggleBifurcation = (enabled: boolean) => {
    if (onUpdateBifurcation) {
      onUpdateBifurcation({
        enabled,
        bifurcationNodeId: cutOffNodeId,
        transformerNodeId: transformerNodeId,
        transformerCapacityKva: transformerCapacityKva,
        mode: 'ADDITIONAL_TRANSFORMER'
      });
    }
    if (enabled) {
      setSelectedScheme('tri_scheme');
      setShowNodeAnalysis(true);
    }
  };

  const handleSetCutOffNode = (nodeId: string) => {
    if (onUpdateBifurcation) {
      onUpdateBifurcation({
        enabled: isBifurcationActive,
        bifurcationNodeId: nodeId,
        transformerNodeId: transformerNodeId,
        transformerCapacityKva: transformerCapacityKva,
        mode: 'ADDITIONAL_TRANSFORMER'
      });
    }
  };

  const handleSetTransformerNode = (nodeId: string) => {
    if (onUpdateBifurcation) {
      onUpdateBifurcation({
        enabled: isBifurcationActive,
        bifurcationNodeId: cutOffNodeId,
        transformerNodeId: nodeId,
        transformerCapacityKva: transformerCapacityKva,
        mode: 'ADDITIONAL_TRANSFORMER'
      });
    }
  };

  const handleSetTransformerCapacity = (kva: number) => {
    if (onUpdateBifurcation) {
      onUpdateBifurcation({
        enabled: isBifurcationActive,
        bifurcationNodeId: cutOffNodeId,
        transformerNodeId: transformerNodeId,
        transformerCapacityKva: kva,
        mode: 'ADDITIONAL_TRANSFORMER'
      });
    }
  };

  // Adjusted summary incorporating current bifurcation state
  const effectiveSummary = selectedScheme === 'exist' && existingSummary ? existingSummary : summary;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-4">
      {/* Top Header & Scheme Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>Topological Map & Single Line Diagrams (SLD)</span>
              {isBifurcationActive && (
                <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  Bifurcation Active
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Topological line diagrams of Exist, Proposed-1, and Proposed-2 lines with substations, consumer points, currents, conductor types & voltage drops.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isBifurcationActive && (
            <button
              onClick={() => setShowNodeAnalysis(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                showNodeAnalysis 
                  ? 'bg-purple-700 text-white border-purple-800' 
                  : 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{showNodeAnalysis ? 'Hide Node Analysis' : 'Show Node Analysis (0 & 5 Yrs)'}</span>
              {showNodeAnalysis ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          )}

          {onOpenPrintReport && (
            <button
              onClick={onOpenPrintReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs transition-colors cursor-pointer"
              title="Print Single Line Diagrams or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print SLD Schemes</span>
            </button>
          )}
        </div>
      </div>

      {/* Scheme Selection Tabs (Tri-Scheme Map, Exist Map, Proposed-1 Map, Proposed-2 Map, Combined) */}
      <div className="bg-slate-100 p-1.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] font-bold text-slate-600 mr-1 hidden sm:inline">
            Line Map View:
          </span>

          <button
            type="button"
            onClick={() => setSelectedScheme('tri_scheme')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedScheme === 'tri_scheme'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-emerald-950 hover:bg-emerald-50 border border-emerald-300'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Map of Exist, Proposed-1 & Proposed-2 Lines</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedScheme('exist')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedScheme === 'exist'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white text-amber-950 hover:bg-amber-50 border border-amber-300'
            }`}
          >
            Exist Line Map
          </button>

          <button
            type="button"
            onClick={() => setSelectedScheme('proposed_1')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedScheme === 'proposed_1'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-blue-900 hover:bg-blue-50 border border-blue-300'
            }`}
          >
            Proposed-1 Line Map (T-1)
          </button>

          <button
            type="button"
            onClick={() => setSelectedScheme('proposed_2')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedScheme === 'proposed_2'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-300'
            }`}
          >
            Proposed-2 Line Map (T-2)
          </button>

          <button
            type="button"
            onClick={() => setSelectedScheme('combined')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedScheme === 'combined'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            All Combined
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(prev => Math.max(0.5, Number((prev - 0.15).toFixed(2))))}
            className="p-1.5 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-600 w-10 text-center font-bold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(2.0, Number((prev + 0.15).toFixed(2))))}
            className="p-1.5 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Manual Cut-Off Point, Additional Transformer Insertion & Bifurcation Control Bar */}
      <div className={`rounded-xl p-3 border transition-colors flex flex-wrap items-center justify-between gap-3 text-xs ${
        isBifurcationActive 
          ? 'bg-purple-50/80 border-purple-300' 
          : 'bg-amber-50/60 border-amber-300'
      }`}>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
            <input
              type="checkbox"
              checked={isBifurcationActive}
              onChange={(e) => handleToggleBifurcation(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
            />
            <span>Enable Line Bifurcation & Additional Transformer (T-2) Scheme</span>
          </label>
        </div>

        {isBifurcationActive && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Cut-off node */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-amber-950">Cut-Off Node:</span>
              <select
                value={cutOffNodeId}
                onChange={(e) => handleSetCutOffNode(e.target.value)}
                className="bg-white border border-amber-400 rounded-lg px-2.5 py-1 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {feeder.nodes.map(node => (
                  <option key={node.id} value={node.id}>
                    Node {node.id} ({node.label})
                  </option>
                ))}
              </select>
            </div>

            {/* Proposed Transformer Location Node */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-purple-950">New Trf (T-2) Node:</span>
              <select
                value={transformerNodeId}
                onChange={(e) => handleSetTransformerNode(e.target.value)}
                className="bg-white border border-purple-400 rounded-lg px-2.5 py-1 text-purple-950 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                {feeder.nodes.map(node => (
                  <option key={node.id} value={node.id}>
                    Node {node.id} ({node.label}) {node.id === cutOffNodeId ? '★ Split Point' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Proposed Transformer Capacity */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-purple-950">T-2 Rating:</span>
              <select
                value={transformerCapacityKva}
                onChange={(e) => handleSetTransformerCapacity(Number(e.target.value))}
                className="bg-white border border-purple-400 rounded-lg px-2.5 py-1 text-purple-950 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                {[25, 50, 100, 200, 250, 400, 500, 630, 1000, 2500].map(cap => (
                  <option key={cap} value={cap}>
                    {cap} kVA
                  </option>
                ))}
              </select>
            </div>

            {/* Status Persistence Badge */}
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Status Saved Locally (Active until changed)</span>
            </div>
          </div>
        )}
      </div>

      {/* Render SLD Viewer */}
      <div style={{ transform: zoom !== 1 ? `scale(${zoom})` : undefined, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }}>
        <FeederSLDViewer
          feeder={feeder}
          summary={summary}
          existingSummary={existingSummary}
          bifurcationConfig={bifurcationConfig}
          scheme={selectedScheme}
          theme="light"
          showMetrics={true}
        />
      </div>

      {/* SLD Blueprint Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-emerald-800 border border-emerald-600 flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-amber-300" />
            </div>
            <span className="text-[11px]">Main Transformer Substation (T-1 @ Node 0.0)</span>
          </div>

          {isBifurcationActive && (
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-purple-900 border border-purple-400 flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-amber-300" />
              </div>
              <span className="text-[11px]">Additional Transformer (T-2: {transformerCapacityKva} kVA @ Node {transformerNodeId})</span>
            </div>
          )}

          {isBifurcationActive && (
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-600 flex items-center justify-center font-bold text-[8px] text-slate-950">
                ✂
              </div>
              <span className="text-[11px]">Cut-Off Point (Node {cutOffNodeId})</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-800" />
            <span className="text-[11px]">Distribution Pole</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[7px] font-bold">
              3Φ
            </div>
            <span className="text-[11px]">3-Phase Consumer</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-1 bg-blue-600 rounded" />
            <span className="text-[11px]">T-1 Main Span</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-1 bg-purple-600 rounded" />
            <span className="text-[11px]">T-2 Bifurcated Span</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-1 bg-red-600 rounded" />
            <span className="text-[11px]">High Drop (&gt;9%)</span>
          </div>
        </div>

        <span className="font-mono text-[10px] text-slate-500">
          WAPDA Distribution Engineering Standard
        </span>
      </div>

      {/* ========================================================
          EMBEDDED NODE ANALYSIS OF EXIST, PROPOSED-1, AND PROPOSED-2 LINES
          (0 YEARS AND AFTER 5 YEARS)
         ======================================================== */}
      {isBifurcationActive && showNodeAnalysis && bifurcationDossier && (
        <div className="mt-8 pt-6 border-t-2 border-dashed border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-700" />
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                Node Analysis of Exist, Proposed-1, and Proposed-2 Lines (0 Years & After 5 Years)
              </h3>
            </div>
            <span className="text-xs font-mono text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
              WAPDA Engineering Standard Analysis
            </span>
          </div>

          <BifurcationStatementsPanel
            dossier={bifurcationDossier}
            currencySymbol={feeder.currencySymbol || 'PKR'}
            onOpenPrintReport={onOpenPrintReport}
          />
        </div>
      )}
    </div>
  );
};
