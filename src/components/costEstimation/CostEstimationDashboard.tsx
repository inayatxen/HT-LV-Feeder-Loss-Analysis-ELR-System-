/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  CostEstimateRecord, 
  EstimateStatus, 
  EstimateType, 
  UserRole 
} from '../../types/costEstimation';
import { exportEstimateToExcelWorkbook } from '../../utils/costEngine';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Printer, 
  Download, 
  Edit3, 
  Copy, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Zap, 
  TrendingUp, 
  FolderPlus,
  GitBranch,
  Eye
} from 'lucide-react';

interface CostEstimationDashboardProps {
  estimates: CostEstimateRecord[];
  onNewEstimate: () => void;
  onEditEstimate: (estimate: CostEstimateRecord) => void;
  onDeleteEstimate: (id: string) => void;
  onDuplicateEstimate: (estimate: CostEstimateRecord) => void;
  onReviseEstimate: (estimate: CostEstimateRecord) => void;
  onPrintEstimate: (estimate: CostEstimateRecord, mode?: 'preview' | 'print' | 'pdf') => void;
  userRole: UserRole;
  userName: string;
  onSaveEstimate?: (estimate: CostEstimateRecord) => void;
}

export const CostEstimationDashboard: React.FC<CostEstimationDashboardProps> = ({
  estimates,
  onNewEstimate,
  onEditEstimate,
  onDeleteEstimate,
  onDuplicateEstimate,
  onReviseEstimate,
  onPrintEstimate,
  userRole,
  userName,
  onSaveEstimate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<EstimateType | 'ALL'>('ALL');
  
  // Merge Sub-Estimates Modal State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [targetEstimateId, setTargetEstimateId] = useState('');
  const [selectedSubEstimateIds, setSelectedSubEstimateIds] = useState<string[]>([]);
  const [mergeLumpName, setMergeLumpName] = useState('');
  const [mergeType, setMergeType] = useState<EstimateType>('COMBINED_HT_LT');

  const handleOpenMergeModal = () => {
    setIsMergeModalOpen(true);
    if (estimates.length > 0) {
      const defaultTarget = estimates[0];
      setTargetEstimateId(defaultTarget.id);
      setMergeLumpName(`${defaultTarget.projectInfo.schemeProjectName || 'Consolidated Project'} (Merged Lump Sum)`);
      setMergeType('COMBINED_HT_LT');
      setSelectedSubEstimateIds([]);
    }
  };

  const handleTargetChange = (id: string) => {
    setTargetEstimateId(id);
    const target = estimates.find(e => e.id === id);
    if (target) {
      setMergeLumpName(`${target.projectInfo.schemeProjectName || 'Consolidated Project'} (Merged Lump Sum)`);
      setSelectedSubEstimateIds(prev => prev.filter(subId => subId !== id));
    }
  };

  const handleToggleSubEstimate = (id: string) => {
    setSelectedSubEstimateIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(subId => subId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleMergeEstimates = () => {
    const target = estimates.find(e => e.id === targetEstimateId);
    if (!target) return;

    const subs = estimates.filter(e => selectedSubEstimateIds.includes(e.id));
    if (subs.length === 0) return;

    // Merge line details
    const combinedLineDetails = { ...target.lineDetails };
    subs.forEach(s => {
      combinedLineDetails.htLengthKm = Number(((combinedLineDetails.htLengthKm || 0) + (s.lineDetails.htLengthKm || 0)).toFixed(3));
      combinedLineDetails.ltLengthKm = Number(((combinedLineDetails.ltLengthKm || 0) + (s.lineDetails.ltLengthKm || 0)).toFixed(3));
      combinedLineDetails.htPoles = (combinedLineDetails.htPoles || 0) + (s.lineDetails.htPoles || 0);
      combinedLineDetails.ltPoles = (combinedLineDetails.ltPoles || 0) + (s.lineDetails.ltPoles || 0);
      combinedLineDetails.staySets = (combinedLineDetails.staySets || 0) + (s.lineDetails.staySets || 0);
      combinedLineDetails.roadCrossings = (combinedLineDetails.roadCrossings || 0) + (s.lineDetails.roadCrossings || 0);
      combinedLineDetails.canalCrossings = (combinedLineDetails.canalCrossings || 0) + (s.lineDetails.canalCrossings || 0);
      combinedLineDetails.transformerStructures = (combinedLineDetails.transformerStructures || 0) + (s.lineDetails.transformerStructures || 0);
      combinedLineDetails.transformerCount = (combinedLineDetails.transformerCount || 0) + (s.lineDetails.transformerCount || 0);
      if (s.lineDetails.transformerCapacityKva > (combinedLineDetails.transformerCapacityKva || 0)) {
        combinedLineDetails.transformerCapacityKva = s.lineDetails.transformerCapacityKva;
      }
    });

    // Merge materials items list (combine matching codes)
    const itemMap = new Map<string, typeof target.items[0]>();

    const addItemToMerged = (item: typeof target.items[0], sourceNo: string) => {
      const existing = itemMap.get(item.materialCode);
      if (existing) {
        const newQty = Number((existing.quantity + item.quantity).toFixed(3));
        const materialAmount = Math.round(newQty * item.unitRate);
        const labourAmount = Math.round(newQty * (item.labourRate || 0));
        const transportAmount = Math.round(newQty * (item.transportRate || 0));
        const totalAmount = materialAmount + labourAmount + transportAmount;

        itemMap.set(item.materialCode, {
          ...existing,
          quantity: newQty,
          materialAmount,
          labourAmount,
          transportAmount,
          totalAmount,
          remarks: `Merged from ${target.projectInfo.estimateNo} & ${sourceNo}`
        });
      } else {
        itemMap.set(item.materialCode, {
          ...item,
          remarks: `Source: ${sourceNo}`
        });
      }
    };

    // Add target items
    target.items.forEach(item => addItemToMerged(item, target.projectInfo.estimateNo));
    // Add sub estimates items
    subs.forEach(s => {
      s.items.forEach(item => addItemToMerged(item, s.projectInfo.estimateNo));
    });

    const mergedItems = Array.from(itemMap.values());

    // Calculate aggregated base costs
    const materialCost = mergedItems.reduce((sum, i) => sum + i.materialAmount, 0);
    const labourCost = mergedItems.reduce((sum, i) => sum + i.labourAmount, 0);
    const transportationCost = mergedItems.reduce((sum, i) => sum + (i.transportAmount || 0), 0);
    const civilWorksCost = target.charges.civilWorksCost + subs.reduce((sum, s) => sum + (s.charges.civilWorksCost || 0), 0);

    // Compute overheads based on Target's CSR percentages
    const engPct = target.charges.engineeringChargesPercent || 5;
    const contPct = target.charges.contingencyPercent || 2;
    const deptPct = target.charges.departmentalOverheadPercent || 10;
    const contOverPct = target.charges.contractorOverheadPercent || 0;
    const taxPct = target.charges.taxGstPercent || 18;

    const baseForOverhead = materialCost + labourCost;

    const engineeringChargesAmount = Math.round(baseForOverhead * engPct / 100);
    const contingencyAmount = Math.round(baseForOverhead * contPct / 100);
    const departmentalOverheadAmount = Math.round(baseForOverhead * deptPct / 100);
    const contractorOverheadAmount = Math.round(baseForOverhead * contOverPct / 100);

    const subTotal = materialCost + labourCost + transportationCost + civilWorksCost + 
                     engineeringChargesAmount + contingencyAmount + departmentalOverheadAmount + contractorOverheadAmount;

    const taxGstAmount = Math.round(subTotal * taxPct / 100);
    const grandTotal = subTotal + taxGstAmount;

    const totalKm = (combinedLineDetails.htLengthKm || 0) + (combinedLineDetails.ltLengthKm || 0);
    const costPerKm = totalKm > 0 ? Math.round(grandTotal / totalKm) : 0;

    const combinedCharges: typeof target.charges = {
      ...target.charges,
      materialCost,
      labourCost,
      transportationCost,
      civilWorksCost,
      engineeringChargesAmount,
      contingencyAmount,
      departmentalOverheadAmount,
      contractorOverheadAmount,
      subTotal,
      taxGstAmount,
      grandTotal,
      costPerKm
    };

    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const mergedNo = `EST-LUMP-${year}-${rand}`;

    const mergedEstimate: CostEstimateRecord = {
      id: `est-merge-${Date.now()}`,
      status: 'DRAFT',
      type: mergeType,
      projectInfo: {
        ...target.projectInfo,
        estimateNo: mergedNo,
        revisionNo: 'Rev-00',
        estimateDate: new Date().toISOString().split('T')[0],
        schemeProjectName: mergeLumpName,
        purposeOfWork: `Consolidated Lump Sum Estimate merging sub-estimates ${subs.map(e => e.projectInfo.estimateNo).join(', ')} into target ${target.projectInfo.estimateNo}`
      },
      lineDetails: combinedLineDetails,
      items: mergedItems,
      charges: combinedCharges,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          user: userName,
          role: userRole,
          action: `Consolidated Merge: Merged ${subs.length} sub-estimates into target ${target.projectInfo.estimateNo}`
        }
      ]
    };

    if (onSaveEstimate) {
      onSaveEstimate(mergedEstimate);
    }
    setIsMergeModalOpen(false);
  };
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');

  // KPI Calculations
  const stats = useMemo(() => {
    const total = estimates.length;
    const draft = estimates.filter(e => e.status === 'DRAFT').length;
    const submitted = estimates.filter(e => e.status === 'SUBMITTED').length;
    const approved = estimates.filter(e => e.status === 'APPROVED').length;
    const rejected = estimates.filter(e => e.status === 'REJECTED').length;
    const totalValue = estimates.reduce((sum, e) => sum + (e.charges?.grandTotal || 0), 0);
    const totalKm = estimates.reduce((sum, e) => sum + ((e.lineDetails?.htLengthKm || 0) + (e.lineDetails?.ltLengthKm || 0)), 0);

    return { total, draft, submitted, approved, rejected, totalValue, totalKm };
  }, [estimates]);

  // Unique divisions for filter dropdown
  const divisions = useMemo(() => {
    const set = new Set<string>();
    estimates.forEach(e => {
      if (e.projectInfo.division) set.add(e.projectInfo.division);
    });
    return Array.from(set);
  }, [estimates]);

  // Filtered estimates list
  const filteredEstimates = useMemo(() => {
    return estimates.filter(e => {
      const matchesSearch = 
        e.projectInfo.estimateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.projectInfo.schemeProjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.projectInfo.proposedLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.projectInfo.feederName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || e.type === typeFilter;
      const matchesDivision = divisionFilter === 'ALL' || e.projectInfo.division === divisionFilter;

      return matchesSearch && matchesStatus && matchesType && matchesDivision;
    });
  }, [estimates, searchTerm, statusFilter, typeFilter, divisionFilter]);

  return (
    <div className="space-y-6">
      
      {/* 1. Executive Portfolio KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-slate-500 text-[11px] block font-medium">Total Estimates</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Active Portfolio</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-slate-500 text-[11px] block font-medium">Draft Estimates</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-700 mt-0.5">{stats.draft}</div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">In Preparation</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-slate-500 text-[11px] block font-medium">Submitted (XEN/SE)</span>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-0.5">{stats.submitted}</div>
          <span className="text-[10px] text-blue-500 font-mono mt-1 block">Awaiting Sanction</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-slate-500 text-[11px] block font-medium">Sanctioned & Approved</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-0.5">{stats.approved}</div>
          <span className="text-[10px] text-emerald-600 font-mono mt-1 block">Ready for Work Order</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-slate-500 text-[11px] block font-medium">Total Portfolio Value</span>
          <div className="text-base sm:text-lg font-black text-amber-600 mt-0.5 truncate font-mono">
            Rs. {(stats.totalValue / 1000000).toFixed(2)}M
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Million PKR</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-slate-500 text-[11px] block font-medium">Total Line Length</span>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 mt-0.5 font-mono">
            {stats.totalKm.toFixed(1)} <span className="text-xs font-normal text-slate-500">km</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">HT & LT Lines</span>
        </div>
      </div>

      {/* 2. Control & Search Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search estimates by number, scheme name, locality, or feeder..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {estimates.length > 1 && (
              <button
                type="button"
                onClick={handleOpenMergeModal}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-all cursor-pointer"
                title="Merge additional sub-estimates into a single consolidated lump estimate"
              >
                <GitBranch className="w-4 h-4 text-indigo-600 rotate-180" />
                <span>Merge Sub-Estimates</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNewEstimate}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Estimate</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Status:</span>
            {(['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Division Filter */}
            {divisions.length > 0 && (
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
              >
                <option value="ALL">All Divisions</option>
                {divisions.map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            )}

            {/* Scope Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="HT_LINE_EXTENSION">HT 11kV Line</option>
              <option value="LT_LINE_EXTENSION">LT 400V Line</option>
              <option value="NEW_DISTRIBUTION_TRANSFORMER">Transformer Installation</option>
              <option value="COMPLETE_HT_FEEDER">Complete Feeder</option>
              <option value="COMBINED_HT_LT">Combined HT+LT</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Estimates List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3 px-3">Estimate No.</th>
                <th className="py-3 px-4">Scheme / Proposed Location</th>
                <th className="py-3 px-3">Type & Feeder</th>
                <th className="py-3 px-2 text-right">Length</th>
                <th className="py-3 px-3 text-right">Grand Total (PKR)</th>
                <th className="py-3 px-3 text-right">Cost / km</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Date</th>
                <th className="py-3 px-3 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {filteredEstimates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    No estimates found matching your search. Click "Create New Estimate" above to start a new estimate.
                  </td>
                </tr>
              ) : (
                filteredEstimates.map(est => {
                  const km = (est.lineDetails.htLengthKm || 0) + (est.lineDetails.ltLengthKm || 0);
                  return (
                    <tr key={est.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Estimate No & Revision */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block leading-tight">
                          {est.projectInfo.estimateNo}
                        </span>
                        <span className="text-[11px] text-slate-400 block font-normal">
                          {est.projectInfo.revisionNo}
                        </span>
                      </td>

                      {/* Scheme & Location */}
                      <td className="py-3 px-4 font-sans max-w-xs">
                        <span className="font-bold text-slate-900 block leading-tight">
                          {est.projectInfo.schemeProjectName || est.projectInfo.proposedLocation || 'Line Extension'}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                          {est.projectInfo.proposedLocation || est.projectInfo.villageLocality}
                        </span>
                      </td>

                      {/* Type & Feeder */}
                      <td className="py-3 px-3 font-sans">
                        <span className="text-xs font-semibold text-slate-800 block leading-tight">
                          {est.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {est.projectInfo.feederName}
                        </span>
                      </td>

                      {/* Length */}
                      <td className="py-3 px-2 text-right">
                        {km > 0 ? (
                          <>
                            <span className="font-bold text-slate-900">{km.toFixed(2)}</span>
                            <span className="text-[11px] text-slate-400 ml-0.5">km</span>
                          </>
                        ) : (
                          <span className="text-[11px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            Sub-Stn
                          </span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-3 text-right font-black text-slate-950 text-sm">
                        {est.charges.grandTotal.toLocaleString()}
                      </td>

                      {/* Cost per km */}
                      <td className="py-3 px-3 text-right text-emerald-700 font-semibold text-xs">
                        {est.charges.overheadBasis === 'MATERIAL' || km === 0 ? (
                          <span className="text-[11px] text-slate-500 font-sans font-medium">
                            Lump Sum Pkg
                          </span>
                        ) : (
                          est.charges.costPerKm.toLocaleString()
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          est.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          est.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          est.status === 'REJECTED' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {est.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-center text-[11px] text-slate-500 font-sans">
                        {est.projectInfo.estimateDate}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditEstimate(est)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit / Review Estimate"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onPrintEstimate(est, 'preview')}
                            className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Print Preview & Page Setup"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onPrintEstimate(est, 'print')}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Print Document (System Print Dialog)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onPrintEstimate(est, 'pdf')}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Save as PDF Document"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => exportEstimateToExcelWorkbook(est)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Export to Excel (.xlsx)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onReviseEstimate(est)}
                            className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Create New Revision (e.g. Rev-01)"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDuplicateEstimate(est)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate Estimate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {est.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete draft estimate "${est.projectInfo.estimateNo}"?`)) {
                                  onDeleteEstimate(est.id);
                                }
                              }}
                              className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* ========================================================
          MERGE SUB-ESTIMATES MODAL
         ======================================================== */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-indigo-805 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-300 rotate-180" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Merge Additional Sub-Estimates</h3>
                  <p className="text-[11px] text-indigo-200 mt-0.5">Aggregate multiple sub-estimates into a single consolidated Lump Estimate</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="text-indigo-200 hover:text-white transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {/* Target Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">1. Select Target Lump Estimate (Parent Record)</label>
                <p className="text-[11px] text-slate-500 leading-tight">This estimate acts as the main base. Its division details, design factors, and overhead percentage rates will be used for the combined project.</p>
                <select
                  value={targetEstimateId}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                >
                  {estimates.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.projectInfo.estimateNo} — {e.projectInfo.schemeProjectName} (Rs. {e.charges.grandTotal.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-estimates Checklist */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">2. Select Additional Sub-Estimates to Merge</label>
                <p className="text-[11px] text-slate-500 leading-tight">Check the sub-estimates whose material items, poles, lengths, and line costs should be merged into the consolidated lump estimate.</p>
                
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                  {estimates
                    .filter(e => e.id !== targetEstimateId)
                    .map(est => {
                      const isChecked = selectedSubEstimateIds.includes(est.id);
                      return (
                        <label
                          key={est.id}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100/60 cursor-pointer transition-colors text-xs font-medium"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSubEstimate(est.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-900 block truncate">{est.projectInfo.estimateNo} — {est.projectInfo.schemeProjectName}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              Type: {est.type.replace(/_/g, ' ')} · Total: Rs. {est.charges.grandTotal.toLocaleString()} · {((est.lineDetails.htLengthKm || 0) + (est.lineDetails.ltLengthKm || 0)).toFixed(2)} km
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  {estimates.filter(e => e.id !== targetEstimateId).length === 0 && (
                    <div className="py-8 text-center text-slate-400">
                      No other sub-estimates available to merge.
                    </div>
                  )}
                </div>
              </div>

              {/* Combined Estimate Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">3. Combined Project Name</label>
                  <input
                    type="text"
                    value={mergeLumpName}
                    onChange={(e) => setMergeLumpName(e.target.value)}
                    placeholder="E.g. Consolidated Feeder Reconductoring"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">4. Combined Estimate Type</label>
                  <select
                    value={mergeType}
                    onChange={(e) => setMergeType(e.target.value as EstimateType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="COMBINED_HT_LT">Combined HT+LT Line Extension</option>
                    <option value="COMPLETE_HT_FEEDER">Complete HT Feeder Package</option>
                    <option value="NEW_DISTRIBUTION_TRANSFORMER">Consolidated Distribution Transformers</option>
                    <option value="LT_LINE_EXTENSION">Consolidated LT Line Extensions</option>
                    <option value="OTHER">Other Consolidated Lump Sum Project</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMergeEstimates}
                disabled={selectedSubEstimateIds.length === 0 || !mergeLumpName}
                className={`px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  (selectedSubEstimateIds.length === 0 || !mergeLumpName) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 rotate-180" />
                <span>Perform Consolidated Merge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
