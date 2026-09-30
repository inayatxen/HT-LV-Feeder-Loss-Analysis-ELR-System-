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
  userName
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<EstimateType | 'ALL'>('ALL');
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

          {/* Action Button: Create New Estimate */}
          <button
            type="button"
            onClick={onNewEstimate}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Estimate</span>
          </button>
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
                        <span className="font-bold text-slate-900">{km.toFixed(2)}</span>
                        <span className="text-[11px] text-slate-400 ml-0.5">km</span>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-3 text-right font-black text-slate-950 text-sm">
                        {est.charges.grandTotal.toLocaleString()}
                      </td>

                      {/* Cost per km */}
                      <td className="py-3 px-3 text-right text-emerald-700 font-semibold text-xs">
                        {est.charges.costPerKm.toLocaleString()}
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
    </div>
  );
};
