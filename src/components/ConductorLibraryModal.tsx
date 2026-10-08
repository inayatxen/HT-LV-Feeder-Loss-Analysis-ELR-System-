/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, BookOpen, Check, Maximize2, Minimize2 } from 'lucide-react';
import { CONDUCTOR_LIST } from '../data/conductors';

interface ConductorLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConductorLibraryModal: React.FC<ConductorLibraryModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [conductors, setConductors] = useState(CONDUCTOR_LIST);

  if (!isOpen) return null;

  const handleAmpacityChange = (code: string, newAmpacity: number) => {
    setConductors(conductors.map(c => c.code === code ? { ...c, ampacity: newAmpacity } : c));
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center ${isMaximized ? 'p-0' : 'p-3 sm:p-4'}`}>
      <div className={`bg-white w-full ${isMaximized ? 'h-full max-w-none rounded-none my-0' : 'max-w-5xl rounded-2xl my-6'} shadow-xl border border-slate-200 overflow-hidden flex flex-col`}>
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">WAPDA & Distribution Standard Conductor Library</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isMaximized ? "Restore Window View" : "Maximize Full Screen"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4">
            Electrical parameters configured at 50 Hz, 75°C operating conductor temperature in accordance with WAPDA Distribution Code and IEEE standard feeder calculations.
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Conductor Code</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Resistance (Ω/km)</th>
                  <th className="py-2.5 px-3 text-right">Reactance (Ω/km)</th>
                  <th className="py-2.5 px-3 text-right">Continuous Ampacity</th>
                  <th className="py-2.5 px-4">Standard Application</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {conductors.map(cond => (
                  <tr key={cond.code} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-xs border border-slate-200">
                        {cond.code}
                      </span>
                      <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                        {cond.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="text-[11px] font-medium text-slate-600">
                        {cond.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                      {cond.resistancePerKm.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {cond.reactancePerKm.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                      <input 
                        type="number" 
                        value={cond.ampacity} 
                        onChange={(e) => handleAmpacityChange(cond.code, Number(e.target.value))}
                        className="w-16 font-bold text-amber-600 border border-slate-300 rounded px-1 text-right"
                      /> A
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-600 text-[11px]">
                      {cond.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Close Conductor Reference
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
