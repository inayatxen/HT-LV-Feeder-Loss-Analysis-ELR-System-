/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  resetCostDbToDefaults,
  buildLinkedEstimateForFeeder
} from '../../utils/costDatabase';
import { FeederData, FeederAnalysisSummary, BifurcationConfig } from '../../types/feeder';
import { CostEstimationDashboard } from './CostEstimationDashboard';
import { EstimateFormView } from './EstimateFormView';
import { MaterialMasterView } from './MaterialMasterView';
import { DesignFactorsView } from './DesignFactorsView';
import { CostBenefitAnalysisView } from './CostBenefitAnalysisView';
import { JustificationSlipView } from './JustificationSlipView';
import { PrintAndPdfExportModal } from './print/PrintAndPdfExportModal';
import { 
  Calculator, 
  Layers, 
  Sliders, 
  Plus, 
  FileText, 
  ShieldCheck, 
  RotateCcw,
  Sparkles,
  TrendingUp,
  FileCheck2,
  Link2,
  Zap,
  CheckCircle2,
  FolderOpen,
  Save
} from 'lucide-react';
import { DEFAULT_DESIGN_FACTORS, INITIAL_MATERIALS, STANDARD_TEMPLATES } from '../../data/materialMaster';

interface CostEstimationModuleProps {
  currentJobTitle?: string;
  activeFeeder?: FeederData;
  activeSummary?: FeederAnalysisSummary;
  existingSummary?: FeederAnalysisSummary;
  proposedSummary?: FeederAnalysisSummary;
  hasActiveInterventions?: boolean;
  bifurcationConfig?: BifurcationConfig;
  onUpdateFeeder?: (updatedFeeder: FeederData) => void;
  onSwitchToAnalysis?: () => void;
  onSelectFeeder?: (feederId: string) => void;
  availableFeeders?: FeederData[];
  onSaveUnifiedProject?: () => void;
}

export const CostEstimationModule: React.FC<CostEstimationModuleProps> = ({
  currentJobTitle = 'SDO',
  activeFeeder,
  activeSummary,
  existingSummary,
  proposedSummary,
  hasActiveInterventions,
  bifurcationConfig,
  onUpdateFeeder,
  onSwitchToAnalysis,
  onSelectFeeder,
  availableFeeders = [],
  onSaveUnifiedProject
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'materials' | 'design_factors' | 'cost_benefit' | 'justification_slip'>('dashboard');
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

  // Find linked estimate for active feeder
  const linkedEstimate = useMemo(() => {
    if (!activeFeeder || estimates.length === 0) return null;
    return (
      estimates.find(e => e.id === activeFeeder.linkedEstimateId) ||
      estimates.find(e => e.id === `est-elr-${activeFeeder.id}`) ||
      estimates.find(e => e.id.includes(activeFeeder.id)) ||
      estimates.find(e => e.projectInfo.feederName?.trim().toLowerCase() === activeFeeder.name?.trim().toLowerCase()) ||
      estimates.find(e => activeFeeder.workOrderNo && e.projectInfo.workOrderNo === activeFeeder.workOrderNo) ||
      null
    );
  }, [activeFeeder, estimates]);

  // Auto-sync & keep open the estimate of this particular analysis ELR
  useEffect(() => {
    if (!activeFeeder) return;

    if (linkedEstimate) {
      if (!selectedEstimate || selectedEstimate.id !== linkedEstimate.id) {
        setSelectedEstimate(linkedEstimate);
        setActiveTab('form');
      }
    } else if (materials.length > 0 && estimates.length > 0) {
      // Synthesize on the fly for active feeder if none exists yet
      const newLinked = buildLinkedEstimateForFeeder(activeFeeder, materials, designFactors);
      setEstimates(prev => [newLinked, ...prev]);
      saveEstimateToDb(newLinked).catch(console.error);
      setSelectedEstimate(newLinked);
      setActiveTab('form');
      if (onUpdateFeeder) {
        onUpdateFeeder({
          ...activeFeeder,
          linkedEstimateId: newLinked.id,
          linkedEstimate: newLinked
        });
      }
    }
  }, [activeFeeder?.id, linkedEstimate?.id, materials.length, estimates.length]);

  // Open the estimate of this particular analysis ELR
  const handleOpenLinkedEstimate = () => {
    if (linkedEstimate) {
      setSelectedEstimate(linkedEstimate);
      setActiveTab('form');
    } else if (activeFeeder && materials.length > 0) {
      // Synthesize linked estimate on the fly
      const newLinked = buildLinkedEstimateForFeeder(activeFeeder, materials, designFactors);
      setEstimates(prev => [newLinked, ...prev]);
      saveEstimateToDb(newLinked).catch(console.error);
      setSelectedEstimate(newLinked);
      setActiveTab('form');
      if (onUpdateFeeder) {
        onUpdateFeeder({
          ...activeFeeder,
          linkedEstimateId: newLinked.id,
          linkedEstimate: newLinked
        });
      }
    }
  };

  // Handler: Save Estimate and synchronize unified project state
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
    // Keep open the estimate of this particular analysis ELR
    setSelectedEstimate(updated);
    await saveEstimateToDb(updated);

    // Keep unified Feeder project state strictly in sync!
    if (activeFeeder && onUpdateFeeder) {
      const isMatchingProject = 
        updated.id === activeFeeder.linkedEstimateId ||
        updated.id === `est-elr-${activeFeeder.id}` ||
        updated.projectInfo.feederName === activeFeeder.name ||
        updated.projectInfo.workOrderNo === activeFeeder.workOrderNo;

      if (isMatchingProject) {
        const updatedFeeder: FeederData = {
          ...activeFeeder,
          name: updated.projectInfo.feederName || activeFeeder.name,
          workOrderNo: updated.projectInfo.workOrderNo || activeFeeder.workOrderNo,
          schemeCategory: updated.projectInfo.schemeCategory || activeFeeder.schemeCategory,
          elrCode: updated.projectInfo.elrCode || activeFeeder.elrCode,
          accountHead: updated.projectInfo.accountHead || activeFeeder.accountHead,
          circle: updated.projectInfo.circle || activeFeeder.circle,
          division: updated.projectInfo.division || activeFeeder.division,
          subDivision: updated.projectInfo.subDivision || activeFeeder.subDivision,
          district: updated.projectInfo.district || activeFeeder.district,
          villageLocality: updated.projectInfo.villageLocality || activeFeeder.villageLocality,
          schemeProjectName: updated.projectInfo.schemeProjectName || activeFeeder.schemeProjectName,
          purposeOfWork: updated.projectInfo.purposeOfWork || activeFeeder.purposeOfWork,
          preparedBy: updated.projectInfo.preparedBy || activeFeeder.preparedBy,
          checkedBy: updated.projectInfo.checkedBy || activeFeeder.checkedBy,
          approvedBy: updated.projectInfo.approvedBy || activeFeeder.approvedBy,
          linkedEstimateId: updated.id,
          linkedEstimate: updated
        };
        onUpdateFeeder(updatedFeeder);
      }
    }
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

  // Handler: Save All Materials (Bulk CSV / Excel update)
  const handleSaveAllMaterials = async (updatedList: MaterialItem[]) => {
    setMaterials(updatedList);
    try {
      localStorage.setItem('material_overrides', JSON.stringify(updatedList));
    } catch {}
    for (const mat of updatedList) {
      await saveMaterialToDb(mat);
    }
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
    <div className="space-y-5">
      
      {/* ========================================================
          UNIFIED PROJECT LINKAGE BANNER: ANALYSIS <-> LINE ESTIMATION
         ======================================================== */}
      {activeFeeder && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-blue-800/80">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Project & Feeder Hierarchy Details */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Link2 className="w-3 h-3" />
                  Linked Unified Project
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  WO: {activeFeeder.workOrderNo || '26147126042'}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {activeFeeder.category === 'HV' ? '11kV HT Primary Feeder' : '400V LT Secondary Feeder'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white truncate">
                  {activeFeeder.name}
                </h2>
                <span className="text-xs text-blue-300 font-medium px-2 py-0.5 bg-blue-950/80 rounded border border-blue-800">
                  {activeFeeder.substationName}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span><strong>Circle:</strong> {activeFeeder.circle || 'Peshawar Circle-1'}</span>
                <span>•</span>
                <span><strong>Division:</strong> {activeFeeder.division || 'Cantt Division Peshawar'}</span>
                <span>•</span>
                <span><strong>Sub-Division:</strong> {activeFeeder.subDivision || 'Gulbhar Sub-Division'}</span>
                <span>•</span>
                <span><strong>Transformer:</strong> {activeFeeder.existingTransformerKva} kVA</span>
              </div>
            </div>

            {/* Quick Linkage Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onSaveUnifiedProject && (
                <button
                  type="button"
                  onClick={onSaveUnifiedProject}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition-all shadow-md active:scale-95 cursor-pointer ring-1 ring-emerald-300"
                  title="Save both 1. FLADIX Feeder Loss Analysis and 2. Line Cost Estimation together as One Project"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>Save as One Project (1. FLADIX Analysis + 2. Cost Estimation)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenLinkedEstimate}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Open and edit the estimate for this active FLADIX Feeder"
              >
                <Calculator className="w-4 h-4" />
                <span>{linkedEstimate ? 'Open Estimate for this FLADIX Feeder' : 'Generate Linked Estimate'}</span>
              </button>

              {onSwitchToAnalysis && (
                <button
                  type="button"
                  onClick={onSwitchToAnalysis}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-xs cursor-pointer"
                  title="Switch back to FLADIX Feeder Loss Analysis & Data Indexing workbench"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>View FLADIX Loss Analysis</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
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

          <button
            type="button"
            onClick={() => setActiveTab('cost_benefit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'cost_benefit'
                ? 'bg-white text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            <span>Cost Benefit Analysis (BCR)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('justification_slip')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'justification_slip'
                ? 'bg-white text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Justification Slip</span>
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
          activeFeederId={activeFeeder?.id}
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
          onSaveEstimate={handleSaveEstimate}
          onSaveUnifiedProject={onSaveUnifiedProject}
        />
      )}

      {activeTab === 'form' && (
        <EstimateFormView
          initialEstimate={selectedEstimate || linkedEstimate}
          estimates={estimates}
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
          onSaveUnifiedProject={onSaveUnifiedProject}
        />
      )}

      {activeTab === 'materials' && (
        <MaterialMasterView
          materials={materials}
          onSaveMaterial={handleSaveMaterial}
          onResetFactoryRates={handleResetFactory}
          onSaveAllMaterials={handleSaveAllMaterials}
        />
      )}

      {activeTab === 'design_factors' && (
        <DesignFactorsView
          factors={designFactors}
          templates={templates}
          onSaveFactors={handleSaveFactors}
        />
      )}

      {activeTab === 'cost_benefit' && (
        <CostBenefitAnalysisView
          estimates={estimates}
          activeFeeder={activeFeeder}
          existingSummary={existingSummary}
          proposedSummary={proposedSummary}
          hasActiveInterventions={hasActiveInterventions}
          linkedEstimate={selectedEstimate || linkedEstimate}
          onSaveUnifiedProject={onSaveUnifiedProject}
        />
      )}

      {activeTab === 'justification_slip' && (
        <JustificationSlipView
          estimates={estimates}
          activeFeeder={activeFeeder}
          existingSummary={existingSummary}
          proposedSummary={proposedSummary}
          linkedEstimate={selectedEstimate || linkedEstimate}
          onSaveUnifiedProject={onSaveUnifiedProject}
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
