/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  Zap, 
  Building, 
  Layers, 
  FileSpreadsheet, 
  CheckCircle2, 
  UserCheck, 
  FolderPlus,
  Sparkles,
  Activity
} from 'lucide-react';
import { 
  FeederData, 
  FeederCategory, 
  JobTitle, 
  PRESET_JOB_TITLES 
} from '../types/feeder';
import { GULBHAR_COLONY_LT_FEEDER, WARSAK_11KV_HT_FEEDER } from '../data/presetFeeders';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentJobTitle: string;
  onJobTitleChange: (title: string) => void;
  onCreateJob: (newFeeder: FeederData) => void;
  activeCategory: FeederCategory;
}

export const NewJobModal: React.FC<NewJobModalProps> = ({
  isOpen,
  onClose,
  currentJobTitle,
  onJobTitleChange,
  onCreateJob,
  activeCategory
}) => {
  const [jobName, setJobName] = useState('');
  const [category, setCategory] = useState<FeederCategory>(activeCategory);
  const [substation, setSubstation] = useState('132kV Peshawar City Substation');
  const [officerTitle, setOfficerTitle] = useState(currentJobTitle || 'Sub-Divisional Officer (SDO)');
  const [transformerKva, setTransformerKva] = useState<number>(category === 'LV' ? 100 : 1200);
  const [sourceCurrentAmps, setSourceCurrentAmps] = useState<number>(180);
  const [baseVoltage, setBaseVoltage] = useState<number>(category === 'LV' ? 400 : 11000);
  const [loadFactor, setLoadFactor] = useState<number>(0.60);
  const [templateType, setTemplateType] = useState<'blank' | 'wapda_lt' | 'wapda_ht'>('blank');

  if (!isOpen) return null;

  const handleCategoryChange = (newCat: FeederCategory) => {
    setCategory(newCat);
    if (newCat === 'LV') {
      setBaseVoltage(400);
      setTransformerKva(100);
      setTemplateType('blank');
    } else {
      setBaseVoltage(11000);
      setTransformerKva(5000);
      setTemplateType('blank');
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = jobName.trim() || `New ${category} Feeder Study #${Math.floor(1000 + Math.random() * 9000)}`;
    const newId = `job-${Date.now()}-${finalName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`;

    let initialNodes = [];
    let initialSegments = [];

    if (templateType === 'wapda_lt') {
      const clone = JSON.parse(JSON.stringify(GULBHAR_COLONY_LT_FEEDER));
      initialNodes = clone.nodes;
      initialSegments = clone.segments;
    } else if (templateType === 'wapda_ht') {
      const clone = JSON.parse(JSON.stringify(WARSAK_11KV_HT_FEEDER));
      initialNodes = clone.nodes;
      initialSegments = clone.segments;
    } else {
      // Clean 3-Node Starter
      initialNodes = [
        {
          id: '0.0',
          label: 'Node 0 (Transformer Substation)',
          poleNumber: 'T-0',
          threePhaseCustomers: 0,
          singlePhaseCustomers: 0,
          isTransformerNode: true,
          x: 100,
          y: 220
        },
        {
          id: '1.0',
          label: 'Pole 1 (Main Trunk)',
          poleNumber: 'P-1',
          threePhaseCustomers: category === 'LV' ? 1 : 0,
          singlePhaseCustomers: category === 'LV' ? 8 : 0,
          spotLoadKva: category === 'HV' ? 100 : undefined,
          x: 280,
          y: 220
        },
        {
          id: '2.0',
          label: 'Pole 2 (Distribution End)',
          poleNumber: 'P-2',
          threePhaseCustomers: category === 'LV' ? 2 : 0,
          singlePhaseCustomers: category === 'LV' ? 12 : 0,
          spotLoadKva: category === 'HV' ? 200 : undefined,
          x: 460,
          y: 220
        }
      ];

      initialSegments = [
        {
          id: 's-0-1',
          fromNodeId: '0.0',
          toNodeId: '1.0',
          lengthKm: 0.080,
          conductorCode: category === 'LV' ? 'WASP' : 'DOG'
        },
        {
          id: 's-1-2',
          fromNodeId: '1.0',
          toNodeId: '2.0',
          lengthKm: 0.120,
          conductorCode: category === 'LV' ? 'ANT' : 'RABBIT'
        }
      ];
    }

    const newFeeder: FeederData = {
      id: newId,
      name: finalName,
      description: `Feeder study created on ${new Date().toLocaleDateString()} by ${officerTitle}`,
      type: category === 'HV' ? 'HT' : 'LT',
      category,
      substationName: substation.trim() || 'Grid Substation',
      gridVoltageKv: category === 'HV' ? 11.0 : 11.0,
      nominalVoltage: baseVoltage,
      loadPerSinglePhaseCustomerKva: category === 'LV' ? 2.0 : 0,
      operatingPowerFactor: 0.85,
      loadFactor: loadFactor || 0.60,
      annualGrowthRatePercent: 5.0,
      tariffPerKwh: 38.5,
      currencySymbol: 'PKR',
      existingTransformerKva: category === 'LV' ? transformerKva : Math.round(sourceCurrentAmps * Math.sqrt(3) * (baseVoltage / 1000) * 0.85),
      proposedTransformerKva: category === 'LV' ? (transformerKva >= 200 ? transformerKva + 100 : 200) : Math.round(sourceCurrentAmps * Math.sqrt(3) * (baseVoltage / 1000) * 0.85 * 1.3),
      nodes: initialNodes,
      segments: initialSegments
    };

    if (officerTitle && officerTitle !== currentJobTitle) {
      onJobTitleChange(officerTitle);
    }

    onCreateJob(newFeeder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/pesco-logo.svg"
              alt="PESCO Logo"
              className="w-10 h-10 rounded-full border border-amber-500/40 shadow-xs shrink-0"
            />
            <div>
              <h2 className="text-base font-bold leading-tight">Start New Loss Analysis Job</h2>
              <p className="text-xs text-slate-400">PESCO / WAPDA · Configure study parameters, grid location & layout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4">
          
          {/* Job Title & Project Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Feeder / Job Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g. Gulbhar Feeder Extension / Warsak Road Phase 2"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-semibold text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Officer Job Title (Writable with autocomplete presets) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Your Officer Job Title / Designation</span>
              <span className="text-[11px] font-normal text-slate-500">Writable field</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserCheck className="w-4 h-4 text-amber-500" />
              </div>
              <input
                type="text"
                list="new-job-title-presets"
                value={officerTitle}
                onChange={(e) => setOfficerTitle(e.target.value)}
                placeholder="Write your job title (e.g. SDO, XEN, Planning Engr)..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-semibold text-slate-900"
              />
              <datalist id="new-job-title-presets">
                {PRESET_JOB_TITLES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Category Selector (LV 400V vs HV 11kV) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Voltage Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCategoryChange('LV')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  category === 'LV'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-400/40'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <div className="text-left">
                  <span className="block font-bold">LV Analysis (400V LT)</span>
                  <span className="text-[10px] font-normal text-slate-500">Low Tension Distribution</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('HV')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  category === 'HV'
                    ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-400/40'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-4 h-4 text-sky-500" />
                <div className="text-left">
                  <span className="block font-bold">HV Analysis (11kV HT)</span>
                  <span className="text-[10px] font-normal text-slate-500">High Tension Primary Feeder</span>
                </div>
              </button>
            </div>
          </div>

          {/* Grid Substation, Initial Transformer Capacity & System Voltage */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Grid Substation
              </label>
              <input
                type="text"
                value={substation}
                onChange={(e) => setSubstation(e.target.value)}
                placeholder="e.g. 132kV Substation"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {category === 'LV' ? 'Transformer (kVA)' : 'Input Source Current (Amps)'}
              </label>
              {category === 'LV' ? (
                <select
                  value={transformerKva}
                  onChange={(e) => setTransformerKva(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 font-mono font-bold cursor-pointer"
                >
                  <option value={25}>25 kVA (Single-Phase/Rural)</option>
                  <option value={50}>50 kVA (Standard LT)</option>
                  <option value={100}>100 kVA (WAPDA Benchmark)</option>
                  <option value={200}>200 kVA (Commercial/Dense)</option>
                  <option value={400}>400 kVA (High Density)</option>
                  <option value={630}>630 kVA (Industrial / Bulk)</option>
                </select>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    step="5"
                    value={sourceCurrentAmps}
                    onChange={(e) => setSourceCurrentAmps(parseFloat(e.target.value) || 180)}
                    placeholder="e.g. 180 Amps"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-2 text-[11px] font-mono text-slate-400">Amps (A)</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nominal Voltage
              </label>
              <select
                value={baseVoltage}
                onChange={(e) => setBaseVoltage(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 font-mono font-bold cursor-pointer"
              >
                {category === 'LV' ? (
                  <>
                    <option value={400}>400 V (Standard LT)</option>
                    <option value={390}>390 V (390V Feeder)</option>
                    <option value={380}>380 V (380V Alt)</option>
                    <option value={415}>415 V (415V IEC)</option>
                  </>
                ) : (
                  <>
                    <option value={11000}>11,000 V (11 kV HT)</option>
                    <option value={33000}>33,000 V (33 kV HT)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Load Factor Option */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                <span>Feeder Load Factor (LF)</span>
              </label>
              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                LF: {(loadFactor * 100).toFixed(0)}% · LLF: {(0.2 * loadFactor + 0.8 * Math.pow(loadFactor, 2)).toFixed(3)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '35% Domestic', value: 0.35 },
                { label: '50% Commercial', value: 0.50 },
                { label: '60% WAPDA Std', value: 0.60 },
                { label: '75% Industrial', value: 0.75 }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLoadFactor(opt.value)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    Math.abs(loadFactor - opt.value) < 0.01
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-400/40'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Initial Spans & Nodes Template
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="template"
                  checked={templateType === 'blank'}
                  onChange={() => setTemplateType('blank')}
                  className="text-amber-500 focus:ring-amber-400"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">Clean 3-Node Starter Feeder (Recommended)</span>
                  <span className="text-slate-500 text-[11px]">Start fresh and enter spans/lengths in the Input Data Form table</span>
                </div>
              </label>

              {category === 'LV' && (
                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="template"
                    checked={templateType === 'wapda_lt'}
                    onChange={() => setTemplateType('wapda_lt')}
                    className="text-amber-500 focus:ring-amber-400"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">WAPDA 8-Node Gulbhar Colony Benchmark (image1.png)</span>
                    <span className="text-slate-500 text-[11px]">Includes the standard 8 spans and 100 kVA transformer network</span>
                  </div>
                </label>
              )}

              {category === 'HV' && (
                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="template"
                    checked={templateType === 'wapda_ht'}
                    onChange={() => setTemplateType('wapda_ht')}
                    className="text-amber-500 focus:ring-amber-400"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">11kV HT Primary Radial Feeder (Warsak Road)</span>
                    <span className="text-slate-500 text-[11px]">Includes 11kV distribution line spans with DOG & RABBIT conductors</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-all cursor-pointer ring-1 ring-amber-300"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create & Open Job</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
