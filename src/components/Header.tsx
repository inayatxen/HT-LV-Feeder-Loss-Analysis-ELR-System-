/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PescoLogo } from './PescoLogo';
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
  Calculator,
  Save,
  FolderDown,
  Activity
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
  activeTab: 'input_form' | 'sld' | 'table' | 'charts' | 'voltage_profile' | 'whatif' | 'forecast';
  setActiveTab: (tab: 'input_form' | 'sld' | 'table' | 'charts' | 'voltage_profile' | 'whatif' | 'forecast') => void;
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
  onSaveUnifiedProject?: () => void;
  onResetToFactory?: () => void;
  theme: 'light' | 'dark' | 'blue' | 'amber';
  onToggleTheme: (theme: 'light' | 'dark' | 'blue' | 'amber') => void;
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
  onSelectJobTitle,
  onSaveUnifiedProject,
  onResetToFactory,
  theme,
  onToggleTheme
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 no-print shadow-xl w-full select-none">
      {/* ========================================================
          TOP ROW: PROMINENT CENTERED BRAND IDENTITY & WAPDA TITLE (3D CHASSIS)
         ======================================================== */}
      <div className="border-b border-slate-800/90 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 w-full py-2.5 sm:py-3.5 px-3 sm:px-6 md:px-8 shadow-inner">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 md:gap-5">
            <div className="relative group shrink-0">
              <PescoLogo className="w-full h-full" />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shadow-md border-2 border-slate-900 pointer-events-none">
                ⚡
              </span>
            </div>
            <div className="text-center sm:text-left leading-tight">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-3 flex-wrap">
                <span className="text-sm sm:text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-sm whitespace-nowrap">
                  FLADIX
                </span>
                <span className="hidden sm:inline text-xs sm:text-sm md:text-base font-bold tracking-normal text-amber-300">
                  — Feeder Loss Analysis and Data Indexing
                </span>
                <span className="text-[10px] sm:text-xs md:text-sm font-mono font-black tracking-wider px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-xs">
                  PESCO · WAPDA
                </span>
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm text-slate-300 font-semibold leading-snug mt-0.5 tracking-wide">
                Feeder Loss Analysis and Data Indexing · Engineering & Loss Reduction (ELR) & CSR-2026 Line Cost Suite
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          CONTROL ROW: MODULE SWITCHER, VOLTAGE CATEGORY, JOB TITLE & ACTIONS (3D CONTROLS)
         ======================================================== */}
      <div className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-xs w-full py-1.5 sm:py-2">
        <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          
          {/* Left Controls: Module Switcher + Voltage Level */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 1. Primary System Module Switcher (ELR Analysis vs Line Cost Estimation) */}
            <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-700/80 shadow-inner shrink-0">
              <button
                onClick={() => onSelectSystemModule?.('elr_loss_analysis')}
                title="Switch to FLADIX: Feeder Loss Analysis & Data Indexing Module"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeSystemModule === 'elr_loss_analysis'
                    ? 'btn-3d-amber text-slate-950 font-extrabold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${activeSystemModule === 'elr_loss_analysis' ? 'text-slate-950 stroke-[2.5]' : 'text-amber-400'}`} />
                <span className="hidden xs:inline">FLADIX Loss Analysis</span>
                <span className="xs:hidden">FLADIX</span>
              </button>

              <button
                onClick={() => onSelectSystemModule?.('line_cost_estimation')}
                title="Switch to HT/LT Electrical Line Extension & Feeder Cost Estimation Module"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeSystemModule === 'line_cost_estimation'
                    ? 'btn-3d-blue text-white font-extrabold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Calculator className={`w-3.5 h-3.5 ${activeSystemModule === 'line_cost_estimation' ? 'text-white stroke-[2.5]' : 'text-blue-400'}`} />
                <span className="hidden xs:inline">Line Cost Estimation</span>
                <span className="xs:hidden">Cost</span>
              </button>
            </div>

            {/* 2. LV / HV Selector (400V LT vs 11kV HT Feeder Analysis Mode) */}
            <div 
              className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-700/80 shadow-inner shrink-0"
              role="group"
              aria-label="Feeder Voltage Category"
            >
              <button
                type="button"
                onClick={() => onSelectCategory('LV')}
                title="Switch to Low Voltage / Low Tension 400V Feeder Analysis (Secondary Distribution)"
                className={`flex items-center justify-center px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === 'LV'
                    ? 'btn-3d-amber text-slate-950 font-black shadow-sm'
                    : 'text-amber-400 font-bold hover:text-amber-300 hover:bg-slate-800/60'
                }`}
              >
                <span>400V LT</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectCategory('HV')}
                title="Switch to High Voltage / High Tension 11kV Feeder Analysis (Primary Feeder & Node 0 Voltage Injection)"
                className={`flex items-center justify-center px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === 'HV'
                    ? 'btn-3d-blue text-white font-black shadow-sm'
                    : 'text-sky-400 font-bold hover:text-sky-300 hover:bg-slate-800/60'
                }`}
              >
                <span>11kV HT</span>
              </button>
            </div>
          </div>

          {/* Right Controls: Job Title, Feeder Dropdown & 3D Tactile Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
            
            {/* Writable Job Title Input with 3D Sunken Chassis */}
            <div 
              className="flex items-center gap-1.5 bg-slate-900 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-amber-500/70 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/30 shadow-inner transition-all group"
              title="Write or edit your custom Job Title / Designation"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] text-slate-400 hidden xl:inline font-medium">Job Title:</span>
              <input
                type="text"
                list="header-job-title-presets"
                value={selectedJobTitle}
                onChange={(e) => onSelectJobTitle(e.target.value)}
                placeholder="Job title..."
                className="bg-transparent text-amber-300 text-xs font-bold focus:outline-none w-[90px] sm:w-[130px] lg:w-[160px] placeholder:text-slate-500 truncate"
              />
              <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-amber-400 shrink-0 transition-colors pointer-events-none" />
              <datalist id="header-job-title-presets">
                {PRESET_JOB_TITLES.map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
            </div>

            {/* Feeder Dropdown with 3D Sunken Chassis */}
            <div className="flex items-center gap-1">
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
                className="bg-slate-900 text-slate-100 text-xs font-semibold border border-slate-700 hover:border-amber-500/70 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[120px] sm:max-w-[170px] truncate cursor-pointer shadow-inner"
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

              {/* Direct "+ New Job" Tactile 3D Button */}
              <button
                onClick={onOpenNewJob}
                title="Start a new FLADIX Feeder Loss Analysis Job"
                className="btn-3d-slate flex items-center gap-1 px-2.5 py-1.5 text-xs whitespace-nowrap"
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
              onClick={onOpenDatabase}
              title="Open Old Saved Jobs & Database Manager (IndexedDB)"
              className="btn-3d-slate hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs whitespace-nowrap"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Old Jobs</span>
            </button>
            {onResetToFactory && (
              <button
                onClick={onResetToFactory}
                title="Reset all FLADIX & Cost data to factory defaults"
                className="btn-3d-rose flex items-center gap-1.5 px-2.5 py-1.5 text-xs whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            )}

            {/* Prominent Save Unified Project Button (3D Emerald Finish) */}
            {onSaveUnifiedProject && (
              <button
                onClick={onSaveUnifiedProject}
                title="Save both 1. FLADIX Feeder Loss Analysis and 2. Line Cost Estimation together as One Project"
                className="btn-3d-emerald flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                <span className="hidden xl:inline">Save Project (FLADIX & Cost)</span>
                <span className="xl:hidden">Save</span>
              </button>
            )}

            {/* Official Report Button (3D Amber Finish) */}
            <button
              onClick={onOpenReport}
              title="Open Official FLADIX Engineering Report"
              className="btn-3d-amber flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-slate-950 stroke-[2.4]" />
              <span>Report</span>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================
          ROW 2: 100% WIDTH PRIMARY FEATURE MODULE NAVIGATION TABS (3D TACTILE TABS)
         ======================================================== */}
      {activeSystemModule === 'line_cost_estimation' ? (
        <div className="bg-slate-950 px-2 sm:px-4 md:px-6 lg:px-8 w-full border-t border-slate-800/80 shadow-md">
          <div className="w-full max-w-[1920px] mx-auto h-11 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className="text-blue-400 font-bold flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-400 stroke-[2.2]" />
                Electrical Line Extension & Feeder Cost Estimation Module
              </span>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <span className="text-slate-400 text-[11px] hidden sm:inline">PESCO Composite Schedule of Rates (CSR-2026) · WAPDA BOQ Engine</span>
            </div>

            <button
              onClick={() => onSelectSystemModule?.('elr_loss_analysis')}
              className="btn-3d-amber flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-950 whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span>Switch to FLADIX Feeder Loss Analysis →</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 px-2 sm:px-4 md:px-6 lg:px-8 w-full border-t border-slate-800/80 shadow-md">
          <div className="w-full max-w-[1920px] mx-auto h-11 sm:h-12 flex items-center justify-between gap-2 sm:gap-3 overflow-x-auto scrollbar-none py-1">
            
            {/* Navigation Buttons */}
            <nav className="flex items-center gap-1.5 shrink-0">
              {/* 1. Input Data Form */}
              <button
                onClick={() => setActiveTab('input_form')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'input_form'
                    ? 'btn-3d-amber text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${activeTab === 'input_form' ? 'text-slate-950 stroke-[2.5]' : 'text-blue-400'}`} />
                <span>Input Data Form</span>
              </button>

              {/* 2. Single Line Diagram */}
              <button
                onClick={() => setActiveTab('sld')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'sld'
                    ? 'btn-3d-amber text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <GitBranch className={`w-3.5 h-3.5 ${activeTab === 'sld' ? 'text-slate-950 stroke-[2.5]' : 'text-amber-400'}`} />
                <span>Single Line Diagram</span>
              </button>

              {/* 3. Segment Schedule */}
              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'table'
                    ? 'btn-3d-amber text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${activeTab === 'table' ? 'text-slate-950 stroke-[2.5]' : 'text-purple-400'}`} />
                <span>Calculated Schedule</span>
              </button>

              {/* 4. Loss & Voltage Analytics */}
              <button
                onClick={() => setActiveTab('charts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'charts'
                    ? 'btn-3d-amber text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <TrendingUp className={`w-3.5 h-3.5 ${activeTab === 'charts' ? 'text-slate-950 stroke-[2.5]' : 'text-emerald-400'}`} />
                <span>Loss Analytics</span>
              </button>

              {/* 5. Voltage Profile & Sparklines */}
              <button
                onClick={() => setActiveTab('voltage_profile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'voltage_profile'
                    ? 'btn-3d-amber text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <Activity className={`w-3.5 h-3.5 ${activeTab === 'voltage_profile' ? 'text-slate-950 stroke-[2.5]' : 'text-amber-400'}`} />
                <span>Voltage Profile</span>
              </button>

              {/* 6. What-If Simulator */}
              <button
                onClick={() => setActiveTab('whatif')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'whatif'
                    ? 'btn-3d-amber text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <SlidersHorizontal className={`w-3.5 h-3.5 ${activeTab === 'whatif' ? 'text-slate-950 stroke-[2.5]' : 'text-indigo-400'}`} />
                <span>What-If Simulator</span>
                {hasActiveInterventions && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5 shadow-sm" />
                )}
              </button>

              {/* 6. 5-Year Forecast */}
              <button
                onClick={() => setActiveTab('forecast')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'forecast'
                    ? 'btn-3d-amber text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <TrendingUp className={`w-3.5 h-3.5 ${activeTab === 'forecast' ? 'text-slate-950 stroke-[2.5]' : 'text-cyan-400'}`} />
                <span>5-Year Forecast</span>
              </button>
            </nav>

            {/* Right Status Badges in Row 2 */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Active Officer Badge */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 shadow-inner">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[210px]">Officer: <strong className="text-white">{selectedJobTitle || 'SDO'}</strong></span>
              </div>

              {summary && activeTransformerKva && (
                <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 shadow-inner">
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
              
              <div className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                <span className={`w-2 h-2 rounded-full inline-block ${activeCategory === 'LV' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]'}`} />
                <span className="text-slate-300 font-semibold">{activeCategory === 'LV' ? '400V LT' : '11kV HT'}</span>
              </div>

              {/* Theme Selector Dropdown */}
              <select
                value={theme}
                onChange={(e) => onToggleTheme(e.target.value as 'light' | 'dark' | 'blue' | 'amber')}
                className="bg-slate-900 text-amber-300 text-xs font-bold rounded-lg border border-slate-700/80 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-inner"
                title="Select Color Theme"
              >
                <option value="light">☀️ Light</option>
                <option value="dark">🌙 Dark</option>
                <option value="blue">🔵 Blue</option>
                <option value="amber">🔶 Amber</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
