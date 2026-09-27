/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FeederAnalysisSummary, FeederData, ForecastYearResult } from '../types/feeder';
import { BarChart3, TrendingDown, Activity, PieChart, ShieldAlert } from 'lucide-react';

interface LossChartsProps {
  summary: FeederAnalysisSummary;
  feeder: FeederData;
  forecastData?: ForecastYearResult[];
}

export const LossCharts: React.FC<LossChartsProps> = ({
  summary,
  feeder,
  forecastData = []
}) => {
  const [activeChart, setActiveChart] = useState<'hotspots' | 'voltage' | 'forecast' | 'composition'>('hotspots');

  // Sorted segments for hotspot chart
  const sortedSegments = [...summary.segmentResults].sort((a, b) => b.lineLossKw - a.lineLossKw);
  const maxSegmentLoss = Math.max(...sortedSegments.map(s => s.lineLossKw), 0.1);

  // Main trunk path for voltage profile: 0.0 -> 1.0 -> 2.0 -> 3.0 -> 4.0 -> 5.0 -> 6.0 -> 7.0
  const trunkNodes = ['0.0', '1.0', '2.0', '3.0', '4.0', '5.0', '6.0', '7.0'];
  const trunkPoints = trunkNodes.map(nodeId => {
    if (nodeId === '0.0') return { nodeId, dropPct: 0, voltage: summary.baseVoltage };
    const seg = summary.segmentResults.find(s => s.toNodeId === nodeId);
    return {
      nodeId,
      dropPct: seg ? seg.percentVoltDrop : 0,
      voltage: seg ? seg.receivingVoltage : summary.baseVoltage
    };
  });

  return (
    <div className="space-y-6">
      {/* Chart Selector Bar */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveChart('hotspots')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeChart === 'hotspots'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-rose-500" />
            Loss Hotspots by Span
          </button>

          <button
            onClick={() => setActiveChart('voltage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeChart === 'voltage'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-500" />
            Trunk Voltage Drop Profile
          </button>

          <button
            onClick={() => setActiveChart('forecast')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeChart === 'forecast'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-sky-500" />
            5-Year Loss Trajectory
          </button>

          <button
            onClick={() => setActiveChart('composition')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeChart === 'composition'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-purple-500" />
            Loss Breakdown
          </button>
        </div>

        <div className="text-xs text-slate-500 px-3 hidden sm:block">
          Click any segment bar or data point for technical diagnostics
        </div>
      </div>

      {/* Chart Viewport 1: Loss Hotspots Bar Chart */}
      {activeChart === 'hotspots' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Segment Line Loss Hotspots (kW)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  Pareto Distribution
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Segment 1.0 → 2.0 and 2.0 → 3.0 contribute over 62% of entire feeder energy dissipation.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600">
              Total Feeder Loss: <span className="font-bold text-slate-900">{summary.totalLineLossKw} kW</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {sortedSegments.map((seg, idx) => {
              const pctOfTotal = ((seg.lineLossKw / summary.totalLineLossKw) * 100).toFixed(1);
              const barWidth = Math.max(2, (seg.lineLossKw / maxSegmentLoss) * 100);
              const isTopCulprit = idx < 2;

              return (
                <div key={seg.segment.id} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="w-6 font-mono text-slate-400">#{idx + 1}</span>
                      <span className="font-bold text-slate-800">
                        Span {seg.fromNodeId} → {seg.toNodeId}
                      </span>
                      <span className="text-slate-400">({seg.lengthMeters}m · {seg.conductor.code})</span>
                      {isTopCulprit && (
                        <span className="text-[10px] text-rose-700 font-semibold bg-rose-100 px-1.5 py-0.2 rounded">
                          Priority Reconductoring
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums text-xs">
                      <span className="text-slate-500">{pctOfTotal}% of total</span>
                      <span className="font-bold text-slate-900 w-16 text-right">
                        {seg.lineLossKw.toFixed(3)} kW
                      </span>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isTopCulprit
                          ? 'bg-gradient-to-r from-rose-500 to-red-600'
                          : (seg.lineLossKw > 0.5 ? 'bg-amber-500' : 'bg-sky-500')
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Viewport 2: Voltage Drop Profile Curve */}
      {activeChart === 'voltage' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Feeder Voltage Profile Along Trunk (Node 0 → 7)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Terminal -{summary.worstVoltageDropPercent}%
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory WAPDA/NEPRA limit is ±5% (380V). Drops exceeding 9% violate quality-of-service standards.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-rose-500 border border-rose-500 border-dashed" />
                9% Danger Limit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500" />
                5% Warning Limit
              </span>
            </div>
          </div>

          <div className="mt-6 w-full overflow-x-auto">
            <svg viewBox="0 0 800 280" className="w-full h-64 overflow-visible">
              <defs>
                <linearGradient id="voltageAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="50" y1="40" x2="750" y2="40" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="90" x2="750" y2="90" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="140" x2="750" y2="140" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="190" x2="750" y2="190" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="240" x2="750" y2="240" stroke="#cbd5e1" strokeWidth="1" />

              {/* 5% Warning Threshold Line */}
              {/* Scale: Y=40 is 0% drop, Y=240 is 12% drop => 16.66 px per % drop */}
              <line x1="50" y1="123" x2="750" y2="123" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
              <text x="755" y="126" fill="#f59e0b" fontSize="10" fontFamily="monospace">
                -5% (380V)
              </text>

              {/* 9% Danger Threshold Line */}
              <line x1="50" y1="190" x2="750" y2="190" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
              <text x="755" y="193" fill="#ef4444" fontSize="10" fontFamily="monospace">
                -9% (364V)
              </text>

              {/* Y Axis Labels */}
              <text x="40" y="44" textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">0% (400V)</text>
              <text x="40" y="126" textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">-5%</text>
              <text x="40" y="193" textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">-9%</text>
              <text x="40" y="244" textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">-12%</text>

              {/* Plot Path */}
              {(() => {
                const totalNodes = trunkPoints.length;
                const stepX = (750 - 50) / (totalNodes - 1);
                
                const points = trunkPoints.map((pt, i) => {
                  const x = 50 + i * stepX;
                  // y = 40 + (pt.dropPct / 12) * 200
                  const y = 40 + (pt.dropPct / 12) * 200;
                  return { x, y, pt };
                });

                const pathD = points.reduce((acc, p, idx) => 
                  idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ''
                );

                const areaD = `${pathD} L ${points[points.length - 1].x} 240 L ${points[0].x} 240 Z`;

                return (
                  <g>
                    {/* Shaded Area */}
                    <path d={areaD} fill="url(#voltageAreaGrad)" />

                    {/* Line */}
                    <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />

                    {/* Nodes Circles and Labels */}
                    {points.map((p, i) => (
                      <g key={p.pt.nodeId}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={p.pt.dropPct > 9 ? 6 : 4}
                          fill={p.pt.dropPct > 9 ? '#ef4444' : (p.pt.dropPct > 5 ? '#f59e0b' : '#10b981')}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y={p.y - 10}
                          textAnchor="middle"
                          fill={p.pt.dropPct > 9 ? '#b91c1c' : '#1e293b'}
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          -{p.pt.dropPct}%
                        </text>
                        <text
                          x={p.x}
                          y={260}
                          textAnchor="middle"
                          fill="#475569"
                          fontSize="11"
                          fontWeight="600"
                        >
                          Node {p.pt.nodeId.replace('.0', '')}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Chart Viewport 3: 5-Year Forecast Curve */}
      {activeChart === 'forecast' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>5-Year Growth Trajectory (Load vs Line Losses)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                  {feeder.annualGrowthRatePercent}% Annual Growth
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Line losses expand with the square of current (I²R), growing from 7.7 kW to 12.555 kW (+63%).
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600">
              Year 5 Energy Loss: <span className="font-bold text-slate-900">30,445 kWh/yr</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-6 gap-3">
            {forecastData.map(f => (
              <div 
                key={f.year} 
                className={`p-3 rounded-lg border transition-all ${
                  f.year === 5 
                    ? 'bg-amber-50/50 border-amber-300' 
                    : (f.year === 0 ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200')
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-bold">Year {f.year}</span>
                  <span className="font-mono text-[10px]">
                    {f.year === 0 ? 'Current' : `+${(Math.pow(1 + feeder.annualGrowthRatePercent/100, f.year) * 100 - 100).toFixed(0)}%`}
                  </span>
                </div>
                <div className="space-y-1 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Demand:</span>
                    <span className="font-bold text-slate-900">{f.demandKva} kVA</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Transformer:</span>
                    <span className={`font-semibold ${f.existingLoadingPercent > 100 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {f.existingLoadingPercent}% Ld
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Line Loss:</span>
                    <span className="font-bold text-amber-600">{f.lineLossesKw} kW</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Energy Loss:</span>
                    <span className="font-medium text-slate-600">{f.annualEnergyLossKwh.toLocaleString()} kWh</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Viewport 4: Loss Composition */}
      {activeChart === 'composition' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Loss Composition & Technical Dissipation Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison of Low Tension feeder line resistance losses versus transformer technical losses.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Distribution Line Losses
              </span>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
                {summary.totalLineLossKw} kW
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Ohmic I²R heat loss in overhead ACSR and PVC conductors along the 426m network.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Transformer Core (Iron) Loss
              </span>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
                0.32 kW
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Constant hysteresis and eddy current dissipation in the laminated silicon steel core.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Transformer Copper Loss
              </span>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
                2.30 kW
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Winding resistance dissipation under 118% overload condition.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
