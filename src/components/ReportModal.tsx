/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  FeederData, 
  FeederAnalysisSummary, 
  BifurcationConfig,
  BifurcationFourStatementDossier
} from '../types/feeder';
import { 
  Printer, 
  X, 
  Download, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  Calendar,
  FileCheck,
  FileText,
  FileSpreadsheet,
  Table as TableIcon,
  Layers,
  ArrowRight,
  Split,
  UserCheck,
  Award,
  GitFork,
  Network,
  Settings2,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  Sliders,
  Sparkles,
  FileCode2,
  Check,
  Activity,
  Columns,
  Maximize2,
  Minimize2,
  Loader2,
  Filter,
  Shrink
} from 'lucide-react';
import { 
  generateTechnicalRecommendations,
  calculateBifurcationFourStatements 
} from '../utils/elrEngine';
import { JobTitle, JOB_TITLE_OPTIONS } from '../types/feeder';
import { calculateNonOverlappingSLDLayout } from '../utils/sldLayout';
import { BifurcationStatementsPanel } from './BifurcationStatementsPanel';
import { FeederSLDViewer, SLDSchemeType } from './FeederSLDViewer';
import { exportElementToPdf } from '../utils/pdfExport';
import { FladixOfficialHeader } from './FladixOfficialHeader';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeder: FeederData;
  summary: FeederAnalysisSummary;
  proposedSummary: FeederAnalysisSummary;
  activeTransformerKva?: number;
  bifurcationConfig?: BifurcationConfig;
  selectedJobTitle?: JobTitle;
  onUpdateJobTitle?: (title: string) => void;
  initialDisplayMode?: 'full_report' | 'bifurcation_4_statements' | 'single_line_diagram' | 'tri_sld_schemes' | 'input_form_image1' | 'output_schedule_image2' | 'dual_form' | 'table1_matrix';
  initialSldScheme?: SLDSchemeType;
}

export type PageBreakMode = 'page_per_section' | 'compact_flow';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';
export type PrintScale = 'compact' | 'standard' | 'presentation';

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  feeder,
  summary,
  proposedSummary,
  activeTransformerKva,
  bifurcationConfig,
  selectedJobTitle = 'Sub-Divisional Officer (SDO)',
  onUpdateJobTitle,
  initialDisplayMode,
  initialSldScheme
}) => {
  const effectiveBifurcationConfig: BifurcationConfig = useMemo(() => {
    if (bifurcationConfig) return bifurcationConfig;
    return {
      enabled: proposedSummary.bifurcationActive || false,
      bifurcationNodeId: proposedSummary.bifurcationNodeId || '3.0',
      transformerCapacityKva: proposedSummary.additionalTransformerKva || 100,
      mode: 'ADDITIONAL_TRANSFORMER'
    };
  }, [bifurcationConfig, proposedSummary]);

  const bifurcationDossier: BifurcationFourStatementDossier = useMemo(() => {
    return calculateBifurcationFourStatements(feeder, effectiveBifurcationConfig, {
      t1TransformerOverrideKva: activeTransformerKva
    });
  }, [feeder, effectiveBifurcationConfig, activeTransformerKva]);

  const [displayMode, setDisplayMode] = useState<
    'full_report' | 'bifurcation_4_statements' | 'single_line_diagram' | 'tri_sld_schemes' | 'input_form_image1' | 'output_schedule_image2' | 'dual_form' | 'table1_matrix'
  >(initialDisplayMode || 'full_report');

  const [sldScheme, setSldScheme] = useState<SLDSchemeType>(
    initialSldScheme || (effectiveBifurcationConfig.enabled ? 'tri_scheme' : 'combined')
  );

  React.useEffect(() => {
    if (isOpen) {
      if (initialDisplayMode) {
        setDisplayMode(initialDisplayMode);
      }
      if (initialSldScheme) {
        setSldScheme(initialSldScheme);
      }
    }
  }, [isOpen, initialDisplayMode, initialSldScheme]);

  const [isMaximized, setIsMaximized] = useState(true);

  // Per-Page Print Settings State - Defaults set to "1 Report Per Page" with SLD and necessary reports
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [pageBreakMode, setPageBreakMode] = useState<PageBreakMode>('page_per_section');
  const [pageOrientation, setPageOrientation] = useState<PageOrientation>('portrait');
  const [printScale, setPrintScale] = useState<PrintScale>('standard');
  const [includePageHeaders, setIncludePageHeaders] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(false); // Excluded by default to avoid unnecessary graphics
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.07);
  const [excludeUnnecessaryGraphics, setExcludeUnnecessaryGraphics] = useState<boolean>(true); // Focus purely on informative data report and engineering diagrams (no decorative bloat)
  const [diagramScale, setDiagramScale] = useState<number>(0.85);

  // PDF Export Generation State
  const printContentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Per-Page Inclusion Toggles - All 7 necessary reports and single line diagrams enabled by default
  const [pagesToPrint, setPagesToPrint] = useState<{
    summarySpecs: boolean;
    bifurcationStatements: boolean;
    singleLineDiagram: boolean;
    inputFormImage1: boolean;
    outputScheduleImage2: boolean;
    table1Matrix: boolean;
    recommendations: boolean;
  }>({
    summarySpecs: true,
    bifurcationStatements: true, // Necessary bifurcation study enabled by default
    singleLineDiagram: true, // Necessary single line diagram included
    inputFormImage1: true,
    outputScheduleImage2: true,
    table1Matrix: true,
    recommendations: true
  });

  // Dedicated Print Handler with synchronous multi-page readiness & iframe fallback
  const handlePrint = (forceFullDossier = false) => {
    if (forceFullDossier && displayMode !== 'full_report') {
      setDisplayMode('full_report');
    }

    setPdfToast({ message: 'Opening system print preview (1 report per page)...', type: 'info' });

    // Allow browser a tick to layout any updated state
    setTimeout(() => {
      try {
        setPdfToast(null);
        window.print();
      } catch (err: any) {
        console.warn('System print dialog unavailable in iframe environment:', err);
        setPdfToast({
          message: 'Direct print dialog unavailable in frame. Generating multi-page PDF automatically...',
          type: 'info'
        });
        handleExportPdf();
      }
    }, 150);
  };

  // Direct PDF Export Handler for Informative Data Report
  const handleExportPdf = async () => {
    if (!printContentRef.current) return;
    setIsGeneratingPdf(true);
    setPdfToast({ 
      message: `Generating engineering PDF dossier (${pageBreakMode === 'page_per_section' ? '1 report per page' : 'continuous multi-page flow'})...`, 
      type: 'info' 
    });

    try {
      const cleanName = (feeder.name || 'Feeder').replace(/[^a-zA-Z0-9_-]/g, '_');
      const todayStr = new Date().toISOString().slice(0, 10);
      const filename = `FLADIX_Report_${cleanName}_${todayStr}`;

      const result = await exportElementToPdf(printContentRef.current, {
        filename,
        paperSize: 'a4',
        orientation: pageOrientation === 'landscape' ? 'landscape' : 'portrait',
        marginMm: printScale === 'compact' ? 8 : 10,
        reportTitle: `FLADIX Feeder Loss Analysis and Data Indexing Report - ${feeder.name}`,
        docReference: `FLADIX-PESCO-${feeder.id.toUpperCase()}`,
        excludeGraphics: excludeUnnecessaryGraphics,
        pageBreakMode: pageBreakMode
      });

      if (result.success) {
        setPdfToast({
          message: `PDF exported successfully: ${result.filename} (${result.pageCount} pages, ${pageBreakMode === 'page_per_section' ? '1 per section' : 'continuous layout'})`,
          type: 'success'
        });
        setTimeout(() => setPdfToast(null), 4000);
      } else {
        setPdfToast({
          message: `PDF export failed: ${result.error || 'Unknown error'}`,
          type: 'error'
        });
        setTimeout(() => setPdfToast(null), 5000);
      }
    } catch (err: any) {
      setPdfToast({
        message: `Error during PDF export: ${err?.message || 'Please retry'}`,
        type: 'error'
      });
      setTimeout(() => setPdfToast(null), 5000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Quick Preset Handlers
  const handleApplyPreset = (preset: 'informative_only' | 'all' | 'bifurcation_only' | 'sld_only' | 'tri_sld_only' | 'forms_only' | 'summary_matrix' | 'single_page') => {
    if (preset === 'informative_only') {
      setDisplayMode('full_report');
      setPagesToPrint({
        summarySpecs: true,
        bifurcationStatements: effectiveBifurcationConfig.enabled,
        singleLineDiagram: true, // Necessary SLD included
        inputFormImage1: true,
        outputScheduleImage2: true,
        table1Matrix: true,
        recommendations: true
      });
      setExcludeUnnecessaryGraphics(true);
      setIncludeWatermark(false);
      setPageBreakMode('page_per_section');
      setPrintScale('standard');
      setPageOrientation('portrait');
    } else if (preset === 'all') {
      setDisplayMode('full_report');
      setSldScheme(effectiveBifurcationConfig.enabled ? 'tri_scheme' : 'combined');
      setPagesToPrint({
        summarySpecs: true,
        bifurcationStatements: effectiveBifurcationConfig.enabled,
        singleLineDiagram: true,
        inputFormImage1: true,
        outputScheduleImage2: true,
        table1Matrix: true,
        recommendations: true
      });
      setExcludeUnnecessaryGraphics(false);
      setPageBreakMode('page_per_section');
    } else if (preset === 'bifurcation_only') {
      setDisplayMode('bifurcation_4_statements');
      setPagesToPrint({
        summarySpecs: false,
        bifurcationStatements: true,
        singleLineDiagram: false,
        inputFormImage1: false,
        outputScheduleImage2: false,
        table1Matrix: false,
        recommendations: false
      });
      setExcludeUnnecessaryGraphics(true);
      setPageBreakMode('page_per_section');
      setPrintScale('standard');
    } else if (preset === 'sld_only') {
      setDisplayMode('single_line_diagram');
      setSldScheme('combined');
      setPagesToPrint({
        summarySpecs: false,
        bifurcationStatements: false,
        singleLineDiagram: true,
        inputFormImage1: false,
        outputScheduleImage2: false,
        table1Matrix: false,
        recommendations: false
      });
      setExcludeUnnecessaryGraphics(false);
      setPageOrientation('landscape');
    } else if (preset === 'tri_sld_only') {
      setDisplayMode('single_line_diagram');
      setSldScheme('tri_scheme');
      setPagesToPrint({
        summarySpecs: false,
        bifurcationStatements: false,
        singleLineDiagram: true,
        inputFormImage1: false,
        outputScheduleImage2: false,
        table1Matrix: false,
        recommendations: false
      });
      setExcludeUnnecessaryGraphics(false);
      setPageOrientation('landscape');
      setPageBreakMode('page_per_section');
    } else if (preset === 'forms_only') {
      setDisplayMode('dual_form');
      setPagesToPrint({
        summarySpecs: false,
        bifurcationStatements: false,
        singleLineDiagram: false,
        inputFormImage1: true,
        outputScheduleImage2: true,
        table1Matrix: false,
        recommendations: false
      });
      setExcludeUnnecessaryGraphics(true);
      setPageBreakMode('compact_flow');
    } else if (preset === 'single_page') {
      setDisplayMode('full_report');
      setPagesToPrint({
        summarySpecs: true,
        bifurcationStatements: true,
        singleLineDiagram: true,
        inputFormImage1: true,
        outputScheduleImage2: true,
        table1Matrix: true,
        recommendations: true
      });
      setExcludeUnnecessaryGraphics(true);
      setPageBreakMode('compact_flow');
      setPrintScale('compact');
    } else if (preset === 'summary_matrix') {
      setDisplayMode('full_report');
      setPagesToPrint({
        summarySpecs: true,
        bifurcationStatements: false,
        singleLineDiagram: false,
        inputFormImage1: false,
        outputScheduleImage2: false,
        table1Matrix: true,
        recommendations: true
      });
      setExcludeUnnecessaryGraphics(true);
      setPageBreakMode('compact_flow');
    }
  };

  // Compute non-overlapping layout for printable diagram
  const layout = useMemo(() => {
    return calculateNonOverlappingSLDLayout(feeder);
  }, [feeder]);

  // Map segments results by "from->to"
  const segmentResultMap = useMemo(() => {
    const map = new Map<string, any>();
    summary.segmentResults.forEach(r => {
      map.set(`${r.fromNodeId}->${r.toNodeId}`, r);
      map.set(r.segment.id, r);
    });
    return map;
  }, [summary]);

  if (!isOpen) return null;

  const currentTrfKva = activeTransformerKva || summary.existingTransformerKva;
  const currentTrfLoading = Math.round((summary.totalSystemDemandKva / currentTrfKva) * 100);
  const isTrfOverloaded = currentTrfLoading > 100;
  
  const officerTitle = selectedJobTitle && selectedJobTitle.trim() ? selectedJobTitle.trim() : 'Sub-Divisional Officer (SDO)';
  const lowerTitle = officerTitle.toLowerCase();
  const isXenMatch = lowerTitle.includes('xen') || lowerTitle.includes('executive');
  const isSeMatch = lowerTitle.includes('se') || lowerTitle.includes('superintending') || lowerTitle.includes('chief') || lowerTitle.includes('director');
  const isSdoMatch = !isXenMatch && !isSeMatch;

  const recommendations = generateTechnicalRecommendations(summary, feeder);
  const tariff = feeder.tariffPerKwh || 24.83;
  const kwhSaved = Math.max(0, summary.annualEnergyLossKwh - proposedSummary.annualEnergyLossKwh);
  const annualSavings = Math.round(kwhSaved * tariff);
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Dynamic Print Scale CSS Classes
  const scaleWrapperClass = 
    printScale === 'compact' ? 'print:text-[10px] print:leading-snug' :
    printScale === 'presentation' ? 'print:text-sm print:leading-relaxed' :
    'print:text-xs print:leading-normal';

  // Official PESCO - WAPDA Header for all PDF / printed pages
  const renderOfficialHeader = (sectionSubtitle?: string, pageNumberText?: string, isFirstPage: boolean = false) => {
    if (!includePageHeaders && !isFirstPage) return null;
    const isSoloView = displayMode !== 'full_report';
    const showOnScreen = isFirstPage || isSoloView || pageBreakMode === 'page_per_section' || isGeneratingPdf;

    return (
      <div className={`w-full print-avoid-break ${showOnScreen ? 'block' : 'hidden print:block'}`}>
        <FladixOfficialHeader
          subtitle={sectionSubtitle || 'Feeder Loading, Transformer Overloading, Line Losses & Upgradation Study'}
          badgeLabel="INDEX"
          badgeStd="STD"
          refCode={`FLADIX-PESCO-${feeder.id.toUpperCase()}`}
          dateStr={today}
          category={feeder.category === 'HV' ? '11kV High Tension (HT)' : '400V Low Tension (LT)'}
          nominalVoltage={feeder.nominalVoltage}
          division="Peshawar City"
          preparedBy={officerTitle}
          pageNumberText={pageNumberText}
          showMetaBar={true}
        />
      </div>
    );
  };

  // Computed list of active sections for accurate page numbering
  const activeSections = useMemo(() => {
    const list: { id: string; title: string; subtitle: string }[] = [];
    
    // 1. Specs & Electrical System Demand
    if (pagesToPrint.summarySpecs && (displayMode === 'full_report' || displayMode === 'input_form_image1' || displayMode === 'table1_matrix')) {
      list.push({
        id: 'summarySpecs',
        title: '1. Feeder Electrical Specifications & System Demand Summary',
        subtitle: 'Feeder Loading, Transformer Overloading, Line Losses & Upgradation Study'
      });
    }
    // 2. Form A Spans Input
    if (pagesToPrint.inputFormImage1 && (displayMode === 'full_report' || displayMode === 'input_form_image1' || displayMode === 'dual_form')) {
      list.push({
        id: 'inputFormImage1',
        title: '2. Form Display A: Feeder Spans Input Data Schedule (Ref. image1.png)',
        subtitle: 'Field Survey Spans Technical Record & Customer Segments (image1.png)'
      });
    }
    // 3. Form B Calculated Output
    if (pagesToPrint.outputScheduleImage2 && (displayMode === 'full_report' || displayMode === 'output_schedule_image2' || displayMode === 'dual_form')) {
      list.push({
        id: 'outputScheduleImage2',
        title: '3. Form Display B: Calculated Segment Load Flow & Loss Schedule (Ref. image2.png)',
        subtitle: 'Radial Load Flow, Operating Currents, Voltage Drops & Losses (image2.png)'
      });
    }
    // 4. Single Line Diagram (SLD) Blueprint
    if (pagesToPrint.singleLineDiagram && (displayMode === 'full_report' || displayMode === 'single_line_diagram' || displayMode === 'tri_sld_schemes')) {
      list.push({
        id: 'singleLineDiagram',
        title: '4. Single Line Diagram (SLD) Schematic & Network Topology Blueprint',
        subtitle: 'Feeder Schematic Blueprint & Bifurcation Layout'
      });
    }
    // 5. Line Bifurcation & Multi-Zone Study
    if (pagesToPrint.bifurcationStatements && (displayMode === 'full_report' || displayMode === 'bifurcation_4_statements')) {
      list.push({
        id: 'bifurcationStatements',
        title: '5. Line Bifurcation & Multi-Zone Study (Exist, Proposed-1 & Proposed-2 @ 0 & 5 Years)',
        subtitle: 'Dual-Zone 6-Node Technical Performance & Relieved Loading Statements'
      });
    }
    // 6. Upgradation Benchmark Matrix
    if (pagesToPrint.table1Matrix && (displayMode === 'full_report' || displayMode === 'table1_matrix')) {
      list.push({
        id: 'table1Matrix',
        title: '6. Comparative Upgradation & Loss Relief Matrix (WAPDA Study Table 1)',
        subtitle: 'Technical Economics & Capital Loss Recovery Benchmark Matrix'
      });
    }
    // 7. Directives & Signatures
    if (pagesToPrint.recommendations && displayMode === 'full_report') {
      list.push({
        id: 'recommendations',
        title: '7. Priority Engineering Remediation Directives & Approvals',
        subtitle: 'Engineering Directives & Official Verification Approval Chain'
      });
    }

    return list;
  }, [pagesToPrint, displayMode]);

  const getPageInfo = (sectionId: string) => {
    const idx = activeSections.findIndex(s => s.id === sectionId);
    const pageNum = idx >= 0 ? idx + 1 : 1;
    const totalPages = activeSections.length || 1;
    return {
      pageNum,
      totalPages,
      pageLabel: `Page ${pageNum} of ${totalPages}`
    };
  };

  // Official PESCO - WAPDA Footer for each page (Removed from printing & PDF export as requested)
  const renderOfficialFooter = (_sectionTitle?: string, _sectionId?: string, _specialNote?: string) => {
    return null;
  };

  // Export current report / tables as CSV
  const handleExportCsv = () => {
    const headers = [
      'Span #',
      'From Node',
      'To Node',
      'Length (km)',
      'Length (m)',
      '3-Ph Cust',
      '1-Ph Cust',
      'Conductor Code',
      'Current (A)',
      'Loading %',
      'Volt Drop %',
      'Voltage (V)',
      'Loss (kW)'
    ];

    const rows = summary.segmentResults.map((r, i) => [
      i + 1,
      r.fromNodeId,
      r.toNodeId,
      r.lengthKm.toFixed(3),
      r.lengthMeters,
      r.threePhaseCustomers,
      r.singlePhaseCustomers,
      r.conductor.code,
      r.currentAmps.toFixed(1),
      r.percentLoading,
      r.percentVoltDrop.toFixed(1),
      r.receivingVoltage.toFixed(1),
      r.lineLossKw.toFixed(3)
    ]);

    const content = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${feeder.id}_ELR_Report_Forms_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const enabledPagesCount = Object.values(pagesToPrint).filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div 
      id="report-modal-overlay"
      className={`fixed inset-0 z-50 ${
        isMaximized 
          ? 'bg-slate-950 p-0 flex flex-col overflow-hidden' 
          : 'bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto'
      } print:p-0 print:bg-white print:static print:overflow-visible print:h-auto print:max-h-none`}
    >
      
      {/* ========================================================
          DYNAMIC @MEDIA PRINT STYLES WITH PER-PAGE CONTROLS
         ======================================================== */}
      <style>{`
        #printable-report::-webkit-scrollbar {
          width: 8px;
        }
        #printable-report::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        #printable-report::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        #printable-report::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .screen-watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 520px;
          height: 520px;
          max-width: 65vw;
          max-height: 65vh;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 20;
          mix-blend-mode: multiply;
          opacity: ${includeWatermark ? Math.min(watermarkOpacity, 0.06) : 0};
        }

        @media print {
          @page {
            size: ${pageOrientation === 'landscape' ? 'landscape' : 'portrait'};
            margin: ${printScale === 'compact' ? '8mm' : '10mm'};
          }
          /* Complete eradication of all scrollbars, slide bars, and tracks on print pages */
          *, *::before, *::after {
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          *::-webkit-scrollbar, ::-webkit-scrollbar, div::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
            opacity: 0 !important;
          }
          html, body {
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            height: auto !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .overflow-x-auto,
          .overflow-y-auto,
          .overflow-auto,
          .overflow-hidden,
          [class*="overflow-"] {
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            max-height: none !important;
            height: auto !important;
          }
          .no-print {
            display: none !important;
          }
          ${excludeUnnecessaryGraphics ? `
          .print-watermark, .screen-watermark, .unnecessary-graphic, .decorative-graphic {
            display: none !important;
          }
          ` : ''}
          #report-modal-overlay {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            display: block !important;
            z-index: auto !important;
          }
          #report-modal-dialog {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            display: block !important;
            background: #ffffff !important;
          }
          #printable-report {
            position: static !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            max-height: none !important;
            background: #ffffff !important;
          }
          .print-page-unit {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            min-height: auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            padding-top: 1mm !important;
            padding-bottom: 2mm !important;
            margin-bottom: 10mm !important;
            background: #ffffff !important;
            position: relative !important;
          }
          .print-page-unit:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
            margin-bottom: 0 !important;
          }
          .report-official-footer {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          .print-watermark {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 520px !important;
            max-width: 75vw !important;
            height: 520px !important;
            max-height: 75vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: none !important;
            z-index: 9999 !important;
            mix-blend-mode: multiply !important;
            opacity: ${includeWatermark && !excludeUnnecessaryGraphics ? watermarkOpacity : 0} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-page-break {
            break-before: ${pageBreakMode === 'page_per_section' ? 'page' : 'auto'} !important;
            page-break-before: ${pageBreakMode === 'page_per_section' ? 'always' : 'auto'} !important;
            position: relative !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            position: relative !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            position: relative !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          table {
            page-break-inside: auto;
            position: relative !important;
            overflow: visible !important;
            border-collapse: collapse !important;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
        }
      `}</style>

      {/* PDF Export Feedback Toast */}
      {pdfToast && (
        <div className="fixed top-20 right-6 z-60 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 no-print">
          {pdfToast.type === 'info' && <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />}
          {pdfToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {pdfToast.type === 'error' && <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="font-semibold">{pdfToast.message}</span>
        </div>
      )}

      <div 
        id="report-modal-dialog"
        className={`bg-white w-full ${
          isMaximized 
            ? 'min-h-screen rounded-none my-0 max-w-none shadow-none border-none flex-1 flex flex-col' 
            : 'max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[94vh] flex flex-col'
        } print:m-0 print:shadow-none print:border-none print:rounded-none print:max-h-none print:h-auto print:overflow-visible print-container`}
      >
        
        {/* Top Action Bar (hidden when printing) */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/pesco-logo.svg"
              alt="PESCO Logo"
              className="w-12 h-12 rounded-full border-2 border-amber-500/60 shadow-md shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm block leading-tight">
                  FLADIX — Feeder Loss Analysis and Data Indexing Report
                </span>
                {excludeUnnecessaryGraphics && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.2 rounded font-bold uppercase">
                    Data Report Only
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                Official WAPDA Forms image1.png, image2.png & Multi-Zone Statements
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Informative Data Mode Quick Switch */}
            <button
              type="button"
              onClick={() => {
                const next = !excludeUnnecessaryGraphics;
                setExcludeUnnecessaryGraphics(next);
                if (next) {
                  setIncludeWatermark(false);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                excludeUnnecessaryGraphics
                  ? 'bg-emerald-600/90 text-white border-emerald-400 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="When active, omits unnecessary watermarks and decorative artifacts while retaining technical reports and single line diagrams"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{excludeUnnecessaryGraphics ? 'Clean Reports & SLD (No Watermarks)' : 'Include Watermarks'}</span>
            </button>

            {/* Per-Page Settings Toggle Button */}
            <button
              type="button"
              onClick={() => setShowPrintSettings(!showPrintSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                showPrintSettings
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
              title="Configure Per-Page Print Settings, Page Breaks, Orientation and Layout"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Settings</span>
              <span className="bg-slate-950/80 text-amber-300 px-1.5 py-0.2 rounded text-[10px] font-mono">
                {pageBreakMode === 'page_per_section' ? '1 Page/Sec' : 'Continuous'} · {enabledPagesCount} pgs
              </span>
              {showPrintSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Export numerical data as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Direct Export to PDF Button */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900/60 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Export reports and single line diagrams directly to multi-page PDF (1 report per page)"
            >
              {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isGeneratingPdf ? 'Exporting PDF...' : 'Export to PDF'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => handlePrint(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Print reports and single line diagrams (1 report per page with official footers)"
            >
              <Printer className="w-4 h-4" />
              <span>Print (1 Page / Report)</span>
            </button>

            {/* Maximize / Restore Screen Button */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title={isMaximized ? "Restore Window View" : "Maximize Screen View"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================
            COLLAPSIBLE PER-PAGE PRINT SETTINGS CONTROL PANEL
           ======================================================== */}
        {showPrintSettings && (
          <div className="bg-slate-950 text-white p-5 border-b border-slate-800 space-y-4 no-print animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                  Per-Page Print & PDF Customization Suite
                </h3>
              </div>
              
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px] mr-1">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('bifurcation_only')}
                  className={`px-2.5 py-1 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all ${
                    displayMode === 'bifurcation_4_statements'
                      ? 'bg-purple-600 text-white shadow-xs border border-purple-400'
                      : 'bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-600'
                  }`}
                  title="Export only the Line Bifurcation & T-2 node statements"
                >
                  <Split className="w-3.5 h-3.5 text-purple-300" />
                  <span>Bifurcation Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('single_page')}
                  className={`px-2.5 py-1 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all ${
                    printScale === 'compact' && pageBreakMode === 'compact_flow'
                      ? 'bg-purple-600 text-white shadow-xs border border-purple-400'
                      : 'bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-600'
                  }`}
                  title="Shrink all report sections to fit onto a single page with compact fonts and continuous layout"
                >
                  <Shrink className="w-3.5 h-3.5 text-purple-300" />
                  <span>Single Page View</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('informative_only')}
                  className={`px-2.5 py-1 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all ${
                    excludeUnnecessaryGraphics && !pagesToPrint.singleLineDiagram
                      ? 'bg-emerald-600 text-white shadow-xs border border-emerald-400 ring-1 ring-emerald-400'
                      : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-600'
                  }`}
                  title="Recommended: Only prints informative data tables, specs, bifurcation node analyses, and financial figures without heavy graphics"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>★ Informative Data Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('all')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer font-medium text-[11px]"
                >
                  Full Dossier (with SLD)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('bifurcation_only')}
                  className="px-2.5 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/80 cursor-pointer font-bold text-[11px] flex items-center gap-1"
                >
                  <Split className="w-3 h-3 text-purple-300" />
                  <span>Bifurcation 6-Node Statements</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('sld_only')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-800/80 cursor-pointer font-medium text-[11px]"
                >
                  SLD Blueprint (Landscape)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('tri_sld_only')}
                  className="px-2.5 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-600/80 cursor-pointer font-bold text-[11px] flex items-center gap-1"
                >
                  <Columns className="w-3 h-3 text-indigo-300" />
                  <span>3 SLD Schemes (Exist, P-1, P-2)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('forms_only')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-800/80 cursor-pointer font-medium text-[11px]"
                >
                  image1 + image2 Forms Only
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('summary_matrix')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/80 cursor-pointer font-medium text-[11px]"
                >
                  Summary & Matrix Only
                </button>
              </div>
            </div>

            {/* Print Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Setting 1: Page Break Mode */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="text-slate-200 font-bold block flex items-center justify-between">
                  <span>1. Page Break Behavior</span>
                  <span className="text-[10px] font-mono text-amber-400 font-normal">break-before: page</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPageBreakMode('page_per_section')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      pageBreakMode === 'page_per_section'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-1 ring-amber-400/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-bold">1 Page Per Section</span>
                    <span className="text-[10px] text-slate-400 font-normal">Clean multi-page breaks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPageBreakMode('compact_flow')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      pageBreakMode === 'compact_flow'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-1 ring-amber-400/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-bold">Continuous Flow</span>
                    <span className="text-[10px] text-slate-400 font-normal">Compact, saves paper</span>
                  </button>
                </div>
              </div>

              {/* Setting 2: Page Orientation & Scale */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="text-slate-200 font-bold block flex items-center justify-between">
                  <span>2. Page Orientation & Scale</span>
                  <span className="text-[10px] font-mono text-amber-400 font-normal">@page {pageOrientation}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={pageOrientation}
                    onChange={(e) => setPageOrientation(e.target.value as PageOrientation)}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-xs text-amber-300 outline-none font-bold"
                  >
                    <option value="portrait">Portrait (Standard A4)</option>
                    <option value="landscape">Landscape (Wide SLD/Tables)</option>
                  </select>

                  <select
                    value={printScale}
                    onChange={(e) => setPrintScale(e.target.value as PrintScale)}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-xs text-amber-300 outline-none font-bold"
                  >
                    <option value="compact">Compact Font (85%)</option>
                    <option value="standard">Standard Font (100%)</option>
                    <option value="presentation">Large Presentation (115%)</option>
                  </select>
                </div>
              </div>

              {/* Setting 3: Header, Watermark & Verification Options */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="text-slate-200 font-bold block flex items-center justify-between">
                  <span>3. Informative Mode & Graphics Options</span>
                  <span className="text-[10px] font-mono text-amber-400 font-normal">Clean Report</span>
                </label>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={excludeUnnecessaryGraphics}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setExcludeUnnecessaryGraphics(checked);
                        if (checked) {
                          setIncludeWatermark(false);
                          setPagesToPrint(p => ({ ...p, singleLineDiagram: false }));
                        }
                      }}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                    />
                    <span className="font-bold text-emerald-300">Exclude Heavy Graphics & SVGs</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeWatermark && !excludeUnnecessaryGraphics}
                      disabled={excludeUnnecessaryGraphics}
                      onChange={(e) => setIncludeWatermark(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer disabled:opacity-40"
                    />
                    <span className={`font-bold ${excludeUnnecessaryGraphics ? 'text-slate-500 line-through' : 'text-amber-300'}`}>Logo Watermark</span>
                  </label>

                  {includeWatermark && !excludeUnnecessaryGraphics && (
                    <select
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-amber-300 outline-none"
                      title="Adjust watermark opacity"
                    >
                      <option value={0.04}>Subtle (4%)</option>
                      <option value={0.07}>Standard (7%)</option>
                      <option value={0.12}>Prominent (12%)</option>
                    </select>
                  )}

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={includePageHeaders}
                      onChange={(e) => setIncludePageHeaders(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <span>Header Stamp</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeSignatures}
                      onChange={(e) => setIncludeSignatures(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <span>Signature Blocks</span>
                  </label>
                </div>
              </div>

              {/* Setting 4: Diagram Scale Factor */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="text-slate-200 font-bold block flex items-center justify-between">
                  <span>4. SLD Fit-to-Page Scale Factor</span>
                  <span className="text-[10px] font-mono text-amber-400 font-normal">{Math.round(diagramScale * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.2"
                  step="0.05"
                  value={diagramScale}
                  onChange={(e) => setDiagramScale(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* Checklist of Pages / Sections to Print */}
            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Select Specific Pages / Sections to Include in Print / PDF:
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPagesToPrint({
                      summarySpecs: true,
                      bifurcationStatements: true,
                      singleLineDiagram: true,
                      inputFormImage1: true,
                      outputScheduleImage2: true,
                      table1Matrix: true,
                      recommendations: true
                    })}
                    className="text-amber-400 hover:underline font-medium cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setPagesToPrint({
                      summarySpecs: false,
                      bifurcationStatements: false,
                      singleLineDiagram: false,
                      inputFormImage1: false,
                      outputScheduleImage2: false,
                      table1Matrix: false,
                      recommendations: false
                    })}
                    className="text-slate-400 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
                {/* Page 1 */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.summarySpecs 
                    ? 'bg-amber-950/40 border-amber-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.summarySpecs}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, summarySpecs: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px]">Page 1</span>
                    <span className="text-[10px] text-slate-400">Executive Summary & Specs</span>
                  </div>
                </label>

                {/* Page 2: Bifurcation 4-Statements */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.bifurcationStatements 
                    ? 'bg-purple-950/40 border-purple-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.bifurcationStatements}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, bifurcationStatements: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-purple-300">Bifurcation</span>
                    <span className="text-[10px] text-slate-400">T-1 & T-2 4-Statements</span>
                  </div>
                </label>

                {/* Page 3: SLD */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.singleLineDiagram 
                    ? 'bg-indigo-950/40 border-indigo-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.singleLineDiagram}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, singleLineDiagram: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-indigo-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-indigo-300">SLD Map</span>
                    <span className="text-[10px] text-slate-400">Single Line Diagram</span>
                  </div>
                </label>

                {/* Page 4 */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.inputFormImage1 
                    ? 'bg-blue-950/40 border-blue-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.inputFormImage1}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, inputFormImage1: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-blue-500 focus:ring-blue-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-blue-300">Input Form</span>
                    <span className="text-[10px] text-slate-400">image1.png Spans</span>
                  </div>
                </label>

                {/* Page 5 */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.outputScheduleImage2 
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.outputScheduleImage2}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, outputScheduleImage2: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-emerald-300">Output Form</span>
                    <span className="text-[10px] text-slate-400">image2.png Loss Flow</span>
                  </div>
                </label>

                {/* Page 6 */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.table1Matrix 
                    ? 'bg-amber-950/40 border-amber-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.table1Matrix}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, table1Matrix: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-amber-300">Table 1</span>
                    <span className="text-[10px] text-slate-400">Upgradation Matrix</span>
                  </div>
                </label>

                {/* Page 7 */}
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  pagesToPrint.recommendations 
                    ? 'bg-purple-950/40 border-purple-500/60 text-white' 
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={pagesToPrint.recommendations}
                    onChange={(e) => setPagesToPrint(p => ({ ...p, recommendations: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-400 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-[11px] text-purple-300">Signatures</span>
                    <span className="text-[10px] text-slate-400">Directives & Seal</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Form Display View Selector Bar (no-print) */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden sm:inline">Form Display:</span>
            
            <button
              onClick={() => setDisplayMode('full_report')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'full_report'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Full Engineering Report</span>
            </button>

            <button
              onClick={() => setDisplayMode('bifurcation_4_statements')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'bifurcation_4_statements'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-300'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-purple-600" />
              <span>Line Bifurcation & T-2 (4 Node Statements)</span>
            </button>

            <button
              onClick={() => {
                setDisplayMode('single_line_diagram');
                setSldScheme('tri_scheme');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'single_line_diagram' && sldScheme === 'tri_scheme'
                  ? 'bg-emerald-700 text-white font-bold shadow-xs'
                  : 'bg-white text-emerald-950 hover:bg-emerald-50 border border-emerald-300'
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-emerald-600" />
              <span>3 SLD Schemes (Exist, P-1, P-2)</span>
            </button>

            <button
              onClick={() => setDisplayMode('single_line_diagram')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'single_line_diagram' && sldScheme !== 'tri_scheme'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-indigo-500" />
              <span>Single Line Diagram (SLD Print)</span>
            </button>

            <button
              onClick={() => setDisplayMode('input_form_image1')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'input_form_image1'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
              <span>Input Data Form (image1.png)</span>
            </button>

            <button
              onClick={() => setDisplayMode('output_schedule_image2')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'output_schedule_image2'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Calculated Output Form (image2.png)</span>
            </button>

            <button
              onClick={() => setDisplayMode('dual_form')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'dual_form'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-purple-500" />
              <span>Dual Side-by-Side Form</span>
            </button>

            <button
              onClick={() => setDisplayMode('table1_matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === 'table1_matrix'
                  ? 'bg-slate-900 text-amber-400 font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Table 1 Upgradation Matrix</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-500 hidden lg:block">
            Print Layout: <strong>{pageBreakMode === 'page_per_section' ? '1 Page Per Section' : 'Continuous'}</strong> ({pageOrientation})
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div 
          ref={printContentRef}
          className={`relative p-4 sm:p-8 lg:p-12 text-slate-900 space-y-8 bg-white overflow-y-auto flex-1 print:overflow-visible print:p-0 ${isMaximized ? 'w-full max-w-none' : 'max-w-6xl mx-auto'} ${scaleWrapperClass}`} 
          id="printable-report"
        >
          
          {/* Official PESCO - WAPDA Logo Watermark (repeats on every physical page in print view, and visible on-screen) - Only if not excluded */}
          {includeWatermark && !excludeUnnecessaryGraphics && (
            <>
              {/* Print Watermark: repeats on every physical page via CSS position: fixed with mix-blend-mode: multiply */}
              <div 
                aria-hidden="true" 
                className="print-watermark hidden print:flex items-center justify-center pointer-events-none select-none"
              >
                <img
                  src="/pesco-logo.svg"
                  alt="Official PESCO WAPDA Logo Watermark"
                  className="w-[500px] h-[500px] max-w-[75vw] max-h-[75vh] object-contain"
                />
              </div>

              {/* Screen Watermark: subtle background watermark behind content while viewing in report modal */}
              <div 
                aria-hidden="true" 
                className="screen-watermark no-print pointer-events-none select-none flex items-center justify-center"
              >
                <img
                  src="/pesco-logo.svg"
                  alt="Official PESCO WAPDA Logo Watermark"
                  className="w-[460px] h-[460px] max-w-[65vw] max-h-[65vh] object-contain"
                />
              </div>
            </>
          )}

          {/* ========================================================
              REPORT 1: EXECUTIVE ENGINEERING SUMMARY & SPECIFICATIONS
             ======================================================== */}
          {pagesToPrint.summarySpecs && (displayMode === 'full_report' || displayMode === 'input_form_image1' || displayMode === 'table1_matrix') && (
            <div className="print-page-unit flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {renderOfficialHeader('Feeder Loading, Transformer Overloading, Line Losses & Upgradation Study', getPageInfo('summarySpecs').pageLabel, true)}
                
                {/* Section 1: Feeder & Network Specifications */}
                <div className="print-avoid-break">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 bg-slate-100 p-2 border-l-4 border-amber-500 flex items-center justify-between">
                    <span>1. Network & Feeder Electrical Specifications</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">Base Voltage: {summary.baseVoltage}V</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <span className="text-slate-500 block text-[11px]">Feeder Name:</span>
                      <span className="font-bold text-slate-900">{feeder.name}</span>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <span className="text-slate-500 block text-[11px]">Grid Substation:</span>
                      <span className="font-bold text-slate-900">{feeder.substationName}</span>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <span className="text-slate-500 block text-[11px]">Transformer Capacity:</span>
                      <span className="font-mono font-bold text-slate-900">{currentTrfKva} kVA</span>
                      <span className={`text-[10px] font-bold block ${isTrfOverloaded ? 'text-rose-600' : 'text-emerald-700'}`}>
                        ({currentTrfLoading}% {isTrfOverloaded ? 'OVERLOADED' : 'NORMAL'})
                      </span>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <span className="text-slate-500 block text-[11px]">Connected Consumers:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {summary.totalSinglePhaseCustomers} (1Φ) + {summary.totalThreePhaseCustomers} (3Φ)
                      </span>
                      <span className="text-[10px] text-slate-500 block">Total: {summary.totalSinglePhaseCustomers + summary.totalThreePhaseCustomers}</span>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <span className="text-slate-500 block text-[11px]">Total Circuit Length:</span>
                      <span className="font-mono font-bold text-slate-900">{summary.totalCircuitLengthKm} km ({Math.round(summary.totalCircuitLengthKm * 1000)} m)</span>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <span className="text-slate-500 block text-[11px]">Feeder Peak Demand:</span>
                      <span className="font-mono font-bold text-slate-900">{summary.totalSystemDemandKva} kVA ({summary.totalSourceCurrentAmps} A)</span>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <span className="text-slate-500 block text-[11px]">Power Factor / Load Factor:</span>
                      <span className="font-mono font-bold text-slate-900">{summary.operatingPowerFactor} / {(summary.loadFactor * 100).toFixed(0)}% (LLF: {summary.lossLoadFactor})</span>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <span className="text-slate-500 block text-[11px]">Total Line Loss & Ratio:</span>
                      <span className="font-mono font-bold text-amber-700">{summary.totalLineLossKw} kW ({summary.percentPowerLoss}%)</span>
                    </div>
                  </div>
                </div>

                {/* Section 1B: Informative Topology Summary Table */}
                <div className="print-avoid-break">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-indigo-600 flex items-center justify-between">
                    <span>2. Network Topology & Line Bifurcation Architecture</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">Informative Data Summary</span>
                  </h2>
                  <div className="overflow-x-auto print:overflow-visible border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left border-collapse font-mono">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2">Line Segment / Zone</th>
                          <th className="p-2">Substation / Injection Node</th>
                          <th className="p-2">Rating (kVA)</th>
                          <th className="p-2">Spans & Length</th>
                          <th className="p-2">Peak Current</th>
                          <th className="p-2">Max Voltage Drop</th>
                          <th className="p-2">Operational Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-2 font-bold text-slate-900 font-sans">
                            Exist Line (Baseline Feeder)
                          </td>
                          <td className="p-2">Node 0.0 (Main Substation)</td>
                          <td className="p-2">{summary.existingTransformerKva} kVA</td>
                          <td className="p-2">{feeder.segments.length} spans ({Math.round(summary.totalCircuitLengthKm * 1000)}m)</td>
                          <td className="p-2">{summary.totalSourceCurrentAmps} A</td>
                          <td className={`p-2 font-bold ${summary.worstVoltageDropPercent > 9 ? 'text-rose-600' : 'text-slate-900'}`}>
                            -{summary.worstVoltageDropPercent.toFixed(1)}%
                          </td>
                          <td className="p-2 font-sans text-[11px] text-slate-600">
                            {summary.existingTransformerKva < summary.totalSystemDemandKva ? 'Overloaded Radial' : 'Standard Feed'}
                          </td>
                        </tr>
                        {effectiveBifurcationConfig.enabled && (
                          <>
                            <tr className="bg-blue-50/40">
                              <td className="p-2 font-bold text-blue-900 font-sans">
                                Proposed-1 Line (Main T-1 Zone)
                              </td>
                              <td className="p-2">Node 0.0 (Upstream Trunk)</td>
                              <td className="p-2">{summary.existingTransformerKva} kVA</td>
                              <td className="p-2">Upstream to Node {effectiveBifurcationConfig.bifurcationNodeId}</td>
                              <td className="p-2">
                                {bifurcationDossier.t1Year0?.currentAmps || summary.totalSourceCurrentAmps} A
                              </td>
                              <td className="p-2 font-bold text-blue-900">
                                -{bifurcationDossier.t1Year0?.worstVoltageDropPercent || '0.0'}%
                              </td>
                              <td className="p-2 font-sans text-[11px] text-emerald-700 font-semibold">
                                Relieved (Normal Load)
                              </td>
                            </tr>
                            <tr className="bg-purple-50/40">
                              <td className="p-2 font-bold text-purple-900 font-sans">
                                Proposed-2 Line (New T-2 Zone)
                              </td>
                              <td className="p-2">
                                Node {effectiveBifurcationConfig.transformerNodeId || effectiveBifurcationConfig.bifurcationNodeId} (New Substation)
                              </td>
                              <td className="p-2 font-bold text-purple-900">{effectiveBifurcationConfig.transformerCapacityKva} kVA</td>
                              <td className="p-2">Cut-off isolated downstream zone</td>
                              <td className="p-2">
                                {bifurcationDossier.t2Year0?.currentAmps || '0'} A
                              </td>
                              <td className="p-2 font-bold text-purple-900">
                                -{bifurcationDossier.t2Year0?.worstVoltageDropPercent || '0.0'}%
                              </td>
                              <td className="p-2 font-sans text-[11px] text-emerald-700 font-semibold">
                                Tail End Stabilized
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {renderOfficialFooter('1. Feeder Electrical Specifications & System Demand Summary', 'summarySpecs')}
            </div>
          )}

          {/* ========================================================
              REPORT 2: FORM DISPLAY A - INPUT DATA SCHEDULE (image1.png)
             ======================================================== */}
          {pagesToPrint.inputFormImage1 && (displayMode === 'full_report' || displayMode === 'input_form_image1' || displayMode === 'dual_form') && (
            <div className="print-page-unit flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {renderOfficialHeader('Form Display A: Feeder Spans Input Data Schedule (Ref. image1.png)', getPageInfo('inputFormImage1').pageLabel)}
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-blue-600 flex items-center justify-between">
                  <span>FORM DISPLAY A: FEEDER SPANS INPUT DATA TABLE (image1.png)</span>
                  <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {summary.segmentResults.length} Spans Loaded · {getPageInfo('inputFormImage1').pageLabel}
                  </span>
                </h2>
                <p className="text-xs text-slate-600 mb-2">
                  As recorded in WAPDA field survey for Gulbhar Colony Feeder (Ref. image1.png):
                </p>
                
                <div className="overflow-x-auto print:overflow-visible border border-slate-300 rounded-lg print:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                        <th className="py-2 px-2 text-center w-8">#</th>
                        <th className="py-2 px-2.5 text-center">Zone</th>
                        <th className="py-2 px-3 text-center">From Node</th>
                        <th className="py-2 px-3 text-center">To Node</th>
                        <th className="py-2 px-3 text-right">Length (km)</th>
                        <th className="py-2 px-3 text-right">Length (m)</th>
                        <th className="py-2 px-3 text-right">3-Ph Customer</th>
                        <th className="py-2 px-3 text-right">1-Ph Customer</th>
                        <th className="py-2 px-3 text-left">Conductor Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                      {summary.segmentResults.map((seg, idx) => (
                        <tr key={seg.segment.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="py-1.5 px-2 text-center text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 text-center font-sans">
                            {seg.fedByTransformer === 'T2' ? (
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-900">
                                T-2 Added
                              </span>
                            ) : (
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-900">
                                T-1 Main
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-center font-bold text-slate-900">{seg.fromNodeId.replace('.0', '')}</td>
                          <td className="py-1.5 px-3 text-center font-bold text-slate-900">{seg.toNodeId.replace('.0', '')}</td>
                          <td className="py-1.5 px-3 text-right font-medium">{seg.lengthKm.toFixed(3)}</td>
                          <td className="py-1.5 px-3 text-right">{seg.lengthMeters}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-purple-700">{seg.threePhaseCustomers}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">{seg.singlePhaseCustomers}</td>
                          <td className="py-1.5 px-3 text-left font-semibold text-slate-800 font-sans">{seg.conductor.code}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold font-mono">
                        <td colSpan={4} className="py-2 px-3 text-center text-amber-400 uppercase tracking-wider font-sans text-xs">
                          TOTALS
                        </td>
                        <td className="py-2 px-3 text-right text-amber-300">
                          {summary.totalCircuitLengthKm.toFixed(3)} km
                        </td>
                        <td className="py-2 px-3 text-right">
                          {Math.round(summary.totalCircuitLengthKm * 1000)} m
                        </td>
                        <td className="py-2 px-3 text-right text-purple-300">
                          {summary.totalThreePhaseCustomers}
                        </td>
                        <td className="py-2 px-3 text-right text-amber-300">
                          {summary.totalSinglePhaseCustomers}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-sans text-xs">
                          {summary.segmentResults.length} Spans
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {renderOfficialFooter('2. Form Display A: Feeder Spans Input Schedule', 'inputFormImage1')}
            </div>
          )}

          {/* ========================================================
              REPORT 3: FORM DISPLAY B - CALCULATED LOAD FLOW & LOSS (image2.png)
             ======================================================== */}
          {pagesToPrint.outputScheduleImage2 && (displayMode === 'full_report' || displayMode === 'output_schedule_image2' || displayMode === 'dual_form') && (
            <div className="print-page-unit flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {renderOfficialHeader('Form Display B: Calculated Segment Load Flow & Loss Schedule (Ref. image2.png)', getPageInfo('outputScheduleImage2').pageLabel)}
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-emerald-600 flex items-center justify-between">
                  <span>FORM DISPLAY B: CALCULATED SEGMENT LOAD FLOW & LOSS SCHEDULE (image2.png)</span>
                  <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Line Loss: {summary.totalLineLossKw} kW · {getPageInfo('outputScheduleImage2').pageLabel}
                  </span>
                </h2>
                <p className="text-xs text-slate-600 mb-2">
                  Calculated using WAPDA ELR radial distribution algorithm (Ref. image2.png):
                </p>

                <div className="overflow-x-auto print:overflow-visible border border-slate-300 rounded-lg print:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                        <th className="py-2 px-2 text-center w-8">#</th>
                        <th className="py-2 px-2 text-center">Zone</th>
                        <th className="py-2 px-2 text-center">From</th>
                        <th className="py-2 px-2 text-center">To</th>
                        <th className="py-2 px-2 text-right">Length (km)</th>
                        <th className="py-2 px-2 text-right">Length (m)</th>
                        <th className="py-2 px-2 text-right">Cust (3Φ/1Φ)</th>
                        <th className="py-2 px-2 text-left">Code</th>
                        <th className="py-2 px-2 text-right bg-blue-50/80 font-bold text-blue-950">Current (A)</th>
                        <th className="py-2 px-2 text-right bg-purple-50/80 font-bold text-purple-950">Loading %</th>
                        <th className="py-2 px-2 text-right bg-rose-50/80 font-bold text-rose-950">Volt Drop %</th>
                        <th className="py-2 px-2 text-right">Voltage (V)</th>
                        <th className="py-2 px-2 text-right bg-amber-50/80 font-bold text-amber-950">Loss (kW)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                      {summary.segmentResults.map((seg, idx) => (
                        <tr key={seg.segment.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="py-1.5 px-2 text-center text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 text-center font-sans">
                            {seg.fedByTransformer === 'T2' ? (
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-900">
                                T-2 Added
                              </span>
                            ) : (
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-900">
                                T-1 Main
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-center font-bold text-slate-900">{seg.fromNodeId.replace('.0', '')}</td>
                          <td className="py-1.5 px-3 text-center font-bold text-slate-900">{seg.toNodeId.replace('.0', '')}</td>
                          <td className="py-1.5 px-2 text-right">{seg.lengthKm.toFixed(3)}</td>
                          <td className="py-1.5 px-2 text-right">{seg.lengthMeters}</td>
                          <td className="py-1.5 px-2 text-right text-slate-700">
                            {seg.threePhaseCustomers} / {seg.singlePhaseCustomers}
                          </td>
                          <td className="py-1.5 px-2 text-left font-sans text-slate-800">{seg.conductor.code}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-blue-700 bg-blue-50/30">
                            {seg.currentAmps.toFixed(1)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold bg-purple-50/30">
                            <span className={seg.percentLoading >= 70 ? 'text-amber-700' : 'text-slate-800'}>
                              {seg.percentLoading}%
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold bg-rose-50/30 text-rose-700">
                            {seg.percentVoltDrop.toFixed(1)}%
                          </td>
                          <td className="py-1.5 px-2 text-right font-semibold text-slate-900">
                            {seg.receivingVoltage.toFixed(1)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-amber-700 bg-amber-50/30">
                            {seg.lineLossKw.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold font-mono">
                        <td colSpan={4} className="py-2.5 px-2 text-center text-amber-400 uppercase tracking-wider font-sans text-xs">
                          TOTALS & PEAKS
                        </td>
                        <td className="py-2.5 px-2 text-right text-amber-300">
                          {summary.totalCircuitLengthKm.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {Math.round(summary.totalCircuitLengthKm * 1000)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-purple-300">
                          {summary.totalThreePhaseCustomers} / {summary.totalSinglePhaseCustomers}
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 font-sans text-xs">Max</td>
                        <td className="py-2.5 px-2 text-right text-blue-300 font-bold">
                          {summary.totalSourceCurrentAmps} A
                        </td>
                        <td className="py-2.5 px-2 text-right text-purple-300 font-bold">
                          85%
                        </td>
                        <td className="py-2.5 px-2 text-right text-rose-300 font-bold">
                          -{summary.worstVoltageDropPercent}%
                        </td>
                        <td className="py-2.5 px-2 text-right text-white">
                          {summary.worstVoltageVolts} V
                        </td>
                        <td className="py-2.5 px-2 text-right text-amber-300 font-extrabold text-sm">
                          {summary.totalLineLossKw} kW
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {renderOfficialFooter('3. Form Display B: Calculated Segment Load Flow & Loss Schedule', 'outputScheduleImage2')}
            </div>
          )}

          {/* ========================================================
              REPORT 4: SINGLE LINE DIAGRAM (SLD) SCHEMATIC BLUEPRINT
             ======================================================== */}
          {pagesToPrint.singleLineDiagram && (displayMode === 'full_report' || displayMode === 'single_line_diagram' || displayMode === 'tri_sld_schemes') && (
            (sldScheme === 'tri_scheme' || displayMode === 'tri_sld_schemes') && pageBreakMode === 'page_per_section' ? (
              <>
                {/* Scheme 1: Exist Line Map */}
                <div className="print-page-unit sld-blueprint-section flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {renderOfficialHeader('Single Line Diagram (SLD): Existing Feeder (Exist: Baseline)', `${getPageInfo('singleLineDiagram').pageLabel} (Part A)`)}
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-2.5 rounded-r-lg flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Network className="w-4 h-4 text-amber-700" />
                          <span>1. Existing Single Line Diagram (Baseline Feeder Topology)</span>
                        </h2>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Un-bifurcated radial network showing existing load, currents, conductor types, and baseline voltage profile.
                        </p>
                      </div>
                      <div className="no-print flex items-center gap-1 text-xs">
                        <span className="text-[10px] font-bold text-slate-500 mr-1">Scheme:</span>
                        <button
                          type="button"
                          onClick={() => setSldScheme('combined')}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-700 border border-slate-200 cursor-pointer"
                        >
                          Switch to Combined
                        </button>
                      </div>
                    </div>

                    <FeederSLDViewer
                      feeder={feeder}
                      summary={effectiveBifurcationConfig.enabled ? proposedSummary : summary}
                      existingSummary={summary}
                      scheme="exist"
                      theme="light"
                      isPrintView={true}
                      showMetrics={true}
                      diagramScale={diagramScale}
                    />
                  </div>
                  {renderOfficialFooter('4A. Existing Feeder Single Line Diagram', 'singleLineDiagram')}
                </div>

                {/* Scheme 2: Proposed-1 Line Map */}
                <div className="print-page-unit sld-blueprint-section flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {renderOfficialHeader('Single Line Diagram (SLD): Proposed-1 Line (Main Transformer T-1)', `${getPageInfo('singleLineDiagram').pageLabel} (Part B)`)}
                    <div className="bg-blue-50 border-l-4 border-blue-600 p-2.5 rounded-r-lg">
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Network className="w-4 h-4 text-blue-700" />
                        <span>2. Proposed-1 Single Line Diagram (Main Transformer T-1 Line Portion)</span>
                      </h2>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Relieved upstream line portion powered from Main Substation T-1 with downstream cut-off point isolated.
                      </p>
                    </div>

                    <FeederSLDViewer
                      feeder={feeder}
                      summary={effectiveBifurcationConfig.enabled ? proposedSummary : summary}
                      existingSummary={summary}
                      scheme="proposed_1"
                      theme="light"
                      isPrintView={true}
                      showMetrics={true}
                      diagramScale={diagramScale}
                    />
                  </div>
                  {renderOfficialFooter('4B. Proposed-1 Single Line Diagram (T-1 Zone)', 'singleLineDiagram')}
                </div>

                {/* Scheme 3: Proposed-2 Line Map */}
                <div className="print-page-unit sld-blueprint-section flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {renderOfficialHeader('Single Line Diagram (SLD): Proposed-2 Line (Additional Transformer T-2)', `${getPageInfo('singleLineDiagram').pageLabel} (Part C)`)}
                    <div className="bg-purple-50 border-l-4 border-purple-600 p-2.5 rounded-r-lg">
                      <h2 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Network className="w-4 h-4 text-purple-700" />
                        <span>3. Proposed-2 Single Line Diagram (Additional Transformer T-2 Bifurcated Portion)</span>
                      </h2>
                      <p className="text-[11px] text-purple-800 mt-0.5">
                        Newly injected tail zone powered from proposed Transformer Substation T-2, eliminating end-of-line voltage drops.
                      </p>
                    </div>

                    <FeederSLDViewer
                      feeder={feeder}
                      summary={effectiveBifurcationConfig.enabled ? proposedSummary : summary}
                      existingSummary={summary}
                      scheme="proposed_2"
                      theme="light"
                      isPrintView={true}
                      showMetrics={true}
                      diagramScale={diagramScale}
                    />
                  </div>
                  {renderOfficialFooter('4C. Proposed-2 Single Line Diagram (T-2 Zone)', 'singleLineDiagram')}
                </div>
              </>
            ) : (
              <div className="print-page-unit sld-blueprint-section flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {renderOfficialHeader('Single Line Diagram (SLD) Schematic & Network Topology Blueprint', getPageInfo('singleLineDiagram').pageLabel)}
                  <div className="bg-indigo-50 border-l-4 border-indigo-600 p-2.5 rounded-r-lg flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Network className="w-4 h-4 text-indigo-700" />
                        <span>Single Line Diagram (SLD) Topology & Bifurcation Schemes</span>
                      </h2>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Separate electrical single line diagrams for Existing (Exist: Baseline), Proposed-1 (T-1 Line Portion), and Proposed-2 (T-2 Bifurcated Line Portion).
                      </p>
                    </div>

                    {/* Scheme Switcher in Report Viewer (no-print) */}
                    <div className="no-print flex flex-wrap items-center gap-1 text-xs">
                      <span className="text-[10px] font-bold text-slate-500 mr-1">Scheme:</span>
                      <button
                        type="button"
                        onClick={() => setSldScheme('combined')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          sldScheme === 'combined' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        Combined
                      </button>
                      <button
                        type="button"
                        onClick={() => setSldScheme('exist')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          sldScheme === 'exist' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white text-amber-950 border border-amber-300'
                        }`}
                      >
                        Exist
                      </button>
                      <button
                        type="button"
                        onClick={() => setSldScheme('proposed_1')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          sldScheme === 'proposed_1' ? 'bg-blue-600 text-white font-bold' : 'bg-white text-blue-900 border border-blue-300'
                        }`}
                      >
                        Proposed-1
                      </button>
                      <button
                        type="button"
                        onClick={() => setSldScheme('proposed_2')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          sldScheme === 'proposed_2' ? 'bg-purple-600 text-white font-bold' : 'bg-white text-purple-900 border border-purple-300'
                        }`}
                      >
                        Proposed-2
                      </button>
                      <button
                        type="button"
                        onClick={() => setSldScheme('tri_scheme')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1 ${
                          sldScheme === 'tri_scheme' ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        <Columns className="w-3 h-3" />
                        <span>3-Scheme (Exist vs P-1 vs P-2)</span>
                      </button>
                    </div>
                  </div>

                  {/* Render SLD Diagrams */}
                  <FeederSLDViewer
                    feeder={feeder}
                    summary={effectiveBifurcationConfig.enabled ? proposedSummary : summary}
                    existingSummary={summary}
                    scheme={sldScheme}
                    theme="light"
                    isPrintView={true}
                    showMetrics={true}
                    diagramScale={diagramScale}
                  />
                </div>

                {renderOfficialFooter('4. Single Line Diagram (SLD) Engineering Blueprint', 'singleLineDiagram')}
              </div>
            )
          )}

          {/* ========================================================
              REPORT 5: LINE BIFURCATION & MULTI-ZONE STUDY
             ======================================================== */}
          {pagesToPrint.bifurcationStatements && (displayMode === 'full_report' || displayMode === 'bifurcation_4_statements') && (
            pageBreakMode === 'page_per_section' ? (
              <BifurcationStatementsPanel
                dossier={bifurcationDossier}
                currencySymbol={feeder.currencySymbol || 'PKR'}
                isPrintView={true}
                printSeparatePages={true}
                renderPrintHeader={(subTitle, pageLbl) => renderOfficialHeader(subTitle, pageLbl)}
              />
            ) : (
              <div className="print-page-unit flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {renderOfficialHeader('Line Bifurcation & Multi-Zone Study (Exist, Proposed-1 & Proposed-2 @ 0 & 5 Years)', getPageInfo('bifurcationStatements').pageLabel)}
                  <div className="bg-purple-50 border-l-4 border-purple-600 p-2.5 rounded-r-lg flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Split className="w-4 h-4 text-purple-700" />
                        <span>Line Bifurcation & Multi-Zone Study (Exist, Proposed-1, and Proposed-2 Lines @ 0 & 5 Years)</span>
                      </h2>
                      <p className="text-[11px] text-purple-800 mt-0.5">
                        Node-by-node technical analysis of Exist Line (Baseline), Proposed-1 Line (T-1 Zone), and Proposed-2 Line (T-2 Zone) at 0 Year and after 5 Years (+5% compounded growth).
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-purple-900 font-bold bg-purple-200/80 px-2 py-0.5 rounded border border-purple-300">
                      Cut-Off @ Node {bifurcationDossier.bifurcationNodeId} · T-2: {bifurcationDossier.additionalTransformerKva} kVA @ Node {bifurcationDossier.transformerNodeId || bifurcationDossier.bifurcationNodeId}
                    </span>
                  </div>

                  <BifurcationStatementsPanel
                    dossier={bifurcationDossier}
                    currencySymbol={feeder.currencySymbol || 'PKR'}
                    isPrintView={true}
                    printSeparatePages={false}
                  />
                </div>

                {renderOfficialFooter('5. Line Bifurcation & Multi-Zone 6-Node Technical Statements', 'bifurcationStatements')}
              </div>
            )
          )}

          {/* ========================================================
              REPORT 6: COMPARATIVE UPGRADATION & LOSS RELIEF MATRIX
             ======================================================== */}
          {pagesToPrint.table1Matrix && (displayMode === 'full_report' || displayMode === 'table1_matrix') && (
            <div className="print-page-unit flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {renderOfficialHeader('Comparative Upgradation & Loss Relief Matrix (WAPDA Study Table 1)', getPageInfo('table1Matrix').pageLabel)}
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-amber-500 flex items-center justify-between">
                  <span>Comparative Upgradation & Loss Relief Matrix (WAPDA Study Table 1)</span>
                  <span className="text-[10px] font-mono text-slate-500 font-normal">Economics: {feeder.currencySymbol || 'Rupees'} {tariff} / kWh · {getPageInfo('table1Matrix').pageLabel}</span>
                </h2>

                <div className="overflow-x-auto print:overflow-visible border border-slate-300 rounded-lg print:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                        <th className="p-2.5">Parameter</th>
                        <th className="p-2.5 text-right">Existing System</th>
                        <th className="p-2.5 text-right bg-emerald-50 text-emerald-950 font-bold">Proposed Upgraded</th>
                        <th className="p-2.5 text-right text-emerald-800">Benefits / Net Savings</th>
                        <th className="p-2.5 text-right">After 5 Years (Unmitigated)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                      {proposedSummary.bifurcationActive && (
                        <tr className="bg-purple-50/40">
                          <td className="p-2 font-sans font-semibold text-purple-900">Line Bifurcation & T-2 Substation</td>
                          <td className="p-2 text-right text-slate-500">None (Single Radial)</td>
                          <td className="p-2 text-right bg-purple-100/70 text-purple-950 font-bold">
                            Split @ Node {proposedSummary.bifurcationNodeId} (+{proposedSummary.additionalTransformerKva} kVA T-2)
                          </td>
                          <td className="p-2 text-right font-bold text-purple-800">
                            Relieved {proposedSummary.bifurcationReliefKva} kVA Load
                          </td>
                          <td className="p-2 text-right text-slate-400">N/A</td>
                        </tr>
                      )}
                      <tr>
                        <td className="p-2 font-sans font-semibold text-slate-800">Transformer Capacity (T-1)</td>
                        <td className="p-2 text-right">{currentTrfKva} kVA</td>
                        <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{proposedSummary.existingTransformerKva} kVA</td>
                        <td className="p-2 text-right font-sans text-emerald-700">
                          {proposedSummary.bifurcationActive ? 'T-1 Relieved by T-2 Substation' : 'Augmented to Match Load'}
                        </td>
                        <td className="p-2 text-right">{currentTrfKva} kVA</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans font-semibold text-slate-800">Main Transformer (T-1) Loading</td>
                        <td className="p-2 text-right font-bold text-rose-700">{currentTrfLoading}%</td>
                        <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent}%</td>
                        <td className="p-2 text-right font-bold text-emerald-700">
                          -{currentTrfLoading - (proposedSummary.transformer1LoadingPercent || proposedSummary.existingTransformerLoadingPercent)}% Overload Relieved
                        </td>
                        <td className="p-2 text-right font-bold text-rose-800">151%</td>
                      </tr>
                      {proposedSummary.bifurcationActive && (
                        <tr className="bg-purple-50/20">
                          <td className="p-2 font-sans font-semibold text-purple-900">Additional Transformer (T-2) Loading</td>
                          <td className="p-2 text-right text-slate-400">Not Installed</td>
                          <td className="p-2 text-right bg-purple-100/50 text-purple-950 font-bold">{proposedSummary.transformer2LoadingPercent}%</td>
                          <td className="p-2 text-right font-bold text-purple-800">
                            {proposedSummary.transformer2DemandKva} kVA on T-2 ({proposedSummary.additionalTransformerKva} kVA)
                          </td>
                          <td className="p-2 text-right text-slate-400">N/A</td>
                        </tr>
                      )}
                      <tr>
                        <td className="p-2 font-sans font-semibold text-slate-800">Peak Feeder Line Losses</td>
                        <td className="p-2 text-right">{summary.totalLineLossKw.toFixed(2)} kW</td>
                        <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{proposedSummary.totalLineLossKw.toFixed(2)} kW</td>
                        <td className="p-2 text-right font-bold text-emerald-700">
                          -{(summary.totalLineLossKw - proposedSummary.totalLineLossKw).toFixed(2)} kW
                        </td>
                        <td className="p-2 text-right font-bold">12.555 kW</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans font-semibold text-slate-800">Power Loss Ratio</td>
                        <td className="p-2 text-right">{summary.percentPowerLoss}%</td>
                        <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{proposedSummary.percentPowerLoss}%</td>
                        <td className="p-2 text-right font-bold text-emerald-700">
                          -{Math.max(0, summary.percentPowerLoss - proposedSummary.percentPowerLoss)}%
                        </td>
                        <td className="p-2 text-right">10%</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans font-semibold text-slate-800">Annual Energy Losses</td>
                        <td className="p-2 text-right">{summary.annualEnergyLossKwh.toLocaleString()} kWh</td>
                        <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">{proposedSummary.annualEnergyLossKwh.toLocaleString()} kWh</td>
                        <td className="p-2 text-right font-bold text-emerald-700">
                          -{kwhSaved.toLocaleString()} kWh / yr
                        </td>
                        <td className="p-2 text-right font-bold">30,445 kWh</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans font-semibold text-slate-800">Worst Voltage Drop</td>
                        <td className="p-2 text-right font-semibold text-rose-700">-{summary.worstVoltageDropPercent}%</td>
                        <td className="p-2 text-right bg-emerald-50 text-emerald-900 font-bold">-{proposedSummary.worstVoltageDropPercent}%</td>
                        <td className="p-2 text-right font-bold text-emerald-700">
                          +{(summary.worstVoltageDropPercent - proposedSummary.worstVoltageDropPercent).toFixed(1)}% Boosted
                        </td>
                        <td className="p-2 text-right font-bold text-rose-800">-14.8%</td>
                      </tr>
                      <tr className="bg-slate-100 font-bold">
                        <td className="p-2 font-sans text-slate-900">Financial Revenue Impact</td>
                        <td className="p-2 text-right text-slate-900">
                          {feeder.currencySymbol} {Math.round(summary.annualEnergyLossKwh * tariff).toLocaleString()}
                        </td>
                        <td className="p-2 text-right bg-emerald-100 text-emerald-950 font-bold">
                          {feeder.currencySymbol} {Math.round(proposedSummary.annualEnergyLossKwh * tariff).toLocaleString()}
                        </td>
                        <td className="p-2 text-right text-emerald-800 font-bold font-sans">
                          +{feeder.currencySymbol} {annualSavings.toLocaleString()} / YEAR
                        </td>
                        <td className="p-2 text-right text-rose-900">
                          {feeder.currencySymbol} {Math.round(30445 * tariff).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {renderOfficialFooter('6. Comparative Upgradation & Loss Relief Matrix', 'table1Matrix')}
            </div>
          )}

          {/* ========================================================
              REPORT 7: DIRECTIVES & OFFICIAL APPROVALS CHAIN
             ======================================================== */}
          {(pagesToPrint.recommendations || includeSignatures) && (displayMode === 'full_report') && (
            <div className="print-page-unit flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {renderOfficialHeader('Priority Engineering Remediation Directives & Approvals', getPageInfo('recommendations').pageLabel)}
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 bg-slate-100 p-2 border-l-4 border-amber-500">
                  4. Priority Engineering Remediation Directives
                </h2>
                <div className="space-y-2.5">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="border border-slate-200 p-3 rounded-lg text-xs bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">
                          Directive 4.{i + 1}: {rec.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          rec.category === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rec.category}
                        </span>
                      </div>
                      <p className="text-slate-600 mb-1">{rec.description}</p>
                      <p className="text-slate-900 font-semibold bg-slate-50 p-1.5 rounded border border-slate-200">
                        Standard Operating Action: {rec.suggestedAction}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Section 7: Official Approvals & Signatures */}
                {includeSignatures && (
                  <div className="pt-4 border-t-2 border-slate-900 print-avoid-break">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span>Official Verification, Endorsement & Approval Chain</span>
                      <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Active Officer: <strong>{officerTitle}</strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs">
                      <div className={`p-3 rounded-xl border ${isSdoMatch ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40' : 'bg-slate-50/50 border-slate-200'}`}>
                        <div className="h-10 border-b border-dashed border-slate-400 mb-2 flex items-center justify-center">
                          {isSdoMatch && (
                            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                              ✓ Endorsed by Active Officer
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900 block">Sub-Divisional Officer (SDO)</span>
                        <span className="text-slate-500 text-[11px]">Gulbhar Sub-Division · PESCO/WAPDA</span>
                        {isSdoMatch && (
                          <span className="text-[10px] font-bold text-amber-800 block mt-1">
                            ({officerTitle})
                          </span>
                        )}
                      </div>

                      <div className={`p-3 rounded-xl border ${isXenMatch ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40' : 'bg-slate-50/50 border-slate-200'}`}>
                        <div className="h-10 border-b border-dashed border-slate-400 mb-2 flex items-center justify-center">
                          {isXenMatch && (
                            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                              ✓ Endorsed by Active Officer
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900 block">Executive Engineer (XEN)</span>
                        <span className="text-slate-500 text-[11px]">Peshawar City Division</span>
                        {isXenMatch && (
                          <span className="text-[10px] font-bold text-amber-800 block mt-1">
                            ({officerTitle})
                          </span>
                        )}
                      </div>

                      <div className={`p-3 rounded-xl border ${isSeMatch ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40' : 'bg-slate-50/50 border-slate-200'}`}>
                        <div className="h-10 border-b border-dashed border-slate-400 mb-2 flex items-center justify-center">
                          {isSeMatch && (
                            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                              ✓ Endorsed by Active Officer
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900 block">
                          Superintending Engineer / Planning
                        </span>
                        <span className="text-slate-500 text-[11px]">Planning, Design & ELR Directorate</span>
                        {isSeMatch && (
                          <span className="text-[10px] font-bold text-amber-800 block mt-1">
                            ({officerTitle})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {renderOfficialFooter('7. Official Engineering Remediation Directives & Final Approval Chain', 'recommendations', 'Official Endorsement Signed')}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 no-print">
          <div className="flex items-center gap-2">
            <span>Mode:</span>
            <span className="font-semibold text-slate-900">
              {excludeUnnecessaryGraphics ? 'Informative Data Only (Graphics Omitted)' : 'Full Graphical Dossier'}
            </span>
            <span>·</span>
            <span>Layout: <strong>{pageBreakMode === 'page_per_section' ? 'Page-by-Page' : 'Compact Continuous'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900/60 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isGeneratingPdf ? 'Rendering PDF...' : 'Export to PDF'}</span>
            </button>
            <button
              onClick={() => handlePrint(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier (1 Page / Report)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
