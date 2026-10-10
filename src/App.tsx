/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  PRESET_FEEDERS, 
  GULBHAR_COLONY_LT_FEEDER 
} from './data/presetFeeders';
import { 
  FeederData, 
  FeederNode, 
  SegmentAnalysisResult,
  FeederCategory,
  JobTitle,
  BifurcationConfig
} from './types/feeder';
import { 
  calculateFeederAnalysis, 
  generateGrowthForecast,
  calculateBifurcationFourStatements
} from './utils/elrEngine';
import { Header } from './components/Header';
import { SummaryMetrics } from './components/SummaryMetrics';
import { SingleLineDiagram } from './components/SingleLineDiagram';
import { SegmentTable } from './components/SegmentTable';
import { LossCharts } from './components/LossCharts';
import { WhatIfWorkbench } from './components/WhatIfWorkbench';
import { ForecastingView } from './components/ForecastingView';
import { InputDataForm } from './components/InputDataForm';
import { ReportModal } from './components/ReportModal';
import { ConductorLibraryModal } from './components/ConductorLibraryModal';
import { NodeInspectorModal } from './components/NodeInspectorModal';
import { LocalDatabaseModal } from './components/LocalDatabaseModal';
import { NewJobModal } from './components/NewJobModal';
import { CostEstimationModule } from './components/costEstimation/CostEstimationModule';
import { SaveUnifiedProjectModal } from './components/SaveUnifiedProjectModal';
import { 
  initLocalDatabase, 
  saveFeederToLocalDb, 
  saveAnalysisSnapshotToDb,
  SavedAnalysisSnapshot 
} from './utils/localDatabase';
import { 
  getAllEstimatesFromDb, 
  saveEstimateToDb, 
  buildLinkedEstimateForFeeder 
} from './utils/costDatabase';
import { INITIAL_MATERIALS, DEFAULT_DESIGN_FACTORS } from './data/materialMaster';
import { CostEstimateRecord } from './types/costEstimation';
import { Zap, GitBranch, Layers, TrendingUp, SlidersHorizontal, FileText, CheckCircle2, ShieldAlert, Database, Calculator, Save } from 'lucide-react';

export default function App() {
  const [activeSystemModule, setActiveSystemModule] = useState<'elr_loss_analysis' | 'line_cost_estimation'>('elr_loss_analysis');
  const [activeCategory, setActiveCategory] = useState<FeederCategory>('LV');
  const [selectedFeederId, setSelectedFeederId] = useState<string>('gulbhar-colony-peshawar');
  const [activeTab, setActiveTab] = useState<'input_form' | 'sld' | 'table' | 'charts' | 'whatif' | 'forecast'>('input_form');

  // Light / Dark / Blue / Amber Theme State
  const [theme, setTheme] = useState<'light' | 'dark' | 'blue' | 'amber'>(() => {
    try {
      const saved = localStorage.getItem('pesco_theme');
      if (saved === 'dark' || saved === 'light' || saved === 'blue' || saved === 'amber') return saved;
    } catch {}
    return 'light';
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('pesco_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = (newTheme: 'light' | 'dark' | 'blue' | 'amber') => {
    setTheme(newTheme);
  };

  // Job Title Selection State (persisted locally)
  const [selectedJobTitle, setSelectedJobTitle] = useState<JobTitle>(() => {
    try {
      const saved = localStorage.getItem('user_job_title');
      if (saved) return saved as JobTitle;
    } catch {}
    return 'SDO';
  });

  const handleSelectJobTitle = (title: JobTitle) => {
    setSelectedJobTitle(title);
    try {
      localStorage.setItem('user_job_title', title);
    } catch {}
  };
  
  // Custom feeder modifications
  const [customFeeders, setCustomFeeders] = useState<Record<string, FeederData>>(() => {
    const map: Record<string, FeederData> = {};
    PRESET_FEEDERS.forEach(f => {
      map[f.id] = JSON.parse(JSON.stringify(f));
    });
    return map;
  });

  const activeFeeder = customFeeders[selectedFeederId] || GULBHAR_COLONY_LT_FEEDER;

  // Filter feeders available for the selected category (LV vs HV)
  const availableFeeders = useMemo(() => {
    return Object.values(customFeeders).filter(f => {
      const cat = f.category || (f.type === 'HT' ? 'HV' : 'LV');
      return cat === activeCategory;
    });
  }, [customFeeders, activeCategory]);

  // Helper to load persisted bifurcation configuration from localStorage
  const getSavedBifurcationConfig = (feeder: FeederData): BifurcationConfig => {
    const defaultCutOff = feeder.nodes[2]?.id || '3.0';
    const defaultKva = feeder.category === 'HV' ? 2500 : 100;
    try {
      const saved = localStorage.getItem(`pesco_bifurcation_${feeder.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            enabled: Boolean(parsed.enabled),
            bifurcationNodeId: parsed.bifurcationNodeId || defaultCutOff,
            transformerNodeId: parsed.transformerNodeId || parsed.bifurcationNodeId || defaultCutOff,
            transformerCapacityKva: Number(parsed.transformerCapacityKva) || defaultKva,
            mode: parsed.mode || 'ADDITIONAL_TRANSFORMER'
          };
        }
      }
    } catch (err) {
      console.warn('Could not read saved bifurcation config:', err);
    }
    return {
      enabled: false,
      bifurcationNodeId: defaultCutOff,
      transformerNodeId: defaultCutOff,
      transformerCapacityKva: defaultKva,
      mode: 'ADDITIONAL_TRANSFORMER'
    };
  };

  interface ConfigSnapshot {
    conductors: Record<string, string>;
    capacitors: Record<string, number>;
    transformerKva: number;
    bifurcation: BifurcationConfig;
  }

  // What-If Interventions State
  const [activeTransformerKva, setActiveTransformerKva] = useState<number>(activeFeeder.existingTransformerKva);
  const [activeInjectedVoltage, setActiveInjectedVoltage] = useState<number>(activeFeeder.nominalVoltage);
  const [activeConductors, setActiveConductors] = useState<Record<string, string>>({});
  const [activeCapacitors, setActiveCapacitors] = useState<Record<string, number>>({});
  const [activeLoadFactor, setActiveLoadFactor] = useState<number | undefined>(undefined);
  const [bifurcationConfig, setBifurcationConfig] = useState<BifurcationConfig>(() => {
    return getSavedBifurcationConfig(GULBHAR_COLONY_LT_FEEDER);
  });

  // History Tracker
  const [history, setHistory] = useState<ConfigSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addToHistory = () => {
    const snapshot: ConfigSnapshot = {
      conductors: { ...activeConductors },
      capacitors: { ...activeCapacitors },
      transformerKva: activeTransformerKva,
      bifurcation: { ...bifurcationConfig }
    };
    const newHistory = [...history.slice(0, historyIndex + 1), snapshot];
    if (newHistory.length > 4) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setActiveConductors(prev.conductors);
      setActiveCapacitors(prev.capacitors);
      setActiveTransformerKva(prev.transformerKva);
      setBifurcationConfig(prev.bifurcation);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setActiveConductors(next.conductors);
      setActiveCapacitors(next.capacitors);
      setActiveTransformerKva(next.transformerKva);
      setBifurcationConfig(next.bifurcation);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Handler to update and persist bifurcation config
  const handleUpdateTransformerKva = (kva: number) => {
    addToHistory();
    setActiveTransformerKva(kva);
  };

  const handleUpdateBifurcationConfig = (newConfig: BifurcationConfig) => {
    addToHistory();
    setBifurcationConfig(newConfig);
    try {
      localStorage.setItem(`pesco_bifurcation_${selectedFeederId}`, JSON.stringify(newConfig));
      localStorage.setItem('pesco_bifurcation_active', JSON.stringify({
        feederId: selectedFeederId,
        config: newConfig
      }));
    } catch (e) {
      console.warn('Failed to save bifurcation config:', e);
    }
    if (newConfig.enabled) {
      setDbToast(`Bifurcation status saved: Cut-off @ Node ${newConfig.bifurcationNodeId} · T-2: ${newConfig.transformerCapacityKva} kVA @ Node ${newConfig.transformerNodeId || newConfig.bifurcationNodeId}`);
      setTimeout(() => setDbToast(''), 3500);
    }
  };

  // Category switch handler (LV vs HV)
  const handleSelectCategory = (category: FeederCategory) => {
    setActiveCategory(category);
    if (activeSystemModule !== 'elr_loss_analysis') {
      setActiveSystemModule('elr_loss_analysis');
    }
    const matching = Object.values(customFeeders).filter(f => {
      const cat = f.category || (f.type === 'HT' ? 'HV' : 'LV');
      return cat === category;
    });
    if (matching.length > 0) {
      const defaultId = category === 'LV' ? 'gulbhar-colony-peshawar' : 'hayatabad-11kv-feeder';
      const target = matching.find(f => f.id === defaultId) || matching[0];
      setSelectedFeederId(target.id);
      setActiveTransformerKva(target.existingTransformerKva);
      setActiveInjectedVoltage(target.nominalVoltage);
      setActiveConductors({});
      setActiveCapacitors({});
      setActiveLoadFactor(undefined);
      setBifurcationConfig(getSavedBifurcationConfig(target));
    }
    setDbToast(category === 'LV' 
      ? '⚡ Switched to 400V LT Feeder Analysis (Secondary Distribution · Gulbhar Colony)' 
      : '⚡ Switched to 11kV HT Feeder Analysis (Primary 11 kV Feeder · Injected Voltage @ Node 0)'
    );
    setTimeout(() => setDbToast(''), 3500);
  };

  // When switching feeders, load persisted bifurcation configuration
  const handleSelectFeeder = (feederId: string) => {
    setSelectedFeederId(feederId);
    const target = customFeeders[feederId] || PRESET_FEEDERS.find(f => f.id === feederId) || GULBHAR_COLONY_LT_FEEDER;
    const cat = target.category || (target.type === 'HT' ? 'HV' : 'LV');
    setActiveCategory(cat);
    setActiveTransformerKva(target.existingTransformerKva);
    setActiveInjectedVoltage(target.nominalVoltage);
    setActiveConductors({});
    setActiveCapacitors({});
    setActiveLoadFactor(undefined);
    setBifurcationConfig(getSavedBifurcationConfig(target));
  };

  // Modals state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportDisplayMode, setReportDisplayMode] = useState<'full_report' | 'single_line_diagram' | undefined>('full_report');
  const [isConductorsOpen, setIsConductorsOpen] = useState(false);
  const [isLocalDbOpen, setIsLocalDbOpen] = useState(false);
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [isSaveUnifiedOpen, setIsSaveUnifiedOpen] = useState(false);
  const [currentLinkedEstimate, setCurrentLinkedEstimate] = useState<CostEstimateRecord | null>(null);
  const [dbToast, setDbToast] = useState('');
  const [inspectedNode, setInspectedNode] = useState<FeederNode | null>(null);

  // Start new job handler
  const handleCreateNewJob = (newFeeder: FeederData) => {
    setCustomFeeders(prev => ({
      ...prev,
      [newFeeder.id]: newFeeder
    }));
    setSelectedFeederId(newFeeder.id);
    const cat = newFeeder.category || (newFeeder.type === 'HT' ? 'HV' : 'LV');
    setActiveCategory(cat);
    setActiveTransformerKva(newFeeder.existingTransformerKva);
    setActiveConductors({});
    setActiveCapacitors({});
    setActiveTab('input_form');

    saveFeederToLocalDb(newFeeder).catch(console.error);
    setDbToast(`Started new job: "${newFeeder.name}"`);
    setTimeout(() => setDbToast(''), 3500);
  };

  // Initialize and load custom/persisted feeders from IndexedDB local database on mount
  React.useEffect(() => {
    let mounted = true;
    initLocalDatabase()
      .then(res => {
        if (mounted && res && res.feeders && Object.keys(res.feeders).length > 0) {
          setCustomFeeders(res.feeders);
        }
      })
      .catch(err => {
        console.warn('Local database initialization:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Baseline Calculation (Current Installed Feeder)
  const existingSummary = useMemo(() => {
    return calculateFeederAnalysis(activeFeeder);
  }, [activeFeeder]);

  // Proposed Calculation (With What-If Interventions)
  const proposedSummary = useMemo(() => {
    return calculateFeederAnalysis(activeFeeder, {
      customConductors: activeConductors,
      customCapacitors: activeCapacitors,
      transformerOverrideKva: activeTransformerKva,
      voltageOverride: activeInjectedVoltage,
      loadFactorOverride: activeLoadFactor,
      bifurcation: bifurcationConfig
    });
  }, [activeFeeder, activeConductors, activeCapacitors, activeTransformerKva, activeInjectedVoltage, activeLoadFactor, bifurcationConfig]);

  // Forecast data (5-Year)
  const forecastData = useMemo(() => {
    return generateGrowthForecast(activeFeeder, 5, activeFeeder.annualGrowthRatePercent, {
      customConductors: activeConductors,
      customCapacitors: activeCapacitors,
      bifurcation: bifurcationConfig
    });
  }, [activeFeeder, activeConductors, activeCapacitors, bifurcationConfig]);

  // Bifurcation Analysis Dossier (Exist, Proposed-1, and Proposed-2 Lines @ 0 & 5 Years)
  const bifurcationDossier = useMemo(() => {
    return calculateBifurcationFourStatements(activeFeeder, bifurcationConfig, {
      customConductors: activeConductors,
      customCapacitors: activeCapacitors,
      t1TransformerOverrideKva: activeTransformerKva,
      loadFactorOverride: activeLoadFactor
    });
  }, [activeFeeder, bifurcationConfig, activeConductors, activeCapacitors, activeTransformerKva, activeLoadFactor]);

  const hasActiveInterventions = 
    activeTransformerKva !== activeFeeder.existingTransformerKva ||
    activeInjectedVoltage !== activeFeeder.nominalVoltage ||
    Object.keys(activeConductors).length > 0 ||
    Object.keys(activeCapacitors).length > 0 ||
    (activeLoadFactor !== undefined && activeLoadFactor !== activeFeeder.loadFactor) ||
    bifurcationConfig.enabled;

  // Handlers for What-If
  const handleSetConductor = (segmentId: string, conductorCode: string) => {
    addToHistory();
    setActiveConductors(prev => {
      const next = { ...prev };
      if (conductorCode === 'A' || conductorCode === activeFeeder.segments.find(s => s.id === segmentId)?.conductorCode) {
        delete next[segmentId];
      } else {
        next[segmentId] = conductorCode;
      }
      return next;
    });
  };

  const handleSetCapacitor = (nodeId: string, kvar: number) => {
    addToHistory();
    setActiveCapacitors(prev => {
      const next = { ...prev };
      if (kvar <= 0) {
        delete next[nodeId];
      } else {
        next[nodeId] = kvar;
      }
      return next;
    });
  };

  const handleApplyPackage = (pkg: 'standard' | 'max' | 'capacitor_only' | 'bifurcation') => {
    if (pkg === 'bifurcation') {
      setActiveTransformerKva(activeFeeder.existingTransformerKva);
      handleUpdateBifurcationConfig({
        enabled: true,
        bifurcationNodeId: activeFeeder.nodes[2]?.id || '3.0',
        transformerNodeId: activeFeeder.nodes[2]?.id || '3.0',
        transformerCapacityKva: activeFeeder.category === 'HV' ? 2500 : 100,
        mode: 'ADDITIONAL_TRANSFORMER'
      });
      setActiveCapacitors({ '6.0': 20 });
      setActiveConductors({});
      setActiveLoadFactor(undefined);
    } else if (pkg === 'standard') {
      setActiveTransformerKva(activeFeeder.proposedTransformerKva);
      handleUpdateBifurcationConfig({ ...bifurcationConfig, enabled: false });
      setActiveCapacitors({ '6.0': 20 });
      setActiveConductors({});
      setActiveLoadFactor(undefined);
    } else if (pkg === 'max') {
      setActiveTransformerKva(activeFeeder.proposedTransformerKva);
      handleUpdateBifurcationConfig({
        enabled: true,
        bifurcationNodeId: activeFeeder.nodes[2]?.id || '3.0',
        transformerNodeId: activeFeeder.nodes[2]?.id || '3.0',
        transformerCapacityKva: activeFeeder.category === 'HV' ? 2500 : 100,
        mode: 'ADDITIONAL_TRANSFORMER'
      });
      setActiveCapacitors({ '6.0': 20, '12.0': 20 });
      setActiveConductors({ 's-1-2': 'DOG', 's-2-3': 'DOG' });
      setActiveLoadFactor(undefined);
    } else if (pkg === 'capacitor_only') {
      handleUpdateBifurcationConfig({ ...bifurcationConfig, enabled: false });
      setActiveCapacitors({ '6.0': 20, '12.0': 15 });
      setActiveLoadFactor(undefined);
    }
  };

  const handleResetInterventions = () => {
    setActiveTransformerKva(activeFeeder.existingTransformerKva);
    setActiveInjectedVoltage(activeFeeder.nominalVoltage);
    setActiveConductors({});
    setActiveCapacitors({});
    setActiveLoadFactor(undefined);
    handleUpdateBifurcationConfig({
      enabled: false,
      bifurcationNodeId: activeFeeder.nodes[2]?.id || '3.0',
      transformerNodeId: activeFeeder.nodes[2]?.id || '3.0',
      transformerCapacityKva: activeFeeder.category === 'HV' ? 2500 : 100,
      mode: 'ADDITIONAL_TRANSFORMER'
    });
  };

  // Node Inspector update
  const handleUpdateNode = (updatedNode: FeederNode) => {
    setCustomFeeders(prev => {
      const current = prev[selectedFeederId] || activeFeeder;
      const newNodes = current.nodes.map(n => n.id === updatedNode.id ? updatedNode : n);
      return {
        ...prev,
        [selectedFeederId]: {
          ...current,
          nodes: newNodes
        }
      };
    });
  };

  // Input Data Form update with automatic local database persistence
  const handleSaveFeeder = (updatedFeeder: FeederData) => {
    setCustomFeeders(prev => ({
      ...prev,
      [selectedFeederId]: updatedFeeder
    }));
    setActiveTransformerKva(updatedFeeder.existingTransformerKva);

    saveFeederToLocalDb(updatedFeeder)
      .then(() => {
        setDbToast(`Feeder "${updatedFeeder.name}" saved to Local Database (IndexedDB)`);
        setTimeout(() => setDbToast(''), 3500);
      })
      .catch(err => {
        console.error('Failed to auto-save to local database:', err);
      });
  };

  // Restore snapshot from local database into workspace
  const handleLoadSnapshot = (snapshot: SavedAnalysisSnapshot) => {
    setCustomFeeders(prev => ({
      ...prev,
      [snapshot.feederId]: snapshot.feederData
    }));
    setSelectedFeederId(snapshot.feederId);
    setActiveCategory(snapshot.category);
    setActiveTransformerKva(snapshot.transformerKva);
    setActiveConductors({});
    setActiveCapacitors({});
    setActiveTab('table');
    if (snapshot.linkedEstimate) {
      setCurrentLinkedEstimate(snapshot.linkedEstimate);
      saveEstimateToDb(snapshot.linkedEstimate).catch(console.error);
    }
    setDbToast(`Loaded snapshot "${snapshot.name}" from Local Database`);
    setTimeout(() => setDbToast(''), 3500);
  };

  React.useEffect(() => {
    const handleOpenReport = () => setIsReportOpen(true);
    window.addEventListener('open-report-modal', handleOpenReport);
    return () => window.removeEventListener('open-report-modal', handleOpenReport);
  }, []);

  // Open Unified Project Save Modal (Saves ELR Analysis + Cost Estimation as One Project)
  const handleOpenSaveUnifiedProject = async () => {
    try {
      const allEstimates = await getAllEstimatesFromDb();
      let matched = 
        allEstimates.find(e => e.id === activeFeeder.linkedEstimateId) ||
        allEstimates.find(e => e.id === `est-elr-${activeFeeder.id}`) ||
        allEstimates.find(e => e.id.includes(activeFeeder.id)) ||
        allEstimates.find(e => e.projectInfo.feederName?.trim().toLowerCase() === activeFeeder.name?.trim().toLowerCase()) ||
        allEstimates.find(e => activeFeeder.workOrderNo && e.projectInfo.workOrderNo === activeFeeder.workOrderNo) ||
        null;

      if (!matched) {
        matched = buildLinkedEstimateForFeeder(activeFeeder, INITIAL_MATERIALS, DEFAULT_DESIGN_FACTORS);
      }
      setCurrentLinkedEstimate(matched);
    } catch {
      const fallback = buildLinkedEstimateForFeeder(activeFeeder, INITIAL_MATERIALS, DEFAULT_DESIGN_FACTORS);
      setCurrentLinkedEstimate(fallback);
    }
    setIsSaveUnifiedOpen(true);
  };

  // Save Both ELR Analysis & Cost Estimation as One Project
  const handleConfirmSaveUnifiedProject = async (projectName: string, remarks: string) => {
    const estimateToSave: CostEstimateRecord = currentLinkedEstimate || buildLinkedEstimateForFeeder(activeFeeder, INITIAL_MATERIALS, DEFAULT_DESIGN_FACTORS);

    const updatedEstimate: CostEstimateRecord = {
      ...estimateToSave,
      projectInfo: {
        ...estimateToSave.projectInfo,
        schemeProjectName: projectName,
        purposeOfWork: remarks,
        feederName: activeFeeder.name,
        workOrderNo: activeFeeder.workOrderNo || estimateToSave.projectInfo.workOrderNo || '26-14-71-26-042',
        subDivision: activeFeeder.subDivision || estimateToSave.projectInfo.subDivision,
        division: activeFeeder.division || estimateToSave.projectInfo.division,
        circle: activeFeeder.circle || estimateToSave.projectInfo.circle,
        district: activeFeeder.district || estimateToSave.projectInfo.district
      },
      updatedAt: new Date().toISOString()
    };

    const updatedFeeder: FeederData = {
      ...activeFeeder,
      schemeProjectName: projectName,
      purposeOfWork: remarks,
      linkedEstimateId: updatedEstimate.id,
      linkedEstimate: updatedEstimate
    };

    // 1. Save Feeder Analysis Model
    await saveFeederToLocalDb(updatedFeeder);
    setCustomFeeders(prev => ({
      ...prev,
      [selectedFeederId]: updatedFeeder
    }));

    // 2. Save Cost Estimate Model
    await saveEstimateToDb(updatedEstimate);
    setCurrentLinkedEstimate(updatedEstimate);

    // 3. Save Unified Analysis + Cost Estimate Snapshot in Local Database
    const currentSummary = hasActiveInterventions ? proposedSummary : existingSummary;
    const snapshot: SavedAnalysisSnapshot = {
      id: `snap-unified-${Date.now()}`,
      name: projectName,
      notes: remarks,
      timestamp: Date.now(),
      feederId: updatedFeeder.id,
      feederName: updatedFeeder.name,
      category: updatedFeeder.category || (updatedFeeder.type === 'HT' ? 'HV' : 'LV'),
      transformerKva: activeTransformerKva,
      totalCircuitLengthKm: currentSummary.totalCircuitLengthKm,
      totalSystemDemandKva: currentSummary.totalSystemDemandKva,
      totalLineLossKw: currentSummary.totalLineLossKw,
      worstVoltageDropPercent: currentSummary.worstVoltageDropPercent,
      worstVoltageVolts: currentSummary.worstVoltageVolts,
      annualEnergyLossKwh: currentSummary.annualEnergyLossKwh,
      isTransformerOverloaded: currentSummary.isTransformerOverloaded,
      feederData: JSON.parse(JSON.stringify(updatedFeeder)),
      summary: JSON.parse(JSON.stringify(currentSummary)),
      linkedEstimate: JSON.parse(JSON.stringify(updatedEstimate))
    };
    await saveAnalysisSnapshotToDb(snapshot);

    setDbToast(`✅ Unified Project "${projectName}" Saved! (1. FLADIX Feeder Loss Analysis + 2. Cost Estimate under WO: ${updatedFeeder.workOrderNo || '26-14-71-26-042'})`);
    setTimeout(() => setDbToast(''), 4500);
  };

  // Export Unified Project File (Downloadable JSON Bundle)
  const handleExportUnifiedProjectFile = () => {
    const currentSummary = hasActiveInterventions ? proposedSummary : existingSummary;
    const estimateToExport = currentLinkedEstimate || buildLinkedEstimateForFeeder(activeFeeder, INITIAL_MATERIALS, DEFAULT_DESIGN_FACTORS);

    const bundle = {
      projectFormat: 'PESCO_UNIFIED_PROJECT_BUNDLE_V1',
      exportedAt: new Date().toISOString(),
      projectInfo: {
        projectName: activeFeeder.schemeProjectName || activeFeeder.name,
        feederName: activeFeeder.name,
        workOrderNo: activeFeeder.workOrderNo || '26-14-71-26-042',
        circle: activeFeeder.circle || 'Peshawar Circle-1',
        division: activeFeeder.division || 'Cantt Division Peshawar',
        subDivision: activeFeeder.subDivision || 'Gulbhar Sub-Division',
        voltageCategory: activeCategory
      },
      part1_elrLossAnalysis: {
        feederData: activeFeeder,
        summary: currentSummary,
        bifurcationConfig: bifurcationConfig
      },
      part2_lineCostEstimation: {
        estimate: estimateToExport
      }
    };

    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizeName = (activeFeeder.name || 'project').toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.download = `pesco_unified_project_${sanitizeName}_${activeFeeder.workOrderNo || '26147126042'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-blueprint-grid dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 selection:bg-amber-500 selection:text-slate-950 transition-colors duration-200">
      {/* Header with Category & Navigation Controls (Sticky unscrollable at top, hidden when printing official reports) */}
      <div className="sticky top-0 z-40 print:hidden no-print shadow-xl">
        <Header
          activeSystemModule={activeSystemModule}
          onSelectSystemModule={setActiveSystemModule}
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          feederType={activeFeeder.type}
          selectedFeederId={selectedFeederId}
          onSelectFeeder={handleSelectFeeder}
          onOpenReport={() => {
            setReportDisplayMode('full_report');
            setIsReportOpen(true);
          }}
          onOpenConductors={() => setIsConductorsOpen(true)}
          onOpenDatabase={() => setIsLocalDbOpen(true)}
          onOpenNewJob={() => setIsNewJobOpen(true)}
          onResetInterventions={handleResetInterventions}
          hasActiveInterventions={hasActiveInterventions}
          availableFeeders={availableFeeders}
          activeTransformerKva={activeTransformerKva}
          summary={hasActiveInterventions ? proposedSummary : existingSummary}
          selectedJobTitle={selectedJobTitle}
          onSelectJobTitle={handleSelectJobTitle}
          onSaveUnifiedProject={handleOpenSaveUnifiedProject}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* Database Save Toast Notification (3D Dark Glass Badge) */}
      {dbToast && (
        <div className="fixed bottom-6 right-6 z-50 card-3d-dark text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 print:hidden no-print">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{dbToast}</span>
        </div>
      )}

      {/* Main Workspace Viewport (Adapts to all screens 360px to 4K ultra-wide) */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-5 space-y-4 sm:space-y-6 print:hidden">
        
        {activeSystemModule === 'line_cost_estimation' ? (
          <CostEstimationModule 
            currentJobTitle={selectedJobTitle}
            activeFeeder={activeFeeder}
            existingSummary={existingSummary}
            proposedSummary={proposedSummary}
            hasActiveInterventions={hasActiveInterventions}
            activeSummary={hasActiveInterventions ? proposedSummary : existingSummary}
            bifurcationConfig={bifurcationConfig}
            onUpdateFeeder={handleSaveFeeder}
            onSwitchToAnalysis={() => setActiveSystemModule('elr_loss_analysis')}
            onSelectFeeder={handleSelectFeeder}
            availableFeeders={availableFeeders}
            onSaveUnifiedProject={handleOpenSaveUnifiedProject}
          />
        ) : (
          <>
            {/* Executive KPI Summary Cards */}
            <SummaryMetrics
              summary={hasActiveInterventions ? proposedSummary : existingSummary}
              feeder={activeFeeder}
              isProposedScenario={hasActiveInterventions}
              onSaveUnifiedProject={handleOpenSaveUnifiedProject}
              onOpenCostEstimation={() => setActiveSystemModule('line_cost_estimation')}
            />

            {/* What-If Active Banner (3D Tactile Card) */}
            {hasActiveInterventions && (
              <div className="card-3d bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border-emerald-300 text-emerald-950 px-4 py-3 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 no-print shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="leading-snug">
                    <strong className="font-bold text-emerald-900">What-If Scenario Active:</strong> Viewing upgraded system ({activeTransformerKva} kVA transformer, {Object.keys(activeConductors).length} re-conductored spans, {proposedSummary.totalCapacitorKvar} kVAR capacitors).
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className={`btn-3d-slate px-3 py-1 text-xs font-bold cursor-pointer ${historyIndex <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Undo
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className={`btn-3d-slate px-3 py-1 text-xs font-bold cursor-pointer ${historyIndex >= history.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Redo
                  </button>
                  <button
                    onClick={handleResetInterventions}
                    className="btn-3d-slate px-3 py-1 text-xs text-rose-300 hover:text-white font-bold cursor-pointer"
                  >
                    Reset to Baseline
                  </button>
                </div>
              </div>
            )}

            {/* Tab Content Display */}
            {activeTab === 'input_form' && (
              <div className="space-y-4">
                <InputDataForm
                  key={`input-${activeFeeder.id}-${activeCategory}`}
                  feeder={activeFeeder}
                  summary={hasActiveInterventions ? proposedSummary : existingSummary}
                  onSaveFeeder={handleSaveFeeder}
                  onNavigateToSchedule={() => setActiveTab('table')}
                  activeTransformerKva={activeTransformerKva}
                  onUpdateTransformerKva={(kva) => setActiveTransformerKva(kva)}
                  onOpenDatabase={() => setIsLocalDbOpen(true)}
                  onSelectCategory={handleSelectCategory}
                  onOpenLinkedCostEstimate={() => setActiveSystemModule('line_cost_estimation')}
                  onSaveUnifiedProject={handleOpenSaveUnifiedProject}
                />
              </div>
            )}

            {activeTab === 'sld' && (
              <div className="space-y-4">
                <SingleLineDiagram
                  key={`sld-${activeFeeder.id}-${activeCategory}`}
                  feeder={activeFeeder}
                  summary={hasActiveInterventions ? proposedSummary : existingSummary}
                  existingSummary={existingSummary}
                  bifurcationConfig={bifurcationConfig}
                  onUpdateBifurcation={handleUpdateBifurcationConfig}
                  bifurcationDossier={bifurcationDossier}
                  onSelectNode={(node) => setInspectedNode(node)}
                  onSelectSegment={(segResult) => {
                    setActiveTab('table');
                  }}
                  onQuickReconductor={handleSetConductor}
                  onQuickCapacitor={handleSetCapacitor}
                  activeCapacitors={activeCapacitors}
                  activeConductors={activeConductors}
                  onOpenPrintReport={() => {
                    setReportDisplayMode('single_line_diagram');
                    setIsReportOpen(true);
                  }}
                />
              </div>
            )}

            {activeTab === 'table' && (
              <div className="space-y-4">
                <SegmentTable
                  key={`table-${activeFeeder.id}-${activeCategory}`}
                  segmentResults={(hasActiveInterventions ? proposedSummary : existingSummary).segmentResults}
                  feeder={activeFeeder}
                  onReconductor={handleSetConductor}
                  activeConductors={activeConductors}
                  activeCapacitors={activeCapacitors}
                  activeTransformerKva={activeTransformerKva}
                  onUpdateTransformerKva={(kva) => setActiveTransformerKva(kva)}
                  activeInjectedVoltage={activeInjectedVoltage}
                  onUpdateInjectedVoltage={(volts) => setActiveInjectedVoltage(volts)}
                  onResetToImage1={() => {
                    setCustomFeeders(prev => ({
                      ...prev,
                      [selectedFeederId]: JSON.parse(JSON.stringify(PRESET_FEEDERS.find(f => f.id === selectedFeederId) || GULBHAR_COLONY_LT_FEEDER))
                    }));
                    setActiveTransformerKva(activeFeeder.existingTransformerKva);
                    setActiveInjectedVoltage(activeFeeder.nominalVoltage);
                    setActiveConductors({});
                    setActiveCapacitors({});
                  }}
                />
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="space-y-4">
                <LossCharts
                  key={`charts-${activeFeeder.id}-${activeCategory}`}
                  summary={hasActiveInterventions ? proposedSummary : existingSummary}
                  feeder={activeFeeder}
                  forecastData={forecastData}
                  existingSummary={existingSummary}
                  proposedSummary={proposedSummary}
                />
              </div>
            )}

            {activeTab === 'whatif' && (
              <div className="space-y-4">
                <WhatIfWorkbench
                  key={`whatif-${activeFeeder.id}-${activeCategory}`}
                  feeder={activeFeeder}
                  existingSummary={existingSummary}
                  proposedSummary={proposedSummary}
                  activeTransformerKva={activeTransformerKva}
                  setActiveTransformerKva={setActiveTransformerKva}
                  activeInjectedVoltage={activeInjectedVoltage}
                  onUpdateInjectedVoltage={(volts) => setActiveInjectedVoltage(volts)}
                  activeConductors={activeConductors}
                  onSetConductor={handleSetConductor}
                  activeCapacitors={activeCapacitors}
                  onSetCapacitor={handleSetCapacitor}
                  activeLoadFactor={activeLoadFactor}
                  onSetLoadFactor={(lf) => setActiveLoadFactor(lf)}
                  bifurcationConfig={bifurcationConfig}
                  onSetBifurcation={handleUpdateBifurcationConfig}
                  onApplyPackage={handleApplyPackage}
                  onReset={handleResetInterventions}
                  onOpenPrintReport={() => setIsReportOpen(true)}
                  onOpenCostEstimation={() => setActiveSystemModule('line_cost_estimation')}
                  onUndo={undo}
                  onRedo={redo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                />
              </div>
            )}

            {activeTab === 'forecast' && (
              <div className="space-y-4">
                <ForecastingView
                  key={`forecast-${activeFeeder.id}-${activeCategory}`}
                  feeder={activeFeeder}
                  activeConductors={activeConductors}
                  activeCapacitors={activeCapacitors}
                  bifurcationConfig={bifurcationConfig}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer (100% Width) - Hidden during print */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto no-print print:hidden w-full">
        <div className="w-full px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span>FLADIX · Feeder Loss Analysis and Data Indexing · PESCO Distribution Suite & CSR-2026 Line Cost Estimation</span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Designed By Engr. Inayatullah</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveSystemModule(prev => prev === 'line_cost_estimation' ? 'elr_loss_analysis' : 'line_cost_estimation')}
              className={`hover:text-slate-800 transition-colors font-bold flex items-center gap-1 cursor-pointer ${
                activeSystemModule === 'line_cost_estimation' ? 'text-amber-600' : 'text-blue-600'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{activeSystemModule === 'line_cost_estimation' ? 'Switch to FLADIX Feeder Loss Analysis' : 'Line Extension Cost Estimation'}</span>
            </button>
            <button
              onClick={() => setIsLocalDbOpen(true)}
              className="hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-amber-500" />
              <span>Local Database</span>
            </button>
            <button
              onClick={() => setIsConductorsOpen(true)}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              Conductor Database
            </button>
            <button
              onClick={() => setIsReportOpen(true)}
              className="hover:text-slate-800 transition-colors font-medium text-amber-700 cursor-pointer"
            >
              Export Engineering Report
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isReportOpen && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          feeder={activeFeeder}
          summary={existingSummary}
          proposedSummary={proposedSummary}
          activeTransformerKva={activeTransformerKva}
          bifurcationConfig={bifurcationConfig}
          selectedJobTitle={selectedJobTitle}
          initialDisplayMode={reportDisplayMode}
        />
      )}

      <ConductorLibraryModal
        isOpen={isConductorsOpen}
        onClose={() => setIsConductorsOpen(false)}
      />

      <LocalDatabaseModal
        isOpen={isLocalDbOpen}
        onClose={() => setIsLocalDbOpen(false)}
        activeFeeder={activeFeeder}
        activeSummary={hasActiveInterventions ? proposedSummary : existingSummary}
        activeTransformerKva={activeTransformerKva}
        customFeeders={customFeeders}
        onLoadSnapshot={handleLoadSnapshot}
        onLoadFeeder={(feederId) => handleSelectFeeder(feederId)}
        onRefreshFeeders={(updated) => setCustomFeeders(updated)}
      />

      <NewJobModal
        isOpen={isNewJobOpen}
        onClose={() => setIsNewJobOpen(false)}
        currentJobTitle={selectedJobTitle}
        onJobTitleChange={handleSelectJobTitle}
        onCreateJob={handleCreateNewJob}
        activeCategory={activeCategory}
      />

      <NodeInspectorModal
        isOpen={!!inspectedNode}
        node={inspectedNode}
        feeder={activeFeeder}
        onClose={() => setInspectedNode(null)}
        onUpdateNode={handleUpdateNode}
        incomingSegResult={
          inspectedNode 
            ? (hasActiveInterventions ? proposedSummary : existingSummary).segmentResults.find(s => s.toNodeId === inspectedNode.id)
            : undefined
        }
      />

      <SaveUnifiedProjectModal
        isOpen={isSaveUnifiedOpen}
        onClose={() => setIsSaveUnifiedOpen(false)}
        feeder={activeFeeder}
        summary={hasActiveInterventions ? proposedSummary : existingSummary}
        estimate={currentLinkedEstimate}
        onConfirmSave={handleConfirmSaveUnifiedProject}
        onExportProjectFile={handleExportUnifiedProjectFile}
      />
    </div>
  );
}
