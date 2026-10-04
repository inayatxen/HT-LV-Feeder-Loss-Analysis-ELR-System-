/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Zap, 
  FileText, 
  SlidersHorizontal, 
  TrendingUp, 
  GitBranch, 
  Layers, 
  BookOpen, 
  RotateCcw, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  Database,
  UserCheck,
  Edit3,
  Plus,
  FolderOpen,
  Calculator
} from 'lucide-react';
import { 
  FeederType, 
  FeederCategory, 
  FeederData, 
  FeederAnalysisSummary,
  JobTitle,
  JOB_TITLE_OPTIONS,
  PRESET_JOB_TITLES
} from '../types/feeder';

interface HeaderProps {
  activeSystemModule?: 'elr_loss_analysis' | 'line_cost_estimation';
  onSelectSystemModule?: (module: 'elr_loss_analysis' | 'line_cost_estimation') => void;
  activeCategory: FeederCategory;
  onSelectCategory: (category: FeederCategory) => void;
  activeTab: 'input_form' | 'sld' | 'table' | 'charts' | 'whatif' | 'forecast';
  setActiveTab: (tab: 'input_form' | 'sld' | 'table' | 'charts' | 'whatif' | 'forecast') => void;
  feederType: FeederType;
  selectedFeederId: string;
  onSelectFeeder: (id: string) => void;
  onOpenReport: () => void;
  onOpenConductors: () => void;
  onOpenDatabase: () => void;
  onOpenNewJob: () => void;
  onResetInterventions: () => void;
  hasActiveInterventions: boolean;
  availableFeeders: FeederData[];
  activeTransformerKva?: number;
  summary?: FeederAnalysisSummary;
  selectedJobTitle: JobTitle;
  onSelectJobTitle: (title: JobTitle) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSystemModule = 'elr_loss_analysis',
  onSelectSystemModule,
  activeCategory,
  onSelectCategory,
  activeTab,
  setActiveTab,
  selectedFeederId,
  onSelectFeeder,
  onOpenReport,
  onOpenConductors,
  onOpenDatabase,
  onOpenNewJob,
  onResetInterventions,
  hasActiveInterventions,
  availableFeeders,
  activeTransformerKva,
  summary,
  selectedJobTitle,
  onSelectJobTitle
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 no-print shadow-md w-full">
      {/* ========================================================
          ROW 1: 100% WIDTH BRAND, MODULE SWITCHER, JOB TITLE, & GLOBAL ACTIONS
         ======================================================== */}
      <div className="border-b border-slate-800/80 bg-slate-900 w-full">
        <div className="w-full px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2 sm:gap-3 overflow-x-auto scrollbar-none">
          
          {/* 1. Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative group shrink-0">
              <img
                src="/pesco-logo.svg"
                alt="PESCO WAPDA Logo"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-amber-500/40 shadow-sm transition-transform group-hover:scale-105"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-[8px] font-black shadow-xs">
                ⚡
              </span>
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap">
                  PESCO Distribution Suite
                </span>
                <span className="hidden md:inline-block text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  WAPDA
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden lg:block leading-none mt-0.5">
                Peshawar Electric Supply Company · Engineering & Loss Reduction
              </p>
            </div>
          </div>

          {/* 2. Primary System Module Switcher (ELR Analysis vs Line Cost Estimation) */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-700/80 shadow-inner shrink-0">
            <button
              onClick={() => onSelectSystemModule?.('elr_loss_analysis')}
              title="Switch to Feeder Loss Analysis & Technical Loss Reduction Module (WAPDA Engine)"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeSystemModule === 'elr_loss_analysis'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold ring-1 ring-amber-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${activeSystemModule === 'elr_loss_analysis' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>Feeder Loss Analysis (ELR)</span>
            </button>

            <button
              onClick={() => onSelectSystemModule?.('line_cost_estimation')}
              title="Switch to HT/LT Electrical Line Extension & Feeder Cost Estimation Module"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeSystemModule === 'line_cost_estimation'
                  ? 'bg-blue-600 text-white shadow-md font-extrabold ring-1 ring-blue-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Calculator className={`w-3.5 h-3.5 ${activeSystemModule === 'line_cost_estimation' ? 'text-white' : 'text-blue-400'}`} />
              <span>Line Cost Estimation</span>
            </button>
          </div>

          {/* 3. LV / HV Selector (400V LT vs 11kV HT Feeder Analysis Mode) */}
          <div 
            className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-700/80 shadow-inner shrink-0"
            role="group"
            aria-label="Feeder Voltage Category"
          >
            <button
              type="button"
              onClick={() => onSelectCategory('LV')}
              title="Switch to Low Voltage / Low Tension 400V Feeder Analysis (Secondary Distribution)"
              className={`flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'LV'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black ring-1 ring-amber-400 scale-[1.02]'
                  : 'text-amber-400 font-bold hover:text-amber-300 hover:bg-slate-900/80'
              }`}
            >
              <span>400V LT</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectCategory('HV')}
              title="Switch to High Voltage / High Tension 11kV Feeder Analysis (Primary Feeder & Node 0 Voltage Injection)"
              className={`flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'HV'
                  ? 'bg-sky-500 text-slate-950 shadow-sm font-black ring-1 ring-sky-400 scale-[1.02]'
                  : 'text-sky-400 font-bold hover:text-sky-300 hover:bg-slate-900/80'
              }`}
            >
              <span>11kV HT</span>
            </button>
          </div>

          {/* 3. Job Title Writing, Feeder Dropdown & Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Writable Job Title Input with Datalist Suggestions */}
            <div 
              className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-amber-500/70 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/50 shadow-inner transition-all group"
              title="Write or edit your custom Job Title / Designation"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] text-slate-400 hidden xl:inline font-medium">Job Title:</span>
              <input
                type="text"
                list="header-job-title-presets"
                value={selectedJobTitle}
                onChange={(e) => onSelectJobTitle(e.target.value)}
                placeholder="Write your job title..."
                className="bg-transparent text-amber-300 text-xs font-bold focus:outline-none w-[120px] sm:w-[150px] lg:w-[180px] placeholder:text-slate-500 truncate"
              />
              <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-amber-400 shrink-0 transition-colors pointer-events-none" />
              <datalist id="header-job-title-presets">
                {PRESET_JOB_TITLES.map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
            </div>

            {/* Job / Feeder Dropdown with Options to Start New or Open Old */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 hidden 2xl:inline font-medium">Job:</span>
              <select
                value={selectedFeederId}
                onChange={(e) => {
                  if (e.target.value === '__NEW_JOB__') {
                    onOpenNewJob();
                  } else if (e.target.value === '__OPEN_DB__') {
                    onOpenDatabase();
                  } else {
                    onSelectFeeder(e.target.value);
                  }
                }}
                className="bg-slate-800 text-slate-100 text-xs font-semibold border border-slate-700 hover:border-amber-500/70 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[130px] sm:max-w-[185px] truncate cursor-pointer shadow-inner"
              >
                <optgroup label="📋 Active / Available Jobs">
                  {availableFeeders.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="⚡ Quick Job Actions">
                  <option value="__NEW_JOB__">➕ + Start New Job / Study...</option>
                  <option value="__OPEN_DB__">📂 Open Old Saved Job (Local DB)...</option>
                </optgroup>
              </select>

              {/* Direct "+ New Job" Quick Button */}
              <button
                onClick={onOpenNewJob}
                title="Start a new Feeder Loss Analysis Job"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">New Job</span>
              </button>
            </div>

            {hasActiveInterventions && (
              <button
                onClick={onResetInterventions}
                title="Reset What-If overrides back to baseline"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/60 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onOpenConductors}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Conductor DB</span>
            </button>

            <button
              onClick={onOpenDatabase}
              title="Open Old Saved Jobs & Database Manager (IndexedDB)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Old Jobs / DB</span>
            </button>

            <button
              onClick={onOpenReport}
              title="Open Official WAPDA ELR Form & Loss Analysis Report"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer ring-1 ring-amber-300/80 active:scale-95"
            >
              <FileText className="w-4 h-4 text-slate-950 stroke-[2.2]" />
              <span>Report</span>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================
          ROW 2: 100% WIDTH PRIMARY FEATURE MODULE NAVIGATION BUTTONS
         ======================================================== */}
      {activeSystemModule === 'line_cost_estimation' ? (
        <div className="bg-slate-950 px-3 sm:px-6 lg:px-8 w-full border-t border-slate-800/60">
          <div className="w-full h-11 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className="text-blue-400 font-bold flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-400" />
                Electrical Line Extension & Feeder Cost Estimation Module
              </span>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <span className="text-slate-400 text-[11px] hidden sm:inline">PESCO Composite Schedule of Rates (CSR-2026) · WAPDA BOQ Engine</span>
            </div>

            <button
              onClick={() => onSelectSystemModule?.('elr_loss_analysis')}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch to Feeder Loss Analysis (ELR) →</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 px-3 sm:px-6 lg:px-8 w-full">
          <div className="w-full h-11 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            
            {/* Navigation Buttons */}
            <nav className="flex items-center gap-1 shrink-0">
              {/* 1. Input Data Form (image1.png) */}
              <button
                onClick={() => setActiveTab('input_form')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'input_form'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${activeTab === 'input_form' ? 'text-slate-950' : 'text-blue-400'}`} />
                <span>Input Data Form</span>
              </button>

              {/* 2. Single Line Diagram */}
              <button
                onClick={() => setActiveTab('sld')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'sld'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Single Line Diagram</span>
              </button>

              {/* 3. Segment Schedule (image2.png) */}
              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'table'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Calculated Schedule</span>
              </button>

              {/* 4. Loss & Voltage Analytics */}
              <button
                onClick={() => setActiveTab('charts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'charts'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Loss Analytics</span>
              </button>

              {/* 5. What-If Simulator */}
              <button
                onClick={() => setActiveTab('whatif')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'whatif'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>What-If Simulator</span>
                {hasActiveInterventions && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </button>

              {/* 6. 5-Year Forecast */}
              <button
                onClick={() => setActiveTab('forecast')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'forecast'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>5-Year Forecast</span>
              </button>
            </nav>

            {/* Right Status Badges in Row 2 */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Active Officer Badge */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                <UserCheck className="w-3 h-3 text-amber-400" />
                <span className="truncate max-w-[210px]">Officer: <strong className="text-white">{selectedJobTitle || 'SDO'}</strong></span>
              </div>

              {summary && activeTransformerKva && (
                <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">Trf:</span>
                  <span className="font-bold text-white">{activeTransformerKva} kVA</span>
                  <span className="text-slate-600">|</span>
                  <span className={`font-bold flex items-center gap-1 ${summary.isTransformerOverloaded ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {summary.isTransformerOverloaded ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {summary.existingTransformerLoadingPercent}% Load
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-400 font-bold">{summary.totalLineLossKw} kW Loss</span>
                </div>
              )}
              
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full inline-block ${activeCategory === 'LV' ? 'bg-amber-400' : 'bg-sky-400'}`} />
                <span className="hidden md:inline text-slate-300 font-semibold">{activeCategory === 'LV' ? '400V LT' : '11kV HT'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
