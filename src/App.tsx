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
  JobTitle 
} from './types/feeder';
import { 
  calculateFeederAnalysis, 
  generateGrowthForecast 
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
import { 
  initLocalDatabase, 
  saveFeederToLocalDb, 
  SavedAnalysisSnapshot 
} from './utils/localDatabase';
import { Zap, GitBranch, Layers, TrendingUp, SlidersHorizontal, FileText, CheckCircle2, ShieldAlert, Database } from 'lucide-react';

export default function App() {
  const [activeCategory, setActiveCategory] = useState<FeederCategory>('LV');
  const [selectedFeederId, setSelectedFeederId] = useState<string>('gulbhar-colony-peshawar');
  const [activeTab, setActiveTab] = useState<'input_form' | 'sld' | 'table' | 'charts' | 'whatif' | 'forecast'>('input_form');

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

  // What-If Interventions State
  const [activeTransformerKva, setActiveTransformerKva] = useState<number>(activeFeeder.existingTransformerKva);
  const [activeConductors, setActiveConductors] = useState<Record<string, string>>({});
  const [activeCapacitors, setActiveCapacitors] = useState<Record<string, number>>({});
  const [activeLoadFactor, setActiveLoadFactor] = useState<number | undefined>(undefined);

  // Category switch handler (LV vs HV)
  const handleSelectCategory = (category: FeederCategory) => {
    setActiveCategory(category);
    const matching = Object.values(customFeeders).filter(f => {
      const cat = f.category || (f.type === 'HT' ? 'HV' : 'LV');
      return cat === category;
    });
    if (matching.length > 0) {
      const defaultId = category === 'LV' ? 'gulbhar-colony-peshawar' : 'hayatabad-11kv-feeder';
      const target = matching.find(f => f.id === defaultId) || matching[0];
      setSelectedFeederId(target.id);
      setActiveTransformerKva(target.existingTransformerKva);
      setActiveConductors({});
      setActiveCapacitors({});
      setActiveLoadFactor(undefined);
    }
  };

  // When switching feeders, reset what-if parameters
  const handleSelectFeeder = (feederId: string) => {
    setSelectedFeederId(feederId);
    const target = customFeeders[feederId] || PRESET_FEEDERS.find(f => f.id === feederId) || GULBHAR_COLONY_LT_FEEDER;
    const cat = target.category || (target.type === 'HT' ? 'HV' : 'LV');
    setActiveCategory(cat);
    setActiveTransformerKva(target.existingTransformerKva);
    setActiveConductors({});
    setActiveCapacitors({});
    setActiveLoadFactor(undefined);
  };

  // Modals state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isConductorsOpen, setIsConductorsOpen] = useState(false);
  const [isLocalDbOpen, setIsLocalDbOpen] = useState(false);
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
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
      loadFactorOverride: activeLoadFactor
    });
  }, [activeFeeder, activeConductors, activeCapacitors, activeTransformerKva, activeLoadFactor]);

  // Forecast data (5-Year)
  const forecastData = useMemo(() => {
    return generateGrowthForecast(activeFeeder, 5, activeFeeder.annualGrowthRatePercent, {
      customConductors: activeConductors,
      customCapacitors: activeCapacitors
    });
  }, [activeFeeder, activeConductors, activeCapacitors]);

  const hasActiveInterventions = 
    activeTransformerKva !== activeFeeder.existingTransformerKva ||
    Object.keys(activeConductors).length > 0 ||
    Object.keys(activeCapacitors).length > 0 ||
    (activeLoadFactor !== undefined && activeLoadFactor !== activeFeeder.loadFactor);

  // Handlers for What-If
  const handleSetConductor = (segmentId: string, conductorCode: string) => {
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

  const handleApplyPackage = (pkg: 'standard' | 'max' | 'capacitor_only') => {
    if (pkg === 'standard') {
      setActiveTransformerKva(activeFeeder.proposedTransformerKva);
      setActiveCapacitors({ '6.0': 20 });
      setActiveConductors({});
      setActiveLoadFactor(undefined);
    } else if (pkg === 'max') {
      setActiveTransformerKva(activeFeeder.proposedTransformerKva);
      setActiveCapacitors({ '6.0': 20, '12.0': 20 });
      setActiveConductors({ 's-1-2': 'DOG', 's-2-3': 'DOG' });
      setActiveLoadFactor(undefined);
    } else if (pkg === 'capacitor_only') {
      setActiveCapacitors({ '6.0': 20, '12.0': 15 });
      setActiveLoadFactor(undefined);
    }
  };

  const handleResetInterventions = () => {
    setActiveTransformerKva(activeFeeder.existingTransformerKva);
    setActiveConductors({});
    setActiveCapacitors({});
    setActiveLoadFactor(undefined);
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
    setDbToast(`Loaded snapshot "${snapshot.name}" from Local Database`);
    setTimeout(() => setDbToast(''), 3500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 2-Row Header with Category Selector */}
      <Header
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        feederType={activeFeeder.type}
        selectedFeederId={selectedFeederId}
        onSelectFeeder={handleSelectFeeder}
        onOpenReport={() => setIsReportOpen(true)}
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
      />

      {/* Database Save Toast Notification */}
      {dbToast && (
        <div className="fixed top-24 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{dbToast}</span>
        </div>
      )}

      {/* Main Workspace Viewport (100% Screen Width) */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-5 space-y-6">
        
        {/* Executive KPI Summary Cards */}
        <SummaryMetrics
          summary={hasActiveInterventions ? proposedSummary : existingSummary}
          feeder={activeFeeder}
          isProposedScenario={hasActiveInterventions}
        />

        {/* What-If Active Banner */}
        {hasActiveInterventions && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between no-print shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>What-If Scenario Active:</strong> Viewing upgraded system ({activeTransformerKva} kVA transformer, {Object.keys(activeConductors).length} re-conductored spans, {proposedSummary.totalCapacitorKvar} kVAR capacitors).
              </span>
            </div>
            <button
              onClick={handleResetInterventions}
              className="text-emerald-700 hover:text-emerald-900 font-bold underline ml-4 whitespace-nowrap"
            >
              Reset to Baseline
            </button>
          </div>
        )}

        {/* Tab Content Display */}
        {activeTab === 'input_form' && (
          <div className="space-y-4">
            <InputDataForm
              feeder={activeFeeder}
              summary={hasActiveInterventions ? proposedSummary : existingSummary}
              onSaveFeeder={handleSaveFeeder}
              onNavigateToSchedule={() => setActiveTab('table')}
              activeTransformerKva={activeTransformerKva}
              onUpdateTransformerKva={(kva) => setActiveTransformerKva(kva)}
              onOpenDatabase={() => setIsLocalDbOpen(true)}
            />
          </div>
        )}

        {activeTab === 'sld' && (
          <div className="space-y-4">
            <SingleLineDiagram
              feeder={activeFeeder}
              summary={hasActiveInterventions ? proposedSummary : existingSummary}
              onSelectNode={(node) => setInspectedNode(node)}
              onSelectSegment={(segResult) => {
                setActiveTab('table');
              }}
              onQuickReconductor={handleSetConductor}
              onQuickCapacitor={handleSetCapacitor}
              activeCapacitors={activeCapacitors}
              activeConductors={activeConductors}
            />
          </div>
        )}

        {activeTab === 'table' && (
          <div className="space-y-4">
            <SegmentTable
              segmentResults={(hasActiveInterventions ? proposedSummary : existingSummary).segmentResults}
              feeder={activeFeeder}
              onReconductor={handleSetConductor}
              activeConductors={activeConductors}
              activeCapacitors={activeCapacitors}
              activeTransformerKva={activeTransformerKva}
              onUpdateTransformerKva={(kva) => setActiveTransformerKva(kva)}
              onResetToImage1={() => {
                setCustomFeeders(prev => ({
                  ...prev,
                  [selectedFeederId]: JSON.parse(JSON.stringify(PRESET_FEEDERS.find(f => f.id === selectedFeederId) || GULBHAR_COLONY_LT_FEEDER))
                }));
                setActiveTransformerKva(activeFeeder.existingTransformerKva);
                setActiveConductors({});
                setActiveCapacitors({});
              }}
            />
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-4">
            <LossCharts
              summary={hasActiveInterventions ? proposedSummary : existingSummary}
              feeder={activeFeeder}
              forecastData={forecastData}
            />
          </div>
        )}

        {activeTab === 'whatif' && (
          <div className="space-y-4">
            <WhatIfWorkbench
              feeder={activeFeeder}
              existingSummary={existingSummary}
              proposedSummary={proposedSummary}
              activeTransformerKva={activeTransformerKva}
              setActiveTransformerKva={setActiveTransformerKva}
              activeConductors={activeConductors}
              onSetConductor={handleSetConductor}
              activeCapacitors={activeCapacitors}
              onSetCapacitor={handleSetCapacitor}
              activeLoadFactor={activeLoadFactor}
              onSetLoadFactor={(lf) => setActiveLoadFactor(lf)}
              onApplyPackage={handleApplyPackage}
              onReset={handleResetInterventions}
            />
          </div>
        )}

        {activeTab === 'forecast' && (
          <div className="space-y-4">
            <ForecastingView
              feeder={activeFeeder}
              activeConductors={activeConductors}
              activeCapacitors={activeCapacitors}
            />
          </div>
        )}
      </main>

      {/* Footer (100% Width) */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto no-print w-full">
        <div className="w-full px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            HT LV Feeder Loss Analysis System · Based on WAPDA ELR Methodology (Mohsin Iqbal, 2016)
          </div>
          <div className="flex items-center gap-4">
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
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        feeder={activeFeeder}
        summary={existingSummary}
        proposedSummary={proposedSummary}
        activeTransformerKva={activeTransformerKva}
        selectedJobTitle={selectedJobTitle}
      />

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
    </div>
  );
}
