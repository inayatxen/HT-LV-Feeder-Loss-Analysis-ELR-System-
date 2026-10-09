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
  AlertCircle,
  Copy,
  Check,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { WAPDA_SCHEDULE_RAW, lookupWapdaScheduleItem } from '../../data/wapdaScheduleRates';
import { 
  downloadCsvFile, 
  generateCsvTemplateContent, 
  generateAllMaterialsCsv,
  parseAndApplyMaterialRates,
  MatchedUpdateResult 
} from '../../utils/materialCsvHelper';

interface MaterialMasterViewProps {
  materials: MaterialItem[];
  onSaveMaterial: (material: MaterialItem) => void;
  onResetFactoryRates: () => void;
  onSaveAllMaterials?: (materials: MaterialItem[]) => void;
}

export const MaterialMasterView: React.FC<MaterialMasterViewProps> = ({
  materials,
  onSaveMaterial,
  onResetFactoryRates,
  onSaveAllMaterials
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'ALL'>('ALL');
  const [selectedVoltage, setSelectedVoltage] = useState<'ALL' | 'HT' | 'LT'>('ALL');
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [viewingHistoryMaterial, setViewingHistoryMaterial] = useState<MaterialItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleSearch, setScheduleSearch] = useState('');

  // Bulk CSV / Excel Import State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkUpdateResult, setBulkUpdateResult] = useState<MatchedUpdateResult | null>(null);
  const [isParsingBulk, setIsParsingBulk] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // Edit material state
  const [editCode, setEditCode] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editSpecification, setEditSpecification] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('');
  const [newMaterialRate, setNewMaterialRate] = useState<number>(0);
  const [newLabourRate, setNewLabourRate] = useState<number>(0);
  const [newInstallationRate, setNewInstallationRate] = useState<number>(0);
  const [newTransportationRate, setNewTransportationRate] = useState<number>(0);
  const [newEffectiveDate, setNewEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rateChangeRemarks, setRateChangeRemarks] = useState<string>('');
  const [approvedBy, setApprovedBy] = useState<string>('Chief Engineer (P&D) PESCO');

  // Add new material form state
  const [newMaterialForm, setNewMaterialForm] = useState({
    code: '',
    name: '',
    category: 'POLES' as MaterialCategory,
    unit: 'Nos',
    specification: '',
    voltageApplicability: 'HT' as 'HT' | 'LT' | 'BOTH',
    defaultQtyFactor: 1,
    materialRate: 15000,
    labourRate: 2000,
    installationRate: 1200,
    transportationRate: 800,
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

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
    setEditCode(item.code);
    setEditName(item.name);
    setEditSpecification(item.specification);
    setEditUnit(item.unit);
    setNewMaterialRate(item.materialRate);
    setNewLabourRate(item.labourRate);
    setNewInstallationRate(item.installationRate || 0);
    setNewTransportationRate(item.transportationRate || 0);
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
      code: editCode.trim().toUpperCase() || editingMaterial.code,
      name: editName.trim() || editingMaterial.name,
      specification: editSpecification.trim() || editingMaterial.specification,
      unit: editUnit.trim() || editingMaterial.unit,
      materialRate: Number(newMaterialRate),
      labourRate: Number(newLabourRate),
      installationRate: Number(newInstallationRate),
      transportationRate: Number(newTransportationRate),
      effectiveFrom: newEffectiveDate,
      rateHistory: updatedHistory
    };

    onSaveMaterial(updated);
    setEditingMaterial(null);
  };

  const handleCreateNewMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialForm.code.trim() || !newMaterialForm.name.trim()) return;

    const newId = `mat-${newMaterialForm.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    const item: MaterialItem = {
      id: newId,
      code: newMaterialForm.code.trim().toUpperCase(),
      name: newMaterialForm.name.trim(),
      category: newMaterialForm.category,
      unit: newMaterialForm.unit.trim() || 'Nos',
      specification: newMaterialForm.specification.trim(),
      voltageApplicability: newMaterialForm.voltageApplicability,
      defaultQtyFactor: Number(newMaterialForm.defaultQtyFactor) || 0,
      materialRate: Number(newMaterialForm.materialRate) || 0,
      labourRate: Number(newMaterialForm.labourRate) || 0,
      installationRate: Number(newMaterialForm.installationRate) || 0,
      transportationRate: Number(newMaterialForm.transportationRate) || 0,
      effectiveFrom: newMaterialForm.effectiveFrom || new Date().toISOString().split('T')[0],
      isActive: true,
      rateHistory: [
        {
          id: `rh-${Date.now()}`,
          rate: Number(newMaterialForm.materialRate) || 0,
          labourRate: Number(newMaterialForm.labourRate) || 0,
          effectiveFrom: newMaterialForm.effectiveFrom || new Date().toISOString().split('T')[0],
          approvedBy: approvedBy,
          remarks: 'Initial item creation'
        }
      ]
    };

    onSaveMaterial(item);
    setIsAddingNew(false);
    // Reset form
    setNewMaterialForm({
      code: '',
      name: '',
      category: 'POLES',
      unit: 'Nos',
      specification: '',
      voltageApplicability: 'HT',
      defaultQtyFactor: 1,
      materialRate: 15000,
      labourRate: 2000,
      installationRate: 1200,
      transportationRate: 800,
      effectiveFrom: new Date().toISOString().split('T')[0]
    });
  };

  const handleDownloadTemplate = () => {
    downloadCsvFile('pesco_material_price_template.csv', generateCsvTemplateContent());
  };

  const handleExportCatalog = () => {
    downloadCsvFile('pesco_material_catalog_rates.csv', generateAllMaterialsCsv(materials));
  };

  const handleBulkFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setIsParsingBulk(true);
    setBulkSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const result = parseAndApplyMaterialRates(buffer, materials);
        setBulkUpdateResult(result);
      } catch (err: any) {
        alert('Error parsing file: ' + (err.message || 'Invalid format'));
      } finally {
        setIsParsingBulk(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleApplyBulkUpdates = () => {
    if (!bulkUpdateResult || bulkUpdateResult.matchedCount === 0) return;

    if (onSaveAllMaterials) {
      onSaveAllMaterials(bulkUpdateResult.updatedMaterials);
    } else {
      bulkUpdateResult.updatedItems.forEach(item => {
        const mat = bulkUpdateResult.updatedMaterials.find(m => m.code === item.code);
        if (mat) onSaveMaterial(mat);
      });
    }

    setBulkSuccessMsg(`Successfully saved ${bulkUpdateResult.matchedCount} updated material rate(s) into Material Master!`);
    setTimeout(() => {
      setShowBulkImportModal(false);
      setBulkUpdateResult(null);
      setBulkFileName('');
      setBulkSuccessMsg('');
    }, 2000);
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Download CSV format template with standard Stock Code and Rate columns"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV Template</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBulkImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 border border-amber-500/60 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Bulk update material prices via Excel or CSV spreadsheet"
          >
            <Upload className="w-3.5 h-3.5 text-slate-950" />
            <span>Update Rates (Excel/CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCatalog}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Export all current catalog materials and rates to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Browse official WAPDA Approved Schedule of Rates (Price List)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Price List (AUP)</span>
          </button>

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
              placeholder="Search material through Name or Store Code (e.g. 08110, DOG, 15310, stay rod, transformer)..."
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 group/code">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-900 group-hover/code:bg-blue-50 group-hover/code:text-blue-700 transition-colors">
                            {mat.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(mat.code);
                              setCopiedCode(mat.code);
                              setTimeout(() => setCopiedCode(null), 2000);
                            }}
                            className="opacity-0 group-hover/code:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity p-0.5 cursor-pointer"
                            title="Copy Material Code"
                          >
                            {copiedCode === mat.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
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
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Material Code</label>
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs text-blue-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Unit of Measurement</label>
                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Material Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-xs text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Specifications / Standards</label>
                  <textarea
                    rows={2}
                    value={editSpecification}
                    onChange={(e) => setEditSpecification(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Material Rate (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newMaterialRate}
                    onChange={(e) => setNewMaterialRate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Labour Rate (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newLabourRate}
                    onChange={(e) => setNewLabourRate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Installation Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newInstallationRate}
                    onChange={(e) => setNewInstallationRate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Transport Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newTransportationRate}
                    onChange={(e) => setNewTransportationRate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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

      {/* Add New Material Modal */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Add New Material to CSR Catalog</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewMaterial} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Material Code *
                  </label>
                  <input
                    type="text"
                    value={newMaterialForm.code}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. POL-09-PCC, CND-DOG-ACSR"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                    <span>Quick prefix:</span>
                    {['POL-', 'CND-', 'CBL-', 'INS-', 'HW-', 'TRF-', 'SW-', 'STR-', 'PNL-', 'EQP-'].map(pfx => (
                      <button
                        key={pfx}
                        type="button"
                        onClick={() => setNewMaterialForm(prev => ({ ...prev, code: pfx }))}
                        className="hover:text-blue-600 font-mono underline"
                      >
                        {pfx}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newMaterialForm.category}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, category: e.target.value as MaterialCategory })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="POLES">POLES</option>
                    <option value="CONDUCTORS">CONDUCTORS</option>
                    <option value="INSULATORS">INSULATORS</option>
                    <option value="HARDWARE">HARDWARE</option>
                    <option value="TRANSFORMERS">TRANSFORMERS</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Material Name / Title *
                  </label>
                  <input
                    type="text"
                    value={newMaterialForm.name}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, name: e.target.value })}
                    placeholder="e.g. PCC Pole 11 Meter / ACSR Dog Conductor"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit *
                  </label>
                  <select
                    value={newMaterialForm.unit}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Nos">Nos (Each)</option>
                    <option value="Km">Km (Kilometer)</option>
                    <option value="Meter">Meter</option>
                    <option value="Set">Set</option>
                    <option value="Kg">Kg</option>
                    <option value="Job">Job / Lumpsum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specification & WAPDA Standard Reference
                </label>
                <textarea
                  rows={2}
                  value={newMaterialForm.specification}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, specification: e.target.value })}
                  placeholder="e.g. Technical parameters, DDS standard reference, dimensions, tensile grade..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Voltage Class
                  </label>
                  <select
                    value={newMaterialForm.voltageApplicability}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, voltageApplicability: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="HT">HT (High Tension / 11kV)</option>
                    <option value="LT">LT (Low Tension / 400V)</option>
                    <option value="BOTH">BOTH (Universal HT/LT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Effective From Date
                  </label>
                  <input
                    type="date"
                    value={newMaterialForm.effectiveFrom}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Material Rate (PKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newMaterialForm.materialRate}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, materialRate: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Labour Rate (PKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newMaterialForm.labourRate}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, labourRate: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Installation (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newMaterialForm.installationRate}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, installationRate: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Transport (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newMaterialForm.transportationRate}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, transportationRate: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Save Material to Database
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

      {/* Official WAPDA Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-900">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Official WAPDA / DISCO Approved Schedule of Rates (AUP)</h3>
                  <p className="text-[11px] text-emerald-300 font-mono">Store Master Schedule (400+ Standard Line Items)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  placeholder="Filter official schedule by store code (e.g. 02110, 01110) or description (e.g. Dog, Wasp, Pole)..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {WAPDA_SCHEDULE_RAW.filter(([sc, desc]) => 
                  !scheduleSearch || sc.toLowerCase().includes(scheduleSearch.toLowerCase()) || desc.toLowerCase().includes(scheduleSearch.toLowerCase())
                ).length} of {WAPDA_SCHEDULE_RAW.length} Items Listed
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                    <th className="py-2.5 px-3 w-12 text-center">Sr.</th>
                    <th className="py-2.5 px-3 w-28">Store Code</th>
                    <th className="py-2.5 px-4">Standard WAPDA Description</th>
                    <th className="py-2.5 px-3 text-center w-20">Unit</th>
                    <th className="py-2.5 px-4 text-right w-36">Approved Unit Price (PKR)</th>
                    <th className="py-2.5 px-3 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {WAPDA_SCHEDULE_RAW.filter(([sc, desc]) => 
                    !scheduleSearch || sc.toLowerCase().includes(scheduleSearch.toLowerCase()) || desc.toLowerCase().includes(scheduleSearch.toLowerCase())
                  ).map(([sc, desc, um, aup], idx) => {
                    const isExisting = materials.some(m => m.code === sc || m.code.replace(/^0+/, '') === sc.replace(/^0+/, ''));
                    return (
                      <tr key={sc} className="hover:bg-emerald-50/50 transition-colors">
                        <td className="py-2 px-3 text-center text-slate-400 text-[11px] font-sans">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900">
                            {sc}
                          </span>
                        </td>
                        <td className="py-2 px-4 font-sans font-medium text-slate-800">
                          {desc}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600 font-sans font-semibold">
                          {um || '-'}
                        </td>
                        <td className="py-2 px-4 text-right font-bold text-emerald-800">
                          {aup > 0 ? `Rs. ${aup.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isExisting ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-sans font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setNewMaterialForm({
                                  code: sc,
                                  name: desc,
                                  category: sc.startsWith('01') ? 'POLES' : sc.startsWith('02') || sc.startsWith('14') ? 'CONDUCTORS' : sc.startsWith('05') ? 'INSULATORS' : sc.startsWith('08') ? 'TRANSFORMERS' : 'HARDWARE',
                                  unit: um || 'EA',
                                  specification: `Official WAPDA Store Code ${sc} - ${desc}`,
                                  voltageApplicability: 'HT',
                                  defaultQtyFactor: 1,
                                  materialRate: aup,
                                  labourRate: Math.round(aup * 0.15),
                                  installationRate: Math.round(aup * 0.08),
                                  transportationRate: Math.round(aup * 0.04),
                                  effectiveFrom: new Date().toISOString().split('T')[0]
                                });
                                setShowScheduleModal(false);
                                setIsAddingNew(true);
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors cursor-pointer"
                            >
                              + Add to Master
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Close Price List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV / Excel Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Bulk Update Material Rates via Spreadsheet</h3>
                  <p className="text-[11px] text-slate-400">Update composite schedule rates from Excel (.xlsx) or CSV</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBulkImportModal(false);
                  setBulkUpdateResult(null);
                  setBulkFileName('');
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* CSV Format Reference & Download Template Action */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Required Spreadsheet Columns:
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors cursor-pointer w-fit"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Download Blank CSV Template</span>
                  </button>
                </div>

                <div className="font-mono text-xs bg-slate-900 text-emerald-400 p-2.5 rounded-lg overflow-x-auto select-all">
                  Stock Code,Description,Unit,Rate,Labour Rate
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  • <strong>Stock Code</strong>: WAPDA Store Code (e.g. <code>008110</code> for 25kVA T/F, <code>01110</code> for HT Spun Pole, <code>02110</code> for Dog conductor, <code>15310</code> for Stay Rod).<br />
                  • <strong>Rate</strong>: New material unit rate in PKR.<br />
                  • <strong>Labour Rate</strong>: (Optional) New labour / installation charge.
                </p>
              </div>

              {/* Upload Input Area */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center transition-colors bg-white">
                <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Choose CSV or Excel File (.csv, .xlsx)</span>
                  <input
                    type="file"
                    onChange={handleBulkFileSelected}
                    accept=".xlsx, .xls, .csv, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                  />
                </label>
                {bulkFileName && (
                  <p className="mt-2 text-xs font-mono text-slate-700">
                    Selected: <strong className="text-emerald-700">{bulkFileName}</strong>
                  </p>
                )}
              </div>

              {/* Loading indicator */}
              {isParsingBulk && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  <span>Reading and comparing spreadsheet records...</span>
                </div>
              )}

              {/* Success message */}
              {bulkSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bulkSuccessMsg}</span>
                </div>
              )}

              {/* Preview Table of Matched Items */}
              {bulkUpdateResult && bulkUpdateResult.matchedCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Matched Materials to Update ({bulkUpdateResult.matchedCount}):
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Ready to apply
                    </span>
                  </div>

                  <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Code</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3 text-right">Current Rate</th>
                          <th className="py-2 px-3 text-right text-emerald-700 font-bold">New Rate (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {bulkUpdateResult.updatedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-bold text-slate-900">{item.code}</td>
                            <td className="py-1.5 px-3 font-sans text-slate-800 truncate max-w-xs">{item.name}</td>
                            <td className="py-1.5 px-3 text-right text-slate-400 line-through">
                              {item.oldRate.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold text-emerald-700">
                              {item.newRate.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unmatched items notice */}
              {bulkUpdateResult && bulkUpdateResult.unmatchedRows.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{bulkUpdateResult.unmatchedRows.length} item(s) in spreadsheet were not found in current catalog:</span>
                  </div>
                  <p className="text-[11px] text-amber-800 font-mono">
                    {bulkUpdateResult.unmatchedRows.slice(0, 10).map(u => u.code || u.desc).join(', ')}
                    {bulkUpdateResult.unmatchedRows.length > 10 ? '...' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowBulkImportModal(false);
                  setBulkUpdateResult(null);
                  setBulkFileName('');
                }}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!bulkUpdateResult || bulkUpdateResult.matchedCount === 0 || !!bulkSuccessMsg}
                onClick={handleApplyBulkUpdates}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save & Apply Updates ({bulkUpdateResult?.matchedCount || 0} items)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
