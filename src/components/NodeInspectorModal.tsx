/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FeederNode, SegmentAnalysisResult, FeederData } from '../types/feeder';
import { X, Save, Zap, BatteryCharging, Users, Activity } from 'lucide-react';

interface NodeInspectorModalProps {
  node: FeederNode | null;
  feeder: FeederData;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNode: (updatedNode: FeederNode) => void;
  incomingSegResult?: SegmentAnalysisResult;
}

export const NodeInspectorModal: React.FC<NodeInspectorModalProps> = ({
  node,
  feeder,
  isOpen,
  onClose,
  onUpdateNode,
  incomingSegResult
}) => {
  if (!isOpen || !node) return null;

  const [label, setLabel] = useState(node.label);
  const [singlePhaseCust, setSinglePhaseCust] = useState(node.singlePhaseCustomers);
  const [threePhaseCust, setThreePhaseCust] = useState(node.threePhaseCustomers);
  const [capacitorKvar, setCapacitorKvar] = useState(node.capacitorKvar || 0);
  const [spotLoadAmps, setSpotLoadAmps] = useState(node.spotLoadAmps || 0);
  const [spotLoadKva, setSpotLoadKva] = useState(node.spotLoadKva || 0);

  useEffect(() => {
    setLabel(node.label);
    setSinglePhaseCust(node.singlePhaseCustomers);
    setThreePhaseCust(node.threePhaseCustomers);
    setCapacitorKvar(node.capacitorKvar || 0);
    setSpotLoadAmps(node.spotLoadAmps || 0);
    setSpotLoadKva(node.spotLoadKva || 0);
  }, [node]);

  const handleSave = () => {
    onUpdateNode({
      ...node,
      label,
      singlePhaseCustomers: Number(singlePhaseCust),
      threePhaseCustomers: Number(threePhaseCust),
      capacitorKvar: Number(capacitorKvar),
      spotLoadAmps: Number(spotLoadAmps),
      spotLoadKva: Number(spotLoadKva)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">
                Node {node.id} {node.isTransformerNode ? '(Distribution Transformer)' : '(Distribution Pole)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {feeder.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {incomingSegResult && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">Terminal Voltage:</span>
                <span className="font-bold text-slate-800">{incomingSegResult.receivingVoltage} V</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">Voltage Drop:</span>
                <span className={`font-bold ${incomingSegResult.percentVoltDrop > 9 ? 'text-rose-600' : 'text-amber-600'}`}>
                  -{incomingSegResult.percentVoltDrop}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">Arrival Current:</span>
                <span className="font-bold text-slate-800">{incomingSegResult.currentAmps} A</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Pole Identifier / Description
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {!node.isTransformerNode && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Single-Phase Consumers (1Φ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={singlePhaseCust}
                  onChange={(e) => setSinglePhaseCust(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  @ 2.0 kVA WAPDA standard
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-purple-500" />
                  Three-Phase Consumers (3Φ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={threePhaseCust}
                  onChange={(e) => setThreePhaseCust(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Commercial / Tube-well / Mill
                </span>
              </div>
            </div>
          )}

          {/* Shunt Capacitor Setting */}
          <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
              <BatteryCharging className="w-4 h-4 text-sky-600" />
              Shunt Capacitor Bank Rating (kVAR)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Injects leading reactive kVAR to eliminate lagging current and raise tail-end line voltage.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="5"
                value={capacitorKvar}
                onChange={(e) => setCapacitorKvar(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-32 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-sky-800 focus:outline-none"
              />
              <span className="text-xs font-mono font-semibold text-slate-600">kVAR</span>
              <div className="flex items-center gap-1 ml-auto">
                {[0, 10, 20, 30].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCapacitorKvar(val)}
                    className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                      capacitorKvar === val
                        ? 'bg-sky-600 text-white border-sky-600 font-bold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {val}kVAR
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Spot Loads */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs font-semibold text-slate-800 block mb-1">
              Dedicated Spot Load (ELR Fig. 3)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold">Node Load (kVA):</span>
                  <span className="text-[10px] font-mono text-blue-700 font-bold">{spotLoadKva} kVA</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={spotLoadKva}
                  onChange={(e) => setSpotLoadKva(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none"
                />
                <div className="flex items-center gap-1 mt-1.5">
                  {[10, 25, 50, 100, 200].map(kva => (
                    <button
                      key={kva}
                      type="button"
                      onClick={() => setSpotLoadKva(kva)}
                      className={`flex-1 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                        spotLoadKva === kva
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {kva}kVA
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-0.5">Spot Load (Amps):</span>
                <input
                  type="number"
                  min="0"
                  value={spotLoadAmps}
                  onChange={(e) => setSpotLoadAmps(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply & Recalculate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
