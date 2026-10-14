/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FeederData, 
  FeederNode, 
  FeederSegment, 
  FeederAnalysisSummary,
  FeederCategory
} from '../types/feeder';
import { 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  Zap, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  FileText,
  ArrowRight,
  Calculator,
  Copy,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Database,
  Maximize2,
  Minimize2,
  Link2,
  Building2,
  FileCheck2,
  Compass
} from 'lucide-react';
import { CONDUCTOR_LIST, getConductor } from '../data/conductors';
import { TRANSFORMER_CAPACITIES } from '../data/transformers';
import { GULBHAR_COLONY_LT_FEEDER } from '../data/presetFeeders';
import { ExcelImportModal } from './ExcelImportModal';
import { KmlKmzImportModal } from './KmlKmzImportModal';
import { downloadExcelTemplate, exportFullFeederToExcel } from '../utils/excelImport';
import { calculateNonOverlappingSLDLayout } from '../utils/sldLayout';
import { generate11DigitWorkOrder, format11DigitWorkOrder } from '../utils/costEngine';

interface InputDataFormProps {
  feeder: FeederData;
  summary: FeederAnalysisSummary;
  onSaveFeeder: (updatedFeeder: FeederData) => void;
  onNavigateToSchedule: () => void;
  activeTransformerKva: number;
  onUpdateTransformerKva: (kva: number) => void;
  onOpenDatabase?: () => void;
  onSelectCategory?: (category: FeederCategory) => void;
  onOpenLinkedCostEstimate?: () => void;
  onSaveUnifiedProject?: () => void;
}

export const InputDataForm: React.FC<InputDataFormProps> = ({
  feeder,
  summary,
  onSaveFeeder,
  onNavigateToSchedule,
  activeTransformerKva,
  onUpdateTransformerKva,
  onOpenDatabase,
  onSelectCategory,
  onOpenLinkedCostEstimate,
  onSaveUnifiedProject
}) => {
  // Local editable state for feeder parameters
  const [feederName, setFeederName] = useState(feeder.name);
  const [substationName, setSubstationName] = useState(feeder.substationName);
  const [nominalVoltage, setNominalVoltage] = useState(feeder.nominalVoltage);
  const [loadPerSinglePhase, setLoadPerSinglePhase] = useState(feeder.loadPerSinglePhaseCustomerKva);
  const [powerFactor, setPowerFactor] = useState(feeder.operatingPowerFactor);
  const [loadFactor, setLoadFactor] = useState(feeder.loadFactor);
  const [annualGrowthRate, setAnnualGrowthRate] = useState(feeder.annualGrowthRatePercent);
  const [tariffPerKwh, setTariffPerKwh] = useState<number>(feeder.tariffPerKwh || 24.83);
  const [proposedTrfKva, setProposedTrfKva] = useState(feeder.proposedTransformerKva);
  const [sourceCurrentInput, setSourceCurrentInput] = useState<number>(summary.totalSourceCurrentAmps || 180);
  const [showFormulas, setShowFormulas] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSizingTooltip, setShowSizingTooltip] = useState(false);

  // Unified Project Linking & Administrative Hierarchy State
  const [workOrderNo, setWorkOrderNo] = useState(feeder.workOrderNo || '26147126042');
  const [circle, setCircle] = useState(feeder.circle || 'Peshawar Circle-1');
  const [division, setDivision] = useState(feeder.division || 'Peshawar Cantt Division');
  const [subDivision, setSubDivision] = useState(feeder.subDivision || 'Gulbhar Sub-Division');
  const [district, setDistrict] = useState(feeder.district || 'Peshawar');
  const [villageLocality, setVillageLocality] = useState(feeder.villageLocality || '');
  const [schemeProjectName, setSchemeProjectName] = useState(feeder.schemeProjectName || `${feeder.name} - Loss Reduction Project`);
  const [purposeOfWork, setPurposeOfWork] = useState(feeder.purposeOfWork || 'Energy Loss Reduction (ELR) and network augmentation.');
  const [showProjectInfo, setShowProjectInfo] = useState(true);

  // Analysis Mode: HT Line (11kV) vs LT Line (400V)
  const [analysisMode, setAnalysisMode] = useState<'HT' | 'LT'>(() => {
    return feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000 ? 'HT' : 'LT';
  });
  const isHtLine = analysisMode === 'HT';

  // Segments input table state matching image1.png + HT Line Analysis (Node kVA)
  interface InputRow {
    id: string;
    fromNode: string;
    toNode: string;
    lengthKm: number;
    lengthMeters: number;
    nodeKva?: number; // For HT Line Analysis: Node KVA connected at To Node (DTR load)
    threePhaseCust: number;
    singlePhaseCust: number;
    conductorCode: string;
  }

  const [rows, setRows] = useState<InputRow[]>(() => {
    return feeder.segments.map(s => {
      const toNode = feeder.nodes.find(n => n.id === s.toNodeId);
      const isHt = feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000;
      let kva = toNode?.spotLoadKva || 0;
      if (isHt && !kva) {
        kva = toNode?.threePhaseCustomers ? toNode.threePhaseCustomers * 50 : (toNode?.singlePhaseCustomers ? Math.round(toNode.singlePhaseCustomers * 2.5) : 50);
      }
      return {
        id: s.id,
        fromNode: s.fromNodeId.replace('.0', ''),
        toNode: s.toNodeId.replace('.0', ''),
        lengthKm: s.lengthKm,
        lengthMeters: Math.round(s.lengthKm * 1000),
        nodeKva: kva,
        threePhaseCust: toNode?.threePhaseCustomers || 0,
        singlePhaseCust: toNode?.singlePhaseCustomers || 0,
        conductorCode: s.conductorCode
      };
    });
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showKmlModal, setShowKmlModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');

  // Handle applied feeder from KML / KMZ GIS import
  const handleImportKmlFeeder = (imported: FeederData) => {
    onSaveFeeder(imported);
    const newRows: InputRow[] = imported.segments.map((s, idx) => {
      const toNode = imported.nodes.find(n => n.id === s.toNodeId);
      return {
        id: s.id || `row-${idx}`,
        fromNode: s.fromNodeId.replace('.0', ''),
        toNode: s.toNodeId.replace('.0', ''),
        lengthKm: s.lengthKm,
        lengthMeters: Math.round(s.lengthKm * 1000),
        threePhaseCust: toNode?.threePhaseCustomers || 0,
        singlePhaseCust: toNode?.singlePhaseCustomers || 0,
        nodeKva: toNode?.spotLoadKva,
        conductorCode: s.conductorCode
      };
    });
    setRows(newRows);
    setFeederName(imported.name);
    setSubstationName(imported.substationName);
    setNominalVoltage(imported.nominalVoltage);
    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 3000);
  };

  // Handle applied rows from Excel import modal
  const handleApplyImportedRows = (
    importedRows: {
      fromNode: string;
      toNode: string;
      lengthKm: number;
      lengthMeters: number;
      threePhaseCust: number;
      singlePhaseCust: number;
      nodeKva?: number;
      conductorCode: string;
    }[],
    overrides?: { name?: string; transformerKva?: number }
  ) => {
    setRows(importedRows.map((r, idx) => ({
      id: `span-imp-${idx}-${Date.now()}`,
      fromNode: r.fromNode,
      toNode: r.toNode,
      lengthKm: r.lengthKm,
      lengthMeters: r.lengthMeters,
      nodeKva: r.nodeKva || (isHtLine ? 100 : 0),
      threePhaseCust: r.threePhaseCust,
      singlePhaseCust: r.singlePhaseCust,
      conductorCode: r.conductorCode
    })));

    if (overrides?.name) {
      setFeederName(overrides.name);
    }
    if (overrides?.transformerKva) {
      onUpdateTransformerKva(overrides.transformerKva);
    }

    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 3500);
  };

  // Handle cell edit
  const handleUpdateRow = (index: number, field: keyof InputRow, value: any) => {
    setRows(prev => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'lengthMeters') {
        const meters = Math.max(1, parseFloat(value) || 0);
        target.lengthMeters = meters;
        target.lengthKm = Number((meters / 1000).toFixed(3));
      } else if (field === 'lengthKm') {
        const km = Math.max(0.001, parseFloat(value) || 0);
        target.lengthKm = km;
        target.lengthMeters = Math.round(km * 1000);
      } else if (field === 'nodeKva') {
        target.nodeKva = Math.max(0, parseFloat(value) || 0);
      } else if (field === 'singlePhaseCust') {
        target.singlePhaseCust = Math.max(0, parseInt(value) || 0);
      } else if (field === 'threePhaseCust') {
        target.threePhaseCust = Math.max(0, parseInt(value) || 0);
      } else {
        (target as any)[field] = value;
      }

      updated[index] = target;
      return updated;
    });
  };

  // Add a new row to the table
  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    const nextFrom = lastRow ? lastRow.toNode : '0';
    const nextTo = String(parseInt(nextFrom) + 1 || (rows.length + 1));

    const newRow: InputRow = {
      id: `s-${Date.now()}`,
      fromNode: nextFrom,
      toNode: nextTo,
      lengthKm: isHtLine ? 0.500 : 0.040,
      lengthMeters: isHtLine ? 500 : 40,
      nodeKva: isHtLine ? 100 : 0,
      threePhaseCust: 0,
      singlePhaseCust: isHtLine ? 0 : 10,
      conductorCode: isHtLine ? 'DOG' : 'A'
    };
    setRows([...rows, newRow]);
  };

  // Duplicate a row
  const handleDuplicateRow = (index: number) => {
    const source = rows[index];
    const newRow: InputRow = {
      ...source,
      id: `s-${Date.now()}`,
      fromNode: source.toNode,
      toNode: String(parseInt(source.toNode) + 1 || rows.length + 1)
    };
    const updated = [...rows];
    updated.splice(index + 1, 0, newRow);
    setRows(updated);
  };

  // Delete a row
  const handleDeleteRow = (index: number) => {
    if (rows.length <= 1) {
      alert("Feeder must have at least one segment span.");
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  // Restore exact benchmark data from image1.png (Gulbhar Colony)
  const handleResetToImage1 = () => {
    const original = GULBHAR_COLONY_LT_FEEDER;
    setFeederName(original.name);
    setSubstationName(original.substationName);
    setNominalVoltage(original.nominalVoltage);
    setLoadPerSinglePhase(original.loadPerSinglePhaseCustomerKva);
    setPowerFactor(original.operatingPowerFactor);
    setLoadFactor(original.loadFactor);
    setAnnualGrowthRate(original.annualGrowthRatePercent);
    setProposedTrfKva(original.proposedTransformerKva);
    onUpdateTransformerKva(original.existingTransformerKva);

    setRows(original.segments.map(s => {
      const toNode = original.nodes.find(n => n.id === s.toNodeId);
      return {
        id: s.id,
        fromNode: s.fromNodeId.replace('.0', ''),
        toNode: s.toNodeId.replace('.0', ''),
        lengthKm: s.lengthKm,
        lengthMeters: Math.round(s.lengthKm * 1000),
        threePhaseCust: toNode?.threePhaseCustomers || 0,
        singlePhaseCust: toNode?.singlePhaseCustomers || 0,
        conductorCode: s.conductorCode
      };
    }));

    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 3000);
  };

  // Clear to minimal blank feeder
  const handleClearFeeder = () => {
    setRows([
      { id: 's-0-1', fromNode: '0', toNode: '1', lengthKm: 0.050, lengthMeters: 50, threePhaseCust: 0, singlePhaseCust: 10, conductorCode: 'A' }
    ]);
  };

  // Save changes and reconstruct full FeederData structure
  const handleSaveAndCalculate = () => {
    // Generate unique nodes
    const nodeMap = new Map<string, FeederNode>();

    // Source node (Node 0)
    const sourceLabel = isHtLine
      ? `Node 0 (Substation Bus - Injected ${nominalVoltage >= 1000 ? `${(nominalVoltage/1000).toFixed(2)} kV` : `${nominalVoltage} V`})`
      : `Node 0 (${activeTransformerKva} kVA Transformer)`;

    nodeMap.set('0.0', {
      id: '0.0',
      label: sourceLabel,
      poleNumber: isHtLine ? 'CB-01' : 'T-0',
      threePhaseCustomers: 0,
      singlePhaseCustomers: 0,
      isTransformerNode: !isHtLine,
      spotLoadVoltage: nominalVoltage,
      x: 80,
      y: 160
    });

    const targetDemandKva = isHtLine ? (sourceCurrentInput * Math.sqrt(3) * (nominalVoltage / 1000) * powerFactor) : 0;
    const currentTotalNodeKva = rows.reduce((sum, r) => sum + (r.nodeKva || 0), 0) || 1;
    const scaleFactor = isHtLine ? (targetDemandKva / currentTotalNodeKva) : 1;

    const adjustedRows = isHtLine ? rows.map(r => ({
      ...r,
      nodeKva: Math.max(10, Math.round((r.nodeKva || 50) * scaleFactor))
    })) : rows;

    const segments: FeederSegment[] = [];

    adjustedRows.forEach((r, idx) => {
      const fromId = r.fromNode.includes('.') ? r.fromNode : `${r.fromNode}.0`;
      const toId = r.toNode.includes('.') ? r.toNode : `${r.toNode}.0`;

      if (!nodeMap.has(fromId)) {
        nodeMap.set(fromId, {
          id: fromId,
          label: isHtLine ? `Node ${r.fromNode}` : `Pole ${r.fromNode}`,
          poleNumber: isHtLine ? `T-${r.fromNode}` : `P-${r.fromNode}`,
          threePhaseCustomers: 0,
          singlePhaseCustomers: 0,
          x: 100 + (idx * 70),
          y: 160
        });
      }

      nodeMap.set(toId, {
        id: toId,
        label: isHtLine && r.nodeKva ? `Node ${r.toNode} (${r.nodeKva} kVA DTR)` : (isHtLine ? `Node ${r.toNode}` : `Pole ${r.toNode}`),
        poleNumber: isHtLine ? `T-${r.toNode}` : `P-${r.toNode}`,
        threePhaseCustomers: r.threePhaseCust,
        singlePhaseCustomers: r.singlePhaseCust,
        spotLoadKva: isHtLine ? r.nodeKva : (r.nodeKva || undefined),
        x: 170 + (idx * 70),
        y: 160
      });

      segments.push({
        id: r.id || `s-${r.fromNode}-${r.toNode}`,
        fromNodeId: fromId,
        toNodeId: toId,
        lengthKm: r.lengthKm,
        conductorCode: r.conductorCode
      });
    });

    const totalCalculatedNodeKva = adjustedRows.reduce((acc, r) => acc + (r.nodeKva || 0), 0);

    const rawFeeder: FeederData = {
      ...feeder,
      type: isHtLine ? 'HT' : 'LT',
      category: isHtLine ? 'HV' : 'LV',
      name: feederName,
      substationName,
      workOrderNo,
      circle,
      division,
      subDivision,
      district,
      villageLocality,
      schemeProjectName,
      purposeOfWork,
      nominalVoltage,
      gridVoltageKv: nominalVoltage >= 1000 ? Number((nominalVoltage / 1000).toFixed(2)) : feeder.gridVoltageKv,
      loadPerSinglePhaseCustomerKva: loadPerSinglePhase,
      operatingPowerFactor: powerFactor,
      loadFactor,
      annualGrowthRatePercent: annualGrowthRate,
      tariffPerKwh: tariffPerKwh || 24.83,
      currencySymbol: 'Rupees',
      existingTransformerKva: isHtLine ? (totalCalculatedNodeKva || 1200) : activeTransformerKva,
      proposedTransformerKva: proposedTrfKva,
      nodes: Array.from(nodeMap.values()),
      segments
    };

    const layoutResult = calculateNonOverlappingSLDLayout(rawFeeder);
    const updatedFeeder: FeederData = {
      ...rawFeeder,
      nodes: layoutResult.nodes
    };

    onSaveFeeder(updatedFeeder);
    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 3000);
  };

  // CSV Import parser
  const handleParseCsv = () => {
    setImportError('');
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        setImportError("CSV must contain at least a header row and one data row.");
        return;
      }

      const parsedRows: InputRow[] = [];
      const dataLines = lines.slice(1); // skip header

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;
        const cols = line.split(/[,\t]/).map(c => c.trim());

        if (cols.length < 6) {
          throw new Error(`Row ${i + 2} has insufficient columns (expected 6 or 7).`);
        }

        const fromNode = cols[0];
        const toNode = cols[1];
        const lengthKm = parseFloat(cols[2]) || (parseFloat(cols[3]) / 1000) || 0.05;
        const lengthMeters = cols[3] ? parseFloat(cols[3]) : Math.round(lengthKm * 1000);
        const threePhaseCust = parseInt(cols[4]) || 0;
        const singlePhaseCust = parseInt(cols[5]) || 0;
        const conductorCode = cols[6] ? cols[6].toUpperCase() : 'A';

        parsedRows.push({
          id: `csv-${i}`,
          fromNode,
          toNode,
          lengthKm,
          lengthMeters,
          threePhaseCust,
          singlePhaseCust,
          conductorCode
        });
      }

      if (parsedRows.length === 0) {
        setImportError("No valid rows could be imported.");
        return;
      }

      setRows(parsedRows);
      setShowCsvImport(false);
      setCsvText('');
    } catch (err: any) {
      setImportError(err.message || "Failed to parse CSV format.");
    }
  };

  // Export current input table as CSV
  const handleExportInputCsv = () => {
    const headers = ['From Node', 'To Node', 'Length (km)', 'Length (m)', '3-Ph Customer', '1-Ph Customer', 'Conductor Code'];
    const dataLines = rows.map(r => [
      r.fromNode,
      r.toNode,
      r.lengthKm.toFixed(3),
      r.lengthMeters,
      r.threePhaseCust,
      r.singlePhaseCust,
      r.conductorCode
    ].join(','));

    const content = [headers.join(','), ...dataLines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${feeder.id}_input_data_image1.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Live totals
  const totalLengthM = rows.reduce((acc, r) => acc + r.lengthMeters, 0);
  const totalLengthKm = Number((totalLengthM / 1000).toFixed(3));
  const total1Ph = rows.reduce((acc, r) => acc + r.singlePhaseCust, 0);
  const total3Ph = rows.reduce((acc, r) => acc + r.threePhaseCust, 0);

  // Transformer Loading calculation
  const currentLoadingPercent = Math.round((summary.totalSystemDemandKva / activeTransformerKva) * 100);
  const isOverloaded = currentLoadingPercent > 100;

  return (
    <div className={isFullScreen ? 'fixed inset-0 z-50 bg-slate-100 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-6 flex flex-col' : 'space-y-6'}>
      {/* ========================================================
          FORM HEADER CARD: TWO CLEAN ROWS (ROW 1: TITLE, ROW 2: ACTIONS)
         ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Row 1: Title, Subtitle, & Category Tag */}
        <div className="p-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>DATA ENTRY MODULE</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-bold">
                image1.png Format
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Distribution Feeder Input Data Form
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter Transformer Capacity (kVA) and feeder spans (lengths, customer counts, conductor codes). Calculations update automatically using WAPDA ELR electrical formulas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
              feeder.category === 'HV' 
                ? 'bg-sky-50 text-sky-800 border-sky-200' 
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              {feeder.category === 'HV' ? '11kV HT Feeder' : '400V LT Feeder'}
            </span>

            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700 shadow-xs"
              title={isFullScreen ? "Exit Full Screen" : "Display Form as Full Screen"}
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isFullScreen ? 'Exit Full Screen' : 'Full Screen Form'}</span>
            </button>
          </div>
        </div>

        {/* Header Row 2: Action Buttons Row */}
        <div className="bg-slate-50/80 px-5 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleResetToImage1}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Reload Gulbhar Colony 12-node benchmark"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Load image1.png Benchmark</span>
            </button>

            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Span Row</span>
            </button>

            {/* Excel Import Button */}
            <button
              onClick={() => setShowExcelModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg shadow-2xs transition-all cursor-pointer"
              title="Import spans from an Excel sheet (.xlsx, .xls) or paste from clipboard"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Import from Excel (.xlsx)</span>
            </button>

            {/* KML / KMZ GIS Route Import Button */}
            <button
              onClick={() => setShowKmlModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-950 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg shadow-2xs transition-all cursor-pointer"
              title="Import node-to-node GIS route data from Google Earth KML / KMZ file"
            >
              <Compass className="w-3.5 h-3.5 text-blue-700" />
              <span>Import KML / KMZ</span>
            </button>

            {/* Excel Export Button */}
            <button
              onClick={() => exportFullFeederToExcel(feeder, summary)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export complete calculation model to Excel workbook"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel (.xlsx)</span>
            </button>

            {/* Excel Template Button */}
            <button
              onClick={() => downloadExcelTemplate(feeder)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Download clean Excel template matching image1.png columns"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Template (.xlsx)</span>
            </button>

            <button
              onClick={() => setShowFormulas(!showFormulas)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                showFormulas 
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-amber-600" />
              <span>Electrical Formulas</span>
              {showFormulas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {onOpenDatabase && (
              <button
                type="button"
                onClick={onOpenDatabase}
                title="Save current feeder & analysis as persistent record in Local Database"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span>Save to Local DB</span>
              </button>
            )}
          </div>

          <button
            onClick={handleSaveAndCalculate}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Apply & Calculate Outputs</span>
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Feeder input data applied successfully! All output calculations (image2.png), diagrams, and analytics have been updated.</span>
        </div>
      )}

      {/* ========================================================
          INSERTED ELECTRICAL FORMULAS EXPANDABLE PANEL
         ======================================================== */}
      {showFormulas && (
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-400">
                Inserted Electrical Engineering Formulas (image1.png Input → image2.png Calculated Output)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              WAPDA ELR Standard Formulations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Formula 1: Transformer Loading */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>1. Transformer Loading %</span>
                <span className="text-[10px] font-mono text-amber-400">Loading %</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                % Trf Load = (Peak Demand kVA / Trf Rating kVA) · 100
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                For 100 kVA transformer: 118.0 kVA / 100 kVA = <strong>118% (Overloaded)</strong>. Upgrading to 200 kVA yields <strong>59% (Normal)</strong>.
              </p>
            </div>

            {/* Formula 2: Branch Current */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>2. Branch Current (Amps)</span>
                <span className="text-[10px] font-mono text-amber-400">Current (A)</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                I_s = S_branch / (√3 · V_LL)
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Backward sweep accumulates downstream customer loads. For 164 consumers, total current is 180.0 A at Node 0.
              </p>
            </div>

            {/* Formula 3: Conductor Loading % */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>3. Conductor Loading %</span>
                <span className="text-[10px] font-mono text-amber-400">Loading %</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                % Conductor Load = round( (I_s / I_ampacity) · 100 )
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Code A (7/0.122" ACSR) ampacity = 212 A. At 180.0 A: 180/212 = 85%. At 167.0 A: 167/212 = 79%.
              </p>
            </div>

            {/* Formula 4: Segment Line Loss */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>4. Line Loss (kW)</span>
                <span className="text-[10px] font-mono text-amber-400">Loss (kW)</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                P_loss = (3 · I_s² · R · L · 1.15) / 1000
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                3-phase ohmic dissipation with 1.15 operating temperature factor. Total feeder loss = 7.7 kW.
              </p>
            </div>

            {/* Formula 5: Voltage Drop % */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>5. Voltage Drop % & Voltage</span>
                <span className="text-[10px] font-mono text-amber-400">Volt Drop % / Voltage</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                ΔV = √3 · I_s · (R·cosΦ + X·sinΦ); V = V_nom · (1 - %VD/100)
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Cumulative drop reaches 10.5% at Node 7, dropping 400V supply to 358.0 V.
              </p>
            </div>

            {/* Formula 6: Annual Energy Dissipation */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>6. Annual Energy Loss (kWh)</span>
                <span className="text-[10px] font-mono text-amber-400">Energy Loss</span>
              </div>
              <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded text-[11px]">
                E_loss = P_loss · (0.2·LF + 0.8·LF²) · 8760
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                At 60% load factor (LLF = 0.408): 7.7 kW line loss dissipates 27,522 kWh per year.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feeder Analysis Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            Analysis Engine:
          </span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAnalysisMode('HT');
                if (nominalVoltage < 1000) setNominalVoltage(11000);
                onSelectCategory?.('HV');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isHtLine 
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400 font-extrabold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>⚡ HT Line Analysis (From, To, Length, Node KVA, Conductor)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAnalysisMode('LT');
                if (nominalVoltage >= 1000) setNominalVoltage(400);
                onSelectCategory?.('LV');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !isHtLine 
                  ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-300 font-extrabold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>LT Line Analysis (Consumers)</span>
            </button>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-400 font-semibold">
          {isHtLine ? 'Primary 11 kV Feeder Model · Node 0 Injected Voltage' : 'Secondary 400V Distribution Model'}
        </span>
      </div>

      {/* ========================================================
          UNIFIED PROJECT & 11-DIGIT WORK ORDER HIERARCHY
         ======================================================== */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Unified Project & 11-Digit Work Order Scheme Link</span>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-black">
                  WO: {workOrderNo || '26147126042'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Keeps Loss Analysis and Line Cost Estimation linked under one unified project and naming hierarchy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSaveUnifiedProject && (
              <button
                type="button"
                onClick={onSaveUnifiedProject}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all cursor-pointer ring-1 ring-emerald-300 active:scale-95"
                title="Save both 1. FLADIX Feeder Loss Analysis and 2. Line Cost Estimation together as One Project"
              >
                <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save as One Project (1. FLADIX Analysis + 2. Cost Estimation)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const newWo = generate11DigitWorkOrder({ categoryCode: '71' });
                setWorkOrderNo(newWo);
              }}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Generate new 11-digit WAPDA/PESCO Work Order number"
            >
              ⚡ Generate 11-Digit WO
            </button>
            <button
              type="button"
              onClick={() => setShowProjectInfo(!showProjectInfo)}
              className="p-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
            >
              {showProjectInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showProjectInfo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 text-xs">
            {/* 11-Digit Work Order */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="font-bold text-slate-800 block mb-1">
                11-Digit Work Order No:
              </label>
              <input
                type="text"
                value={workOrderNo}
                maxLength={14}
                onChange={(e) => setWorkOrderNo(e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="26-14-71-26-042"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-blue-700 text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                Format: CC-DD-KK-YY-SSS (11 digits)
              </span>
            </div>

            {/* Feeder / Project Name */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="font-bold text-slate-800 block mb-1">
                Feeder Name:
              </label>
              <input
                type="text"
                value={feederName}
                onChange={(e) => setFeederName(e.target.value)}
                placeholder="Gulbhar Colony Street LT Feeder"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Substation Name */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="font-bold text-slate-800 block mb-1">
                Grid / Substation Name:
              </label>
              <input
                type="text"
                value={substationName}
                onChange={(e) => setSubstationName(e.target.value)}
                placeholder="Gulbhar 132/11 kV Grid"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Circle */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="font-bold text-slate-800 block mb-1">
                Circle:
              </label>
              <input
                type="text"
                value={circle}
                onChange={(e) => setCircle(e.target.value)}
                placeholder="Peshawar Circle-1"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-900 text-xs"
              />
            </div>

            {/* Division */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="font-bold text-slate-800 block mb-1">
                Division:
              </label>
              <input
                type="text"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                placeholder="Cantt Division Peshawar"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-900 text-xs"
              />
            </div>

            {/* Sub-Division */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="font-bold text-slate-800 block mb-1">
                Sub-Division:
              </label>
              <input
                type="text"
                value={subDivision}
                onChange={(e) => setSubDivision(e.target.value)}
                placeholder="Gulbhar Sub-Division"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-900 text-xs"
              />
            </div>

            {/* District */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="font-bold text-slate-800 block mb-1">
                District:
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Peshawar"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-900 text-xs"
              />
            </div>

            {/* Unified Scheme Project Name */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="font-bold text-slate-800 block mb-1">
                Scheme Project Title:
              </label>
              <input
                type="text"
                value={schemeProjectName}
                onChange={(e) => setSchemeProjectName(e.target.value)}
                placeholder="ELR Loss Reduction & Reconductoring Project"
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-900 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          SECTION 1: INJECTED VOLTAGE / TRANSFORMER RATING & ELECTRICAL PARAMETERS
         ======================================================== */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              {isHtLine 
                ? '1. Injected Line Voltage at Node 0 & Electrical Parameters' 
                : '1. Transformer Rating Input & Electrical Parameters'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {isHtLine ? 'Node 0 Grid Voltage Injection' : 'Direct Transformer kVA Input'}
          </span>
        </div>

        {/* HT Injected Line Voltage at Node 0 Panel */}
        {isHtLine ? (
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-xl border border-blue-800 space-y-3.5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Node 0 Injected Line Voltage
                  </span>
                  <span className="text-xs font-bold text-blue-200">
                    Grid Substation 11kV Outgoing Breaker Bus
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/80 mt-1">
                  Analysis begins through injection of line voltage at Node 0, propagating downstream backward-forward sweep load flow and voltage drops.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3.5 py-1.5 rounded-lg bg-blue-900/80 border border-blue-700/60 text-right shadow-xs">
                  <span className="text-[10px] text-blue-300 block font-semibold">Total Connected HT Node Load:</span>
                  <span className="font-mono text-base font-extrabold text-amber-300">
                    {rows.reduce((sum, r) => sum + (r.nodeKva || 0), 0).toLocaleString()} kVA
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-blue-800/60">
              {/* Direct Number Input for Injected Voltage */}
              <div className="flex items-center gap-1.5 bg-blue-900/60 px-3 py-1.5 rounded-lg border border-blue-700/70">
                <span className="text-xs font-semibold text-blue-200">Injected Voltage:</span>
                <input
                  type="number"
                  min="1.0"
                  max="132"
                  step="0.05"
                  value={nominalVoltage >= 1000 ? Number((nominalVoltage / 1000).toFixed(2)) : nominalVoltage}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 11.0;
                    setNominalVoltage(Math.round(val * 1000));
                  }}
                  className="w-20 bg-slate-900 border border-blue-400 rounded px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <span className="text-xs font-mono font-bold text-blue-300">kV ({nominalVoltage.toLocaleString()} V)</span>
              </div>

              <span className="text-blue-700 hidden sm:inline">|</span>

              {/* Quick Injected Voltage Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-blue-300 mr-1">Quick Injected Voltage:</span>
                {[
                  { label: '11.0 kV (Nominal)', kv: 11.0 },
                  { label: '11.2 kV (+1.8%)', kv: 11.2 },
                  { label: '11.4 kV (+3.6%)', kv: 11.4 },
                  { label: '11.5 kV (+4.5%)', kv: 11.5 },
                  { label: '11.8 kV (+7.3%)', kv: 11.8 }
                ].map(preset => {
                  const isSelected = Math.abs(nominalVoltage - preset.kv * 1000) < 10;
                  return (
                    <button
                      key={preset.kv}
                      type="button"
                      onClick={() => setNominalVoltage(Math.round(preset.kv * 1000))}
                      className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all cursor-pointer font-bold ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm ring-2 ring-amber-300 scale-102'
                          : 'bg-blue-900/80 hover:bg-blue-800 text-blue-100 border border-blue-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* LT Transformer Rating Interactive Bar */
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  Fed Transformer Rating (kVA):
                </label>
                <span className="text-[11px] text-slate-500">
                  Change capacity to observe immediate impact on loading % and overload status.
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 ${
                  isOverloaded 
                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {isOverloaded ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Loading: {currentLoadingPercent}% ({isOverloaded ? 'OVERLOADED' : 'NORMAL'})</span>
                </span>

                {/* Sizing Guide Tooltip Toggle Button */}
                {(() => {
                  const peakDemandKva = summary.totalSystemDemandKva || 118;
                  const minRequiredRating = peakDemandKva / 0.80;
                  const recommendedTransformerKva = TRANSFORMER_CAPACITIES.find(c => c >= minRequiredRating) || TRANSFORMER_CAPACITIES[TRANSFORMER_CAPACITIES.length - 1];
                  const projectedLoadingWithRecommended = Math.round((peakDemandKva / recommendedTransformerKva) * 100);

                  return (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSizingTooltip(!showSizingTooltip)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                        title="Click for optimal transformer sizing guide based on feeder peak load"
                      >
                        <span>💡 Optimal Sizing Guide</span>
                      </button>

                      {/* Tooltip / Guide Popover */}
                      {showSizingTooltip && (
                        <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-80 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-50 border border-slate-700 text-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-bold text-amber-400 flex items-center gap-1.5">
                              <span>⚡ WAPDA Transformer Sizing Analysis</span>
                            </span>
                            <button 
                              type="button"
                              onClick={() => setShowSizingTooltip(false)}
                              className="text-slate-400 hover:text-white font-mono text-sm px-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="space-y-1.5 font-mono text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Calculated Peak Load:</span>
                              <span className="font-bold text-white">{peakDemandKva} kVA</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Current Rating:</span>
                              <span className="font-bold text-amber-400">{activeTransformerKva} kVA ({currentLoadingPercent}%)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Safe Loading Limit (80%):</span>
                              <span className="font-bold text-slate-200">Max {Math.round(recommendedTransformerKva * 0.8)} kVA load</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-800 pt-1.5">
                              <span className="text-slate-300 font-bold">Recommended Size:</span>
                              <span className="font-bold text-emerald-400 text-sm">{recommendedTransformerKva} kVA</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Projected Loading:</span>
                              <span className="font-bold text-emerald-300">{projectedLoadingWithRecommended}% (Optimal)</span>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-300 leading-relaxed border-t border-slate-800 pt-2">
                            Operating below 80% capacity prevents winding overheating, minimizes core/copper losses, and extends transformer insulation lifespan by over 2x.
                          </p>

                          <div className="pt-1 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateTransformerKva(recommendedTransformerKva);
                                setShowSizingTooltip(false);
                              }}
                              className="w-full py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer text-center"
                            >
                              Apply Recommended ({recommendedTransformerKva} kVA)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Direct Number Input */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Custom kVA:</span>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  step="5"
                  value={activeTransformerKva}
                  onChange={(e) => onUpdateTransformerKva(Math.max(10, parseFloat(e.target.value) || 100))}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <span className="text-slate-300">|</span>

              {/* Quick Standard Rating Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-1">Quick Select:</span>
                {[25, 50, 100, 200, 400, 630].map(cap => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => onUpdateTransformerKva(cap)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                      activeTransformerKva === cap
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {cap} kVA {cap === 100 ? '(image1)' : (cap === 200 ? '(Upgrade)' : '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Secondary Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs pt-1">
          {/* Field 1: Proposed Transformer (LT) or Input Source Current (HT) */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="font-semibold text-slate-800 block mb-1">
              {isHtLine ? 'Input Source Current (Amps):' : 'Proposed Upgrade Transformer:'}
            </label>
            {isHtLine ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="10"
                  max="2000"
                  step="1"
                  value={sourceCurrentInput}
                  onChange={(e) => setSourceCurrentInput(parseFloat(e.target.value) || 180)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900"
                  title="Enter total source current in Amps injected at Node 0"
                />
                <span className="text-[10px] font-mono text-slate-500 font-bold">A</span>
              </div>
            ) : (
              <select
                value={proposedTrfKva}
                onChange={(e) => setProposedTrfKva(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900"
              >
                {TRANSFORMER_CAPACITIES.map(cap => (
                  <option key={cap} value={cap}>
                    {cap} kVA {cap === 200 ? '(Recommended 200 kVA)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Field 2: Nominal Line Voltage */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="font-semibold text-slate-800 block mb-1">
              Nominal System Voltage:
            </label>
            <select
              value={nominalVoltage}
              onChange={(e) => setNominalVoltage(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value={400}>400 V (Low Tension 3-Phase Standard)</option>
              <option value={390}>390 V (Low Tension 390V Feeder)</option>
              <option value={380}>380 V (Low Tension 380V Alternative)</option>
              <option value={415}>415 V (Low Tension 415V IEC/UK Standard)</option>
              <option value={11000}>11,000 V (High Tension 11kV Feeder)</option>
            </select>
          </div>

          {/* Field 3: Load Factor (LF) with LLF calculation preview */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-800">
                Load Factor (LF):
              </label>
              <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold" title="Loss Load Factor = 0.2·LF + 0.8·LF²">
                LLF: {(0.2 * loadFactor + 0.8 * Math.pow(loadFactor, 2)).toFixed(3)}
              </span>
            </div>
            <input
              type="number"
              step="0.05"
              min="0.10"
              max="1.0"
              value={loadFactor}
              onChange={(e) => setLoadFactor(Math.min(1.0, Math.max(0.1, parseFloat(e.target.value) || 0.6)))}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
              <span>WAPDA Base: 0.60</span>
              <button 
                type="button" 
                onClick={() => setLoadFactor(0.60)}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Field 4: Operating Power Factor */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="font-semibold text-slate-800 block mb-1">
              Power Factor (cosΦ):
            </label>
            <input
              type="number"
              step="0.01"
              min="0.5"
              max="1.0"
              value={powerFactor}
              onChange={(e) => setPowerFactor(parseFloat(e.target.value) || 0.8)}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900"
            />
          </div>

          {/* Field 5: Annual Growth Rate */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="font-semibold text-slate-800 block mb-1">
              Annual Load Growth (%):
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="20"
              value={annualGrowthRate}
              onChange={(e) => setAnnualGrowthRate(parseFloat(e.target.value) || 5.0)}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900"
            />
          </div>

          {/* Field 6: Rate Per KWH (Rupees) */}
          <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-emerald-950">
                Rate Per KWH (Rupees):
              </label>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.2 rounded border border-emerald-200">
                Rs. {tariffPerKwh.toFixed(2)}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="1.0"
                max="500"
                value={tariffPerKwh}
                onChange={(e) => setTariffPerKwh(parseFloat(e.target.value) || 24.83)}
                placeholder="24.83"
                className="w-full bg-white border border-emerald-300 rounded px-2 py-1 font-mono font-bold text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-emerald-800 mt-1">
              <span className="font-medium">Rate: Rs. 24.83 / kWh</span>
              <button 
                type="button" 
                onClick={() => setTariffPerKwh(24.83)}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
                title="Reset to standard tariff rate Rs. 24.83 / kWh"
              >
                Set 24.83
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          SECTION 2: SPANS DATA INPUT FORM (HT LINE / LT LINE)
         ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>
                {isHtLine 
                  ? '2. HT Line Spans Input Table (From Node, To Node, Length, Node KVA, Conductor Type)' 
                  : '2. Feeder Spans Input Table (image1.png Columns)'}
              </span>
              <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                {rows.length} Spans
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isHtLine ? (
                <>
                  HT Line Analysis Parameters: <strong>From Node</strong>, <strong>To Node</strong>, <strong>Length (km / m)</strong>, <strong>Node KVA (Connected DTR Load)</strong>, and <strong>Conductor Type</strong> with line voltage injected at Node 0.
                </>
              ) : (
                <>
                  Columns correspond directly to <strong>image1.png</strong>: From Node, To Node, Length (km), Length (m), 3-Ph Customers, 1-Ph Customers, Conductor Code.
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Segment Span</span>
            </button>
            <button
              onClick={handleClearFeeder}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Clear all spans to start empty"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3 text-center w-12">#</th>
                <th className="py-2.5 px-3 text-center">From Node</th>
                <th className="py-2.5 px-3 text-center">To Node</th>
                <th className="py-2.5 px-3 text-right">Length (km)</th>
                <th className="py-2.5 px-3 text-right">Length (m)</th>
                {isHtLine ? (
                  <th className="py-2.5 px-3 text-center bg-blue-100/90 text-blue-950 font-extrabold border-x border-blue-200">
                    Node KVA
                  </th>
                ) : (
                  <>
                    <th className="py-2.5 px-3 text-right">3-Ph Customer</th>
                    <th className="py-2.5 px-3 text-right">1-Ph Customer</th>
                  </>
                )}
                <th className="py-2.5 px-3 text-left">Conductor Type</th>
                <th className="py-2.5 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Row index */}
                  <td className="py-2 px-3 text-center text-slate-400 text-[11px] font-sans">
                    {idx + 1}
                  </td>

                  {/* From Node */}
                  <td className="py-2 px-2 text-center">
                    <input
                      type="text"
                      value={row.fromNode}
                      onChange={(e) => handleUpdateRow(idx, 'fromNode', e.target.value)}
                      className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* To Node */}
                  <td className="py-2 px-2 text-center">
                    <input
                      type="text"
                      value={row.toNode}
                      onChange={(e) => handleUpdateRow(idx, 'toNode', e.target.value)}
                      className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Length (km) */}
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={row.lengthKm}
                      onChange={(e) => handleUpdateRow(idx, 'lengthKm', e.target.value)}
                      className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Length (m) */}
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="1"
                      value={row.lengthMeters}
                      onChange={(e) => handleUpdateRow(idx, 'lengthMeters', e.target.value)}
                      className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-right text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* HT Mode: Only Dropdown Node KVA */}
                  {isHtLine ? (
                    <td className="py-2 px-2.5 text-center bg-blue-50/40 border-x border-blue-100">
                      <select
                        value={row.nodeKva || 50}
                        onChange={(e) => handleUpdateRow(idx, 'nodeKva', Number(e.target.value))}
                        className="w-full min-w-[95px] bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-center shadow-2xs"
                      >
                        <option value={10}>10 kVA</option>
                        <option value={25}>25 kVA</option>
                        <option value={50}>50 kVA</option>
                        <option value={100}>100 kVA</option>
                        <option value={200}>200 kVA</option>
                        {row.nodeKva && ![10, 25, 50, 100, 200].includes(row.nodeKva) && (
                          <option value={row.nodeKva}>{row.nodeKva} kVA</option>
                        )}
                      </select>
                    </td>
                  ) : (
                    <>
                      {/* 3-Ph Customer */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={row.threePhaseCust}
                          onChange={(e) => handleUpdateRow(idx, 'threePhaseCust', e.target.value)}
                          className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-right font-bold text-purple-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* 1-Ph Customer */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={row.singlePhaseCust}
                          onChange={(e) => handleUpdateRow(idx, 'singlePhaseCust', e.target.value)}
                          className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-right font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    </>
                  )}

                  {/* Conductor Code */}
                  <td className="py-2 px-2 text-left font-sans">
                    <select
                      value={row.conductorCode}
                      onChange={(e) => handleUpdateRow(idx, 'conductorCode', e.target.value)}
                      className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {isHtLine ? (
                        <>
                          <option value="DOG">DOG (100 mm² ACSR)</option>
                          <option value="RABBIT">RABBIT (50 mm² ACSR)</option>
                          <option value="PANTHER">PANTHER (200 mm² ACSR)</option>
                          <option value="WASP">WASP (7/0.170" ACSR)</option>
                          <option value="OSPREY">OSPREY (200 mm² ACSR)</option>
                          <option value="GOPHER">GOPHER (25 mm² ACSR)</option>
                          <option value="ANT">ANT (50 mm² AAC)</option>
                          <option value="A">A (7/0.122" ACSR)</option>
                          <option value="NAT">NAT (147A)</option>
                        </>
                      ) : (
                        <>
                          <option value="A">A (7/0.122" ACSR)</option>
                          <option value="WASP">WASP (7/0.170" ACSR)</option>
                          <option value="PU3">PU3 (PVC 37/0.083")</option>
                          <option value="PU2">PU2 (PVC 19/0.083")</option>
                          <option value="RABBIT">RABBIT (50 mm²)</option>
                          <option value="DOG">DOG (100 mm²)</option>
                          <option value="PANTHER">PANTHER (200 mm²)</option>
                          <option value="ABC-70">ABC-70 (70 mm²)</option>
                          <option value="ABC-120">ABC-120 (120 mm²)</option>
                          <option value="NAT">NAT (147A)</option>
                        </>
                      )}
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleDuplicateRow(idx)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                        title="Duplicate row"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete span"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Table Footer Totals */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold font-mono">
                <td colSpan={3} className="py-3 px-3 text-center text-amber-400 uppercase tracking-wider">
                  TOTAL INPUTS
                </td>
                <td className="py-3 px-2 text-right text-amber-300">
                  {totalLengthKm.toFixed(3)} km
                </td>
                <td className="py-3 px-2 text-right">
                  {totalLengthM} m
                </td>
                {isHtLine ? (
                  <td className="py-3 px-2 text-right text-amber-300 font-mono font-black text-sm">
                    {rows.reduce((sum, r) => sum + (r.nodeKva || 0), 0).toLocaleString()} kVA
                  </td>
                ) : (
                  <>
                    <td className="py-3 px-2 text-right text-purple-300">
                      {total3Ph}
                    </td>
                    <td className="py-3 px-2 text-right text-amber-300">
                      {total1Ph}
                    </td>
                  </>
                )}
                <td colSpan={2} className="py-3 px-3 text-slate-400 font-sans text-xs">
                  {rows.length} Feeder Segments Configured {isHtLine ? `· Injected: ${(nominalVoltage/1000).toFixed(2)} kV at Node 0` : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Tip: Press <strong>"Apply & Calculate Outputs"</strong> to execute backward-forward sweep and view calculated output schedule (image2.png).
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndCalculate}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Apply & Calculate Outputs </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          SECTION 3: LIVE CALCULATED OUTPUT SUMMARY PREVIEW
         ======================================================== */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              3. Live Output Calculation Preview (image2.png Results)
            </h3>
          </div>
          <button
            onClick={onNavigateToSchedule}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View Full image2.png Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Total Feeder Length:</span>
            <span className="font-bold text-slate-900 text-sm">{summary.totalCircuitLengthKm} km</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">({Math.round(summary.totalCircuitLengthKm * 1000)} m)</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Feeder Peak Demand:</span>
            <span className="font-bold text-slate-900 text-sm">{summary.totalSystemDemandKva} kVA</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Current: {summary.totalSourceCurrentAmps} A</span>
          </div>

          <div className={`p-3 rounded-lg border ${summary.isTransformerOverloaded ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <span className="text-[10px] font-sans block font-semibold text-slate-700">Trf Overloading:</span>
            <span className={`font-bold text-sm ${summary.isTransformerOverloaded ? 'text-rose-700' : 'text-emerald-700'}`}>
              {summary.existingTransformerLoadingPercent}%
            </span>
            <span className="text-[10px] block mt-0.5 text-slate-500">
              {summary.isTransformerOverloaded ? 'Overloaded' : 'Normal'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Total Line Losses:</span>
            <span className="font-bold text-slate-900 text-sm">{summary.totalLineLossKw} kW</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">({summary.percentPowerLoss}% Power Loss)</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Annual Energy Losses:</span>
            <span className="font-bold text-slate-900 text-sm">{summary.annualEnergyLossKwh.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">kWh / year</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Worst Voltage Drop:</span>
            <span className={`font-bold text-sm ${summary.worstVoltageDropPercent > 9 ? 'text-rose-600' : 'text-amber-600'}`}>
              -{summary.worstVoltageDropPercent}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">at Node {summary.worstVoltageDropNodeId} ({summary.worstVoltageVolts}V)</span>
          </div>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showCsvImport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm">Import Spans CSV / Excel Data</h4>
              </div>
              <button
                onClick={() => setShowCsvImport(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Paste CSV or Tab-delimited data directly from Excel with the columns:
                <br />
                <code className="font-mono bg-slate-100 p-1 rounded mt-1 block text-[11px] text-slate-800">
                  From Node, To Node, Length (km), Length (m), 3-Ph Cust, 1-Ph Cust, Conductor Code
                </code>
              </p>

              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`0,1,0.005,5,0,12,A\n1,2,0.055,55,0,16,A\n2,3,0.040,40,0,12,A\n...`}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              {importError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {importError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowCsvImport(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleParseCsv}
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  Import Spans
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Excel Import Modal (.xlsx / .xls / .csv / clipboard) */}
      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        onApplyImportedData={handleApplyImportedRows}
        feeder={feeder}
      />

      {/* KML / KMZ GIS Import Modal */}
      <KmlKmzImportModal
        isOpen={showKmlModal}
        onClose={() => setShowKmlModal(false)}
        onImportFeeder={handleImportKmlFeeder}
      />
    </div>
  );
};
