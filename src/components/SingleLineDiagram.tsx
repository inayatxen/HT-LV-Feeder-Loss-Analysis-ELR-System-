/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FeederData, 
  FeederAnalysisSummary, 
  FeederNode, 
  SegmentAnalysisResult 
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
  GitFork
} from 'lucide-react';
import { calculateNonOverlappingSLDLayout } from '../utils/sldLayout';
import { FeederSLDViewer, SLDSchemeType } from './FeederSLDViewer';

interface SingleLineDiagramProps {
  feeder: FeederData;
  summary: FeederAnalysisSummary;
  existingSummary?: FeederAnalysisSummary;
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
  const [selectedScheme, setSelectedScheme] = useState<SLDSchemeType>(
    summary.bifurcationActive ? 'combined' : 'exist'
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Compute non-overlapping layout
  const layout = useMemo(() => {
    return calculateNonOverlappingSLDLayout(feeder);
  }, [feeder]);

  const effectiveSummary = selectedScheme === 'exist' && existingSummary ? existingSummary : summary;

  // Map segments results by "from->to" and segment ID
  const segmentResultMap = useMemo(() => {
    const map = new Map<string, SegmentAnalysisResult>();
    effectiveSummary.segmentResults.forEach(r => {
      map.set(`${r.fromNodeId}->${r.toNodeId}`, r);
      map.set(r.segment.id, r);
    });
    return map;
  }, [effectiveSummary]);

  const bifurcationNodeId = summary.bifurcationNodeId || '3.0';

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
              <span>Single Line Diagram (SLD) Topology</span>
              {summary.bifurcationActive && (
                <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  Bifurcation Active
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Non-overlapping topological map showing substations, distribution poles, currents, conductor codes & voltage drops.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
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

      {/* Scheme Selection Tabs (Exist, Proposed-1, Proposed-2, 3-Scheme Comparison, Combined) */}
      <div className="bg-slate-100 p-1.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] font-bold text-slate-600 mr-1 hidden sm:inline">
            SLD Scheme:
          </span>

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

          <button
            type="button"
            onClick={() => setSelectedScheme('exist')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedScheme === 'exist'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white text-amber-950 hover:bg-amber-50 border border-amber-300'
            }`}
          >
            Exist (Baseline Radial Feeder)
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
            Proposed-1 (T-1 Line Portion)
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
            Proposed-2 (T-2 Line Portion)
          </button>

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
            <span>3-Scheme Comparison (Exist vs P-1 vs P-2)</span>
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

      {/* Render SLD Viewer */}
      <div style={{ transform: zoom !== 1 ? `scale(${zoom})` : undefined, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }}>
        <FeederSLDViewer
          feeder={feeder}
          summary={summary}
          existingSummary={existingSummary}
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
            <span className="text-[11px]">Main Transformer Substation (T-1)</span>
          </div>

          {summary.bifurcationActive && (
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-purple-900 border border-purple-400 flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-amber-300" />
              </div>
              <span className="text-[11px]">Additional Transformer (T-2 @ Node {bifurcationNodeId})</span>
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
    </div>
  );
};
