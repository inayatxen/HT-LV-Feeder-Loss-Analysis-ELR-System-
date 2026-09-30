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
  scheme?: SLDSchemeType;
  title?: string;
  subtitle?: string;
  isPrintView?: boolean;
  theme?: 'dark' | 'light';
  height?: number | string;
  showMetrics?: boolean;
}

export const FeederSLDViewer: React.FC<FeederSLDViewerProps> = ({
  feeder,
  summary,
  existingSummary,
  scheme = 'combined',
  title,
  subtitle,
  isPrintView = false,
  theme = 'light',
  height,
  showMetrics = true
}) => {
  const layout = useMemo(() => {
    return calculateNonOverlappingSLDLayout(feeder);
  }, [feeder]);

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
  const isSegmentVisibleInScheme = (fromNodeId: string, toNodeId: string, fedBy?: 'T1' | 'T2') => {
    if (scheme === 'exist' || scheme === 'combined') return true;
    if (scheme === 'proposed_1') {
      // Cut segment to cut-off node is tie open or excluded
      if (toNodeId === cutOffNodeId) return false;
      return fedBy === 'T1' || !fedBy;
    }
    if (scheme === 'proposed_2') {
      return fedBy === 'T2';
    }
    return true;
  };

  const isNodeVisibleInScheme = (nodeId: string) => {
    if (scheme === 'exist' || scheme === 'combined') return true;
    if (scheme === 'proposed_1') {
      const seg = effectiveSummary.segmentResults.find(s => s.toNodeId === nodeId);
      if (nodeId === '0.0') return true;
      return seg ? seg.fedByTransformer === 'T1' || !seg.fedByTransformer : true;
    }
    if (scheme === 'proposed_2') {
      if (nodeId === proposedTransformerNodeId) return true;
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

    // Count visible spans and consumers in this scheme
    const visibleSegs = effectiveSummary.segmentResults.filter(s => 
      isSegmentVisibleInScheme(s.fromNodeId, s.toNodeId, s.fedByTransformer)
    );
    const visibleLengthM = visibleSegs.reduce((sum, s) => sum + s.lengthMeters, 0);
    const visibleLossKw = visibleSegs.reduce((sum, s) => sum + s.lineLossKw, 0);
    const maxDrop = visibleSegs.reduce((max, s) => s.percentVoltDrop > max ? s.percentVoltDrop : max, 0);

    const schemeCurrentAmps = isProp1 
      ? (summary.transformer1DemandKva ? Number((summary.transformer1DemandKva / (Math.sqrt(3) * 0.4)).toFixed(1)) : summary.totalSourceCurrentAmps)
      : isProp2 
        ? (summary.transformer2DemandKva ? Number((summary.transformer2DemandKva / (Math.sqrt(3) * 0.4)).toFixed(1)) : 0)
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
              <strong className="text-slate-900">{visibleSegs.length} spans ({visibleLengthM}m)</strong>
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
        <div className={`p-4 overflow-x-auto print:overflow-visible flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50/60'}`}>
          <svg
            width={layout.width}
            height={layout.height}
            viewBox={layout.viewBox}
            className="w-full max-w-full h-auto select-none"
            style={{ minHeight: isPrintView ? '240px' : '300px' }}
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
              const isVisible = isSegmentVisibleInScheme(seg.fromNodeId, seg.toNodeId, segResult?.fedByTransformer);

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
                <g key={seg.id} opacity={isMuted ? 0.35 : 1.0}>
                  {/* Main span line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth={isMuted ? 1.5 : (segResult?.isHighLoss ? 4 : 3)}
                    strokeLinecap="round"
                    strokeDasharray={isCutSegment ? "6 6" : (isMuted ? "3 3" : undefined)}
                  />

                  {/* Span Info Label Box (only if visible & not muted) */}
                  {!isMuted && isVisible && (
                    <g transform={`translate(${midX}, ${midY - 14})`}>
                      <rect
                        x="-36"
                        y="-10"
                        width="72"
                        height="20"
                        rx="4"
                        fill="#ffffff"
                        stroke={isFedByT2 && !isExist ? '#7c3aed' : (segResult?.isHighLoss ? '#dc2626' : '#64748b')}
                        strokeWidth="1.2"
                        className="filter drop-shadow-xs"
                      />
                      <text
                        x="0"
                        y="-1"
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {isCutSegment 
                          ? 'TIE OPEN' 
                          : (segResult ? `${segResult.currentAmps}A` : 'Span')}
                      </text>
                      <text
                        x="0"
                        y="7"
                        textAnchor="middle"
                        fill={segResult?.isHighLoss ? '#b91c1c' : '#475569'}
                        fontSize="7"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {isCutSegment ? 'Bifurcated' : (segResult ? `${segResult.lineLossKw} kW` : '')}
                      </text>
                    </g>
                  )}

                  {/* Conductor & Length Badge */}
                  {!isMuted && isVisible && segResult && (
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

            {/* Render Nodes (Poles & Substations) */}
            {layout.nodes.map(node => {
              const x = node.x;
              const y = node.y;
              const isBifurcationInjectionNode = (summary.bifurcationActive || isProp2) && node.id === proposedTransformerNodeId;
              const incomingSegResult = segmentResultMap.get(
                `${effectiveSummary.segmentResults.find(r => r.toNodeId === node.id)?.fromNodeId}->${node.id}`
              ) || effectiveSummary.segmentResults.find(r => r.toNodeId === node.id);

              const isNodeInProp1 = isNodeVisibleInScheme(node.id) && !isProp2;
              const isNodeInProp2 = isNodeVisibleInScheme(node.id) && isProp2;
              const isNodeMuted = isProp1 
                ? (incomingSegResult?.fedByTransformer === 'T2')
                : isProp2 
                  ? (incomingSegResult && incomingSegResult.fedByTransformer !== 'T2' && node.id !== proposedTransformerNodeId)
                  : false;

              return (
                <g key={node.id} transform={`translate(${x}, ${y})`} opacity={isNodeMuted ? 0.3 : 1.0}>
                  {/* Transformer Node (T-1 @ Node 0.0) */}
                  {node.isTransformerNode && !isProp2 ? (
                    <g>
                      <rect
                        x="-22"
                        y="-22"
                        width="44"
                        height="44"
                        rx="6"
                        fill="#065f46"
                        stroke="#047857"
                        strokeWidth="2"
                      />
                      <Zap className="w-5 h-5 text-amber-300" x="-10" y="-12" />
                      <text
                        x="0"
                        y="10"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="7.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        T-1: {summary.existingTransformerKva}kVA
                      </text>
                      <text
                        x="0"
                        y="17"
                        textAnchor="middle"
                        fill="#a7f3d0"
                        fontSize="6.5"
                        fontFamily="monospace"
                      >
                        {isExist ? `${summary.existingTransformerLoadingPercent}%` : `${summary.transformer1LoadingPercent || summary.existingTransformerLoadingPercent}%`} Load
                      </text>
                    </g>
                  ) : isBifurcationInjectionNode && (isProp2 || currentScheme === 'combined') ? (
                    /* Transformer Node (T-2 @ Injection Node) */
                    <g>
                      <rect
                        x="-22"
                        y="-22"
                        width="44"
                        height="44"
                        rx="6"
                        fill="#581c87"
                        stroke="#a855f7"
                        strokeWidth="2"
                      />
                      <Zap className="w-5 h-5 text-amber-300" x="-10" y="-12" />
                      <text
                        x="0"
                        y="10"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="7.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        T-2: {summary.additionalTransformerKva}kVA
                      </text>
                      <text
                        x="0"
                        y="17"
                        textAnchor="middle"
                        fill="#e9d5ff"
                        fontSize="6.5"
                        fontFamily="monospace"
                      >
                        {summary.transformer2LoadingPercent || 48}% Load
                      </text>
                    </g>
                  ) : (
                    /* Regular Distribution Pole Node */
                    <g>
                      <circle
                        r="11"
                        fill={isBifurcationInjectionNode ? '#581c87' : (node.isTransformerNode ? '#065f46' : '#1e293b')}
                        stroke={incomingSegResult && incomingSegResult.percentVoltDrop > 9.0 ? '#dc2626' : '#475569'}
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
                    y={node.isTransformerNode && !isProp2 ? 32 : (isBifurcationInjectionNode && (isProp2 || currentScheme === 'combined') ? 32 : 20)}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    Node {node.id.replace('.0', '')}
                  </text>

                  {/* Customer count */}
                  {!isNodeMuted && (
                    <text
                      x="0"
                      y={node.isTransformerNode && !isProp2 ? 40 : (isBifurcationInjectionNode && (isProp2 || currentScheme === 'combined') ? 40 : 28)}
                      textAnchor="middle"
                      fill="#475569"
                      fontSize="7"
                      fontFamily="monospace"
                    >
                      {node.singlePhaseCustomers} (1Φ) {node.threePhaseCustomers ? `+ ${node.threePhaseCustomers}(3Φ)` : ''}
                    </text>
                  )}

                  {/* Voltage drop readout */}
                  {!isNodeMuted && incomingSegResult && (
                    <text
                      x="0"
                      y={node.isTransformerNode && !isProp2 ? 48 : (isBifurcationInjectionNode && (isProp2 || currentScheme === 'combined') ? 48 : 36)}
                      textAnchor="middle"
                      fill={incomingSegResult.percentVoltDrop > 9.0 ? '#dc2626' : '#0284c7'}
                      fontSize="7"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      -{incomingSegResult.percentVoltDrop.toFixed(1)}% ({incomingSegResult.receivingVoltage.toFixed(1)}V)
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
