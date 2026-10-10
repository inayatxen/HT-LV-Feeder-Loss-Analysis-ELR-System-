/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Save, 
  X, 
  CheckCircle2, 
  Zap, 
  Calculator, 
  Download, 
  FileText, 
  ShieldCheck, 
  Layers, 
  Sparkles,
  Link2,
  FolderDown,
  Clock
} from 'lucide-react';
import { FeederData, FeederAnalysisSummary } from '../types/feeder';
import { CostEstimateRecord } from '../types/costEstimation';

interface SaveUnifiedProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeder: FeederData;
  summary: FeederAnalysisSummary;
  estimate: CostEstimateRecord | null;
  onConfirmSave: (projectName: string, remarks: string) => Promise<void>;
  onExportProjectFile?: () => void;
}

export const SaveUnifiedProjectModal: React.FC<SaveUnifiedProjectModalProps> = ({
  isOpen,
  onClose,
  feeder,
  summary,
  estimate,
  onConfirmSave,
  onExportProjectFile
}) => {
  const [projectName, setProjectName] = useState(
    feeder.schemeProjectName || `${feeder.name} - Unified FLADIX & Cost Project`
  );
  const [remarks, setRemarks] = useState(
    feeder.purposeOfWork || `Unified PESCO project containing 1. FLADIX Feeder Loss Analysis and Data Indexing and 2. Line Cost Estimation under Work Order ${feeder.workOrderNo || '26-14-71-26-042'}.`
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onConfirmSave(projectName.trim(), remarks.trim());
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1600);
    } catch (err) {
      console.error('Failed to save unified project:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const workOrder = feeder.workOrderNo || estimate?.projectInfo?.workOrderNo || '26-14-71-26-042';
  const isHt = feeder.type === 'HT' || feeder.category === 'HV' || summary.baseVoltage >= 1000;
  const totalCost = estimate?.charges?.grandTotal || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/40">
              <FolderDown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Save Unified FLADIX Project</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  2-in-1 Project Bundle
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Saves <strong>1. FLADIX Feeder Loss Analysis</strong> and <strong>2. Line Cost Estimation</strong> together in one synchronized project file.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5">
          
          {/* Dual Component Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Card 1: ELR Analysis Component */}
            <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  1. FLADIX Feeder Loss Analysis
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded">
                  {isHt ? '11kV HT' : '400V LT'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Feeder:</span>
                  <strong className="text-slate-900 truncate max-w-[170px]">{feeder.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Length:</span>
                  <strong className="font-mono">{summary.totalCircuitLengthKm} km</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nodes / Spans:</span>
                  <strong className="font-mono">{feeder.nodes.length} nodes · {feeder.segments.length} spans</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Line Losses:</span>
                  <strong className="font-mono text-amber-700">{summary.totalLineLossKw} kW</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Annual Energy Loss:</span>
                  <strong className="font-mono text-slate-900">{summary.annualEnergyLossKwh.toLocaleString()} kWh</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transformer:</span>
                  <strong className="font-mono text-slate-900">{feeder.existingTransformerKva} kVA</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Cost Estimation Component */}
            <div className="bg-blue-50/60 rounded-xl border border-blue-200 p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/80">
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  2. Line Cost Estimation
                </span>
                <span className="text-[10px] font-mono font-bold bg-blue-200/70 text-blue-900 px-2 py-0.5 rounded">
                  CSR-2026
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">11-Digit Work Order:</span>
                  <strong className="font-mono text-blue-800">{workOrder}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimate No:</span>
                  <strong className="font-mono">{estimate?.projectInfo.estimateNo || 'EST-PESH-2026'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">BOQ Items:</span>
                  <strong className="font-mono">{estimate?.items.length || 0} scheduled materials</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Material Cost:</span>
                  <strong className="font-mono text-slate-900">Rs. {(estimate?.charges?.materialCost || 0).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Labour & Overheads:</span>
                  <strong className="font-mono text-slate-900">10% Lab + 16% O.H</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-blue-200/60">
                  <span className="font-bold text-blue-950">Grand Total Net:</span>
                  <strong className="font-mono text-sm text-emerald-700">Rs. {totalCost.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Project Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>Unified Project Name:</span>
              <span className="text-[11px] text-slate-400 font-normal">Identical across both modules</span>
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Gulbhar Colony 400V LT Feeder Loss Reduction & Line Cost Estimate"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Remarks & Technical Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900">
              Project Description / Engineering Remarks:
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Technical notes on feeder topology, losses, and cost estimate..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Hierarchy Metadata Preview */}
          <div className="bg-slate-100 rounded-xl p-3 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
            <span><strong>Circle:</strong> {feeder.circle || 'Peshawar Circle-1'}</span>
            <span>•</span>
            <span><strong>Division:</strong> {feeder.division || 'Cantt Division Peshawar'}</span>
            <span>•</span>
            <span><strong>Sub-Division:</strong> {feeder.subDivision || 'Gulbhar Sub-Division'}</span>
            <span>•</span>
            <span><strong>Head:</strong> {feeder.accountHead || '4-71 ELR Capital'}</span>
          </div>

          {/* Success Notification */}
          {saveSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Project Saved Successfully! Both ELR Loss Analysis and Cost Estimation are unified in database storage.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
            {onExportProjectFile && (
              <button
                type="button"
                onClick={onExportProjectFile}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Download this unified project as a JSON backup file (.pescoproject)"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export Project File (.json)</span>
              </button>
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-xl shadow-md transition-all cursor-pointer ring-1 ring-amber-300"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Both as One Project...' : 'Save as One Project'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
