/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  MaterialItem, 
  MaterialCategory, 
  RateHistoryEntry 
} from '../../types/costEstimation';
import { 
  Search, 
  Plus, 
  Edit3, 
  History, 
  CheckCircle2, 
  X, 
  RotateCcw, 
  Layers, 
  Filter,
  ArrowUpDown,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface MaterialMasterViewProps {
  materials: MaterialItem[];
  onSaveMaterial: (material: MaterialItem) => void;
  onResetFactoryRates: () => void;
}

export const MaterialMasterView: React.FC<MaterialMasterViewProps> = ({
  materials,
  onSaveMaterial,
  onResetFactoryRates
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'ALL'>('ALL');
  const [selectedVoltage, setSelectedVoltage] = useState<'ALL' | 'HT' | 'LT'>('ALL');
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [viewingHistoryMaterial, setViewingHistoryMaterial] = useState<MaterialItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New rate modal state
  const [newMaterialRate, setNewMaterialRate] = useState<number>(0);
  const [newLabourRate, setNewLabourRate] = useState<number>(0);
  const [newEffectiveDate, setNewEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rateChangeRemarks, setRateChangeRemarks] = useState<string>('');
  const [approvedBy, setApprovedBy] = useState<string>('Chief Engineer (P&D) PESCO');

  // Filtered materials
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.specification.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesVoltage = selectedVoltage === 'ALL' || m.voltageApplicability === selectedVoltage || m.voltageApplicability === 'BOTH';
    return matchesSearch && matchesCategory && matchesVoltage;
  });

  const handleOpenEdit = (item: MaterialItem) => {
    setEditingMaterial(item);
    setNewMaterialRate(item.materialRate);
    setNewLabourRate(item.labourRate);
    setNewEffectiveDate(new Date().toISOString().split('T')[0]);
    setRateChangeRemarks('');
  };

  const handleSaveRateRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    const rateChanged = newMaterialRate !== editingMaterial.materialRate || newLabourRate !== editingMaterial.labourRate;
    
    let updatedHistory = [...(editingMaterial.rateHistory || [])];
    if (rateChanged) {
      const historyItem: RateHistoryEntry = {
        id: `rh-${Date.now()}`,
        rate: newMaterialRate,
        labourRate: newLabourRate,
        effectiveFrom: newEffectiveDate,
        approvedBy: approvedBy,
        remarks: rateChangeRemarks || 'Rate revision approved under official PESCO CSR schedule'
      };
      updatedHistory.unshift(historyItem);
    }

    const updated: MaterialItem = {
      ...editingMaterial,
      materialRate: Number(newMaterialRate),
      labourRate: Number(newLabourRate),
      effectiveFrom: newEffectiveDate,
      rateHistory: updatedHistory
    };

    onSaveMaterial(updated);
    setEditingMaterial(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Layers className="w-4 h-4" />
            <span>CENTRALIZED MATERIAL & RATE DATABASE</span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-500">PESCO CSR-2026</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Standard Material Master & Rate Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain authorized materials, approved composite schedule of rates (CSR), labour charges, and rate revision history. Rates are never hard-coded.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetFactoryRates}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Restore official default PESCO rate list"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restore Factory Rates</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Material</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by material code, description, or specification..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              {(['ALL', 'POLES', 'CONDUCTORS', 'INSULATORS', 'HARDWARE', 'TRANSFORMERS', 'OTHER'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'ALL' ? 'All Items' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              {(['ALL', 'HT', 'LT'] as const).map(vol => (
                <button
                  key={vol}
                  type="button"
                  onClick={() => setSelectedVoltage(vol)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    selectedVoltage === vol
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {vol}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
          <span>Showing <strong>{filteredMaterials.length}</strong> of <strong>{materials.length}</strong> catalog items</span>
          <span className="font-mono text-[11px] text-slate-400">All prices in Pakistani Rupees (PKR)</span>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3 px-3 w-12 text-center">Sr.</th>
                <th className="py-3 px-3">Material Code</th>
                <th className="py-3 px-4">Description & Specifications</th>
                <th className="py-3 px-2 text-center">Volt</th>
                <th className="py-3 px-2 text-center">Unit</th>
                <th className="py-3 px-3 text-right">Material Rate (PKR)</th>
                <th className="py-3 px-3 text-right">Labour Rate (PKR)</th>
                <th className="py-3 px-3 text-right">Total Unit Rate</th>
                <th className="py-3 px-3 text-center">Effective From</th>
                <th className="py-3 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                    No materials found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((mat, idx) => {
                  const totalRate = mat.materialRate + mat.labourRate;
                  return (
                    <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                          {mat.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans max-w-sm">
                        <span className="font-bold text-slate-900 block leading-snug">{mat.name}</span>
                        <span className="text-[11px] text-slate-500 block line-clamp-1 mt-0.5 font-normal">
                          {mat.specification}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-sans">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          mat.voltageApplicability === 'HT' 
                            ? 'bg-blue-50 text-blue-700' 
                            : mat.voltageApplicability === 'LT'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {mat.voltageApplicability}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-sans text-slate-600 font-medium">{mat.unit}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {mat.materialRate.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {mat.labourRate.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-900 bg-blue-50/30">
                        {totalRate.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[11px] text-slate-500">
                        {mat.effectiveFrom || '2026-01-01'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(mat)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Rate & Material Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {mat.rateHistory && mat.rateHistory.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setViewingHistoryMaterial(mat)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="View Rate Revision History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rate Revision Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm">Revise Material Rate (CSR Maintenance)</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRateRevision} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-mono text-blue-700 font-bold block">{editingMaterial.code}</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">{editingMaterial.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{editingMaterial.specification}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-mono">
                  <span>Unit: <strong>{editingMaterial.unit}</strong></span>
                  <span>·</span>
                  <span>Category: <strong>{editingMaterial.category}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Material Rate (PKR / {editingMaterial.unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newMaterialRate}
                    onChange={(e) => setNewMaterialRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Current: Rs. {editingMaterial.materialRate.toLocaleString()}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Labour / Erection Rate (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newLabourRate}
                    onChange={(e) => setNewLabourRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Current: Rs. {editingMaterial.labourRate.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Effective From Date
                  </label>
                  <input
                    type="date"
                    value={newEffectiveDate}
                    onChange={(e) => setNewEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Approving Authority
                  </label>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Revision Order / Justification Remarks
                </label>
                <textarea
                  rows={2}
                  value={rateChangeRemarks}
                  onChange={(e) => setRateChangeRemarks(e.target.value)}
                  placeholder="e.g. Approved under PESCO BoD Circular #49 / Current market escalation adjustment..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Audit Policy:</strong> Historical estimates prepared with previous rates will retain their historical values. Only new or revised estimates will use the new rate.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Save & Apply Rate Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rate History Modal */}
      {viewingHistoryMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">Rate History & Audit Trail: {viewingHistoryMaterial.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingHistoryMaterial(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {(viewingHistoryMaterial.rateHistory || []).map((entry, idx) => (
                  <div key={entry.id || idx} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        PKR {entry.rate.toLocaleString()} / {viewingHistoryMaterial.unit}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {entry.effectiveFrom} {entry.effectiveTo ? `to ${entry.effectiveTo}` : '(Current Active)'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-sans">
                      Labour Rate: <strong>PKR {entry.labourRate?.toLocaleString() || '0'}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 font-sans">
                      Sanctioned By: <strong>{entry.approvedBy}</strong>
                    </div>
                    {entry.remarks && (
                      <div className="text-[11px] text-slate-400 italic font-sans">
                        "{entry.remarks}"
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewingHistoryMaterial(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
