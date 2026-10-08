/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  FeederData, 
  FeederAnalysisSummary, 
  SegmentAnalysisResult,
  BifurcationConfig 
} from '../types/feeder';
import { calculateNonOverlappingSLDLayout } from '../utils/sldLayout';
import { Zap, Layers, Split, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';

export type SLDSchemeType = 'exist' | 'proposed_1' | 'proposed_2' | 'combined' | 'tri_scheme';

interface FeederSLDViewerProps {
  feeder: FeederData;
  summary: FeederAnalysisSummary;
  existingSummary?: FeederAnalysisSummary;
  bifurcationConfig?: BifurcationConfig;
  onUpdateBifurcation?: (config: BifurcationConfig) => void;
  scheme?: SLDSchemeType;
  title?: string;
  subtitle?: string;
  isPrintView?: boolean;
  theme?: 'dark' | 'light';
  height?: number | string;
  showMetrics?: boolean;
  diagramScale?: number;
}

export const FeederSLDViewer: React.FC<FeederSLDViewerProps> = ({
  feeder,
  summary,
  existingSummary,
  bifurcationConfig,
  onUpdateBifurcation,
  scheme = 'combined',
  title,
  subtitle,
  isPrintView = false,
  theme = 'light',
  height,
  showMetrics = true,
  diagramScale = 1.0
}) => {
  const layout = useMemo(() => {
    return calculateNonOverlappingSLDLayout(feeder);
  }, [feeder]);

  const [isDragging, setIsDragging] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging || !onUpdateBifurcation || !bifurcationConfig) return;
    
    const transformerNode = layout.nodes.find(n => n.id === proposedTransformerNodeId);
    if (!transformerNode) return;

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // Scale transformation (SVG viewBox vs client rect)
    const svgPoint = (mouseX - rect.left) * (layout.viewBox.split(' ')[2] / rect.width);
    const newLength = Math.max(0, (transformerNode.x - svgPoint));

    onUpdateBifurcation({
        ...bifurcationConfig,
        htExtensionMeters: Math.round(newLength / 50) * 50
    });
  };

  const isHt = feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000;

  // Use appropriate summary for segment results
  const effectiveSummary = scheme === 'exist' && existingSummary ? existingSummary : summary;

  const segmentResultMap = useMemo(() => {
    const map = new Map<string, SegmentAnalysisResult>();
    effectiveSummary.segmentResults.forEach(r => {
      map.set(`${r.fromNodeId}->${r.toNodeId}`, r);
      map.set(r.segment.id, r);
    });
    return map;
  }, [effectiveSummary]);

  const cutOffNodeId = summary.bifurcationNodeId || '3.0';
  const proposedTransformerNodeId = summary.transformerNodeId || summary.bifurcationNodeId || '3.0';

  // Helper to check if a node/segment belongs to the current scheme filter
  const isSegmentVisibleInScheme = (fromNodeId: string, toNodeId: string, fedBy?: 'T1' | 'T2', activeScheme: SLDSchemeType = scheme) => {
    if (activeScheme === 'exist' || activeScheme === 'combined') return true;
    if (activeScheme === 'proposed_1') {
      if (toNodeId === cutOffNodeId) return true; // Keep cut-off segment visible to show TIE OPEN
      return fedBy === 'T1' || !fedBy;
    }
    if (activeScheme === 'proposed_2') {
      if (toNodeId === cutOffNodeId) return true; // Keep cut-off segment visible to show TIE OPEN
      return fedBy === 'T2';
    }
    return true;
  };

  const isNodeVisibleInScheme = (nodeId: string, activeScheme: SLDSchemeType = scheme) => {
    if (activeScheme === 'exist' || activeScheme === 'combined') return true;
    if (activeScheme === 'proposed_1') {
      const seg = effectiveSummary.segmentResults.find(s => s.toNodeId === nodeId);
      if (nodeId === '0.0') return true;
      return seg ? seg.fedByTransformer === 'T1' || !seg.fedByTransformer : true;
    }
    if (activeScheme === 'proposed_2') {
      if (nodeId === proposedTransformerNodeId || nodeId === cutOffNodeId) return true;
      const seg = effectiveSummary.segmentResults.find(s => s.toNodeId === nodeId);
      return seg ? seg.fedByTransformer === 'T2' : false;
    }
    return true;
  };

  const renderSingleDiagramSvg = (
    currentScheme: 'exist' | 'proposed_1' | 'proposed_2' | 'combined',
    diagramTitle?: string,
    diagramBadge?: string,
    badgeColor?: string
  ) => {
    const isDark = theme === 'dark';
    const isExist = currentScheme === 'exist';
    const isProp1 = currentScheme === 'proposed_1';
    const isProp2 = currentScheme === 'proposed_2';

    // Locally shadow the summaries and result maps to dynamically target the active scheme
    const effectiveSummary = (isExist && existingSummary) ? existingSummary : summary;

    const segmentResultMap = (() => {
      const map = new Map<string, SegmentAnalysisResult>();
      effectiveSummary.segmentResults.forEach(r => {
        map.set(`${r.fromNodeId}->${r.toNodeId}`, r);
        map.set(r.segment.id, r);
      });
      return map;
    })();

    const isSegmentVisibleInScheme = (fromNodeId: string, toNodeId: string, fedBy?: 'T1' | 'T2', activeScheme?: any) => {
      if (isExist || currentScheme === 'combined') return true;
      if (isProp1) {
        if (toNodeId === cutOffNodeId) return true; // Keep cut-off segment visible to show TIE OPEN
        return fedBy === 'T1' || !fedBy;
      }
      if (isProp2) {
        if (toNodeId === cutOffNodeId) return true; // Keep cut-off segment visible to show TIE OPEN
        return fedBy === 'T2';
      }
      return true;
    };

    const isNodeVisibleInScheme = (nodeId: string, activeScheme?: any) => {
      if (isExist || currentScheme === 'combined') return true;
      if (isProp1) {
        const seg = effectiveSummary.segmentResults.find(s => s.toNodeId === nodeId);
        if (nodeId === '0.0') return true;
        return seg ? seg.fedByTransformer === 'T1' || !seg.fedByTransformer : true;
      }
      if (isProp2) {
        if (nodeId === proposedTransformerNodeId || nodeId === cutOffNodeId) return true;
        const seg = effectiveSummary.segmentResults.find(s => s.toNodeId === nodeId);
        return seg ? seg.fedByTransformer === 'T2' : false;
      }
      return true;
    };

    // Count strictly active spans in this specific scheme using the shadowed effectiveSummary
    const activeSchemeSegs = effectiveSummary.segmentResults.filter(s => {
      if (isExist) return true;
      if (isProp1) return s.toNodeId !== cutOffNodeId && (s.fedByTransformer === 'T1' || !s.fedByTransformer);
      if (isProp2) return s.fedByTransformer === 'T2';
      return true;
    });

    const htExtensionSpans = bifurcationConfig && bifurcationConfig.htExtensionMeters 
      ? (bifurcationConfig.htExtensionMeters / 50).toFixed(1) 
      : null;

    const visibleLengthM = activeSchemeSegs.reduce((sum, s) => sum + s.lengthMeters, 0);
    const visibleLossKw = activeSchemeSegs.reduce((sum, s) => sum + s.lineLossKw, 0);
    const maxDrop = activeSchemeSegs.reduce((max, s) => s.percentVoltDrop > max ? s.percentVoltDrop : max, 0);

    const schemeCurrentAmps = isProp1 
      ? (summary.transformer1DemandKva ? Number((summary.transformer1DemandKva / (Math.sqrt(3) * 0.4)).toFixed(1)) : (existingSummary ? Number((existingSummary.totalSourceCurrentAmps * 0.58).toFixed(1)) : 104.1))
      : isProp2 
        ? (summary.transformer2DemandKva ? Number((summary.transformer2DemandKva / (Math.sqrt(3) * 0.4)).toFixed(1)) : (summary.totalSourceCurrentAmps ? Number((summary.totalSourceCurrentAmps * 0.58).toFixed(1)) : 104.1))
        : (isExist && existingSummary ? existingSummary.totalSourceCurrentAmps : summary.totalSourceCurrentAmps);

    const schemeTrfKva = isProp1
      ? (summary.existingTransformerKva || 100)
      : isProp2
        ? (summary.additionalTransformerKva || 100)
        : (summary.existingTransformerKva || 100);

    return (
      <div className={`rounded-xl border ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-300 bg-white'} overflow-hidden shadow-xs print:rounded-none print:border-slate-800 flex flex-col`}>
        {/* Header Bar */}
        <div className={`px-3.5 py-2.5 ${
          isProp2 
            ? 'bg-purple-900 text-white' 
            : isProp1 
              ? 'bg-blue-900 text-white' 
              : 'bg-slate-900 text-white'
        } flex flex-wrap items-center justify-between gap-2 text-xs`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[11px] ${
              isProp2 ? 'bg-purple-500/30 text-purple-200' : isProp1 ? 'bg-blue-500/30 text-blue-200' : 'bg-amber-500/30 text-amber-300'
            }`}>
              {isProp2 ? 'P2' : isProp1 ? 'P1' : 'EX'}
            </div>
            <div>
              <span className="font-bold tracking-wide uppercase block">
                {diagramTitle || (
                  isExist 
                    ? '1. Existing Single Line Diagram (Baseline Feeder)'
                    : isProp1
                      ? '2. Proposed-1 Single Line Diagram (Transformer T-1 Portion)'
                      : isProp2
                        ? '3. Proposed-2 Single Line Diagram (Transformer T-2 Bifurcated Portion)'
                        : 'Single Line Diagram Topology'
                )}
              </span>
              <span className="text-[10px] text-slate-300 font-sans block">
                {isExist 
                  ? `Main Substation T-1 (${schemeTrfKva} kVA) · Un-bifurcated Radial Feed · Total Peak Current: ${schemeCurrentAmps} A`
                  : isProp1
                    ? `Main Substation T-1 (${schemeTrfKva} kVA @ Node 0.0) · Upstream Trunk · Peak Current: ${schemeCurrentAmps} A`
                    : `Additional Substation T-2 (${schemeTrfKva} kVA @ Node ${proposedTransformerNodeId}) · Cut-Off @ Node ${cutOffNodeId} · Peak Current: ${schemeCurrentAmps} A`
                }
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${badgeColor || (
              isProp2 ? 'bg-purple-400 text-slate-950' : isProp1 ? 'bg-blue-300 text-slate-950' : 'bg-amber-400 text-slate-950'
            )}`}>
              {diagramBadge || (isExist ? 'EXISTING' : isProp1 ? 'PROPOSED-1' : isProp2 ? 'PROPOSED-2' : 'COMBINED')}
            </span>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        {showMetrics && (
          <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-700">
            <div>
              <span className="text-slate-500 font-sans mr-1">Transformer:</span>
              <strong className="text-slate-900">{schemeTrfKva} kVA</strong>
            </div>
            <div>
              <span className="text-slate-500 font-sans mr-1">Circuit Spans:</span>
              <strong className="text-slate-900">{activeSchemeSegs.length} spans ({visibleLengthM}m)</strong>
            </div>
            <div>
              <span className="text-slate-500 font-sans mr-1">Max Volt Drop:</span>
              <strong className={maxDrop > 9.0 ? 'text-rose-600' : 'text-slate-900'}>-{maxDrop.toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-slate-500 font-sans mr-1">Line Loss:</span>
              <strong className="text-amber-700">{visibleLossKw.toFixed(3)} kW</strong>
            </div>
          </div>
        )}

        {/* SVG Canvas */}
        <div className={`p-4 overflow-x-auto print:overflow-visible flex items-center justify-center ${isDark ? 'bg-slate-950' : (isPrintView ? 'bg-white' : 'bg-slate-50/60')}`}>
          <svg
            width="100%"
            height={layout.height}
            viewBox={layout.viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="w-full max-w-full h-auto select-none"
            style={{ 
              minHeight: isPrintView ? (260 * diagramScale) + 'px' : (300 * diagramScale) + 'px',
              maxHeight: isPrintView ? (600 * diagramScale) + 'px' : undefined,
              width: '100%',
              height: 'auto',
              transform: `scale(${diagramScale})`,
              transformOrigin: 'top center'
            }}
          >
            <defs>
              <marker
                id={`arrow-${currentScheme}`}
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#475569" />
              </marker>
            </defs>

            {/* Render Segments (Lines) */}
            {layout.segments.map(seg => {
              const segResult = segmentResultMap.get(`${seg.fromNodeId}->${seg.toNodeId}`);
              const isCutSegment = (summary.bifurcationActive || isProp1 || isProp2) && seg.toNodeId === cutOffNodeId;
              const isFedByT2 = segResult?.fedByTransformer === 'T2';
              const isVisible = isSegmentVisibleInScheme(seg.fromNodeId, seg.toNodeId, segResult?.fedByTransformer, currentScheme);

              // Color rules
              let strokeColor = '#2563eb'; // blue
              let isMuted = false;

              if (isExist) {
                // In Existing mode: all segments fed by T1
                strokeColor = segResult && segResult.percentVoltDrop > 9.0 ? '#dc2626' : (segResult && segResult.isHighLoss ? '#ea580c' : '#2563eb');
              } else if (isProp1) {
                if (isCutSegment) {
                  strokeColor = '#94a3b8'; // dashed tie open
                } else if (isFedByT2) {
                  isMuted = true;
                  strokeColor = '#cbd5e1'; // de-energized/isolated in T1 view
                } else {
                  strokeColor = segResult && segResult.percentVoltDrop > 9.0 ? '#dc2626' : '#2563eb';
                }
              } else if (isProp2) {
                if (isCutSegment) {
                  strokeColor = '#94a3b8';
                } else if (!isFedByT2) {
                  isMuted = true;
                  strokeColor = '#cbd5e1'; // upstream T1 portion muted in T2 view
                } else {
                  strokeColor = segResult && segResult.percentVoltDrop > 9.0 ? '#dc2626' : '#7c3aed';
                }
              } else {
                // Combined
                if (isCutSegment) strokeColor = '#94a3b8';
                else if (isFedByT2) strokeColor = '#7c3aed';
                else strokeColor = segResult && segResult.percentVoltDrop > 9.0 ? '#dc2626' : '#2563eb';
              }

              const x1 = seg.x1;
              const y1 = seg.y1;
              const x2 = seg.x2;
              const y2 = seg.y2;
              const midX = seg.midX;
              const midY = seg.midY;

              return (
                <g key={seg.id} opacity={isMuted ? 0.22 : 1.0}>
                  {/* Main span line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth={isMuted ? 1.5 : (isCutSegment ? 2 : (segResult?.isHighLoss ? 4 : 3))}
                    strokeLinecap="round"
                    strokeDasharray={isCutSegment ? "6 6" : (isMuted ? "3 3" : undefined)}
                  />

                  {/* Span Info Label Box (only if visible & not muted) */}
                  {!isMuted && isVisible && (
                    <g transform={`translate(${midX}, ${midY - 14})`}>
                      <rect
                        x="-38"
                        y="-10"
                        width="76"
                        height="20"
                        rx="4"
                        fill="#ffffff"
                        stroke={isCutSegment ? '#94a3b8' : (isFedByT2 && !isExist ? '#7c3aed' : (segResult?.isHighLoss ? '#dc2626' : '#64748b'))}
                        strokeWidth="1.2"
                        className="filter drop-shadow-xs"
                      />
                      <text
                        x="0"
                        y="-1"
                        textAnchor="middle"
                        fill={isCutSegment ? '#64748b' : '#0f172a'}
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {isCutSegment 
                          ? '✂ TIE OPEN' 
                          : (segResult ? `${segResult.currentAmps}A` : 'Span')}
                      </text>
                      <text
                        x="0"
                        y="7"
                        textAnchor="middle"
                        fill={isCutSegment ? '#94a3b8' : (segResult?.isHighLoss ? '#b91c1c' : '#475569')}
                        fontSize="7"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {isCutSegment ? 'Cut-Off Point' : (segResult ? `${segResult.lineLossKw} kW` : '')}
                      </text>
                    </g>
                  )}

                  {/* Conductor & Length Badge */}
                  {!isMuted && isVisible && segResult && !isCutSegment && (
                    <g transform={`translate(${midX}, ${midY + 14})`}>
                      <rect
                        x="-28"
                        y="-5"
                        width="56"
                        height="11"
                        rx="2"
                        fill="#f8fafc"
                        stroke="#cbd5e1"
                        strokeWidth="0.8"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#334155"
                        fontSize="6.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {segResult.conductor.code} · {segResult.lengthMeters}m
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Render HT Line Extension */}
            {isProp2 && htExtensionSpans && (
              <g>
                {/* HT Line - Spans */}
                <line
                  x1={layout.nodes.find(n => n.id === proposedTransformerNodeId)?.x || 0}
                  y1={(layout.nodes.find(n => n.id === proposedTransformerNodeId)?.y || 0) - 25}
                  x2={(layout.nodes.find(n => n.id === proposedTransformerNodeId)?.x || 0) - (Number(htExtensionSpans) * 50)}
                  y2={(layout.nodes.find(n => n.id === proposedTransformerNodeId)?.y || 0) - 25}
                  stroke="#059669"
                  strokeWidth="3"
                  strokeDasharray="4 4"
                />
                
                {/* Poles for each span */}
                {Array.from({ length: Math.floor(Number(htExtensionSpans)) }).map((_, i) => (
                  <circle
                    key={i}
                    cx={(layout.nodes.find(n => n.id === proposedTransformerNodeId)?.x || 0) - (i + 1) * 50}
                    cy={(layout.nodes.find(n => n.id === proposedTransformerNodeId)?.y || 0) - 25}
                    r="5"
                    fill="#ffffff"
                    stroke="#059669"
                    strokeWidth="2"
                  />
                ))}

                <text
                  x={(layout.nodes.find(n => n.id === proposedTransformerNodeId)?.x || 0) - (Number(htExtensionSpans) * 25)}
                  y={(layout.nodes.find(n => n.id === proposedTransformerNodeId)?.y || 0) - 35}
                  textAnchor="middle"
                  fill="#059669"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {htExtensionSpans} Spans HT Extension
                </text>
              </g>
            )}

            {/* Render Nodes (Poles & Substations) */}
            {layout.nodes.map(node => {
              const x = node.x;
              const y = node.y;
              const isBifurcationInjectionNode = (summary.bifurcationActive || isProp2) && node.id === proposedTransformerNodeId;
              const incomingSegResult = segmentResultMap.get(
                `${effectiveSummary.segmentResults.find(r => r.toNodeId === node.id)?.fromNodeId}->${node.id}`
              ) || effectiveSummary.segmentResults.find(r => r.toNodeId === node.id);

              const isNodeMuted = isProp1 
                ? (incomingSegResult?.fedByTransformer === 'T2')
                : isProp2 
                  ? (node.id !== proposedTransformerNodeId && (!incomingSegResult || incomingSegResult.fedByTransformer !== 'T2'))
                  : false;

              return (
                <g key={node.id} transform={`translate(${x}, ${y})`} opacity={isNodeMuted ? 0.22 : 1.0}>
                  {/* Transformer Node / Node 0 Substation Bus (Active in Exist, Proposed-1, Combined) */}
                  {(node.isTransformerNode || node.id === '0.0') && !isProp2 ? (
                    <g>
                      <rect
                        x="-24"
                        y="-24"
                        width="48"
                        height="48"
                        rx="6"
                        fill={isHt ? "#1e3a8a" : "#065f46"}
                        stroke={isHt ? "#3b82f6" : "#047857"}
                        strokeWidth="2"
                      />
                      <Zap className="w-5 h-5 text-amber-300" x="-10" y="-14" />
                      <text
                        x="0"
                        y="6"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {isHt ? `Grid Bay (Node 0)` : `T-1: ${summary.existingTransformerKva}kVA`}
                      </text>
                      <text
                        x="0"
                        y="14"
                        textAnchor="middle"
                        fill={isHt ? "#bfdbfe" : "#a7f3d0"}
                        fontSize="6"
                        fontFamily="monospace"
                      >
                        {isHt ? `Inj: ${(summary.baseVoltage / 1000).toFixed(2)} kV` : (isExist ? `${summary.existingTransformerLoadingPercent}%` : `${summary.transformer1LoadingPercent || summary.existingTransformerLoadingPercent}%`) + ' Load'}
                      </text>
                      {isHt && (
                        <text
                          x="0"
                          y="20"
                          textAnchor="middle"
                          fill="#fef08a"
                          fontSize="5.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {summary.totalSourceCurrentAmps} A
                        </text>
                      )}
                    </g>
                  ) : isBifurcationInjectionNode && (isProp2 || currentScheme === 'combined') ? (
                    /* Second HT Line Extension (Grid-fed) or Proposed-2 Transformer Node (T-2) */
                    <g>
                      <rect
                        x="-25"
                        y="-25"
                        width="50"
                        height="50"
                        rx="6"
                        fill="#4c1d95"
                        stroke="#a855f7"
                        strokeWidth="2.2"
                        className="filter drop-shadow-md"
                      />
                      <Zap className="w-5 h-5 text-amber-300" x="-10" y="-15" />
                      <text
                        x="0"
                        y="6"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="7.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {isHt ? '2nd HT Line' : `T-2: ${schemeTrfKva}kVA`}
                      </text>
                      <text
                        x="0"
                        y="14"
                        textAnchor="middle"
                        fill="#e9d5ff"
                        fontSize="6"
                        fontFamily="monospace"
                      >
                        {isHt ? 'Grid Extension' : `Inj: ${summary.baseVoltage || 400}V (0.0%)`}
                      </text>
                      <text
                        x="0"
                        y="21"
                        textAnchor="middle"
                        fill="#fef08a"
                        fontSize="5.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {isHt ? `${schemeCurrentAmps} A` : `Load: ${summary.transformer2LoadingPercent || 48}% (${schemeCurrentAmps}A)`}
                      </text>
                    </g>
                  ) : (
                    /* Regular Distribution Pole Node */
                    <g>
                      <circle
                        r="11"
                        fill={isBifurcationInjectionNode ? '#4c1d95' : (node.isTransformerNode ? '#065f46' : (isProp2 && incomingSegResult?.fedByTransformer === 'T2' ? '#6b21a8' : '#1e293b'))}
                        stroke={incomingSegResult && incomingSegResult.percentVoltDrop > 9.0 ? '#dc2626' : (isProp2 && incomingSegResult?.fedByTransformer === 'T2' ? '#a855f7' : '#475569')}
                        strokeWidth="1.8"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {node.id.replace('.0', '')}
                      </text>
                    </g>
                  )}

                  {/* 3-Phase Customer Badge */}
                  {node.threePhaseCustomers > 0 && !isNodeMuted && (
                    <g transform="translate(-11, -11)">
                      <circle r="6" fill="#7c3aed" stroke="#ffffff" strokeWidth="1" />
                      <text
                        x="0"
                        y="2"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="5.5"
                        fontWeight="bold"
                      >
                        3Φ
                      </text>
                    </g>
                  )}

                  {/* Node Label Below */}
                  <text
                    x="0"
                    y={node.isTransformerNode && !isProp2 ? 32 : (isBifurcationInjectionNode && (isProp2 || currentScheme === 'combined') ? 34 : 20)}
                    textAnchor="middle"
                    fill={isBifurcationInjectionNode && isProp2 ? '#581c87' : '#0f172a'}
                    fontSize={isBifurcationInjectionNode && isProp2 ? '8.5' : '8'}
                    fontWeight="bold"
                  >
                    {isBifurcationInjectionNode && isProp2 
                      ? `Node ${node.id.replace('.0', '')} (T-2 Source)`
                      : `Node ${node.id.replace('.0', '')}`}
                  </text>

                  {/* Customer / Node KVA readout */}
                  {!isNodeMuted && (
                    <text
                      x="0"
                      y={node.isTransformerNode && !isProp2 ? 40 : (isBifurcationInjectionNode && (isProp2 || currentScheme === 'combined') ? 42 : 28)}
                      textAnchor="middle"
                      fill={isHt ? "#1e40af" : "#475569"}
                      fontSize="7"
                      fontFamily="monospace"
                      fontWeight={isHt && node.spotLoadKva ? "bold" : "normal"}
                    >
                      {isHt 
                        ? (node.spotLoadKva ? `${node.spotLoadKva} kVA (DTR)` : (node.singlePhaseCustomers ? `${node.singlePhaseCustomers} cust` : 'Pass'))
                        : `${node.singlePhaseCustomers} (1Φ)${node.threePhaseCustomers ? ` + ${node.threePhaseCustomers}(3Φ)` : ''}`}
                    </text>
                  )}

                  {/* Voltage drop readout */}
                  {!isNodeMuted && (
                    <text
                      x="0"
                      y={node.isTransformerNode && !isProp2 ? 48 : (isBifurcationInjectionNode && (isProp2 || currentScheme === 'combined') ? 50 : 36)}
                      textAnchor="middle"
                      fill={
                        isProp2 && isBifurcationInjectionNode 
                          ? '#059669' 
                          : (incomingSegResult && incomingSegResult.percentVoltDrop > 5.0 && isHt ? '#d97706' : (incomingSegResult && incomingSegResult.percentVoltDrop > 9.0 ? '#dc2626' : '#0284c7'))
                      }
                      fontSize="7"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isProp2 && isBifurcationInjectionNode
                        ? `0.0% Drop (${summary.baseVoltage || 400.0}V)`
                        : (incomingSegResult 
                            ? (isHt 
                                ? `-${incomingSegResult.percentVoltDrop.toFixed(1)}% (${(incomingSegResult.receivingVoltage / 1000).toFixed(3)} kV)`
                                : `-${incomingSegResult.percentVoltDrop.toFixed(1)}% (${incomingSegResult.receivingVoltage.toFixed(1)}V)`)
                            : (node.isTransformerNode ? `0.0% Drop (${summary.baseVoltage || 400.0}V)` : ''))}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  if (scheme === 'tri_scheme') {
    return (
      <div className="space-y-6">
        {/* Tri-Scheme Grid: 1. Exist, 2. Proposed-1, 3. Proposed-2 */}
        <div>
          {renderSingleDiagramSvg(
            'exist', 
            '1. Existing Single Line Diagram (Exist: Baseline Radial Feeder)', 
            'EXISTING (T-1 ONLY)', 
            'bg-amber-400 text-slate-950'
          )}
        </div>

        <div>
          {renderSingleDiagramSvg(
            'proposed_1', 
            '2. Proposed-1 Single Line Diagram (Main Transformer T-1 Line Portion)', 
            'PROPOSED-1 (T-1 ZONE)', 
            'bg-blue-300 text-slate-950'
          )}
        </div>

        <div>
          {renderSingleDiagramSvg(
            'proposed_2', 
            '3. Proposed-2 Single Line Diagram (Additional Transformer T-2 Line Portion)', 
            'PROPOSED-2 (T-2 ZONE)', 
            'bg-purple-300 text-slate-950'
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderSingleDiagramSvg(
        scheme === 'exist' ? 'exist' : (scheme === 'proposed_1' ? 'proposed_1' : (scheme === 'proposed_2' ? 'proposed_2' : 'combined')),
        title,
        subtitle
      )}
    </div>
  );
};
