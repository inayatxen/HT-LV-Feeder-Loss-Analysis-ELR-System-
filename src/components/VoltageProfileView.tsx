/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FeederData, 
  FeederNode, 
  FeederAnalysisSummary, 
  SegmentAnalysisResult 
} from '../types/feeder';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  Search, 
  Filter, 
  ArrowRight, 
  Layers, 
  SlidersHorizontal, 
  Info, 
  Printer, 
  Maximize2, 
  Minimize2, 
  ShieldAlert, 
  Sparkles,
  GitBranch,
  Gauge
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  Legend
} from 'recharts';

interface VoltageProfileViewProps {
  feeder: FeederData;
  summary: FeederAnalysisSummary;
  existingSummary?: FeederAnalysisSummary;
  proposedSummary?: FeederAnalysisSummary;
  hasActiveInterventions?: boolean;
  onSelectNode?: (node: FeederNode) => void;
  onNavigateToWhatIf?: () => void;
}

interface NodePathPoint {
  nodeId: string;
  label: string;
  distanceMeters: number;
  nominalVoltage: number;
  receivingVoltage: number;
  dropVolts: number;
  dropPercent: number;
  // What-If proposed data if available
  proposedReceivingVoltage?: number;
  proposedDropVolts?: number;
  proposedDropPercent?: number;
}

interface NodeVoltageProfileData {
  node: FeederNode;
  segmentResult?: SegmentAnalysisResult;
  proposedSegmentResult?: SegmentAnalysisResult;
  nominalVoltage: number;
  receivingVoltage: number;
  dropVolts: number;
  dropPercent: number;
  proposedReceivingVoltage?: number;
  proposedDropVolts?: number;
  proposedDropPercent?: number;
  voltageGainVolts?: number;
  dropReliefPercent?: number;
  cumulativeDistanceMeters: number;
  pathFromSource: NodePathPoint[];
  status: 'compliant' | 'warning' | 'violation';
  proposedStatus?: 'compliant' | 'warning' | 'violation';
  upstreamConductorCode: string;
  upstreamSegmentLengthMeters: number;
  upstreamCurrentAmps: number;
  fedByTransformer: 'T1' | 'T2';
}

/**
 * High-definition Sparkline component rendering the voltage drop trajectory
 * from the source node (0.0 / Substation) up to the target feeder node.
 */
const NodeVoltageSparkline: React.FC<{
  path: NodePathPoint[];
  nominalVoltage: number;
  status: 'compliant' | 'warning' | 'violation';
  hasWhatIf?: boolean;
  metricMode?: 'drop_magnitude' | 'receiving_voltage';
}> = ({ path, nominalVoltage, status, hasWhatIf = false, metricMode = 'drop_magnitude' }) => {
  // If path has only 1 point (e.g. source node), synthesize a starting hop
  const points = path.length === 1 
    ? [
        { ...path[0], distanceMeters: 0, dropVolts: 0, dropPercent: 0, receivingVoltage: nominalVoltage },
        path[0]
      ] 
    : path;

  const width = 180;
  const height = 48;
  const paddingX = 8;
  const paddingY = 6;
  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;

  // Max drop in percentage across this path to scale sparkline
  const maxDropPct = Math.max(12, ...points.map(p => p.dropPercent), ...points.map(p => p.proposedDropPercent ?? 0));
  const minVolt = Math.min(nominalVoltage * 0.88, ...points.map(p => p.receivingVoltage));
  const maxVolt = nominalVoltage;

  // Scale functions
  const getX = (idx: number) => {
    if (points.length <= 1) return paddingX + innerW / 2;
    return paddingX + (idx / (points.length - 1)) * innerW;
  };

  const getYDrop = (dropPct: number) => {
    // 0% drop at top (paddingY), max drop at bottom (height - paddingY)
    const ratio = Math.min(1, Math.max(0, dropPct / maxDropPct));
    return paddingY + ratio * innerH;
  };

  const getYVolt = (volt: number) => {
    // Nominal voltage at top, lower voltage at bottom
    const range = maxVolt - minVolt || 1;
    const ratio = (maxVolt - volt) / range;
    return paddingY + Math.min(1, Math.max(0, ratio)) * innerH;
  };

  const getY = (p: NodePathPoint) => {
    return metricMode === 'drop_magnitude' ? getYDrop(p.dropPercent) : getYVolt(p.receivingVoltage);
  };

  const getYProposed = (p: NodePathPoint) => {
    if (p.proposedDropPercent === undefined || p.proposedReceivingVoltage === undefined) return getY(p);
    return metricMode === 'drop_magnitude' 
      ? getYDrop(p.proposedDropPercent) 
      : getYVolt(p.proposedReceivingVoltage);
  };

  // Build SVG Path strings
  const baselinePoints = points.map((p, i) => `${getX(i).toFixed(1)},${getY(p).toFixed(1)}`);
  const baselinePathD = `M ${baselinePoints.join(' L ')}`;
  const baselineAreaD = `${baselinePathD} L ${getX(points.length - 1).toFixed(1)},${height - paddingY} L ${getX(0).toFixed(1)},${height - paddingY} Z`;

  // Proposed path if What-If is active
  const proposedPoints = points.map((p, i) => `${getX(i).toFixed(1)},${getYProposed(p).toFixed(1)}`);
  const proposedPathD = `M ${proposedPoints.join(' L ')}`;

  // Status colors
  const strokeColor = status === 'violation' 
    ? '#f43f5e' 
    : status === 'warning' 
      ? '#f59e0b' 
      : '#10b981';

  const fillColor = status === 'violation'
    ? 'rgba(244, 63, 94, 0.15)'
    : status === 'warning'
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(16, 185, 129, 0.15)';

  // 5% NEPRA allowable drop threshold line in SVG
  const yThreshold5Pct = metricMode === 'drop_magnitude' 
    ? getYDrop(5.0) 
    : getYVolt(nominalVoltage * 0.95);

  const lastPoint = points[points.length - 1];
  const lastX = getX(points.length - 1);
  const lastY = getY(lastPoint);
  const lastYProp = getYProposed(lastPoint);

  return (
    <div className="relative group/sparkline flex items-center">
      <svg 
        width={width} 
        height={height} 
        className="overflow-visible select-none shrink-0"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={`grad-${status}-${path[path.length - 1]?.nodeId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* 5% Allowable Voltage Drop Guideline (Dashed line) */}
        <line
          x1={paddingX}
          y1={yThreshold5Pct}
          x2={width - paddingX}
          y2={yThreshold5Pct}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.6"
        />

        {/* Gradient Area under baseline curve */}
        <path
          d={baselineAreaD}
          fill={`url(#grad-${status}-${path[path.length - 1]?.nodeId})`}
        />

        {/* Baseline Voltage Trajectory Line */}
        <path
          d={baselinePathD}
          fill="none"
          stroke={hasWhatIf ? '#94a3b8' : strokeColor}
          strokeWidth={hasWhatIf ? '1.5' : '2'}
          strokeDasharray={hasWhatIf ? '3 2' : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* What-If Proposed Trajectory Line if active */}
        {hasWhatIf && (
          <path
            d={proposedPathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Intermediate node dots */}
        {points.slice(1, -1).map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={getX(i + 1)}
            cy={hasWhatIf ? getYProposed(p) : getY(p)}
            r="1.8"
            fill={hasWhatIf ? '#10b981' : strokeColor}
            opacity="0.8"
          />
        ))}

        {/* Starting Source Dot (Node 0) */}
        <circle
          cx={getX(0)}
          cy={getY(points[0])}
          r="2.5"
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth="1"
        />

        {/* Terminal Target Node Dot */}
        <circle
          cx={lastX}
          cy={lastY}
          r="3.5"
          fill={hasWhatIf ? '#94a3b8' : strokeColor}
          stroke="#ffffff"
          strokeWidth="1.5"
          className="drop-shadow-xs"
        />

        {hasWhatIf && (
          <circle
            cx={lastX}
            cy={lastYProp}
            r="4"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="1.5"
            className="drop-shadow-xs"
          />
        )}
      </svg>

      {/* Hover Tooltip showing path summary */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none opacity-0 group-hover/sparkline:opacity-100 transition-opacity z-30 whitespace-nowrap border border-slate-700">
        <div>Path: {points.map(p => p.nodeId).join(' → ')}</div>
        <div className="text-amber-300 font-mono">
          ΔV: {lastPoint.dropVolts.toFixed(1)}V ({lastPoint.dropPercent.toFixed(1)}%) @ {lastPoint.distanceMeters}m
        </div>
      </div>
    </div>
  );
};

export const VoltageProfileView: React.FC<VoltageProfileViewProps> = ({
  feeder,
  summary,
  existingSummary,
  proposedSummary,
  hasActiveInterventions = false,
  onSelectNode,
  onNavigateToWhatIf
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLIANT' | 'WARNING' | 'VIOLATION' | 'TRANSFORMER'>('ALL');
  const [metricMode, setMetricMode] = useState<'drop_magnitude' | 'receiving_voltage'>('drop_magnitude');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'drop_desc' | 'drop_asc' | 'distance' | 'node_id'>('drop_desc');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nominalVoltage = summary.baseVoltage || feeder.nominalVoltage;
  const isHtLine = feeder.type === 'HT' || feeder.category === 'HV' || nominalVoltage >= 1000;
  const isBifurcated = Boolean(summary.bifurcationActive);

  // Map of segments by toNodeId for easy upward traversal
  const segmentsByToNode = useMemo(() => {
    const map = new Map<string, SegmentAnalysisResult>();
    summary.segmentResults.forEach(s => map.set(s.toNodeId, s));
    return map;
  }, [summary]);

  const proposedSegmentsByToNode = useMemo(() => {
    if (!proposedSummary) return new Map<string, SegmentAnalysisResult>();
    const map = new Map<string, SegmentAnalysisResult>();
    proposedSummary.segmentResults.forEach(s => map.set(s.toNodeId, s));
    return map;
  }, [proposedSummary]);

  // Construct comprehensive node voltage data with full trace to source
  const nodesProfileData: NodeVoltageProfileData[] = useMemo(() => {
    return feeder.nodes.map(node => {
      const seg = segmentsByToNode.get(node.id);
      const propSeg = proposedSegmentsByToNode.get(node.id);

      const isSource = Boolean(node.isTransformerNode || node.id === '0.0' || !seg);
      const receivingVoltage = isSource 
        ? (summary.injectedVoltageAtNode0 || nominalVoltage)
        : (seg?.receivingVoltage ?? nominalVoltage);
      
      const dropVolts = isSource ? 0 : (nominalVoltage - receivingVoltage);
      const dropPercent = isSource ? 0 : (seg?.percentVoltDrop ?? Number(((dropVolts / nominalVoltage) * 100).toFixed(1)));

      const proposedReceivingVoltage = isSource 
        ? (proposedSummary?.injectedVoltageAtNode0 || nominalVoltage)
        : propSeg?.receivingVoltage;
      
      const proposedDropVolts = proposedReceivingVoltage !== undefined ? (nominalVoltage - proposedReceivingVoltage) : undefined;
      const proposedDropPercent = propSeg?.percentVoltDrop;

      const voltageGainVolts = proposedReceivingVoltage !== undefined ? (proposedReceivingVoltage - receivingVoltage) : undefined;
      const dropReliefPercent = proposedDropPercent !== undefined ? (dropPercent - proposedDropPercent) : undefined;

      // Status classification based on WAPDA / NEPRA distribution criteria:
      // ≤ 5.0% drop: Compliant (Normal)
      // > 5.0% and ≤ 10.0% drop: Warning (Marginal)
      // > 10.0% drop: Critical Violation
      const status: 'compliant' | 'warning' | 'violation' = 
        dropPercent > 10.0 ? 'violation' : (dropPercent > 5.0 ? 'warning' : 'compliant');

      const proposedStatus: 'compliant' | 'warning' | 'violation' | undefined = proposedDropPercent !== undefined
        ? (proposedDropPercent > 10.0 ? 'violation' : (proposedDropPercent > 5.0 ? 'warning' : 'compliant'))
        : undefined;

      // Backtrack path to source
      const pathFromSource: NodePathPoint[] = [];
      let currNodeId: string | null = node.id;
      const visited = new Set<string>();

      while (currNodeId && !visited.has(currNodeId)) {
        visited.add(currNodeId);
        const currNode = feeder.nodes.find(n => n.id === currNodeId);
        const currSeg = segmentsByToNode.get(currNodeId);
        const currPropSeg = proposedSegmentsByToNode.get(currNodeId);

        const ptRecv = currSeg ? currSeg.receivingVoltage : nominalVoltage;
        const ptDrop = currSeg ? (nominalVoltage - ptRecv) : 0;
        const ptDropPct = currSeg ? currSeg.percentVoltDrop : 0;

        pathFromSource.unshift({
          nodeId: currNodeId,
          label: currNode?.label || `Node ${currNodeId}`,
          distanceMeters: currSeg ? currSeg.lengthMeters : 0,
          nominalVoltage,
          receivingVoltage: ptRecv,
          dropVolts: ptDrop,
          dropPercent: ptDropPct,
          proposedReceivingVoltage: currPropSeg?.receivingVoltage,
          proposedDropVolts: currPropSeg ? (nominalVoltage - currPropSeg.receivingVoltage) : undefined,
          proposedDropPercent: currPropSeg?.percentVoltDrop
        });

        currNodeId = currSeg ? currSeg.fromNodeId : null;
      }

      // Compute cumulative distance along the path
      let cumulativeDist = 0;
      pathFromSource.forEach(pt => {
        cumulativeDist += pt.distanceMeters;
      });

      return {
        node,
        segmentResult: seg,
        proposedSegmentResult: propSeg,
        nominalVoltage,
        receivingVoltage,
        dropVolts,
        dropPercent,
        proposedReceivingVoltage,
        proposedDropVolts,
        proposedDropPercent,
        voltageGainVolts,
        dropReliefPercent,
        cumulativeDistanceMeters: cumulativeDist,
        pathFromSource,
        status,
        proposedStatus,
        upstreamConductorCode: seg?.conductor.code || 'N/A',
        upstreamSegmentLengthMeters: seg?.lengthMeters || 0,
        upstreamCurrentAmps: seg?.currentAmps || 0,
        fedByTransformer: seg?.fedByTransformer || 'T1'
      };
    });
  }, [feeder.nodes, segmentsByToNode, proposedSegmentsByToNode, summary, proposedSummary, nominalVoltage]);

  // Overall statistics for Top KPI Cards
  const stats = useMemo(() => {
    const totalNodes = nodesProfileData.length;
    const compliantCount = nodesProfileData.filter(d => d.status === 'compliant').length;
    const warningCount = nodesProfileData.filter(d => d.status === 'warning').length;
    const violationCount = nodesProfileData.filter(d => d.status === 'violation').length;

    const worstDropNode = [...nodesProfileData].sort((a, b) => b.dropPercent - a.dropPercent)[0];
    const avgDropPercent = Number((nodesProfileData.reduce((acc, d) => acc + d.dropPercent, 0) / (totalNodes || 1)).toFixed(2));
    const avgVoltage = Number((nodesProfileData.reduce((acc, d) => acc + d.receivingVoltage, 0) / (totalNodes || 1)).toFixed(1));

    // Proposed scenario statistics if What-If active
    const proposedWorstDrop = proposedSummary ? proposedSummary.worstVoltageDropPercent : null;
    const proposedWorstVolts = proposedSummary ? proposedSummary.worstVoltageVolts : null;
    const maxDropRelief = nodesProfileData.reduce((max, d) => Math.max(max, d.dropReliefPercent || 0), 0);

    return {
      totalNodes,
      compliantCount,
      warningCount,
      violationCount,
      worstDropNode,
      avgDropPercent,
      avgVoltage,
      proposedWorstDrop,
      proposedWorstVolts,
      maxDropRelief
    };
  }, [nodesProfileData, proposedSummary]);

  // Network Profile Chart Data: nodes ordered by distance from source
  const networkChartData = useMemo(() => {
    const sorted = [...nodesProfileData].sort((a, b) => a.cumulativeDistanceMeters - b.cumulativeDistanceMeters);
    return sorted.map(d => ({
      nodeId: d.node.id,
      label: d.node.label || `Node ${d.node.id}`,
      poleNumber: d.node.poleNumber || d.node.id,
      distanceKm: Number((d.cumulativeDistanceMeters / 1000).toFixed(3)),
      distanceMeters: d.cumulativeDistanceMeters,
      nominalVoltage: d.nominalVoltage,
      warningThresholdVoltage: Number((d.nominalVoltage * 0.95).toFixed(1)),
      criticalThresholdVoltage: Number((d.nominalVoltage * 0.90).toFixed(1)),
      receivingVoltage: Number(d.receivingVoltage.toFixed(1)),
      dropVolts: Number(d.dropVolts.toFixed(1)),
      dropPercent: Number(d.dropPercent.toFixed(1)),
      proposedReceivingVoltage: d.proposedReceivingVoltage !== undefined ? Number(d.proposedReceivingVoltage.toFixed(1)) : undefined,
      proposedDropPercent: d.proposedDropPercent !== undefined ? Number(d.proposedDropPercent.toFixed(1)) : undefined,
      status: d.status,
      fedBy: d.fedByTransformer
    }));
  }, [nodesProfileData]);

  // Filter and sort nodes for list/grid display
  const filteredNodes = useMemo(() => {
    return nodesProfileData
      .filter(d => {
        // Search term filter
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matchId = d.node.id.toLowerCase().includes(q);
          const matchLabel = (d.node.label || '').toLowerCase().includes(q);
          const matchPole = (d.node.poleNumber || '').toLowerCase().includes(q);
          if (!matchId && !matchLabel && !matchPole) return false;
        }

        // Status pill filter
        if (statusFilter === 'COMPLIANT') return d.status === 'compliant';
        if (statusFilter === 'WARNING') return d.status === 'warning';
        if (statusFilter === 'VIOLATION') return d.status === 'violation';
        if (statusFilter === 'TRANSFORMER') return Boolean(d.node.isTransformerNode || d.node.id === '0.0');
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'drop_desc') return b.dropPercent - a.dropPercent;
        if (sortBy === 'drop_asc') return a.dropPercent - b.dropPercent;
        if (sortBy === 'distance') return a.cumulativeDistanceMeters - b.cumulativeDistanceMeters;
        if (sortBy === 'node_id') return a.node.id.localeCompare(b.node.id, undefined, { numeric: true });
        return 0;
      });
  }, [nodesProfileData, searchTerm, statusFilter, sortBy]);

  const activeInspectedNode = selectedNodeId 
    ? nodesProfileData.find(d => d.node.id === selectedNodeId)
    : null;

  return (
    <div className="space-y-6">
      {/* 1. Header & Overview Title Banner */}
      <div className="card-3d p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white rounded-2xl border border-slate-700/80 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
            <Activity className="w-4 h-4 stroke-[2.2]" />
            <span>WAPDA / NEPRA DISTRIBUTION NETWORK VOLTAGE DROP PROFILING</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>Voltage Profile & Node Sparkline Visualizer</span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {isHtLine ? '11kV HT Feeder' : '400V LT Feeder'}
            </span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Per-node sparkline graphs showing cumulative voltage drop magnitude relative to nominal system voltage ({nominalVoltage}V) from the feeding source to every pole node. Monitored against standard statutory limits (±5% WAPDA warning and ±10% critical threshold).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToWhatIf && (
            <button
              onClick={onNavigateToWhatIf}
              className="btn-3d-amber flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 whitespace-nowrap"
              title="Open What-If Simulator to mitigate voltage drops"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Simulate Upgrade in What-If</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="btn-3d-slate flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 whitespace-nowrap"
            title="Print Voltage Profile Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Nominal System Voltage */}
        <div className="card-3d p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              Nominal Voltage (Vnom)
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              100% Base
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {nominalVoltage} <span className="text-xs text-slate-500 font-normal">Volts</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Injected @ Node 0:</span>
            <strong className="font-mono text-slate-700 dark:text-slate-300">
              {summary.injectedVoltageAtNode0 || nominalVoltage} V
            </strong>
          </div>
        </div>

        {/* Minimum Receiving Voltage & Worst Node */}
        <div className="card-3d p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              Minimum Receiving Voltage
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              Worst Node
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight flex items-baseline gap-2">
            <span>{stats.worstDropNode?.receivingVoltage.toFixed(1)} V</span>
            <span className="text-xs font-semibold text-rose-500">
              (-{stats.worstDropNode?.dropPercent.toFixed(1)}%)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Occurs at:</span>
            <strong className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
              {stats.worstDropNode?.node.label || `Node ${stats.worstDropNode?.node.id}`}
            </strong>
          </div>
        </div>

        {/* Max Drop Magnitude & Statutory Regulation */}
        <div className="card-3d p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-500" />
              Max Voltage Drop (ΔV)
            </span>
            <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
              stats.worstDropNode && stats.worstDropNode.dropPercent > 10.0
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : stats.worstDropNode && stats.worstDropNode.dropPercent > 5.0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            }`}>
              {stats.worstDropNode && stats.worstDropNode.dropPercent > 10.0 ? 'VIOLATION' : (stats.worstDropNode && stats.worstDropNode.dropPercent > 5.0 ? 'WARNING' : 'COMPLIANT')}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            -{stats.worstDropNode?.dropVolts.toFixed(1)} <span className="text-xs text-slate-500 font-normal">Volts</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>NEPRA Limit (±5%):</span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {nominalVoltage * 0.05} V drop
            </span>
          </div>
        </div>

        {/* Network Node Compliance Distribution */}
        <div className="card-3d p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />
              Network Compliance Health
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {stats.totalNodes} Nodes
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${(stats.compliantCount / (stats.totalNodes || 1)) * 100}%` }}
                className="bg-emerald-500 h-full"
                title={`${stats.compliantCount} Compliant Nodes (≤5%)`}
              />
              <div 
                style={{ width: `${(stats.warningCount / (stats.totalNodes || 1)) * 100}%` }}
                className="bg-amber-500 h-full"
                title={`${stats.warningCount} Warning Nodes (5-10%)`}
              />
              <div 
                style={{ width: `${(stats.violationCount / (stats.totalNodes || 1)) * 100}%` }}
                className="bg-rose-500 h-full"
                title={`${stats.violationCount} Violation Nodes (>10%)`}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              ✓ {stats.compliantCount} Good
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              ⚠ {stats.warningCount} Warn
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-bold">
              ✕ {stats.violationCount} Bad
            </span>
          </div>
        </div>
      </div>

      {/* What-If Upgrade Impact Callout Banner if Active */}
      {hasActiveInterventions && proposedSummary && (
        <div className="card-3d p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-900/30 border border-emerald-300 dark:border-emerald-700/60 rounded-xl shadow-sm text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                <span>Proposed Technical Intervention Active in Voltage Profile</span>
                <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono text-[10px] font-black">
                  +{stats.maxDropRelief.toFixed(1)}% Max Relief
                </span>
              </div>
              <p className="text-emerald-800 dark:text-emerald-300 text-[11px] mt-0.5">
                Worst voltage recovers from <strong>{summary.worstVoltageVolts}V (-{summary.worstVoltageDropPercent}%)</strong> to <strong>{proposedSummary.worstVoltageVolts}V (-{proposedSummary.worstVoltageDropPercent}%)</strong>.
                Dual sparklines indicate baseline (dashed) vs upgraded scenario (solid emerald).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 font-bold text-emerald-700 dark:text-emerald-400">
              Terminal Gain: +{(proposedSummary.worstVoltageVolts - summary.worstVoltageVolts).toFixed(1)} V
            </span>
          </div>
        </div>
      )}

      {/* 3. Master Interactive Feeder Voltage Drop Gradient Chart */}
      <div className="card-3d p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-amber-500" />
              <span>Full Feeder Voltage Profile Gradient (Source to Tail)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Receiving voltage decay relative to nominal line voltage ({nominalVoltage}V) as distance from substation/transformer increases.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[11px] text-slate-500">Thresholds:</span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px]">
              -5% Limit ({Number((nominalVoltage * 0.95).toFixed(1))}V)
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px]">
              -10% Limit ({Number((nominalVoltage * 0.90).toFixed(1))}V)
            </span>
          </div>
        </div>

        {/* Recharts Chart Viewport */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={networkChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              
              <XAxis 
                dataKey="poleNumber" 
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={0}
                label={{ value: 'Feeder Pole Nodes (Topological Distance)', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#64748b' }}
              />
              
              <YAxis 
                domain={[(dataMin: number) => Math.floor(Math.min(dataMin, nominalVoltage * 0.88)), (dataMax: number) => Math.ceil(nominalVoltage * 1.02)]}
                tick={{ fontSize: 10, fill: '#64748b' }}
                unit="V"
                width={55}
              />
              
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1.5 font-sans z-50">
                      <div className="font-bold flex items-center justify-between gap-3 border-b border-slate-700 pb-1">
                        <span className="text-amber-400">{d.label} (Pole {d.poleNumber})</span>
                        <span className="font-mono text-[10px] text-slate-400">{d.distanceMeters} meters</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono pt-1">
                        <div className="text-slate-400">Receiving Voltage:</div>
                        <div className="font-bold text-white text-right">{d.receivingVoltage} V</div>
                        
                        <div className="text-slate-400">Voltage Drop ΔV:</div>
                        <div className="font-bold text-amber-400 text-right">-{d.dropVolts} V (-{d.dropPercent}%)</div>

                        {d.proposedReceivingVoltage !== undefined && (
                          <>
                            <div className="text-emerald-400">Proposed Voltage:</div>
                            <div className="font-bold text-emerald-400 text-right">{d.proposedReceivingVoltage} V</div>

                            <div className="text-emerald-400">Voltage Relief:</div>
                            <div className="font-bold text-emerald-400 text-right">
                              +{(d.proposedReceivingVoltage - d.receivingVoltage).toFixed(1)} V
                            </div>
                          </>
                        )}

                        <div className="text-slate-400">Status:</div>
                        <div className={`font-bold text-right ${
                          d.status === 'violation' ? 'text-rose-400' : d.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {d.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

              {/* Horizontal Reference Lines */}
              <ReferenceLine y={nominalVoltage} stroke="#3b82f6" strokeWidth={1.5} label={{ value: `Nominal (${nominalVoltage}V)`, position: 'top', fill: '#3b82f6', fontSize: 10 }} />
              <ReferenceLine y={nominalVoltage * 0.95} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '-5% WAPDA Warning', position: 'right', fill: '#f59e0b', fontSize: 9 }} />
              <ReferenceLine y={nominalVoltage * 0.90} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '-10% Critical Violation', position: 'right', fill: '#f43f5e', fontSize: 9 }} />

              {/* Baseline Voltage Gradient Curve */}
              <Area 
                type="monotone" 
                dataKey="receivingVoltage" 
                name="Baseline Receiving Voltage (V)"
                stroke="#0284c7" 
                strokeWidth={2.5}
                fill="url(#colorBaselineVolt)"
                fillOpacity={0.15}
              />

              {/* Proposed Voltage Curve if What-If is active */}
              {hasActiveInterventions && (
                <Line 
                  type="monotone" 
                  dataKey="proposedReceivingVoltage" 
                  name="Proposed Upgraded Voltage (V)"
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Controls: Search, Status Filters, View Mode & Metric Toggle */}
      <div className="card-3d p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search node by Pole #, ID, or label..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Nodes ({nodesProfileData.length})
          </button>

          <button
            onClick={() => setStatusFilter('VIOLATION')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'VIOLATION'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            ✕ Violations &gt;10% ({stats.violationCount})
          </button>

          <button
            onClick={() => setStatusFilter('WARNING')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'WARNING'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            ⚠ Warning 5-10% ({stats.warningCount})
          </button>

          <button
            onClick={() => setStatusFilter('COMPLIANT')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'COMPLIANT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            ✓ Compliant ≤5% ({stats.compliantCount})
          </button>
        </div>

        {/* View Mode & Sorting */}
        <div className="flex items-center gap-2">
          {/* Sparkline Metric Display Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setMetricMode('drop_magnitude')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                metricMode === 'drop_magnitude'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Show Voltage Drop Magnitude (Volts & %)"
            >
              ΔV Drop Mode
            </button>
            <button
              onClick={() => setMetricMode('receiving_voltage')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                metricMode === 'receiving_voltage'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Show Absolute Receiving Voltage (Volts)"
            >
              V Level Mode
            </button>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
          >
            <option value="drop_desc">Sort: Worst Drop First</option>
            <option value="drop_asc">Sort: Best Voltage First</option>
            <option value="distance">Sort: Distance from Source</option>
            <option value="node_id">Sort: Node ID</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card Grid with Prominent Sparklines"
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tabular Schedule View"
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* 5. Node Display (Grid View vs Table View) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNodes.map(item => {
            const isWorst = item.node.id === stats.worstDropNode?.node.id;
            const isSelected = selectedNodeId === item.node.id;

            return (
              <div 
                key={item.node.id}
                onClick={() => {
                  setSelectedNodeId(item.node.id);
                  onSelectNode?.(item.node);
                }}
                className={`card-3d bg-white dark:bg-slate-900 rounded-xl border p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected 
                    ? 'ring-2 ring-amber-500 border-amber-500 shadow-md' 
                    : item.status === 'violation'
                      ? 'border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
                      : item.status === 'warning'
                        ? 'border-amber-200 dark:border-amber-900/60 hover:border-amber-400'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Node Card Header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      item.status === 'violation' 
                        ? 'bg-rose-500 animate-pulse' 
                        : item.status === 'warning' 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                    }`} />
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-sm">
                        <span>{item.node.label || `Node ${item.node.id}`}</span>
                        {item.node.poleNumber && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                            Pole #{item.node.poleNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>Dist: {item.cumulativeDistanceMeters}m from source</span>
                        <span>•</span>
                        <span>Source: {item.fedByTransformer}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                    item.status === 'violation'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                      : item.status === 'warning'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                  }`}>
                    {item.status} ({item.dropPercent.toFixed(1)}%)
                  </span>
                </div>

                {/* SPARKLINE GRAPH SECTION */}
                <div className="bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="shrink-0">
                    <div className="text-[10px] text-slate-400 font-medium">Trajectory from Source:</div>
                    <NodeVoltageSparkline
                      path={item.pathFromSource}
                      nominalVoltage={nominalVoltage}
                      status={item.status}
                      hasWhatIf={hasActiveInterventions && item.proposedDropPercent !== undefined}
                      metricMode={metricMode}
                    />
                  </div>

                  {/* Numerical Sparkline Terminal Metrics */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-400 font-sans">Receiving:</div>
                    <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                      {item.receivingVoltage.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">V</span>
                    </div>

                    <div className={`text-xs font-black font-mono ${
                      item.status === 'violation' ? 'text-rose-600 dark:text-rose-400' : item.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      -{item.dropVolts.toFixed(1)} V (-{item.dropPercent.toFixed(1)}%)
                    </div>
                  </div>
                </div>

                {/* What-If Upgrade Gain (if active) */}
                {hasActiveInterventions && item.proposedReceivingVoltage !== undefined && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2 text-[11px] font-mono flex items-center justify-between">
                    <span className="text-emerald-800 dark:text-emerald-300 font-sans font-semibold">
                      Proposed Voltage:
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <span>{item.proposedReceivingVoltage.toFixed(1)} V (-{item.proposedDropPercent?.toFixed(1)}%)</span>
                      <span className="text-[10px] px-1 rounded bg-emerald-200 text-emerald-900">
                        +{(item.proposedReceivingVoltage - item.receivingVoltage).toFixed(1)}V
                      </span>
                    </span>
                  </div>
                )}

                {/* Node Details & Connected Load Footer */}
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block font-sans">Upstream Span:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">
                      {item.upstreamConductorCode} ({item.upstreamSegmentLengthMeters}m)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-sans">Current:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {item.upstreamCurrentAmps} A
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 block font-sans">Load:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {item.node.threePhaseCustomers} 3-Ph / {item.node.singlePhaseCustomers} 1-Ph
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW WITH INLINE SPARKLINES */
        <div className="card-3d bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800 font-mono text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Node & Pole</th>
                  <th className="py-2.5 px-3 font-semibold">Distance</th>
                  <th className="py-2.5 px-3 font-semibold">Voltage Drop Sparkline (Source → Node)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Recv Voltage</th>
                  <th className="py-2.5 px-3 font-semibold text-right">ΔV Drop (V)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Drop %</th>
                  {hasActiveInterventions && (
                    <th className="py-2.5 px-3 font-semibold text-right text-emerald-300">Proposed V</th>
                  )}
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Conductor</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Load</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {filteredNodes.map((item, idx) => (
                  <tr 
                    key={item.node.id}
                    onClick={() => {
                      setSelectedNodeId(item.node.id);
                      onSelectNode?.(item.node);
                    }}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                      idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5 font-sans">
                        <span>{item.node.label || `Node ${item.node.id}`}</span>
                        {item.node.poleNumber && (
                          <span className="text-[10px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            P#{item.node.poleNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-3 text-slate-500">
                      {item.cumulativeDistanceMeters} m
                    </td>

                    {/* Inline Sparkline Column */}
                    <td className="py-2 px-3">
                      <NodeVoltageSparkline
                        path={item.pathFromSource}
                        nominalVoltage={nominalVoltage}
                        status={item.status}
                        hasWhatIf={hasActiveInterventions && item.proposedDropPercent !== undefined}
                        metricMode={metricMode}
                      />
                    </td>

                    <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {item.receivingVoltage.toFixed(1)} V
                    </td>

                    <td className="py-2 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                      -{item.dropVolts.toFixed(1)} V
                    </td>

                    <td className={`py-2 px-3 text-right font-black ${
                      item.status === 'violation' ? 'text-rose-600' : item.status === 'warning' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      -{item.dropPercent.toFixed(1)}%
                    </td>

                    {hasActiveInterventions && (
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.proposedReceivingVoltage?.toFixed(1) ?? '—'} V
                      </td>
                    )}

                    <td className="py-2 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        item.status === 'violation'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : item.status === 'warning'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                      {item.upstreamConductorCode}
                    </td>

                    <td className="py-2 px-3 text-right text-slate-500">
                      {item.node.threePhaseCustomers} 3P / {item.node.singlePhaseCustomers} 1P
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
