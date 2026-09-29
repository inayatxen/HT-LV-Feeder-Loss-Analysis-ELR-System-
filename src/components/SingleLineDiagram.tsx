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
  Move
} from 'lucide-react';
import { calculateNonOverlappingSLDLayout } from '../utils/sldLayout';

interface SingleLineDiagramProps {
  feeder: FeederData;
  summary: FeederAnalysisSummary;
  onSelectNode?: (node: FeederNode) => void;
  onSelectSegment?: (segmentResult: SegmentAnalysisResult) => void;
  onQuickReconductor?: (segmentId: string, conductorCode: string) => void;
  onQuickCapacitor?: (nodeId: string, kvar: number) => void;
  activeCapacitors?: Record<string, number>;
  activeConductors?: Record<string, string>;
}

export const SingleLineDiagram: React.FC<SingleLineDiagramProps> = ({
  feeder,
  summary,
  onSelectNode,
  onSelectSegment,
  onQuickReconductor,
  onQuickCapacitor,
  activeCapacitors,
  activeConductors
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'standard' | 'voltage' | 'losses'>('standard');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);

  // Compute non-overlapping layout
  const layout = useMemo(() => {
    return calculateNonOverlappingSLDLayout(feeder);
  }, [feeder]);

  // Map segments results by "from->to" and segment ID
  const segmentResultMap = useMemo(() => {
    const map = new Map<string, SegmentAnalysisResult>();
    summary.segmentResults.forEach(r => {
      map.set(`${r.fromNodeId}->${r.toNodeId}`, r);
      map.set(r.segment.id, r);
    });
    return map;
  }, [summary]);

  const selectedNode = layout.nodes.find(n => n.id === selectedNodeId) || feeder.nodes.find(n => n.id === selectedNodeId);

  // Determine line color based on view mode
  const getSegmentStroke = (segResult?: SegmentAnalysisResult) => {
    if (!segResult) return '#64748b'; // slate-500

    // If bifurcated / fed by T2
    if (segResult.fedByTransformer === 'T2') {
      if (viewMode === 'voltage') {
        const drop = segResult.percentVoltDrop;
        if (drop > 9.0) return '#e11d48';
        if (drop > 5.0) return '#f59e0b';
        return '#a855f7'; // purple-500
      }
      return '#8b5cf6'; // violet-500
    }

    if (viewMode === 'voltage') {
      const drop = segResult.percentVoltDrop;
      if (drop > 9.0) return '#e11d48'; // rose-600
      if (drop > 5.0) return '#f59e0b'; // amber-500
      return '#10b981'; // emerald-500
    }

    if (viewMode === 'losses') {
      const loss = segResult.lineLossKw;
      if (loss > 1.5) return '#dc2626'; // red-600 (Hotspot!)
      if (loss > 0.5) return '#f97316'; // orange-500
      return '#0284c7'; // sky-600
    }

    // Standard mode: highlight high loss/drop
    if (segResult.isHighLoss) return '#ef4444';
    if (segResult.percentVoltDrop > 9.0) return '#f59e0b';
    return '#3b82f6'; // blue-500
  };

  const getSegmentWidth = (segResult?: SegmentAnalysisResult) => {
    if (!segResult) return 3;
    if (segResult.currentAmps === 0 && segResult.isBifurcated) return 2;
    // Thicker for higher current
    if (segResult.currentAmps > 140) return 5.5;
    if (segResult.currentAmps > 70) return 4;
    return 3;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Diagram Controls Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Single Line Topology (Non-Overlapping)</span>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('standard')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'standard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standard Topology
            </button>
            <button
              onClick={() => setViewMode('voltage')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'voltage'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Voltage Profile
            </button>
            <button
              onClick={() => setViewMode('losses')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'losses'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3 h-3 text-red-500" />
              Loss Heatmap
            </button>
          </div>

          {summary.bifurcationActive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md border border-purple-300 animate-pulse">
              <Split className="w-3 h-3" />
              Bifurcated (T-1 + T-2 Active)
            </span>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(prev => Math.max(0.5, Number((prev - 0.15).toFixed(2))))}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(2.0, Number((prev + 0.15).toFixed(2))))}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full overflow-x-auto bg-slate-950 p-6 min-h-[440px] flex items-center justify-center">
        {/* Subtle engineering grid background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}>
          <svg
            width={layout.width}
            height={layout.height}
            viewBox={layout.viewBox}
            className="overflow-visible select-none"
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
              </marker>
              <linearGradient id="grad-highloss" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>

            {/* Render Segments (Connection Lines & Branch Spans) */}
            {layout.segments.map(seg => {
              const segResult = segmentResultMap.get(`${seg.fromNodeId}->${seg.toNodeId}`);
              const strokeColor = getSegmentStroke(segResult);
              const strokeWidth = getSegmentWidth(segResult);
              const isHovered = hoveredSegmentId === seg.id;
              const isCutSegment = summary.bifurcationActive && seg.toNodeId === summary.bifurcationNodeId;

              const x1 = seg.x1;
              const y1 = seg.y1;
              const x2 = seg.x2;
              const y2 = seg.y2;
              const midX = seg.midX;
              const midY = seg.midY;

              return (
                <g 
                  key={seg.id}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredSegmentId(seg.id)}
                  onMouseLeave={() => setHoveredSegmentId(null)}
                  onClick={() => segResult && onSelectSegment?.(segResult)}
                >
                  {/* Invisible wide hit target for easy clicking */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth="24"
                  />

                  {/* Flow connection line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth={isHovered ? strokeWidth + 2.5 : strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={isCutSegment ? "6 6" : undefined}
                    className="transition-all"
                  />

                  {/* Segment Details Box (Calculated Current & Line Loss) */}
                  <g transform={`translate(${midX}, ${midY - 14})`}>
                    <rect
                      x="-42"
                      y="-12"
                      width="84"
                      height="24"
                      rx="4"
                      fill="#0f172a"
                      stroke={isHovered ? '#f59e0b' : (segResult?.fedByTransformer === 'T2' ? '#a855f7' : '#334155')}
                      strokeWidth={isHovered || segResult?.fedByTransformer === 'T2' ? "1.5" : "1"}
                      className="filter drop-shadow-md"
                    />
                    <text
                      x="0"
                      y="-1"
                      textAnchor="middle"
                      fill={segResult?.fedByTransformer === 'T2' ? '#e9d5ff' : '#f8fafc'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      {isCutSegment 
                        ? 'TIE OPEN' 
                        : (segResult ? `${segResult.currentAmps}A (${segResult.fedByTransformer || 'T1'})` : 'Span')}
                    </text>
                    <text
                      x="0"
                      y="8"
                      textAnchor="middle"
                      fill={segResult?.isHighLoss ? '#f87171' : '#94a3b8'}
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {isCutSegment ? 'Bifurcated' : (segResult ? `${segResult.lineLossKw} kW` : '')}
                    </text>
                  </g>

                  {/* Conductor Code and Span Distance Badge */}
                  {segResult && (
                    <g transform={`translate(${midX}, ${midY + 16})`}>
                      <rect
                        x="-32"
                        y="-7"
                        width="64"
                        height="14"
                        rx="3"
                        fill="#020617"
                        stroke="#1e293b"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="7.5"
                        fontFamily="monospace"
                      >
                        {segResult.conductor.code} · {Math.round(segResult.lengthKm * 1000)}m
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Render Nodes (Poles & Substations) */}
            {layout.nodes.map(node => {
              const x = node.x;
              const y = node.y;
              const isSelected = selectedNodeId === node.id;
              const hasCapacitor = (node.capacitorKvar || 0) > 0 || (activeCapacitors?.[node.id] || 0) > 0;
              const isBifurcationInjectionNode = summary.bifurcationActive && node.id === summary.bifurcationNodeId;

              // Find segment leading into this node to get voltage drop
              const incomingSegResult = summary.segmentResults.find(r => r.toNodeId === node.id);

              return (
                <g 
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    onSelectNode?.(node);
                  }}
                >
                  {/* Additional Transformer (T-2) Substation Badge at Bifurcation Node */}
                  {isBifurcationInjectionNode && (
                    <g transform="translate(0, -44)">
                      <rect
                        x="-36"
                        y="-16"
                        width="72"
                        height="32"
                        rx="6"
                        fill="#3b0764"
                        stroke="#c084fc"
                        strokeWidth="2"
                        className="filter drop-shadow-lg"
                      />
                      <Zap className="w-3.5 h-3.5 text-amber-300" x="-30" y="-12" />
                      <text
                        x="6"
                        y="-3"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        T-2 Added
                      </text>
                      <text
                        x="0"
                        y="9"
                        textAnchor="middle"
                        fill="#e9d5ff"
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {summary.additionalTransformerKva}kVA ({summary.transformer2LoadingPercent}%)
                      </text>
                      {/* Connecting indicator line */}
                      <line x1="0" y1="16" x2="0" y2="32" stroke="#c084fc" strokeWidth="2" strokeDasharray="2 2" />
                    </g>
                  )}

                  {/* Transformer Node representation */}
                  {node.isTransformerNode ? (
                    <g>
                      <rect
                        x="-26"
                        y="-26"
                        width="52"
                        height="52"
                        rx="8"
                        fill={summary.isTransformerOverloaded ? '#450a0a' : '#064e3b'}
                        stroke={summary.isTransformerOverloaded ? '#f87171' : '#34d399'}
                        strokeWidth="2"
                      />
                      <Zap className="w-5 h-5 text-amber-400" x="-10" y="-14" />
                      <text
                        x="0"
                        y="12"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="700"
                        fontFamily="monospace"
                      >
                        T-1: {summary.existingTransformerKva}kVA
                      </text>
                      <text
                        x="0"
                        y="21"
                        textAnchor="middle"
                        fill={summary.isTransformer1Overloaded ? '#fca5a5' : '#a7f3d0'}
                        fontSize="7"
                        fontFamily="monospace"
                      >
                        {summary.transformer1LoadingPercent || summary.existingTransformerLoadingPercent}%
                      </text>
                    </g>
                  ) : (
                    /* Regular Pole Node */
                    <g>
                      {/* Selection ring */}
                      {isSelected && (
                        <circle
                          r="18"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="3 3"
                          className="animate-spin"
                        />
                      )}

                      {/* Pole circle */}
                      <circle
                        r="12"
                        fill={isBifurcationInjectionNode ? '#581c87' : '#1e293b'}
                        stroke={
                          isBifurcationInjectionNode
                            ? '#c084fc'
                            : (incomingSegResult && incomingSegResult.percentVoltDrop > 9.0
                                ? '#f59e0b'
                                : '#64748b')
                        }
                        strokeWidth={isBifurcationInjectionNode ? "2.5" : "2"}
                      />

                      {/* Pole Number text */}
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {node.id.replace('.0', '')}
                      </text>
                    </g>
                  )}

                  {/* Shunt Capacitor Indicator */}
                  {hasCapacitor && (
                    <g transform="translate(14, -14)">
                      <circle r="9" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="7"
                        fontWeight="bold"
                      >
                        C
                      </text>
                    </g>
                  )}

                  {/* 3-Phase Customer badge */}
                  {node.threePhaseCustomers > 0 && (
                    <g transform="translate(-14, -14)">
                      <circle r="7" fill="#7c3aed" stroke="#a78bfa" strokeWidth="1" />
                      <text
                        x="0"
                        y="2.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="6.5"
                        fontWeight="bold"
                      >
                        3Φ
                      </text>
                    </g>
                  )}

                  {/* Node Label Below */}
                  <text
                    x="0"
                    y={node.isTransformerNode ? 36 : 24}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="9"
                    fontWeight="500"
                  >
                    Node {node.id.replace('.0', '')}
                  </text>

                  {/* Customers count */}
                  {!node.isTransformerNode && (
                    <text
                      x="0"
                      y="34"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {node.singlePhaseCustomers} cust {node.threePhaseCustomers ? `+ ${node.threePhaseCustomers}(3Φ)` : ''}
                    </text>
                  )}

                  {/* Voltage drop text */}
                  {incomingSegResult && (
                    <text
                      x="0"
                      y="44"
                      textAnchor="middle"
                      fill={incomingSegResult.percentVoltDrop > 9.0 ? '#f87171' : '#38bdf8'}
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      -{incomingSegResult.percentVoltDrop}% ({incomingSegResult.receivingVoltage}V)
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legend & Selected Node Drawer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-slate-600">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-emerald-900 border border-emerald-500 flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
            </div>
            <span>Main Transformer (T-1)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-purple-900 border border-purple-400 flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-amber-300" />
            </div>
            <span>Additional Transformer (T-2)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-500" />
            <span>Distribution Pole</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[8px] font-bold">
              C
            </div>
            <span>Shunt Capacitor</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[7px] font-bold">
              3Φ
            </div>
            <span>3-Phase Load</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-1 bg-rose-500 rounded" />
            <span>High Drop (&gt;9%) / Loss</span>
          </div>
        </div>

        {/* Selected Node Quick Info & Action */}
        {selectedNode && (
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-xs">
            <span className="font-semibold text-slate-800">
              Pole {selectedNode.id.replace('.0', '')} ({selectedNode.label})
            </span>
            <span aria-hidden="true">·</span>
            <span>1-Ph: {selectedNode.singlePhaseCustomers}</span>
            <span>3-Ph: {selectedNode.threePhaseCustomers}</span>
            {onQuickCapacitor && !selectedNode.isTransformerNode && (
              <button
                onClick={() => onQuickCapacitor(selectedNode.id, (selectedNode.capacitorKvar ? 0 : 20))}
                className="ml-2 px-2 py-0.5 text-[11px] font-semibold rounded bg-sky-100 text-sky-800 hover:bg-sky-200 transition-colors cursor-pointer"
              >
                {selectedNode.capacitorKvar ? 'Remove Cap' : '+20 kVAR Cap'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
