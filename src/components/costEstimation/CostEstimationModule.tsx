/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CostEstimateRecord, 
  MaterialItem, 
  DesignFactorsConfig, 
  ConstructionTemplate, 
  UserRole 
} from '../../types/costEstimation';
import { 
  initCostDatabase, 
  saveEstimateToDb, 
  deleteEstimateFromDb, 
  saveMaterialToDb, 
  saveDesignFactorsToDb, 
  resetCostDbToDefaults 
} from '../../utils/costDatabase';
import { CostEstimationDashboard } from './CostEstimationDashboard';
import { EstimateFormView } from './EstimateFormView';
import { MaterialMasterView } from './MaterialMasterView';
import { DesignFactorsView } from './DesignFactorsView';
import { PrintAndPdfExportModal } from './print/PrintAndPdfExportModal';
import { 
  Calculator, 
  Layers, 
  Sliders, 
  Plus, 
  FileText, 
  ShieldCheck, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { DEFAULT_DESIGN_FACTORS, INITIAL_MATERIALS, STANDARD_TEMPLATES } from '../../data/materialMaster';

interface CostEstimationModuleProps {
  currentJobTitle?: string;
}

export const CostEstimationModule: React.FC<CostEstimationModuleProps> = ({
  currentJobTitle = 'SDO'
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'materials' | 'design_factors'>('dashboard');
  const [estimates, setEstimates] = useState<CostEstimateRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);
  const [designFactors, setDesignFactors] = useState<DesignFactorsConfig>(DEFAULT_DESIGN_FACTORS);
  const [templates, setTemplates] = useState<ConstructionTemplate[]>(STANDARD_TEMPLATES);
  
  // Selected estimate for editing or viewing
  const [selectedEstimate, setSelectedEstimate] = useState<CostEstimateRecord | null>(null);
  
  // Printable modal state
  const [printEstimate, setPrintEstimate] = useState<CostEstimateRecord | null>(null);
  const [printMode, setPrintMode] = useState<'preview' | 'print' | 'pdf'>('preview');

  const handleOpenPrint = (est: CostEstimateRecord, mode: 'preview' | 'print' | 'pdf' = 'preview') => {
    setPrintEstimate(est);
    setPrintMode(mode);
  };

  // User Role & Officer Name
  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (currentJobTitle === 'XEN') return 'XEN';
    if (currentJobTitle === 'SE') return 'SE';
    return 'SDO';
  });
  const [userName, setUserName] = useState<string>('Engr. M. Inayat');

  // Load from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    initCostDatabase()
      .then(res => {
        if (mounted) {
          if (res.estimates) {
            const cleansed = res.estimates.map(e => {
              if (e.lineDetails.is25KvaLumpSumPackage || (Number(e.lineDetails.transformerCapacityKva) === 25 && (!e.lineDetails.htLengthKm || e.lineDetails.htLengthKm === 0))) {
                const filteredItems = e.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD'));
                if (filteredItems.length !== e.items.length) {
                  return {
                    ...e,
                    items: filteredItems,
                    lineDetails: { ...e.lineDetails, staySets: 0 }
                  };
                }
              }
              return e;
            });
            setEstimates(cleansed);
          }
          if (res.materials) setMaterials(res.materials);
          if (res.designFactors) setDesignFactors(res.designFactors);
          if (res.templates) setTemplates(res.templates);
        }
      })
      .catch(err => {
        console.warn('Cost estimation database init error:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Handler: Save Estimate
  const handleSaveEstimate = async (updated: CostEstimateRecord) => {
    setEstimates(prev => {
      const idx = prev.findIndex(e => e.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });
    setSelectedEstimate(null);
    setActiveTab('dashboard');
    await saveEstimateToDb(updated);
  };

  // Handler: Delete Estimate
  const handleDeleteEstimate = async (id: string) => {
    setEstimates(prev => prev.filter(e => e.id !== id));
    await deleteEstimateFromDb(id);
  };

  // Handler: Duplicate Estimate
  const handleDuplicateEstimate = async (orig: CostEstimateRecord) => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newEstNo = `EST-PESH-${year}-${rand}`;

    const dup: CostEstimateRecord = {
      ...orig,
      id: `est-dup-${Date.now()}`,
      status: 'DRAFT',
      projectInfo: {
        ...orig.projectInfo,
        estimateNo: newEstNo,
        revisionNo: 'Rev-00',
        estimateDate: new Date().toISOString().split('T')[0],
        schemeProjectName: `${orig.projectInfo.schemeProjectName} (Copy)`
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          user: userName,
          role: userRole,
          action: `Duplicated from estimate ${orig.projectInfo.estimateNo}`
        }
      ]
    };

    setEstimates(prev => [dup, ...prev]);
    await saveEstimateToDb(dup);
  };

  // Handler: Create Revision (e.g. Rev-00 -> Rev-01)
  const handleReviseEstimate = async (orig: CostEstimateRecord) => {
    const currentRevNum = parseInt(orig.projectInfo.revisionNo.replace(/\D/g, '') || '0', 10);
    const nextRevStr = `Rev-${String(currentRevNum + 1).padStart(2, '0')}`;

    const revised: CostEstimateRecord = {
      ...orig,
      id: `est-rev-${Date.now()}`,
      status: 'DRAFT',
      projectInfo: {
        ...orig.projectInfo,
        revisionNo: nextRevStr,
        estimateDate: new Date().toISOString().split('T')[0]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditTrail: [
        ...orig.auditTrail,
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          user: userName,
          role: userRole,
          action: `Created new revision ${nextRevStr}`
        }
      ]
    };

    setSelectedEstimate(revised);
    setActiveTab('form');
  };

  // Handler: Save Material
  const handleSaveMaterial = async (mat: MaterialItem) => {
    setMaterials(prev => {
      const idx = prev.findIndex(m => m.id === mat.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = mat;
        return copy;
      }
      return [mat, ...prev];
    });
    await saveMaterialToDb(mat);
  };

  // Handler: Save Design Factors
  const handleSaveFactors = async (factors: DesignFactorsConfig) => {
    setDesignFactors(factors);
    await saveDesignFactorsToDb(factors);
  };

  // Handler: Reset factory rates
  const handleResetFactory = async () => {
    if (!confirm('Warning: This will reset all materials and rates to PESCO CSR-2026 factory defaults. Continue?')) return;
    const res = await resetCostDbToDefaults();
    setEstimates(res.estimates);
    setMaterials(res.materials);
    setDesignFactors(res.designFactors);
    setTemplates(res.templates);
  };

  return (
    <div className="space-y-6">
      
      {/* Module Navigation Sub-Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:px-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setSelectedEstimate(null);
              setActiveTab('dashboard');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Estimates Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedEstimate(null);
              setActiveTab('form');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'form' && !selectedEstimate
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Estimate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'materials'
                ? 'bg-white text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Material Master & Rates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('design_factors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'design_factors'
                ? 'bg-white text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>Design Factors & Templates</span>
          </button>
        </div>

        {/* Role & User Indicator */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500">Active Role:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as UserRole)}
              className="font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="SDO">SDO (Sub-Divisional Officer)</option>
              <option value="XEN">XEN (Executive Engineer)</option>
              <option value="SE">SE (Superintending Engineer)</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Rendering */}
      {activeTab === 'dashboard' && (
        <CostEstimationDashboard
          estimates={estimates}
          onNewEstimate={() => {
            setSelectedEstimate(null);
            setActiveTab('form');
          }}
          onEditEstimate={(est) => {
            setSelectedEstimate(est);
            setActiveTab('form');
          }}
          onDeleteEstimate={handleDeleteEstimate}
          onDuplicateEstimate={handleDuplicateEstimate}
          onReviseEstimate={handleReviseEstimate}
          onPrintEstimate={handleOpenPrint}
          userRole={userRole}
          userName={userName}
        />
      )}

      {activeTab === 'form' && (
        <EstimateFormView
          initialEstimate={selectedEstimate}
          materials={materials}
          designFactors={designFactors}
          templates={templates}
          userRole={userRole}
          userName={userName}
          onSaveEstimate={handleSaveEstimate}
          onCancel={() => {
            setSelectedEstimate(null);
            setActiveTab('dashboard');
          }}
          onPrintEstimate={handleOpenPrint}
        />
      )}

      {activeTab === 'materials' && (
        <MaterialMasterView
          materials={materials}
          onSaveMaterial={handleSaveMaterial}
          onResetFactoryRates={handleResetFactory}
        />
      )}

      {activeTab === 'design_factors' && (
        <DesignFactorsView
          factors={factorsState || designFactors}
          templates={templates}
          onSaveFactors={handleSaveFactors}
        />
      )}

      {/* Official Print & PDF Export Center Modal */}
      <PrintAndPdfExportModal
        isOpen={!!printEstimate}
        onClose={() => setPrintEstimate(null)}
        estimate={printEstimate}
        initialMode={printMode}
      />
    </div>
  );
};

// Variable fallback helper
const factorsState: any = null;
