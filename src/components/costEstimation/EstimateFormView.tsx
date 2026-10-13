/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  CostEstimateRecord, 
  EstimateType, 
  EstimateLineDetails, 
  EstimateItem, 
  MaterialItem, 
  DesignFactorsConfig, 
  ConstructionTemplate, 
  CalculationStep,
  EstimateStatus,
  UserRole,
  EstimateCharges
} from '../../types/costEstimation';
import { 
  calculateQuantitiesForLine, 
  calculateHtExtensionMiniEstimate,
  HtExtensionMiniEstimate,
  calculateLtExtensionMiniEstimate,
  LtExtensionMiniEstimate,
  computeEstimateCharges, 
  generateEstimateNumber, 
  exportEstimateToExcelWorkbook,
  generate11DigitWorkOrder,
  format11DigitWorkOrder,
  parse11DigitWorkOrder,
  WO_CIRCLE_CODES,
  WO_DIVISION_CODES,
  WO_SCHEME_CATEGORIES
} from '../../utils/costEngine';
import { calculateFoundationCharges } from '../../utils/foundationCharges';
import { DismantleMaterialSection } from './DismantleMaterialSection';
import { FoundationChargesSection } from './FoundationChargesSection';
import { 
  Plus, 
  Trash2, 
  Save, 
  FileSpreadsheet, 
  Printer, 
  ArrowLeft, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Layers, 
  Info, 
  Sliders, 
  Zap, 
  Truck, 
  ShieldCheck, 
  DollarSign,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  Eye,
  FileText,
  RefreshCw,
  X,
  Filter
} from 'lucide-react';

interface EstimateFormViewProps {
  initialEstimate?: CostEstimateRecord | null;
  estimates?: CostEstimateRecord[];
  materials: MaterialItem[];
  designFactors: DesignFactorsConfig;
  templates: ConstructionTemplate[];
  userRole: UserRole;
  userName: string;
  onSaveEstimate: (estimate: CostEstimateRecord) => void;
  onCancel: () => void;
  onPrintEstimate: (estimate: CostEstimateRecord, mode?: 'preview' | 'print' | 'pdf') => void;
  onSaveUnifiedProject?: () => void;
}

export const EstimateFormView: React.FC<EstimateFormViewProps> = ({
  initialEstimate,
  materials,
  designFactors,
  templates,
  userRole,
  userName,
  onSaveEstimate,
  onCancel,
  onPrintEstimate,
  onSaveUnifiedProject
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  // 1. Project Information State
  const [projectInfo, setProjectInfo] = useState({
    estimateNo: initialEstimate?.projectInfo.estimateNo || generateEstimateNumber('PESH'),
    revisionNo: initialEstimate?.projectInfo.revisionNo || 'Rev-00',
    estimateDate: initialEstimate?.projectInfo.estimateDate || new Date().toISOString().split('T')[0],
    workOrderNo: initialEstimate?.projectInfo.workOrderNo || generate11DigitWorkOrder({ categoryCode: '71' }),
    schemeCategory: initialEstimate?.projectInfo.schemeCategory || 'ELR',
    elrCode: initialEstimate?.projectInfo.elrCode || 'ELR-71-26-042',
    accountHead: initialEstimate?.projectInfo.accountHead || '4-71 ELR Capital Loss Reduction',
    division: initialEstimate?.projectInfo.division || 'Peshawar City',
    subDivision: initialEstimate?.projectInfo.subDivision || 'Gulbhar Sub-Division',
    circle: initialEstimate?.projectInfo.circle || 'Peshawar Circle-1',
    district: initialEstimate?.projectInfo.district || 'Peshawar',
    feederName: initialEstimate?.projectInfo.feederName || 'Gulbhar Colony 11kV Feeder',
    feederCode: initialEstimate?.projectInfo.feederCode || 'FDR-GLB-01',
    proposedLocation: initialEstimate?.projectInfo.proposedLocation || '',
    villageLocality: initialEstimate?.projectInfo.villageLocality || '',
    gpsLatitude: initialEstimate?.projectInfo.gpsLatitude || '34.0151 N',
    gpsLongitude: initialEstimate?.projectInfo.gpsLongitude || '71.5249 E',
    applicantDepartment: initialEstimate?.projectInfo.applicantDepartment || 'PESCO ELR Division / Operations',
    schemeProjectName: initialEstimate?.projectInfo.schemeProjectName || '',
    purposeOfWork: initialEstimate?.projectInfo.purposeOfWork || '',
    preparedBy: initialEstimate?.projectInfo.preparedBy || userName || 'Engr. M. Inayat',
    designation: initialEstimate?.projectInfo.designation || 'Sub-Divisional Officer (SDO)',
    checkedBy: initialEstimate?.projectInfo.checkedBy || 'Engr. Tariq Khan (XEN)',
    approvedBy: initialEstimate?.projectInfo.approvedBy || ''
  });

  // 2. Estimate Type State
  const [estimateType, setEstimateType] = useState<EstimateType>(initialEstimate?.type || 'HT_LINE_EXTENSION');
  const [status, setStatus] = useState<EstimateStatus>(initialEstimate?.status || 'DRAFT');

  // 3. Line Details State
  const [lineDetails, setLineDetails] = useState<EstimateLineDetails>(initialEstimate?.lineDetails || {
    htLengthKm: 1.5,
    ltLengthKm: 0.0,
    htPoles: 17,
    ltPoles: 0,
    staySets: 8,
    roadCrossings: 1,
    canalCrossings: 0,
    transformerStructures: 0,
    transformerCount: 0,
    transformerCapacityKva: 100,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'DOG',
    poleType: 'PCC',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC',
    autoCalculatedFlags: {
      htPoles: true,
      ltPoles: true,
      staySets: true
    }
  });

  // 4. BOQ Items State
  const [items, setItems] = useState<EstimateItem[]>(() => {
    if (initialEstimate?.items && initialEstimate.items.length > 0) {
      const is50Kva = Boolean(
        initialEstimate.lineDetails.is50KvaLumpSumPackage || 
        initialEstimate.lineDetails.transformerCapacityKva === 50 ||
        initialEstimate.projectInfo?.schemeProjectName?.includes('50 KVA') ||
        initialEstimate.projectInfo?.purposeOfWork?.includes('50 KVA')
      );
      if (is50Kva) {
        return initialEstimate.items.map(item => {
          if (item.materialCode === '08110' || item.description?.includes('25 KVA') || (item.materialCode === '08120' && item.unitRate !== 434200)) {
            return {
              ...item,
              id: 'item-08120',
              materialId: 'mat-trf-50kva',
              materialCode: '08120',
              description: 'TRANSFORMER 50 KVA',
              specification: 'Distribution Transformer 50 kVA 11/0.415 kV Copper Wound (WAPDA Code 08120)',
              unit: 'EA',
              quantity: 1,
              unitRate: 434200,
              materialAmount: 434200,
              labourRate: 0,
              labourAmount: 0,
              totalAmount: 434200,
              calculationNotes: '50 kVA Transformer Installation Schedule item: 10% Labour Cost applied'
            };
          }
          return {
            ...item,
            labourRate: 0,
            labourAmount: 0,
            totalAmount: item.materialAmount
          };
        }).filter(i => {
          if (i.id === 'item-stay-ext' || i.id?.endsWith('-ext')) return true;
          return i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD');
        });
      }
      if (initialEstimate.lineDetails.is25KvaLumpSumPackage || initialEstimate.lineDetails.transformerCapacityKva === 25) {
        return initialEstimate.items.map(item => ({
          ...item,
          labourRate: 0,
          labourAmount: 0,
          totalAmount: item.materialAmount
        })).filter(i => {
          if (i.id === 'item-stay-ext' || i.id?.endsWith('-ext')) return true;
          return i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD');
        });
      }
      return initialEstimate.items.map(item => ({
        ...item,
        labourRate: 0,
        labourAmount: 0,
        totalAmount: item.materialAmount
      }));
    }
    // Start with empty array
    return [];
  });

  // Dismantle Items State
  const [dismantleItems, setDismantleItems] = useState<EstimateItem[]>(initialEstimate?.items?.filter(i => i.remarks?.includes('Dismantle')) || []);


  // 5. Calculation Steps Transparency
  const [calculationSteps, setCalculationSteps] = useState<CalculationStep[]>(initialEstimate?.calculationSteps || []);
  const [showCalculationDrawer, setShowCalculationDrawer] = useState(false);

  // 6. Transportation & Overheads State
  const [transportSettings, setTransportSettings] = useState(initialEstimate?.transportationSettings || {
    method: 'PER_KM' as const,
    distanceKm: 25,
    ratePerKm: designFactors.transportRatePerKmDefault || 180,
    loadingUnloadingFixed: 15000,
    vehicleType: 'Heavy Truck'
  });

  const [percentages, setPercentages] = useState<{
    labourPercent: number;
    engineeringPercent: number;
    contingencyPercent: number;
    departmentalPercent: number;
    contractorPercent: number;
    taxPercent: number;
    otherChargesFixed: number;
    overheadBasis?: 'MATERIAL' | 'PRIME_COST';
  }>({
    labourPercent: initialEstimate?.charges.labourPercent ?? 0.0,
    engineeringPercent: initialEstimate?.charges.engineeringChargesPercent ?? 0.0,
    contingencyPercent: initialEstimate?.charges.contingencyPercent ?? 0.0,
    departmentalPercent: initialEstimate?.charges.departmentalOverheadPercent ?? 0.0,
    contractorPercent: initialEstimate?.charges.contractorOverheadPercent ?? 0.0,
    taxPercent: initialEstimate?.charges.taxGstPercent ?? 0.0,
    otherChargesFixed: initialEstimate?.charges.otherChargesAmount ?? 0,
    overheadBasis: initialEstimate?.charges.overheadBasis
  });

  const [isDismantleDeducted, setIsDismantleDeducted] = useState(true);

  // Material search / adder state
  const [selectedMaterialToAdd, setSelectedMaterialToAdd] = useState<string>('');
  const [materialSearchText, setMaterialSearchText] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>('ALL');
  const [tableFilterQuery, setTableFilterQuery] = useState('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogModalSearch, setCatalogModalSearch] = useState('');
  const [catalogModalCategory, setCatalogModalCategory] = useState<string>('ALL');
  const [recentlyAddedCode, setRecentlyAddedCode] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState('');
  const [activePresetKey, setActivePresetKey] = useState<string | null>(null);
  const [lastAppliedPresetName, setLastAppliedPresetName] = useState<string | null>(null);

  // 11kV HT Extension Mini Estimate (WAPDA / DISCO 11kV Feeder Design Standard)
  const [showMiniEstModal, setShowMiniEstModal] = useState(false);
  const [showMiniEstBoqTable, setShowMiniEstBoqTable] = useState(true);

  const miniEstimate: HtExtensionMiniEstimate | null = useMemo(() => {
    if (!lineDetails.htExtensionMeters || lineDetails.htExtensionMeters <= 0) return null;
    return calculateHtExtensionMiniEstimate(lineDetails, designFactors, materials);
  }, [lineDetails, designFactors, materials]);

  const ltMiniEstimate: LtExtensionMiniEstimate | null = useMemo(() => {
    if (!lineDetails.ltExtensionMeters || lineDetails.ltExtensionMeters <= 0) return null;
    return calculateLtExtensionMiniEstimate(lineDetails, designFactors, materials);
  }, [lineDetails, designFactors, materials]);

  const transformerBaseTotal = useMemo(() => {
    const nonExtItems = items.filter(i => 
      !i.id.endsWith('-ext') && 
      i.id !== 'pole-ext' && 
      i.id !== 'ca-ext' && 
      i.id !== 'pin-ext' && 
      i.id !== 'gipin-ext' && 
      i.id !== 'disc-ext' && 
      i.id !== 'stay-ext' && 
      i.id !== 'danger-ext'
    );
    return nonExtItems.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  }, [items]);

  const handleApplyMiniEstimateToMainBoq = () => {
    if (!miniEstimate) return;
    // Remove old -ext items and replace with current miniEstimate items
    const nonExtItems = items.filter(i => 
      !i.id.endsWith('-ext') && 
      i.id !== 'pole-ext' && 
      i.id !== 'ca-ext' && 
      i.id !== 'pin-ext' && 
      i.id !== 'gipin-ext' && 
      i.id !== 'disc-ext' && 
      i.id !== 'stay-ext' && 
      i.id !== 'danger-ext'
    );
    const newItems = [...nonExtItems, ...miniEstimate.items];
    setItems(newItems);
    setSaveToast(`✅ 11kV HT Line Extension (${miniEstimate.meters}m, Rs. ${miniEstimate.grandTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}) merged into Project BOQ`);
    setTimeout(() => setSaveToast(''), 4500);
  };

  // Search filtered materials for the search bar popover
  const searchFilteredMaterials = useMemo(() => {
    if (!materialSearchText.trim()) return [];
    const q = materialSearchText.trim().toLowerCase();
    return materials.filter(m => {
      const matchText = 
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.specification && m.specification.toLowerCase().includes(q));
      const matchCat = materialCategoryFilter === 'ALL' || m.category === materialCategoryFilter;
      return matchText && matchCat;
    });
  }, [materials, materialSearchText, materialCategoryFilter]);

  // Search filtered materials for the full catalog browser modal
  const modalFilteredMaterials = useMemo(() => {
    const q = catalogModalSearch.trim().toLowerCase();
    return materials.filter(m => {
      const matchText = !q || 
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.specification && m.specification.toLowerCase().includes(q));
      const matchCat = catalogModalCategory === 'ALL' || m.category === catalogModalCategory;
      return matchText && matchCat;
    });
  }, [materials, catalogModalSearch, catalogModalCategory]);

  // BOQ items filtered by the table search query
  const filteredBoqItems = useMemo(() => {
    if (!tableFilterQuery.trim()) return items;
    const q = tableFilterQuery.trim().toLowerCase();
    return items.filter(i => 
      i.materialCode.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      (i.specification && i.specification.toLowerCase().includes(q))
    );
  }, [items, tableFilterQuery]);

  const [boqSegregationTab, setBoqSegregationTab] = useState<'all' | 'ht' | 'lt' | 'substation'>('all');

  const getMaterialSegregationType = (item: EstimateItem): 'ht' | 'lt' | 'substation' => {
    const desc = (item.description || '').toUpperCase();
    const code = (item.materialCode || '').toUpperCase();
    if (desc.includes('TRANSFORMER') || desc.includes('KVA') || desc.includes('SUB-STATION') || code.startsWith('08') || desc.includes('DROP OUT') || desc.includes('LIGHTNING ARRESTER') || desc.includes('EARTHING')) {
      return 'substation';
    }
    if (desc.includes('LT') || desc.includes('400V') || desc.includes('LOW TENSION') || desc.includes('RACCOON') || desc.includes('SPIDER') || desc.includes('SERVICE') || desc.includes('9 METER') || desc.includes('9.5M') || code.startsWith('1113')) {
      return 'lt';
    }
    if (desc.includes('HT') || desc.includes('11KV') || desc.includes('DOG') || desc.includes('RABBIT') || desc.includes('ANT') || desc.includes('H-TYPE') || desc.includes('PIN') || desc.includes('DISC') || desc.includes('CROSS ARM') || desc.includes('36 FEET') || code.startsWith('01110')) {
      return 'ht';
    }
    return 'ht';
  };

  const segregatedBoqItems = useMemo(() => {
    if (boqSegregationTab === 'all') return filteredBoqItems;
    return filteredBoqItems.filter(i => getMaterialSegregationType(i) === boqSegregationTab);
  }, [filteredBoqItems, boqSegregationTab]);

  const PRESET_COMBINATIONS = [
    {
      key: 'preset-25kva-transformer-lump-sum',
      label: '⚡ 25 KVA Transformer Installation (18-Item Lump Sum Package)',
      badgeColor: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-700 font-extrabold shadow-sm',
      activeRing: 'ring-2 ring-rose-400 ring-offset-1 font-black shadow-md',
      htLengthKm: 0,
      conductorSize: 'DOG',
      poleType: 'PCC',
      poleHeightMeters: 11,
      htPoles: 0,
      staySets: 0,
      is25KvaPackage: true,
      schemeName: 'Installation of 25 KVA Distribution Transformer Sub-Station (Lump Sum Package)'
    },
    {
      key: 'preset-50kva-transformer-lump-sum',
      label: '⚡ 50 KVA Transformer Installation (18-Item Lump Sum Package)',
      badgeColor: 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700 font-extrabold shadow-sm',
      activeRing: 'ring-2 ring-indigo-400 ring-offset-1 font-black shadow-md',
      htLengthKm: 0,
      conductorSize: 'DOG',
      poleType: 'PCC',
      poleHeightMeters: 11,
      htPoles: 0,
      staySets: 0,
      is50KvaPackage: true,
      schemeName: 'Installation of 50 KVA Distribution Transformer Sub-Station (Lump Sum Package)'
    },
    {
      key: 'preset-100kva-transformer-lump-sum',
      label: '⚡ 100 KVA Transformer Installation (20-Item Lump Sum Package)',
      badgeColor: 'bg-amber-600 hover:bg-amber-500 text-white border-amber-700 font-extrabold shadow-sm',
      activeRing: 'ring-2 ring-amber-400 ring-offset-1 font-black shadow-md',
      htLengthKm: 0,
      conductorSize: 'DOG',
      poleType: 'PCC',
      poleHeightMeters: 11,
      htPoles: 0,
      staySets: 0,
      is100KvaPackage: true,
      schemeName: 'Installation of 100 KVA Distribution Transformer Sub-Station (Lump Sum Package)'
    },
    {
      key: 'preset-200kva-transformer-lump-sum',
      label: '⚡ 200 KVA Transformer Installation (Lump Sum Package)',
      badgeColor: 'bg-purple-600 hover:bg-purple-500 text-white border-purple-700 font-extrabold shadow-sm',
      activeRing: 'ring-2 ring-purple-400 ring-offset-1 font-black shadow-md',
      htLengthKm: 0,
      conductorSize: 'WASP',
      poleType: 'PCC',
      poleHeightMeters: 11,
      htPoles: 0,
      staySets: 0,
      is200KvaPackage: true,
      schemeName: 'Installation of 200 KVA Distribution Transformer Sub-Station (Lump Sum Package)'
    },
    {
      key: 'preset-1km-ht-dog-h-type',
      label: '⚡ 1.0 KM HT Line + DOG Conductor + H-Type Steel Structures (Lump Sum)',
      badgeColor: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700 font-extrabold shadow-sm',
      activeRing: 'ring-2 ring-emerald-400 ring-offset-1 font-black shadow-md',
      htLengthKm: 1.0,
      conductorSize: 'DOG',
      poleType: 'H_STEEL_STRUCTURE',
      poleHeightMeters: 11,
      htPoles: 16,
      staySets: 8,
      is1KmHtDogHTypePackage: true,
      schemeName: 'Construction of 1.0 KM HT Line with DOG Conductor & H-Type Steel Structures (Lump Sum Package)'
    },
    {
      key: 'preset-4spans-dog-steel',
      label: '⚡ 4 Spans HT + Dog + Steel Structure Poles (34.8ft)',
      badgeColor: 'bg-amber-400 hover:bg-amber-300 text-slate-900 border-amber-500',
      activeRing: 'ring-2 ring-amber-500 ring-offset-1 font-black shadow-md',
      htLengthKm: 0.4,
      conductorSize: 'DOG',
      poleType: 'STEEL_STRUCTURE',
      poleHeightMeters: 11,
      htPoles: 4,
      staySets: 2,
      schemeName: '4 Spans HT Line (ACSR Dog Conductor on 34.8ft Steel Structure Poles)'
    }
  ];

  const handleSelectPreset = (preset: typeof PRESET_COMBINATIONS[0]) => {
    setActivePresetKey(preset.key);
    setLastAppliedPresetName(preset.label.replace('⚡ ', ''));

    if ((preset as any).is25KvaPackage) {
      setEstimateType('NEW_DISTRIBUTION_TRANSFORMER');
      const updatedLine: EstimateLineDetails = {
        ...lineDetails,
        htLengthKm: 0,
        ltLengthKm: 0,
        conductorSize: 'DOG',
        conductorType: 'ACSR',
        poleType: 'PCC',
        poleHeightMeters: 11,
        roadCrossings: 0,
        canalCrossings: 0,
        transformerCount: 1,
        transformerStructures: 1,
        transformerCapacityKva: 25,
        is25KvaLumpSumPackage: true,
        circuitsCount: 1,
        htPoles: 0,
        ltPoles: 0,
        staySets: 0,
        autoCalculatedFlags: {
          htPoles: true,
          ltPoles: true,
          staySets: false
        }
      };

      setLineDetails(updatedLine);

      setPercentages({
        labourPercent: 0.0,
        departmentalPercent: 0.0,
        contractorPercent: 0.0,
        engineeringPercent: 0.0,
        contingencyPercent: 0.0,
        taxPercent: 0.0,
        otherChargesFixed: 0,
        overheadBasis: 'MATERIAL'
      });

      setTransportSettings({
        method: 'FIXED',
        distanceKm: 0,
        ratePerKm: 0,
        loadingUnloadingFixed: 0,
        vehicleType: 'Standard Truck'
      });

      setProjectInfo(prev => ({
        ...prev,
        schemeProjectName: preset.schemeName,
        purposeOfWork: 'Installation of 25 KVA 11/0.415 kV Distribution Transformer with 18-item lump sum material list (Rs. 447,128.07), 10% Labour Cost (Rs. 44,712.81), and 16% Over Heads on material cost (Rs. 71,540.49). Net Cost: Rs. 563,381.37.'
      }));

      const res = calculateQuantitiesForLine('NEW_DISTRIBUTION_TRANSFORMER', updatedLine, designFactors, materials);
      setItems(res.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD')));
      setCalculationSteps(res.steps);

      setSaveToast('✅ 25 KVA Transformer Installation Package applied: 18-item lump sum material schedule loaded (Rs. 447,128.07) + 10% Labour (Rs. 44,712.81) + 16% Over Heads on Material (Rs. 71,540.49) = Net Cost Rs. 563,381.37.');
      setTimeout(() => setSaveToast(''), 5500);

      const tableEl = document.getElementById('boq-materials-table');
      if (tableEl) {
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    if ((preset as any).is50KvaPackage) {
      setEstimateType('NEW_DISTRIBUTION_TRANSFORMER');
      const updatedLine: EstimateLineDetails = {
        ...lineDetails,
        htLengthKm: 0,
        ltLengthKm: 0,
        conductorSize: 'DOG',
        conductorType: 'ACSR',
        poleType: 'PCC',
        poleHeightMeters: 11,
        roadCrossings: 0,
        canalCrossings: 0,
        transformerCount: 1,
        transformerStructures: 1,
        transformerCapacityKva: 50,
        is50KvaLumpSumPackage: true,
        is25KvaLumpSumPackage: false,
        circuitsCount: 1,
        htPoles: 0,
        ltPoles: 0,
        staySets: 0,
        autoCalculatedFlags: {
          htPoles: true,
          ltPoles: true,
          staySets: false
        }
      };

      setLineDetails(updatedLine);

      setPercentages({
        labourPercent: 0.0,
        departmentalPercent: 0.0,
        contractorPercent: 0.0,
        engineeringPercent: 0.0,
        contingencyPercent: 0.0,
        taxPercent: 0.0,
        otherChargesFixed: 0,
        overheadBasis: 'MATERIAL'
      });

      setTransportSettings({
        method: 'FIXED',
        distanceKm: 0,
        ratePerKm: 0,
        loadingUnloadingFixed: 0,
        vehicleType: 'Standard Truck'
      });

      setProjectInfo(prev => ({
        ...prev,
        schemeProjectName: preset.schemeName,
        purposeOfWork: 'Installation of 50 KVA 11/0.415 kV Distribution Transformer with 18-item lump sum material list including Store Code 08120 @ Rate Rs. 434,200 (Total Material Rs. 571,542.07), 10% Labour Cost (Rs. 57,154.21), and 16% Over Heads on material cost (Rs. 91,446.73). Net Cost: Rs. 720,143.01.'
      }));

      const res = calculateQuantitiesForLine('NEW_DISTRIBUTION_TRANSFORMER', updatedLine, designFactors, materials);
      setItems(res.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD')));
      setCalculationSteps(res.steps);

      setSaveToast('✅ 50 KVA Transformer Installation Package applied: 18-item lump sum material schedule loaded with Code 08120 @ Rs. 434,200 (Material Rs. 571,542.07) + 10% Labour (Rs. 57,154.21) + 16% Over Heads on Material (Rs. 91,446.73) = Net Cost Rs. 720,143.01.');
      setTimeout(() => setSaveToast(''), 5500);

      const tableEl = document.getElementById('boq-materials-table');
      if (tableEl) {
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    if ((preset as any).is100KvaPackage) {
      setEstimateType('NEW_DISTRIBUTION_TRANSFORMER');
      const updatedLine: EstimateLineDetails = {
        ...lineDetails,
        htLengthKm: 0,
        ltLengthKm: 0,
        conductorSize: 'DOG',
        conductorType: 'ACSR',
        poleType: 'PCC',
        poleHeightMeters: 11,
        roadCrossings: 0,
        canalCrossings: 0,
        transformerCount: 1,
        transformerStructures: 1,
        transformerCapacityKva: 100,
        is100KvaLumpSumPackage: true,
        is50KvaLumpSumPackage: false,
        is25KvaLumpSumPackage: false,
        circuitsCount: 1,
        htPoles: 0,
        ltPoles: 0,
        staySets: 0,
        autoCalculatedFlags: {
          htPoles: true,
          ltPoles: true,
          staySets: false
        }
      };

      setLineDetails(updatedLine);

      setPercentages({
        labourPercent: 0.0,
        departmentalPercent: 0.0,
        contractorPercent: 0.0,
        engineeringPercent: 0.0,
        contingencyPercent: 0.0,
        taxPercent: 0.0,
        otherChargesFixed: 0,
        overheadBasis: 'MATERIAL'
      });

      setTransportSettings({
        method: 'FIXED',
        distanceKm: 0,
        ratePerKm: 0,
        loadingUnloadingFixed: 0,
        vehicleType: 'Standard Truck'
      });

      setProjectInfo(prev => ({
        ...prev,
        schemeProjectName: preset.schemeName,
        purposeOfWork: 'Installation of 100 KVA 11/0.415 kV Distribution Transformer with 20-item lump sum material list including Store Code 08130 @ Rate Rs. 631,000 (Total Material Rs. 851,227.21), 10% Labour Cost (Rs. 85,122.72), and 16% Over Heads on material cost (Rs. 136,196.35). Net Cost: Rs. 1,072,546.28.'
      }));

      const res = calculateQuantitiesForLine('NEW_DISTRIBUTION_TRANSFORMER', updatedLine, designFactors, materials);
      setItems(res.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD')));
      setCalculationSteps(res.steps);

      setSaveToast('✅ 100 KVA Transformer Installation Package applied: 20-item lump sum material schedule loaded with Code 08130 @ Rs. 631,000 (Material Rs. 851,227.21) + 10% Labour (Rs. 85,122.72) + 16% Over Heads on Material (Rs. 136,196.35) = Net Cost Rs. 1,072,546.28.');
      setTimeout(() => setSaveToast(''), 5500);

      const tableEl = document.getElementById('boq-materials-table');
      if (tableEl) {
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    if ((preset as any).is200KvaPackage) {
      setEstimateType('NEW_DISTRIBUTION_TRANSFORMER');
      const updatedLine: EstimateLineDetails = {
        ...lineDetails,
        htLengthKm: 0,
        ltLengthKm: 0,
        conductorSize: 'WASP',
        conductorType: 'ACSR',
        poleType: 'PCC',
        poleHeightMeters: 11,
        roadCrossings: 0,
        canalCrossings: 0,
        transformerCount: 1,
        transformerStructures: 1,
        transformerCapacityKva: 200,
        is200KvaLumpSumPackage: true,
        is100KvaLumpSumPackage: false,
        is50KvaLumpSumPackage: false,
        is25KvaLumpSumPackage: false,
        circuitsCount: 1,
        htPoles: 0,
        ltPoles: 0,
        staySets: 0,
        autoCalculatedFlags: {
          htPoles: true,
          ltPoles: true,
          staySets: false
        }
      };

      setLineDetails(updatedLine);

      setPercentages({
        labourPercent: 0.0,
        departmentalPercent: 0.0,
        contractorPercent: 0.0,
        engineeringPercent: 0.0,
        contingencyPercent: 0.0,
        taxPercent: 0.0,
        otherChargesFixed: 0,
        overheadBasis: 'MATERIAL'
      });

      setTransportSettings({
        method: 'FIXED',
        distanceKm: 0,
        ratePerKm: 0,
        loadingUnloadingFixed: 0,
        vehicleType: 'Standard Truck'
      });

      setProjectInfo(prev => ({
        ...prev,
        schemeProjectName: preset.schemeName,
        purposeOfWork: 'Installation of 200 KVA 11/0.415 kV Distribution Transformer with lump sum material list (Total Material Rs. 1,981,233.97), 10% Labour Cost (Rs. 198,123.40), and 16% Over Heads on material cost (Rs. 316,997.44). Net Cost: Rs. 2,496,354.81.'
      }));

      const res = calculateQuantitiesForLine('NEW_DISTRIBUTION_TRANSFORMER', updatedLine, designFactors, materials);
      setItems(res.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD')));
      setCalculationSteps(res.steps);

      setSaveToast('✅ 200 KVA Transformer Installation Package applied: lump sum material schedule loaded (Material Rs. 1,981,233.97) + 10% Labour (Rs. 198,123.40) + 16% Over Heads on Material (Rs. 316,997.44) = Net Cost Rs. 2,496,354.81.');
      setTimeout(() => setSaveToast(''), 5500);

      const tableEl2 = document.getElementById('boq-materials-table');
      if (tableEl2) {
        tableEl2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    if ((preset as any).is1KmHtDogHTypePackage) {
      setEstimateType('HT_LINE_EXTENSION');
      const updatedLine: EstimateLineDetails = {
        ...lineDetails,
        htLengthKm: 1.0,
        ltLengthKm: 0,
        conductorSize: 'DOG',
        conductorType: 'ACSR',
        poleType: 'H_STEEL_STRUCTURE',
        poleHeightMeters: 11,
        roadCrossings: 0,
        canalCrossings: 0,
        transformerCount: 0,
        transformerStructures: 0,
        transformerCapacityKva: 0,
        is1KmHtDogHTypePackage: true,
        is200KvaLumpSumPackage: false,
        is100KvaLumpSumPackage: false,
        is50KvaLumpSumPackage: false,
        is25KvaLumpSumPackage: false,
        circuitsCount: 1,
        htPoles: 16,
        ltPoles: 0,
        staySets: 8,
        autoCalculatedFlags: {
          htPoles: false,
          ltPoles: true,
          staySets: false
        }
      };

      setLineDetails(updatedLine);

      setPercentages({
        labourPercent: 0.0,
        departmentalPercent: 0.0,
        contractorPercent: 0.0,
        engineeringPercent: 0.0,
        contingencyPercent: 0.0,
        taxPercent: 0.0,
        otherChargesFixed: 0,
        overheadBasis: 'MATERIAL'
      });

      setTransportSettings({
        method: 'FIXED',
        distanceKm: 0,
        ratePerKm: 0,
        loadingUnloadingFixed: 0,
        vehicleType: 'Heavy Truck'
      });

      setProjectInfo(prev => ({
        ...prev,
        schemeProjectName: preset.schemeName,
        purposeOfWork: 'Construction of 1.0 KM 11kV HT line extension using ACSR DOG conductor and H-Type Steel Structures with material list (Total Material Rs. 3,399,531.32), 10% Labour Cost (Rs. 339,953.13), and 16% Over Heads on material cost (Rs. 543,925.01). Net Cost: Rs. 4,283,409.46.'
      }));

      const res = calculateQuantitiesForLine('HT_LINE_EXTENSION', updatedLine, designFactors, materials);
      setItems(res.items);
      setCalculationSteps(res.steps);

      setSaveToast('✅ 1.0 KM HT Line (DOG & H-Type Steel Structures) Package applied: material schedule loaded (Material Rs. 3,399,531.32) + 10% Labour (Rs. 339,953.13) + 16% Over Heads on Material (Rs. 543,925.01) = Net Cost Rs. 4,283,409.46.');
      setTimeout(() => setSaveToast(''), 5500);

      const tableEl3 = document.getElementById('boq-materials-table');
      if (tableEl3) {
        tableEl3.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    setEstimateType('HT_LINE_EXTENSION');

    const updatedLine: EstimateLineDetails = {
      ...lineDetails,
      htLengthKm: preset.htLengthKm,
      ltLengthKm: 0,
      conductorSize: preset.conductorSize,
      conductorType: 'ACSR',
      poleType: preset.poleType,
      poleHeightMeters: preset.poleHeightMeters,
      roadCrossings: 0,
      canalCrossings: 0,
      transformerCount: 0,
      transformerStructures: 0,
      transformerCapacityKva: 0,
      circuitsCount: 1,
      htPoles: preset.htPoles,
      ltPoles: 0,
      staySets: preset.staySets,
      autoCalculatedFlags: {
        htPoles: true,
        ltPoles: true,
        staySets: true
      }
    };

    setLineDetails(updatedLine);

    setProjectInfo(prev => ({
      ...prev,
      schemeProjectName: preset.schemeName,
      purposeOfWork: `Construction of ${preset.label.replace('⚡ ', '')} as per WAPDA / DISCO engineering specifications.`
    }));

    // Auto-calculate exact BOQ material quantities for this combination
    const res = calculateQuantitiesForLine('HT_LINE_EXTENSION', updatedLine, designFactors, materials);
    setItems(res.items);
    setCalculationSteps(res.steps);

    setSaveToast(`✅ ${preset.label} applied: Required material quantities updated in the estimate list below!`);
    setTimeout(() => setSaveToast(''), 4500);

    const tableEl = document.getElementById('boq-materials-table');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Handler: Update HT Dog & H-Type Line Multiple for Additional Line Length
  const handleUpdateHtDogMultiplier = (km: number) => {
    const lineKm = km > 0 ? km : 1.0;
    const updatedLine: EstimateLineDetails = {
      ...lineDetails,
      htLengthKm: lineKm,
      htPoles: Math.round(16 * lineKm),
      staySets: Math.round(8 * lineKm),
      is1KmHtDogHTypePackage: true
    };
    setLineDetails(updatedLine);

    const res = calculateQuantitiesForLine('HT_LINE_EXTENSION', updatedLine, designFactors, materials);
    setItems(res.items);
    setCalculationSteps(res.steps);

    const baseMat = 3399531.32;
    const totalMat = Number((baseMat * lineKm).toFixed(2));
    const totalLabour = Number((totalMat * 0.1).toFixed(2));
    const totalOverhead = Number((totalMat * 0.16).toFixed(2));
    const netTotal = Number((totalMat + totalLabour + totalOverhead).toFixed(2));

    setProjectInfo(prev => ({
      ...prev,
      schemeProjectName: `Construction of ${lineKm} KM HT Line with DOG Conductor & H-Type Steel Structures (Lump Sum Package)`,
      purposeOfWork: `Construction of ${lineKm} KM 11kV HT line extension using ACSR DOG conductor and H-Type Steel Structures with material list (Total Material Rs. ${totalMat.toLocaleString('en-PK', {minimumFractionDigits: 2})}), 10% Labour Cost (Rs. ${totalLabour.toLocaleString('en-PK', {minimumFractionDigits: 2})}), and 16% Over Heads on material cost (Rs. ${totalOverhead.toLocaleString('en-PK', {minimumFractionDigits: 2})}). Net Cost: Rs. ${netTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}.`
    }));

    setSaveToast(`✅ Scaled to ${lineKm} KM (${lineKm}x multiple): Material = Rs. ${totalMat.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Net Cost = Rs. ${netTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}`);
    setTimeout(() => setSaveToast(''), 4500);
  };

  // 7. Computed Charges (Live)
  const totalKm = (Number(lineDetails.htLengthKm) || 0) + (Number(lineDetails.ltLengthKm) || 0);
  const computedCharges = useMemo(() => {
    return computeEstimateCharges(items, totalKm, transportSettings, percentages);
  }, [items, totalKm, transportSettings, percentages]);

  const netDismantleCost = useMemo(() => {
    return isDismantleDeducted ? dismantleItems.reduce((sum, item) => sum + item.materialAmount, 0) * 1.1 : 0;
  }, [dismantleItems, isDismantleDeducted]);

  // Grand Total calculation
  const finalTotal = useMemo(() => {
    return computedCharges.grandTotal - netDismantleCost;
  }, [computedCharges, netDismantleCost]);

  const finalEstimatedCostWith05 = useMemo(() => {
    return Number((finalTotal * 1.005).toFixed(2));
  }, [finalTotal]);

  // Handler: Run Automatic Material Calculation Engine
  const handleCalculateRequiredMaterials = () => {
    const is25Kva = lineDetails.is25KvaLumpSumPackage || 
                    (estimateType === 'NEW_DISTRIBUTION_TRANSFORMER' && lineDetails.transformerCapacityKva === 25) ||
                    (lineDetails.transformerCapacityKva === 25 && (!lineDetails.htLengthKm || lineDetails.htLengthKm === 0));

    const res = calculateQuantitiesForLine(estimateType, lineDetails, designFactors, materials);
    const cleanedItems = is25Kva 
      ? res.items.filter(i => {
          if (i.id === 'item-stay-ext' || i.id?.endsWith('-ext')) return true;
          return i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD');
        })
      : res.items;

    setItems(cleanedItems);
    setCalculationSteps(res.steps);
    setLineDetails(prev => ({
      ...prev,
      htPoles: res.updatedLineDetails.htPoles ?? prev.htPoles,
      ltPoles: res.updatedLineDetails.ltPoles ?? prev.ltPoles,
      staySets: is25Kva ? 0 : (res.updatedLineDetails.staySets ?? prev.staySets),
      autoCalculatedFlags: {
        htPoles: true,
        ltPoles: true,
        staySets: !is25Kva
      }
    }));
    setShowCalculationDrawer(true);
  };

  // Handler: Apply Template
  const handleApplyTemplate = (tmplId: string) => {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;

    setEstimateType(tmpl.type);
    if (tmpl.defaultAdditionalPercentages) {
      setPercentages(prev => ({
        ...prev,
        ...tmpl.defaultAdditionalPercentages
      }));
    }

    if (tmpl.defaultTransformerKva === 25 || tmpl.id.includes('25kva')) {
      const updatedDetails: EstimateLineDetails = {
        ...lineDetails,
        htLengthKm: 0,
        ltLengthKm: 0,
        htPoles: 0,
        ltPoles: 0,
        staySets: 0,
        transformerCount: 1,
        transformerStructures: 1,
        transformerCapacityKva: 25,
        is25KvaLumpSumPackage: true,
        conductorSize: 'DOG',
        autoCalculatedFlags: {
          htPoles: true,
          ltPoles: true,
          staySets: false
        }
      };
      setLineDetails(updatedDetails);
      setPercentages({
        labourPercent: 0.0,
        departmentalPercent: 0.0,
        contractorPercent: 0.0,
        engineeringPercent: 0.0,
        contingencyPercent: 0.0,
        taxPercent: 0.0,
        otherChargesFixed: 0,
        overheadBasis: 'MATERIAL'
      });
      setTransportSettings({
        method: 'FIXED',
        distanceKm: 0,
        ratePerKm: 0,
        loadingUnloadingFixed: 0,
        vehicleType: 'Standard Truck'
      });
      setProjectInfo(prev => ({
        ...prev,
        schemeProjectName: 'Installation of 25 KVA Distribution Transformer Sub-Station (Lump Sum Package)',
        purposeOfWork: 'Installation of 25 KVA 11/0.415 kV Distribution Transformer with 18-item lump sum material list (Rs. 447,128.07), 10% Labour Cost (Rs. 44,712.81), and 16% Over Heads on material cost (Rs. 71,540.49). Net Cost: Rs. 563,381.37.'
      }));
      const res = calculateQuantitiesForLine(tmpl.type, updatedDetails, designFactors, materials);
      setItems(res.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD')));
      setCalculationSteps(res.steps);
      setSaveToast('✅ 25 KVA Transformer Installation Template applied: 18-Item lump sum schedule loaded (Net Cost Rs. 563,381.37).');
      setTimeout(() => setSaveToast(''), 4500);
      return;
    }

    const updatedDetails: EstimateLineDetails = {
      ...lineDetails,
      conductorSize: tmpl.standardConductorCode.includes('PANTHER') ? 'PANTHER' : 
                     tmpl.standardConductorCode.includes('RABBIT') ? 'RABBIT' : 'DOG',
      transformerCapacityKva: tmpl.defaultTransformerKva || lineDetails.transformerCapacityKva,
      transformerCount: tmpl.type === 'NEW_DISTRIBUTION_TRANSFORMER' || tmpl.type === 'COMBINED_HT_LT' ? 1 : lineDetails.transformerCount
    };
    setLineDetails(updatedDetails);

    // Auto recalculate
    const res = calculateQuantitiesForLine(tmpl.type, updatedDetails, designFactors, materials);
    setItems(res.items);
    setCalculationSteps(res.steps);
  };

  // Handler: Update Item Quantity or Rate
  const handleUpdateItem = (itemId: string, field: 'quantity' | 'unitRate' | 'labourRate' | 'remarks', value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const numVal = Number(value) || 0;
      const updated = { ...item, manualOverride: true };

      if (field === 'quantity') {
        updated.quantity = Math.max(0, numVal);
        updated.materialAmount = Math.round(updated.quantity * updated.unitRate);
        updated.labourRate = 0;
        updated.labourAmount = 0;
        updated.totalAmount = updated.materialAmount;
      } else if (field === 'unitRate') {
        updated.unitRate = Math.max(0, numVal);
        updated.materialAmount = Math.round(updated.quantity * updated.unitRate);
        updated.labourRate = 0;
        updated.labourAmount = 0;
        updated.totalAmount = updated.materialAmount;
      } else if (field === 'labourRate') {
        updated.labourRate = 0;
        updated.labourAmount = 0;
        updated.totalAmount = updated.materialAmount;
      } else if (field === 'remarks') {
        updated.remarks = String(value);
      }
      return updated;
    }));
  };

  // Handler: Add Custom Material from Catalog
  const handleAddMaterialToBoq = (matCode: string, qtyToAdd: number = 1) => {
    const mat = materials.find(m => m.code === matCode);
    if (!mat) return;

    const existing = items.find(i => i.materialCode === mat.code);
    if (existing) {
      handleUpdateItem(existing.id, 'quantity', (existing.quantity || 0) + qtyToAdd);
      setRecentlyAddedCode(mat.code);
      setTimeout(() => setRecentlyAddedCode(null), 2500);
      setSaveToast(`Updated quantity for [${mat.code}] ${mat.name} (+${qtyToAdd})`);
      setTimeout(() => setSaveToast(''), 3500);
      setSelectedMaterialToAdd('');
      return;
    }

    const newItem: EstimateItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      materialId: mat.id,
      materialCode: mat.code,
      description: mat.name,
      specification: mat.specification,
      unit: mat.unit,
      quantity: qtyToAdd || mat.defaultQtyFactor || 1,
      unitRate: mat.materialRate,
      materialAmount: mat.materialRate * (qtyToAdd || mat.defaultQtyFactor || 1),
      labourRate: 0,
      labourAmount: 0,
      totalAmount: mat.materialRate * (qtyToAdd || mat.defaultQtyFactor || 1),
      isAutoCalculated: false,
      manualOverride: true,
      remarks: 'Manually added from Material Catalog'
    };

    setItems(prev => [...prev, newItem]);
    setRecentlyAddedCode(mat.code);
    setTimeout(() => setRecentlyAddedCode(null), 2500);
    setSaveToast(`Added [${mat.code}] ${mat.name} to BOQ`);
    setTimeout(() => setSaveToast(''), 3500);
    setSelectedMaterialToAdd('');
  };

  // Handler: Delete BOQ Item
  const handleDeleteItem = (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the BOQ?')) return;
    setItems(prev => prev.filter(i => i.id !== itemId));
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  // Handler: Delete Selected Items
  const handleDeleteSelectedItems = () => {
    if (!confirm(`Are you sure you want to remove the selected ${selectedItemIds.size} items from the BOQ?`)) return;
    console.log("Deleting selected items:", selectedItemIds);
    setItems(prev => {
        const next = prev.filter(i => !selectedItemIds.has(i.id));
        console.log("Items before:", prev.length, "Items after:", next.length);
        return next;
    });
    setSelectedItemIds(new Set());
  };

  // Handler: Duplicate BOQ Item
  const handleDuplicateItem = (item: EstimateItem) => {
    const dup: EstimateItem = {
      ...item,
      id: `item-dup-${Date.now()}`,
      description: `${item.description} (Additional)`,
      manualOverride: true
    };
    setItems(prev => [...prev, dup]);
  };

  // Handler: Save Draft or Submit
  const handleSave = (targetStatus?: EstimateStatus) => {
    const newStatus = targetStatus || status;
    const foundationCost = calculateFoundationCharges(lineDetails);
    const finalCharges = {
        ...computedCharges,
        grandTotal: computedCharges.grandTotal + foundationCost
    };
    const finalRecord: CostEstimateRecord = {
      id: initialEstimate?.id || `est-${Date.now()}`,
      projectInfo,
      type: estimateType,
      status: newStatus,
      lineDetails,
      items,
      charges: finalCharges,
      dismantledItems: dismantleItems,
      dismantledCharges: {
        materialCost: dismantleItems.reduce((sum, item) => sum + item.materialAmount, 0),
        labourCost: dismantleItems.reduce((sum, item) => sum + item.materialAmount, 0) * 0.1,
        transportationCost: 0,
        civilWorksCost: 0,
        engineeringChargesPercent: 0,
        engineeringChargesAmount: 0,
        contingencyPercent: 0,
        contingencyAmount: 0,
        departmentalOverheadPercent: 0,
        departmentalOverheadAmount: 0,
        contractorOverheadPercent: 0,
        contractorOverheadAmount: 0,
        taxGstPercent: 0,
        taxGstAmount: 0,
        otherChargesAmount: 0,
        subTotal: dismantleItems.reduce((sum, item) => sum + item.materialAmount, 0) * 1.1,
        grandTotal: dismantleItems.reduce((sum, item) => sum + item.materialAmount, 0) * 1.1,
        costPerKm: 0,
      } as EstimateCharges,
      calculationSteps,
      transportationSettings: transportSettings,
      auditTrail: [
        ...(initialEstimate?.auditTrail || []),
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          user: userName || projectInfo.preparedBy,
          role: userRole,
          action: initialEstimate ? `Saved update / revision as ${newStatus}` : `Created new estimate as ${newStatus}`,
          remarks: `Total cost: PKR ${computedCharges.grandTotal.toLocaleString()}`
        }
      ],
      createdAt: initialEstimate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveEstimate(finalRecord);
    setSaveToast(`Estimate ${projectInfo.estimateNo} saved successfully!`);
    setTimeout(() => setSaveToast(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Save Toast */}
      {saveToast && (
        <div className="fixed top-24 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{saveToast}</span>
        </div>
      )}

      {/* Top Header & Workflow Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Return to Estimates Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-0.5">
                <span>NEW ELECTRICAL LINE ESTIMATE</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-bold">
                  {projectInfo.estimateNo}
                </span>
                <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                  {projectInfo.revisionNo}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {projectInfo.schemeProjectName || projectInfo.proposedLocation || 'Line Extension Cost Estimation'}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSaveUnifiedProject && (
              <button
                type="button"
                onClick={() => {
                  handleSave(status);
                  onSaveUnifiedProject();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all cursor-pointer ring-1 ring-emerald-300 active:scale-95"
                title="Save both 1. FLADIX Feeder Loss Analysis and 2. Line Cost Estimation together as One Project"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>Save as One Project (1. FLADIX Analysis + 2. Cost Estimation)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave(status)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Save project details, quantities, and BOQ to database"
            >
              <Save className="w-4 h-4" />
              <span>Save Project</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>

            {/* Excel Export */}
            <button
              type="button"
              onClick={() => {
                const currentRecord: CostEstimateRecord = {
                  id: initialEstimate?.id || 'preview',
                  projectInfo,
                  type: estimateType,
                  status,
                  lineDetails,
                  items,
                  charges: computedCharges,
                  calculationSteps,
                  auditTrail: [],
                  createdAt: initialEstimate?.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                exportEstimateToExcelWorkbook(currentRecord);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export complete 6-sheet estimate workbook to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            {/* 1. Print Preview Button */}
            <button
              type="button"
              onClick={() => {
                const currentRecord: CostEstimateRecord = {
                  id: initialEstimate?.id || 'preview',
                  projectInfo,
                  type: estimateType,
                  status,
                  lineDetails,
                  items,
                  charges: computedCharges,
                  calculationSteps,
                  auditTrail: [],
                  createdAt: initialEstimate?.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                onPrintEstimate(currentRecord, 'preview');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Open Interactive Print Preview"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Preview</span>
            </button>

            {/* 2. Save as PDF Button */}
            <button
              type="button"
              onClick={() => {
                const currentRecord: CostEstimateRecord = {
                  id: initialEstimate?.id || 'preview',
                  projectInfo,
                  type: estimateType,
                  status,
                  lineDetails,
                  items,
                  charges: computedCharges,
                  calculationSteps,
                  auditTrail: [],
                  createdAt: initialEstimate?.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                onPrintEstimate(currentRecord, 'pdf');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Generate and Save Formatted PDF Document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Save as PDF</span>
            </button>

            {/* 3. Physical Print Document Button */}
            <button
              type="button"
              onClick={() => {
                const currentRecord: CostEstimateRecord = {
                  id: initialEstimate?.id || 'preview',
                  projectInfo,
                  type: estimateType,
                  status,
                  lineDetails,
                  items,
                  charges: computedCharges,
                  calculationSteps,
                  auditTrail: [],
                  createdAt: initialEstimate?.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                onPrintEstimate(currentRecord, 'print');
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Open System Print Dialog (Windows/Network/USB Printers)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => handleSave('SUBMITTED')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Submit for Checking / Approval</span>
              </button>
            )}

            {(userRole === 'XEN' || userRole === 'SE' || userRole === 'ADMIN') && status === 'SUBMITTED' && (
              <button
                type="button"
                onClick={() => handleSave('APPROVED')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sanction & Approve Estimate</span>
              </button>
            )}
          </div>
        </div>

        {/* Templates Quick Bar */}
        <div className="bg-slate-50/90 px-4 sm:px-5 py-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Apply Construction Template:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {templates.map(tmpl => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleApplyTemplate(tmpl.id)}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-900 bg-white hover:bg-blue-50 border border-slate-200 rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                {tmpl.name.split(':')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Side Forms, Right Side Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Forms */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Project Information Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
                Project & Administrative Information
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">PESCO Distribution Jurisdiction</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Estimate Number</label>
                <input
                  type="text"
                  value={projectInfo.estimateNo}
                  onChange={(e) => setProjectInfo({ ...projectInfo, estimateNo: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Estimate Date</label>
                <input
                  type="date"
                  value={projectInfo.estimateDate}
                  onChange={(e) => setProjectInfo({ ...projectInfo, estimateDate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Revision Number</label>
                <input
                  type="text"
                  value={projectInfo.revisionNo}
                  onChange={(e) => setProjectInfo({ ...projectInfo, revisionNo: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>
            </div>

            {/* ========================================================
                11-DIGIT WORK ORDER & ELR TIE-UP SECTION
               ======================================================== */}
            <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/5 to-slate-50 border border-amber-300/80 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-xs">#</span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      11-Digit Work Order & ELR Tie-Up
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-mono font-bold border border-amber-300">
                        WAPDA / DISCO Statutory Standard
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Ties this Line Cost Estimate directly to the ELR (Energy Loss Reduction) Scheme & Justification Slip.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const parsed = parse11DigitWorkOrder(projectInfo.workOrderNo);
                    const newWo = generate11DigitWorkOrder({
                      circleCode: parsed.circleCode || '26',
                      divisionCode: parsed.divisionCode || '14',
                      categoryCode: '71'
                    });
                    const p = parse11DigitWorkOrder(newWo);
                    setProjectInfo({
                      ...projectInfo,
                      workOrderNo: newWo,
                      schemeCategory: 'ELR',
                      elrCode: p.elrCode,
                      accountHead: p.headOfAccount
                    });
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 border border-amber-400 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-amber-800" />
                  <span>Auto-Gen ELR W.O.</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>11-Digit Work Order No</span>
                    {projectInfo.workOrderNo && projectInfo.workOrderNo.replace(/\D/g, '').length === 11 ? (
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">✓ 11-Digits OK</span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-mono">11 numeric digits</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={projectInfo.workOrderNo || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parsed = parse11DigitWorkOrder(val);
                      setProjectInfo({
                        ...projectInfo,
                        workOrderNo: val,
                        elrCode: parsed.isValid ? parsed.elrCode : projectInfo.elrCode,
                        accountHead: parsed.isValid ? parsed.headOfAccount : projectInfo.accountHead
                      });
                    }}
                    placeholder="e.g. 26147126042 or 26-14-71-26-042"
                    className="w-full px-3 py-1.5 bg-white border border-amber-400 focus:border-amber-600 rounded-lg text-xs font-mono font-black text-slate-900 tracking-wider shadow-xs"
                    maxLength={15}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">ELR Scheme Code / Ref</label>
                  <input
                    type="text"
                    value={projectInfo.elrCode || ''}
                    onChange={(e) => setProjectInfo({ ...projectInfo, elrCode: e.target.value })}
                    placeholder="e.g. ELR-71-26-042"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Scheme Category & Head</label>
                  <select
                    value={(() => {
                      const p = parse11DigitWorkOrder(projectInfo.workOrderNo);
                      return p.categoryCode || '71';
                    })()}
                    onChange={(e) => {
                      const catCode = e.target.value;
                      const p = parse11DigitWorkOrder(projectInfo.workOrderNo);
                      const newWo = generate11DigitWorkOrder({
                        circleCode: p.circleCode || '26',
                        divisionCode: p.divisionCode || '14',
                        categoryCode: catCode,
                        fiscalYear: p.fiscalYearShort || '26',
                        serialNo: p.serialNo || '042'
                      });
                      const parsedNew = parse11DigitWorkOrder(newWo);
                      setProjectInfo({
                        ...projectInfo,
                        workOrderNo: newWo,
                        schemeCategory: parsedNew.categoryPrefix,
                        elrCode: parsedNew.elrCode,
                        accountHead: parsedNew.headOfAccount
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="71">71 - ELR (Energy Loss Reduction Scheme)</option>
                    <option value="72">72 - DOP (Distribution Optimization Program)</option>
                    <option value="73">73 - SDI (System Deposit Improvement Scheme)</option>
                    <option value="74">74 - LE (HT/LT Line Extension)</option>
                    <option value="75">75 - TRF (Transformer Augmentation & Relief)</option>
                    <option value="76">76 - VE (Village Electrification)</option>
                    <option value="77">77 - REHAB (System Rehabilitation)</option>
                  </select>
                </div>
              </div>

{/* 
              Live 11-Digit Code Breakdown Pills 
              {(() => {
                const p = parse11DigitWorkOrder(projectInfo.workOrderNo);
                return (
                  <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    <span className="text-slate-500 font-sans font-semibold">Breakdown:</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200" title="Circle Code">
                      Circle: <strong>{p.circleCode || '26'}</strong> ({p.circleName})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200" title="Division Code">
                      Div: <strong>{p.divisionCode || '14'}</strong> ({p.divisionName})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-bold border border-amber-300" title="Category / ELR Code">
                      Category: <strong>{p.categoryCode || '71'}</strong> ({p.categoryName})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200" title="Fiscal Year">
                      FY: <strong>{p.fiscalYearShort || '26'}</strong> ({p.fiscalYear || '2026'})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200" title="Work Order Serial">
                      Seq: <strong>{p.serialNo || '042'}</strong>
                    </span>
                    <span className="ml-auto text-slate-600 font-sans text-[11px] font-bold">
                      Formatted: <span className="font-mono text-slate-900 font-black">{format11DigitWorkOrder(projectInfo.workOrderNo) || '26-14-71-26-042'}</span>
                    </span>
                  </div>
                );
              })()}
              */}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Division</label>
                <input
                  type="text"
                  value={projectInfo.division}
                  onChange={(e) => setProjectInfo({ ...projectInfo, division: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sub-Division</label>
                <input
                  type="text"
                  value={projectInfo.subDivision}
                  onChange={(e) => setProjectInfo({ ...projectInfo, subDivision: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Circle</label>
                <input
                  type="text"
                  value={projectInfo.circle}
                  onChange={(e) => setProjectInfo({ ...projectInfo, circle: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">District</label>
                <input
                  type="text"
                  value={projectInfo.district}
                  onChange={(e) => setProjectInfo({ ...projectInfo, district: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Feeder Name</label>
                <input
                  type="text"
                  value={projectInfo.feederName}
                  onChange={(e) => setProjectInfo({ ...projectInfo, feederName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Feeder Code</label>
                <input
                  type="text"
                  value={projectInfo.feederCode}
                  onChange={(e) => setProjectInfo({ ...projectInfo, feederCode: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Proposed Location / Village / Mohallah</label>
                <input
                  type="text"
                  value={projectInfo.proposedLocation}
                  onChange={(e) => setProjectInfo({ ...projectInfo, proposedLocation: e.target.value })}
                  placeholder="e.g. Village Garhi Sherdad, Tarnab Road"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">GPS Coordinates (Lat, Long)</label>
                <input
                  type="text"
                  value={`${projectInfo.gpsLatitude}, ${projectInfo.gpsLongitude}`}
                  onChange={(e) => {
                    const parts = e.target.value.split(',');
                    setProjectInfo({
                      ...projectInfo,
                      gpsLatitude: parts[0]?.trim() || '',
                      gpsLongitude: parts[1]?.trim() || ''
                    });
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Applicant / Sponsoring Department</label>
                <input
                  type="text"
                  value={projectInfo.applicantDepartment}
                  onChange={(e) => setProjectInfo({ ...projectInfo, applicantDepartment: e.target.value })}
                  placeholder="e.g. District Council / Local MPA / Private Consumer"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Scheme / Project Title</label>
                <input
                  type="text"
                  value={projectInfo.schemeProjectName}
                  onChange={(e) => setProjectInfo({ ...projectInfo, schemeProjectName: e.target.value })}
                  placeholder="e.g. Rural Electrification Phase-IV / ELR Scheme"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Purpose / Engineering Justification</label>
              <textarea
                rows={2}
                value={projectInfo.purposeOfWork}
                onChange={(e) => setProjectInfo({ ...projectInfo, purposeOfWork: e.target.value })}
                placeholder="Describe scope, e.g. Extension of 11kV HT line by 1.8km to feed newly constructed tube well and residential sector B..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Prepared By (SDO)</label>
                <input
                  type="text"
                  value={projectInfo.preparedBy}
                  onChange={(e) => setProjectInfo({ ...projectInfo, preparedBy: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Checked By (XEN)</label>
                <input
                  type="text"
                  value={projectInfo.checkedBy}
                  onChange={(e) => setProjectInfo({ ...projectInfo, checkedBy: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Approved By (SE / CE)</label>
                <input
                  type="text"
                  value={projectInfo.approvedBy}
                  onChange={(e) => setProjectInfo({ ...projectInfo, approvedBy: e.target.value })}
                  placeholder="Superintending Engineer (SE)"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 2. Line Details & Auto Calculation Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">2</span>
                Line Specifications & Automatic Quantity Engine
              </h3>

              <button
                type="button"
                onClick={handleCalculateRequiredMaterials}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Calculate Required Materials</span>
              </button>
            </div>

            {/* Quick Combination Presets Bar */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-2 border border-slate-800 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 mb-2">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Transformer Augmentation & Package Analysis Dropdown:
                </span>
                <select
                  value={activePresetKey || ''}
                  onChange={(e) => {
                    const found = PRESET_COMBINATIONS.find(p => p.key === e.target.value);
                    if (found) handleSelectPreset(found);
                  }}
                  className="bg-slate-950 border border-slate-600 text-amber-200 font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="" disabled>-- Select 50kVA, 100kVA, 200kVA Augmentation / Preset Package --</option>
                  {PRESET_COMBINATIONS.map(preset => (
                    <option key={preset.key} value={preset.key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-amber-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Quick HT Line Combination Presets:
                </span>
                <span className="text-[10px] text-slate-400">Click to auto-configure line length, conductor & pole structure</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {PRESET_COMBINATIONS.map(preset => {
                  const isActive = activePresetKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`w-full h-full min-h-[48px] px-3.5 py-2 text-xs font-bold rounded-lg border shadow-xs transition-all cursor-pointer flex items-center justify-center text-center gap-2 ${preset.badgeColor} ${
                        isActive ? `${preset.activeRing} ring-2 scale-[1.01]` : 'opacity-90 hover:opacity-100'
                      }`}
                      title={`Click to auto-configure line parameters and update required material quantities below`}
                    >
                      {isActive ? <Check className="w-4 h-4 shrink-0 stroke-[3] text-emerald-800" /> : null}
                      <span className="leading-snug">{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dedicated Multiplier Toolbar for DOG & H-Type Steel Structure Line Package */}
              {lineDetails.is1KmHtDogHTypePackage && (
                <div className="mt-3 pt-3 border-t border-slate-700/80 bg-slate-950/60 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Line Length Multiple
                    </span>
                    <span className="text-xs text-slate-300">
                      Current Line: <strong className="text-white font-mono">{lineDetails.htLengthKm || 1.0} KM</strong> ({lineDetails.htLengthKm || 1.0}x Multiple · {Math.round(16 * (lineDetails.htLengthKm || 1.0))} Structures · {Math.round(3150 * (lineDetails.htLengthKm || 1.0))}m DOG)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5].map(km => {
                      const isSelected = Number(lineDetails.htLengthKm) === km;
                      return (
                        <button
                          key={km}
                          type="button"
                          onClick={() => handleUpdateHtDogMultiplier(km)}
                          className={`w-24 h-8 px-2 py-1 text-xs font-bold rounded-md border transition-all cursor-pointer flex items-center justify-center text-center ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300 ring-2 ring-emerald-400 font-black shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-emerald-200 border-slate-600'
                          }`}
                          title={`Scale lump sum schedule for ${km} KM HT line extension`}
                        >
                          {km}.0 KM ({km}x)
                        </button>
                      );
                    })}
                    <div className="flex items-center gap-1 ml-1 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-600 h-8">
                      <span className="text-[10px] text-slate-400">Custom KM:</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={lineDetails.htLengthKm || ''}
                        onChange={(e) => handleUpdateHtDogMultiplier(Number(e.target.value))}
                        className="w-16 px-1.5 py-0.5 bg-slate-900 text-emerald-300 font-mono text-xs font-bold rounded text-center border border-slate-700 focus:outline-none focus:border-emerald-400"
                        title="Enter any custom distance (e.g. 1.5, 2.8, etc.) to scale the line cost"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estimate Type & Structure Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50/40 p-3.5 rounded-xl border border-blue-100">
              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">Estimate Scope / Type</label>
                <select
                  value={estimateType}
                  onChange={(e) => setEstimateType(e.target.value as EstimateType)}
                  className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HT_LINE_EXTENSION">1. New HT 11kV Line Extension</option>
                  <option value="LT_LINE_EXTENSION">2. New LT 400V Line Extension</option>
                  <option value="HT_LINE_TO_DT">3. HT Line Extension to Proposed Transformer (DT)</option>
                  <option value="LT_LINE_FROM_DT">4. LT Line Extension from Transformer</option>
                  <option value="NEW_DISTRIBUTION_TRANSFORMER">5. New Distribution Transformer Installation</option>
                  <option value="TRANSFORMER_AUGMENTATION">6. Transformer Augmentation / Capacity Upgrade</option>
                  <option value="COMPLETE_HT_FEEDER">7. Complete / Turnkey HT Feeder</option>
                  <option value="COMBINED_HT_LT">8. HT + LT Combined Line Extension</option>
                  <option value="OTHER">9. Other Distribution Works</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">Conductor Specification</label>
                <select
                  value={lineDetails.conductorSize}
                  onChange={(e) => setLineDetails({ ...lineDetails, conductorSize: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DOG">ACSR Dog 7/0.186 (100 mm² - Code 2110)</option>
                  <option value="WASP">ACSR Wasp 7/0.170 (80 mm² - Code 2130)</option>
                  <option value="OSPREY">Osprey Conductor (200 mm² - Code 2160)</option>
                  <option value="RABBIT">ACSR Rabbit 7/0.132 (50 mm² - Code 2120)</option>
                  <option value="INSULATED_DOG">Insulated DOG Conductor (11kV - Code 2361)</option>
                  <option value="PANTHER">ACSR Panther (200 mm² Heavy Feeder)</option>
                  <option value="ANT">AAC Ant Conductor 7/0.122 (Code 2340)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">HT Pole / Structure Type</label>
                <select
                  value={lineDetails.poleType || 'PCC'}
                  onChange={(e) => setLineDetails({ ...lineDetails, poleType: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PCC">HT Spun Pole 36 Feet / PCC 11m (Code 1113)</option>
                  <option value="SPUN_45FT">HT Spun Pole 45 Feet (Code 1114)</option>
                  <option value="STEEL_STRUCTURE">HT Steel Structure Pole 34.8 Feet (Code 1210)</option>
                  <option value="STEEL_STRUCTURE_45FT">HT Steel Structure Pole 45 Feet (Code 75007)</option>
                  <option value="STEEL_STRUCTURE_58FT">HT Heavy Steel Structure 58 Feet (Code 1213)</option>
                </select>
              </div>
            </div>

            {/* Line Length & Quantities Input Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  HT Line Length (km) {lineDetails.is1KmHtDogHTypePackage && <span className="text-emerald-700 font-bold">(Multiple Active)</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={lineDetails.htLengthKm}
                  onChange={(e) => {
                    const newKm = Number(e.target.value);
                    if (lineDetails.is1KmHtDogHTypePackage && newKm > 0) {
                      handleUpdateHtDogMultiplier(newKm);
                    } else {
                      setLineDetails({ ...lineDetails, htLengthKm: newKm });
                    }
                  }}
                  className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs font-mono font-bold text-slate-900 ${
                    lineDetails.is1KmHtDogHTypePackage ? 'border-emerald-500 ring-1 ring-emerald-400 bg-emerald-50/20' : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">LT Line Length (km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={lineDetails.ltLengthKm}
                  onChange={(e) => setLineDetails({ ...lineDetails, ltLengthKm: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  HT Poles (Nos) {lineDetails.autoCalculatedFlags?.htPoles ? <span className="text-blue-600 font-normal">(Auto)</span> : <span className="text-amber-600 font-bold">(Manual)</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  value={lineDetails.htPoles}
                  onChange={(e) => setLineDetails({ 
                    ...lineDetails, 
                    htPoles: Number(e.target.value),
                    autoCalculatedFlags: { ...lineDetails.autoCalculatedFlags, htPoles: false }
                  })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  LT Poles (Nos) {lineDetails.autoCalculatedFlags?.ltPoles ? <span className="text-blue-600 font-normal">(Auto)</span> : <span className="text-amber-600 font-bold">(Manual)</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  value={lineDetails.ltPoles}
                  onChange={(e) => setLineDetails({ 
                    ...lineDetails, 
                    ltPoles: Number(e.target.value),
                    autoCalculatedFlags: { ...lineDetails.autoCalculatedFlags, ltPoles: false }
                  })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Road Crossings</label>
                <input
                  type="number"
                  min="0"
                  value={lineDetails.roadCrossings}
                  onChange={(e) => setLineDetails({ ...lineDetails, roadCrossings: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">River / Canal Crossings</label>
                <input
                  type="number"
                  min="0"
                  value={lineDetails.canalCrossings}
                  onChange={(e) => setLineDetails({ ...lineDetails, canalCrossings: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Stay Sets (Guy Wire)</label>
                <input
                  type="number"
                  min="0"
                  value={lineDetails.staySets}
                  onChange={(e) => setLineDetails({ 
                    ...lineDetails, 
                    staySets: Number(e.target.value),
                    autoCalculatedFlags: { ...lineDetails.autoCalculatedFlags, staySets: false }
                  })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">No. of Circuits</label>
                <input
                  type="number"
                  min="1"
                  max="2"
                  value={lineDetails.circuitsCount}
                  onChange={(e) => setLineDetails({ ...lineDetails, circuitsCount: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-800 mb-1">HT Extension (Meters)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={lineDetails.htExtensionMeters || 0}
                  onChange={(e) => setLineDetails({ ...lineDetails, htExtensionMeters: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-900"
                  placeholder="0 (m)"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-800 mb-1">HT Conductor</label>
                <select
                  value={lineDetails.htExtensionConductorType || 'DOG'}
                  onChange={(e) => setLineDetails({ ...lineDetails, htExtensionConductorType: e.target.value })}
                  className="w-full px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900"
                >
                  <option value="DOG">ACSR Dog (100mm²)</option>
                  <option value="RABBIT">ACSR Rabbit (50mm²)</option>
                  <option value="PANTHER">ACSR Panther (200mm²)</option>
                  <option value="OSPREY">ACSR Osprey (200mm²)</option>
                  <option value="WASP">AAC Wasp (80mm²)</option>
                </select>
              </div>
            </div>

            {/* 1) LT Line Extension Mini-Estimate Card */}
            <div className="bg-gradient-to-br from-blue-50/85 via-sky-50/50 to-slate-50 border border-blue-300 rounded-xl p-4 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-blue-950">
                        1) LT Line Extension Mini-Estimate & Assemblies
                      </h4>
                      <span className="text-[10px] font-semibold uppercase bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded font-mono">
                        WAPDA / PESCO LT Standards
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      Complete Low Tension (LT) line extension with automatic allied materials (Cross arms, shackles, nut-bolts, fasteners).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                    (lineDetails.ltExtensionMeters || 0) > 0 
                      ? 'bg-blue-100 text-blue-900 border border-blue-300' 
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {(lineDetails.ltExtensionMeters || 0) > 0 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Active: {lineDetails.ltExtensionMeters}m ({ltMiniEstimate?.calculatedSpans || 0} Spans)</span>
                      </>
                    ) : (
                      <span>Inactive (0m)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Insertion Text Boxes (a to e) Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 bg-white/90 p-3 rounded-lg border border-blue-200">
                {/* a) LT Line Length in Meters */}
                <div>
                  <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                    a) LT Line Length (m):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={lineDetails.ltExtensionMeters || 0}
                    onChange={(e) => {
                      const m = Math.max(0, Number(e.target.value));
                      setLineDetails({ ...lineDetails, ltExtensionMeters: m, ltLengthKm: m / 1000 });
                    }}
                    className="w-full px-3 py-1.5 bg-blue-50/60 border border-blue-300 rounded-lg text-xs font-mono font-bold text-blue-950 focus:ring-blue-500"
                    placeholder="0 (m)"
                  />
                  <span className="text-[10px] text-blue-700 mt-0.5 block font-mono">
                    = {((lineDetails.ltExtensionMeters || 0) / 1000).toFixed(3)} KM
                  </span>
                </div>

                {/* b) LT Poles Type Required */}
                <div>
                  <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                    b) LT Poles Type:
                  </label>
                  <select
                    value={lineDetails.ltExtensionPoleType || 'PCC_9M'}
                    onChange={(e) => setLineDetails({ ...lineDetails, ltExtensionPoleType: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="PCC_9M">9m Pre-Stressed Concrete Pole (PCC)</option>
                    <option value="STEEL_STRUCTURE">Steel Structure / Tubular Pole</option>
                  </select>
                  <span className="text-[10px] text-blue-700 mt-0.5 block">
                    Total: <strong>{ltMiniEstimate?.totalPoles || 0} Poles</strong>
                  </span>
                </div>

                {/* c) Length of LT Spans in meter */}
                <div>
                  <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                    c) LT Span Length (m):
                  </label>
                  <select
                    value={lineDetails.ltExtensionSpanMeters || 45}
                    onChange={(e) => setLineDetails({ ...lineDetails, ltExtensionSpanMeters: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="45">45m (Standard LT Span)</option>
                    <option value="35">35m (Dense Urban Span)</option>
                    <option value="50">50m (Rural Span)</option>
                  </select>
                  <span className="text-[10px] text-blue-700 mt-0.5 block">
                    Calculated: <strong>{ltMiniEstimate?.calculatedSpans || 0} Spans</strong>
                  </span>
                </div>

                {/* d) Length of LT Conductor */}
                <div>
                  <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                    d) LT Conductor (KM):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={lineDetails.ltExtensionConductorLengthKm || ltMiniEstimate?.conductorQtyKm || 0}
                    onChange={(e) => setLineDetails({ ...lineDetails, ltExtensionConductorLengthKm: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-blue-700 mt-0.5 block font-mono">
                    4-Wire × 1.15 sag
                  </span>
                </div>

                {/* e) Type of LT Conductor Used */}
                <div>
                  <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                    e) LT Conductor Type:
                  </label>
                  <select
                    value={lineDetails.ltExtensionConductorType || 'WASP'}
                    onChange={(e) => setLineDetails({ ...lineDetails, ltExtensionConductorType: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="WASP">AAC Wasp</option>
                    <option value="RABBIT">ACSR Rabbit</option>
                    <option value="SQUIRREL">ACSR Squirrel</option>
                    <option value="ANT">ACSR Ant</option>
                    <option value="ABC">Aerial Bunched Cable ABC</option>
                  </select>
                  <span className="text-[10px] text-blue-700 mt-0.5 block font-mono">
                    Rs. {ltMiniEstimate?.grandTotal.toLocaleString('en-PK', {maximumFractionDigits: 0}) || 0} Total
                  </span>
                </div>
              </div>

              {/* Automatic Allied Materials Checklist */}
              <div className="bg-white/80 p-3 rounded-lg border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-950 uppercase tracking-wide">
                    Automatic Allied Materials & Hardware Included:
                  </span>
                  <span className="text-[10px] text-blue-700 font-mono">
                    WAPDA LT Standards BOQ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="p-1.5 bg-blue-50/50 rounded border border-blue-100 flex items-center justify-between">
                    <span className="text-slate-800">LT Channel Cross Arms / Brackets</span>
                    <strong className="text-blue-900 font-mono">{ltMiniEstimate?.totalPoles || 0} Nos</strong>
                  </div>
                  <div className="p-1.5 bg-blue-50/50 rounded border border-blue-100 flex items-center justify-between">
                    <span className="text-slate-800">Shackle Insulators with D-Irons</span>
                    <strong className="text-blue-900 font-mono">{((ltMiniEstimate?.totalPoles || 0) * 4)} Nos</strong>
                  </div>
                  <div className="p-1.5 bg-blue-50/50 rounded border border-blue-100 flex items-center justify-between">
                    <span className="text-slate-800">Galvanized Nuts, Bolts & Fasteners</span>
                    <strong className="text-blue-900 font-mono">{Math.round((ltMiniEstimate?.totalPoles || 0) * 2)} KG</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 11kV HT Line Extension Mini-Estimate Card (Feeder Design Standard Assemblies & BOQ) */}
            <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-slate-50 border border-emerald-300 rounded-xl p-4 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-2xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-emerald-950">
                        2) HT Line Extension Mini-Estimate & Feeder Assemblies
                      </h4>
                      <span className="text-[10px] font-semibold uppercase bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-mono">
                        WAPDA DDS-23 / DDS-10 Standard
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Mini estimate to join main 11kV feeder line with proposed transformer sub-station, complete with standard BOQ & rates.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                    (lineDetails.htExtensionMeters || 0) > 0 
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {(lineDetails.htExtensionMeters || 0) > 0 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Active: {lineDetails.htExtensionMeters}m ({miniEstimate?.calculatedSpans || 0} Spans)</span>
                      </>
                    ) : (
                      <span>Inactive (0m)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Quick Length Selector Presets */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-emerald-900">
                  Quick Length Presets for Proposed Transformer Spur Line:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { m: 50, label: '50m (1 Span)' },
                    { m: 100, label: '100m (1 Span)' },
                    { m: 150, label: '150m (2 Spans)' },
                    { m: 200, label: '200m (2 Spans)' },
                    { m: 300, label: '300m (3 Spans)' },
                    { m: 500, label: '500m (5 Spans)' }
                  ].map((p) => {
                    const isSelected = lineDetails.htExtensionMeters === p.m;
                    return (
                      <button
                        key={p.m}
                        type="button"
                        onClick={() => setLineDetails({ 
                          ...lineDetails, 
                          htExtensionMeters: p.m,
                          htExtensionMergeWithTransformer: true 
                        })}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs scale-102'
                            : 'bg-white hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{p.label}
                      </button>
                    );
                  })}
                  {(lineDetails.htExtensionMeters || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setLineDetails({ ...lineDetails, htExtensionMeters: 0 })}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors"
                      title="Clear HT extension"
                    >
                      ✕ Reset (0m)
                    </button>
                  )}
                </div>
              </div>

              {/* Assembly Engineering Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white/90 p-3 rounded-lg border border-emerald-200">
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                    Extension Length (Meters):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={lineDetails.htExtensionMeters || 0}
                    onChange={(e) => setLineDetails({ 
                      ...lineDetails, 
                      htExtensionMeters: Math.max(0, Number(e.target.value))
                    })}
                    className="w-full px-3 py-1.5 bg-emerald-50/60 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-950 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-emerald-700 mt-0.5 block font-mono">
                    = {((lineDetails.htExtensionMeters || 0) / 1000).toFixed(3)} KM
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                    Standard Span Spacing:
                  </label>
                  <select
                    value={lineDetails.htExtensionSpanMeters || 100}
                    onChange={(e) => setLineDetails({ 
                      ...lineDetails, 
                      htExtensionSpanMeters: Number(e.target.value) 
                    })}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="100">100 Meters (Standard 11kV Feeder Span)</option>
                    <option value="80">80 Meters (Medium Suburban Span)</option>
                    <option value="50">50 Meters (Short Span / Dense Area)</option>
                  </select>
                  <span className="text-[10px] text-emerald-700 mt-0.5 block">
                    Calculated: <strong>{miniEstimate?.calculatedSpans || 0} Spans</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                    11kV Conductor Type:
                  </label>
                  <select
                    value={lineDetails.htExtensionConductorType || 'DOG'}
                    onChange={(e) => setLineDetails({ 
                      ...lineDetails, 
                      htExtensionConductorType: e.target.value 
                    })}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="DOG">ACSR Dog (100mm² / Code 02110) - Standard</option>
                    <option value="RABBIT">ACSR Rabbit (50mm² / Code 02120) - Light Spur</option>
                    <option value="PANTHER">ACSR Panther (200mm² / Code 02150) - Heavy</option>
                    <option value="OSPREY">ACSR Osprey (200mm² / Code 02160) - Trunk</option>
                    <option value="WASP">AAC Wasp (80mm² / Code 02330)</option>
                  </select>
                  <span className="text-[10px] text-emerald-700 mt-0.5 block">
                    Qty: <strong>{miniEstimate?.conductorQtyKm || 0} KM</strong> (3-Ph × 1.15 sag)
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                    Pole / Structure Assembly:
                  </label>
                  <select
                    value={lineDetails.htExtensionPoleType || 'PC_SPUN_36FT'}
                    onChange={(e) => setLineDetails({ 
                      ...lineDetails, 
                      htExtensionPoleType: e.target.value as any 
                    })}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="PC_SPUN_36FT">36ft PC Spun Pole HC (DDS-23:89 / Code 01110)</option>
                    <option value="STEEL_LATTICE_34_8FT">34.8ft Steel Lattice H-Type (Code 01210)</option>
                  </select>
                  <span className="text-[10px] text-emerald-700 mt-0.5 block">
                    Total: <strong>{miniEstimate?.totalPoles || 0} Poles</strong> ({miniEstimate?.intermediatePoles || 0} Int + 1 Term)
                  </span>
                </div>
              </div>

              {/* Standard 11kV Feeder Assemblies Checklist (WAPDA / DISCO Standards) */}
              <div className="bg-white/80 p-3 rounded-lg border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                    Included 11kV Line Standard Assemblies & Protection Hardware:
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono">
                    Official DISCO BOQ Schedule Specs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-1.5 bg-emerald-50/50 rounded border border-emerald-100">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-800">
                      <strong>11kV V-Cross Arm (06260)</strong> & B-11 Braces ({miniEstimate?.totalPoles || 0} Sets)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-emerald-50/50 rounded border border-emerald-100">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-800">
                      <strong>Pin Insulators & GI Pins (05210/05410)</strong> ({((miniEstimate?.intermediatePoles || 0) * 3)} Nos)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-emerald-50/50 rounded border border-emerald-100">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-800">
                      <strong>Tension Disc Strings 45kN (05230)</strong> (3 Sets Terminal)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-emerald-50/50 rounded border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lineDetails.htExtensionIncludePgClamps !== false}
                      onChange={(e) => setLineDetails({ ...lineDetails, htExtensionIncludePgClamps: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-800">
                      <strong>PG Tapping Connectors (04130)</strong> (3 Nos at Tap-Off)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-emerald-50/50 rounded border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lineDetails.htExtensionIncludeCutouts !== false}
                      onChange={(e) => setLineDetails({ ...lineDetails, htExtensionIncludeCutouts: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-800">
                      <strong>11kV Drop Out Fuses (13311)</strong> & 10K Links (3 Nos)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-emerald-50/50 rounded border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lineDetails.htExtensionIncludeLightningArresters !== false}
                      onChange={(e) => setLineDetails({ ...lineDetails, htExtensionIncludeLightningArresters: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-800">
                      <strong>Lightning Arresters 9kV/10kA (07110)</strong> (3 Nos)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-emerald-50/50 rounded border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lineDetails.htExtensionIncludeStaySets !== false}
                      onChange={(e) => setLineDetails({ ...lineDetails, htExtensionIncludeStaySets: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-800">
                      <strong>Stay Sets Complete (15310)</strong> & 7/8 Wire (2 Sets)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-emerald-50/50 rounded border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lineDetails.htExtensionIncludeEarthing !== false}
                      onChange={(e) => setLineDetails({ ...lineDetails, htExtensionIncludeEarthing: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-800">
                      <strong>Earthing Set & 8 SWG Wire (03110)</strong> (1 Set)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-emerald-50/50 rounded border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lineDetails.htExtensionIncludeDangerPlates !== false}
                      onChange={(e) => setLineDetails({ ...lineDetails, htExtensionIncludeDangerPlates: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-800">
                      <strong>Danger Notice Plates (07310)</strong> ({miniEstimate?.totalPoles || 0} Nos)
                    </span>
                  </label>
                </div>
              </div>

              {/* Mini Estimate BOQ Table & Rates */}
              {miniEstimate && miniEstimate.items.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowMiniEstBoqTable(!showMiniEstBoqTable)}
                      className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 hover:text-emerald-700 cursor-pointer"
                    >
                      {showMiniEstBoqTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>Mini-Estimate Itemized BOQ & Schedule Rates ({miniEstimate.items.length} Assemblies)</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMiniEstModal(true)}
                        className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        <span>View / Print Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApplyMiniEstimateToMainBoq}
                        className="px-3 py-1 text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                        title="Directly sync mini estimate items into main BOQ table"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sync with Project BOQ</span>
                      </button>
                    </div>
                  </div>

                  {showMiniEstBoqTable && (
                    <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-emerald-100/70 text-emerald-950 font-bold border-b border-emerald-200 text-[11px]">
                            <th className="py-2 px-2.5 text-center w-8">#</th>
                            <th className="py-2 px-2.5 w-20">Code</th>
                            <th className="py-2 px-3">11kV Assembly Description & Specification</th>
                            <th className="py-2 px-2 text-center w-14">Unit</th>
                            <th className="py-2 px-2 text-right w-16">Qty</th>
                            <th className="py-2 px-3 text-right">Material Rate</th>
                            <th className="py-2 px-3 text-right">Material Amt</th>
                            <th className="py-2 px-3 text-right">Total (PKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {miniEstimate.items.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-emerald-50/40">
                              <td className="py-1.5 px-2.5 text-center text-slate-500">{idx + 1}</td>
                              <td className="py-1.5 px-2.5 font-bold text-emerald-900">{item.materialCode}</td>
                              <td className="py-1.5 px-3 font-sans">
                                <div className="font-bold text-slate-900">{item.description}</div>
                                <div className="text-[10px] text-slate-500">{item.specification}</div>
                              </td>
                              <td className="py-1.5 px-2 text-center font-sans text-slate-600">{item.unit}</td>
                              <td className="py-1.5 px-2 text-right font-bold text-slate-900">{item.quantity}</td>
                              <td className="py-1.5 px-3 text-right text-slate-700">
                                Rs. {item.unitRate.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                                Rs. {item.materialAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold text-emerald-900 bg-emerald-50/50">
                                Rs. {item.totalAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-emerald-100/90 font-bold text-emerald-950 border-t-2 border-emerald-300 text-xs">
                            <td colSpan={6} className="py-2.5 px-3 font-sans text-right">
                              Subtotal 11kV HT Extension Mini-Estimate ({miniEstimate.meters}m):
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-950">
                              Rs. {miniEstimate.materialTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-950 bg-emerald-200/80">
                              Rs. {miniEstimate.grandTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Merged Lump Sum Package Integration Bar */}
                  <div className="bg-emerald-950 text-white rounded-xl p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-800 pb-2">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-emerald-100">
                        <input
                          type="checkbox"
                          checked={lineDetails.htExtensionMergeWithTransformer !== false}
                          onChange={(e) => {
                            const willMerge = e.target.checked;
                            setLineDetails({ ...lineDetails, htExtensionMergeWithTransformer: willMerge });
                            if (willMerge) {
                              handleApplyMiniEstimateToMainBoq();
                            }
                          }}
                          className="rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4 cursor-pointer"
                        />
                        <span>Merge HT Extension Mini-Estimate with Proposed Transformer Package</span>
                      </label>

                      <span className="text-[10px] font-mono bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-bold self-start sm:self-auto">
                        Unified Turnkey Project Estimate
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-emerald-900/80 p-2.5 rounded-lg border border-emerald-800">
                        <div className="text-[10px] text-emerald-300 uppercase font-semibold">1. Transformer Sub-Station</div>
                        <div className="text-base font-bold font-mono text-white mt-0.5">
                          Rs. {transformerBaseTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          {lineDetails.transformerCapacityKva || 100} kVA Package / Hardware
                        </div>
                      </div>

                      <div className="bg-emerald-900/80 p-2.5 rounded-lg border border-emerald-800">
                        <div className="text-[10px] text-emerald-300 uppercase font-semibold">2. 11kV HT Extension Mini Estimate</div>
                        <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">
                          + Rs. {miniEstimate.grandTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          {miniEstimate.meters}m ({miniEstimate.calculatedSpans} Spans, {miniEstimate.totalPoles} Poles)
                        </div>
                      </div>

                      <div className="bg-emerald-800 p-2.5 rounded-lg border border-emerald-700 shadow-inner">
                        <div className="text-[10px] text-emerald-200 uppercase font-bold">Combined Full Estimate (Merged)</div>
                        <div className="text-lg font-extrabold font-mono text-emerald-100 mt-0.5">
                          Rs. {(transformerBaseTotal + miniEstimate.grandTotal).toLocaleString('en-PK', {minimumFractionDigits: 2})}
                        </div>
                        <div className="text-[10px] text-emerald-300 font-semibold">
                          Turnkey Material & Labour Full BOQ
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bifurcation & Cut-Off Point Configuration (For Separating Existing vs Remaining Lines) */}
            <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-amber-950">
                  <input
                    type="checkbox"
                    checked={lineDetails.bifurcationEnabled || false}
                    onChange={(e) => setLineDetails({ ...lineDetails, bifurcationEnabled: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>Enable Bifurcation / Cut-Off Point (Separate Existing Line vs. Remaining Line Extension)</span>
                </label>
                <span className="text-[10px] font-mono bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-bold">
                  Bifurcation / Tee-Off Split
                </span>
              </div>

              {lineDetails.bifurcationEnabled && (
                <div className="space-y-3 pt-2 border-t border-amber-200/85 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">Manual Cut-Off / Tee-Off Pole:</label>
                      <select
                        value={lineDetails.cutOffPoleNo || 'Pole #2'}
                        onChange={(e) => {
                          const val = e.target.value;
                          const totalPoles = lineDetails.htPoles || 4;
                          const poleNumMatch = val.match(/\d+/);
                          const poleIdx = poleNumMatch ? parseInt(poleNumMatch[0], 10) : 2;
                          const ratio = Math.min(Math.max(poleIdx / totalPoles, 0.1), 0.9);
                          const totalKm = lineDetails.htLengthKm || 0.4;
                          const ex = Number((totalKm * ratio).toFixed(2));
                          const rem = Number((totalKm - ex).toFixed(2));
                          setLineDetails({
                            ...lineDetails,
                            cutOffPoleNo: val,
                            existingPortionKm: ex,
                            remainingPortionKm: rem
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      >
                        {Array.from({ length: Math.max(2, lineDetails.htPoles || 4) }, (_, i) => (
                          <option key={i + 1} value={`Pole #${i + 1}`}>
                            Pole #{i + 1} of {lineDetails.htPoles || 4} (Cut-Off Junction)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">Bifurcation / Split Type:</label>
                      <select
                        value={lineDetails.bifurcationType || 'tee_off'}
                        onChange={(e) => setLineDetails({ ...lineDetails, bifurcationType: e.target.value as any })}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900"
                      >
                        <option value="tee_off">Tee-Off / Tap-Off Connection</option>
                        <option value="section_split">Section Split / Sectionalizer</option>
                        <option value="spur_line">Spur Line Extension</option>
                        <option value="feeder_segregation">Feeder Segregation</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          const half = Number(((lineDetails.htLengthKm || 0.4) / 2).toFixed(2));
                          setLineDetails({
                            ...lineDetails,
                            existingPortionKm: half,
                            remainingPortionKm: half
                          });
                        }}
                        className="w-full py-1.5 px-3 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-amber-300 shadow-2xs"
                      >
                        ⚖️ Split 50 / 50 Equal Portions
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/80 p-3 rounded-lg border border-amber-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">Existing Portion Length (km):</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={lineDetails.existingPortionKm || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const total = lineDetails.htLengthKm || 0.4;
                          setLineDetails({
                            ...lineDetails,
                            existingPortionKm: val,
                            remainingPortionKm: Math.max(0, Number((total - val).toFixed(2)))
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Baseline radial existing feeder segment</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">Remaining Portion Length (km):</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={lineDetails.remainingPortionKm || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const total = lineDetails.htLengthKm || 0.4;
                          setLineDetails({
                            ...lineDetails,
                            remainingPortionKm: val,
                            existingPortionKm: Math.max(0, Number((total - val).toFixed(2)))
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">New proposed line extension segment</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transformer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Transformer Structures</label>
                <input
                  type="number"
                  min="0"
                  value={lineDetails.transformerStructures}
                  onChange={(e) => setLineDetails({ ...lineDetails, transformerStructures: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Transformer Count</label>
                <input
                  type="number"
                  min="0"
                  value={lineDetails.transformerCount}
                  onChange={(e) => setLineDetails({ ...lineDetails, transformerCount: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Transformer Capacity (kVA)</label>
                <select
                  value={lineDetails.transformerCapacityKva}
                  onChange={(e) => {
                    const newKva = Number(e.target.value);
                    if (newKva === 25 && (!lineDetails.htLengthKm || lineDetails.htLengthKm === 0)) {
                      handleSelectPreset(PRESET_COMBINATIONS[0]);
                      return;
                    }
                    const updated = { 
                      ...lineDetails, 
                      transformerCapacityKva: newKva,
                      staySets: newKva === 25 ? 0 : lineDetails.staySets
                    };
                    setLineDetails(updated);
                    if (newKva === 25) {
                      setItems(prev => prev.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD')));
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                >
                  <option value={0}>None (Line Only)</option>
                  <option value={25}>25 kVA</option>
                  <option value={50}>50 kVA</option>
                  <option value={100}>100 kVA (Standard)</option>
                  <option value={200}>200 kVA</option>
                  <option value={400}>400 kVA</option>
                  <option value={630}>630 kVA</option>
                </select>
                {lineDetails.transformerCapacityKva === 25 && (
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(PRESET_COMBINATIONS[0])}
                    className="mt-1.5 w-full py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Load official 18-item WAPDA lump sum schedule for 25 kVA Transformer"
                  >
                    ⚡ Load 18-Item 25 kVA Package (Rs. 447,128.07)
                  </button>
                )}
              </div>
            </div>

            {/* Transparent Calculation Breakdown Drawer */}
            {calculationSteps.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCalculationDrawer(!showCalculationDrawer)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-700 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    Automatic Quantity Engineering Breakdown ({calculationSteps.length} Formulas Audited)
                  </span>
                  {showCalculationDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showCalculationDrawer && (
                  <div className="divide-y divide-slate-200 pt-2 text-xs font-mono">
                    {calculationSteps.map((step, idx) => (
                      <div key={idx} className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <span className="font-bold text-slate-900 font-sans">{step.component}: </span>
                          <span className="text-slate-600">{step.calculation}</span>
                        </div>
                        <div className="font-bold text-blue-700 shrink-0">
                          = {step.resultQuantity} {step.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Searchable Material Selection Table (BOQ) */}
          <div id="boq-materials-table" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 scroll-mt-6">
            {/* Active Combination Preset Notification Banner */}
            {lastAppliedPresetName && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950 animate-in fade-in duration-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Combination Active:</strong> {lastAppliedPresetName} — Material quantities below updated automatically.
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {items.length} Materials
                  </span>
                  <span className="text-emerald-700 font-bold">
                    PKR {items.reduce((s, i) => s + (i.totalAmount || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* 25 kVA Transformer Lump Sum Package Official Notification Callout */}
            {(lineDetails.is25KvaLumpSumPackage || (lineDetails.transformerCapacityKva === 25 && items.some(i => i.materialCode === '08110'))) && (
              <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <span className="p-1.5 bg-rose-600 text-white rounded-lg text-sm shrink-0">⚡</span>
                  <div>
                    <h4 className="font-extrabold text-rose-950 text-sm">
                      Official WAPDA Lump Sum Material Schedule: 25 KVA Transformer Installation
                    </h4>
                    <p className="text-rose-800 text-[11px] mt-0.5">
                      18-item standard schedule with exact CSR rates. Net cost is calculated by adding <strong>10% Labour Cost</strong> and <strong>16% Over Heads</strong> directly on material cost.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-lg border border-rose-200 shrink-0 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Material</span>
                    <span className="font-bold text-slate-900">Rs. {computedCharges.materialCost.toLocaleString()}</span>
                  </div>
                  <span className="text-slate-400 font-bold">+</span>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">10% Labour</span>
                    <span className="font-bold text-rose-700">Rs. {computedCharges.labourCost.toLocaleString()}</span>
                  </div>
                  <span className="text-slate-400 font-bold">+</span>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">16% Overheads</span>
                    <span className="font-bold text-blue-700">Rs. {((computedCharges.departmentalOverheadAmount + computedCharges.contractorOverheadAmount)).toLocaleString()}</span>
                  </div>
                  <span className="text-slate-400 font-bold">=</span>
                  <div>
                    <span className="text-[10px] text-emerald-800 block uppercase font-bold">Net Cost</span>
                    <span className="font-black text-emerald-700 text-sm">Rs. {computedCharges.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">3</span>
                  Bill of Quantities (BOQ) Materials & Erection Schedule
                </h3>
                <span className="text-[11px] text-slate-500">
                  {items.length} items included. Search by Material Name or Code to add materials, or adjust quantities and rates below.
                </span>
              </div>

              {/* Quick Print & Export Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Browse and search full materials catalog"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Browse Full Catalog</span>
                </button>

                <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                  <button
                    type="button"
                    onClick={() => {
                      const currentRecord: CostEstimateRecord = {
                        id: initialEstimate?.id || 'preview',
                        projectInfo,
                        type: estimateType,
                        status,
                        lineDetails,
                        items,
                        charges: computedCharges,
                        calculationSteps,
                        auditTrail: [],
                        createdAt: initialEstimate?.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };
                      onPrintEstimate(currentRecord, 'print');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    title="Print Document"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentRecord: CostEstimateRecord = {
                        id: initialEstimate?.id || 'preview',
                        projectInfo,
                        type: estimateType,
                        status,
                        lineDetails,
                        items,
                        charges: computedCharges,
                        calculationSteps,
                        auditTrail: [],
                        createdAt: initialEstimate?.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };
                      onPrintEstimate(currentRecord, 'pdf');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    title="Save as PDF"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Material Search Bar for Adding Materials Through Name or Code */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2.5 relative">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-blue-600" />
                  <span>Search Material to Add to BOQ (by Name or Store Code):</span>
                </label>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                  <span>Catalog: <strong>{materials.length}</strong> items available</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={materialSearchText}
                    onChange={(e) => {
                      setMaterialSearchText(e.target.value);
                      setIsSearchDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (materialSearchText.trim()) setIsSearchDropdownOpen(true);
                    }}
                    placeholder="Search material through Name or Store Code (e.g. 08110, 08120, DOG, stay rod, 15310, pin insulator, transformer)..."
                    className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                  />
                  {materialSearchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setMaterialSearchText('');
                        setIsSearchDropdownOpen(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category filter pills for search */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs shrink-0">
                  {(['ALL', 'TRANSFORMERS', 'POLES', 'CONDUCTORS', 'HARDWARE', 'INSULATORS'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMaterialCategoryFilter(cat)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        materialCategoryFilter === cat
                          ? 'bg-blue-600 text-white shadow-2xs font-bold'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      {cat === 'ALL' ? 'All' : cat === 'TRANSFORMERS' ? 'Transformers' : cat === 'POLES' ? 'Poles' : cat === 'CONDUCTORS' ? 'Conductors' : cat === 'HARDWARE' ? 'Hardware' : 'Insulators'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Search Results Dropdown Popover */}
              {isSearchDropdownOpen && materialSearchText.trim() && (
                <div className="absolute left-3.5 right-3.5 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-xl z-30 max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-2.5 bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between sticky top-0 z-10 border-b border-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-blue-600" />
                      Matching Materials: <strong>{searchFilteredMaterials.length}</strong> items found
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSearchDropdownOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {searchFilteredMaterials.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs space-y-1">
                      <p className="font-semibold text-slate-700">No material found matching "{materialSearchText}"</p>
                      <p className="text-[11px] text-slate-400">Try searching by Store Code (e.g. 08110, 15310, 01030) or Name (e.g. DOG, stay, transformer, pole).</p>
                    </div>
                  ) : (
                    searchFilteredMaterials.map(mat => {
                      const inBoqItem = items.find(i => i.materialCode === mat.code);
                      const isRecentlyAdded = recentlyAddedCode === mat.code;

                      return (
                        <div
                          key={mat.id}
                          className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-blue-50/50 transition-colors ${
                            isRecentlyAdded ? 'bg-emerald-50/80 border-l-4 border-emerald-500' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="px-2 py-1 rounded bg-slate-900 text-amber-300 font-mono font-bold text-xs shrink-0 border border-slate-800">
                              {mat.code}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{mat.name}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  {mat.category}
                                </span>
                                {mat.voltageApplicability && (
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    mat.voltageApplicability === 'HT' ? 'bg-blue-100 text-blue-800' :
                                    mat.voltageApplicability === 'LT' ? 'bg-emerald-100 text-emerald-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {mat.voltageApplicability}
                                  </span>
                                )}
                              </div>
                              {mat.specification && (
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{mat.specification}</p>
                              )}
                              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600 mt-1">
                                <span>Unit: <strong>{mat.unit}</strong></span>
                                <span>•</span>
                                <span>Material Rate: <strong className="text-slate-900">PKR {mat.materialRate.toLocaleString()}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {inBoqItem ? (
                              <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                <span className="text-[11px] font-bold text-emerald-800">In BOQ: {inBoqItem.quantity} {inBoqItem.unit}</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddMaterialToBoq(mat.code, 1)}
                                  className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-colors"
                                  title="Add +1 to quantity"
                                >
                                  +1
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddMaterialToBoq(mat.code, 1)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add to BOQ</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Filter Bar for Active BOQ Items Table */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={tableFilterQuery}
                  onChange={(e) => setTableFilterQuery(e.target.value)}
                  placeholder="Filter active BOQ items by Name or Code..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {tableFilterQuery && (
                  <button
                    type="button"
                    onClick={() => setTableFilterQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                {tableFilterQuery ? (
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Showing {filteredBoqItems.length} of {items.length} items matching "{tableFilterQuery}"
                  </span>
                ) : (
                  <span>Total Items in BOQ: <strong>{items.length}</strong></span>
                )}
              </div>
            </div>

            {/* Segregation Filter Tabs by Voltage Nature of Work */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
                  <span>Nature of Work Segregation:</span>
                </span>
                {[
                  { id: 'all', label: `All Materials (${filteredBoqItems.length})`, count: filteredBoqItems.length },
                  { id: 'ht', label: `⚡ HT Line Materials (11kV) (${filteredBoqItems.filter(i => getMaterialSegregationType(i) === 'ht').length})`, count: filteredBoqItems.filter(i => getMaterialSegregationType(i) === 'ht').length },
                  { id: 'lt', label: `⚡ LT Line Materials (400V) (${filteredBoqItems.filter(i => getMaterialSegregationType(i) === 'lt').length})`, count: filteredBoqItems.filter(i => getMaterialSegregationType(i) === 'lt').length },
                  { id: 'substation', label: `🔌 Substation & Transformer (${filteredBoqItems.filter(i => getMaterialSegregationType(i) === 'substation').length})`, count: filteredBoqItems.filter(i => getMaterialSegregationType(i) === 'substation').length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setBoqSegregationTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      boqSegregationTab === tab.id
                        ? 'bg-slate-900 text-amber-300 shadow-sm ring-1 ring-slate-800'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {boqSegregationTab !== 'all' && (
                <button
                  type="button"
                  onClick={() => setBoqSegregationTab('all')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  Show All
                </button>
              )}
            </div>

            {/* Table */}
            {selectedItemIds.size > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelectedItems}
                className="mb-2 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete {selectedItemIds.size} Selected
              </button>
            )}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-2 text-center w-10">
                      <input 
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedItemIds.size > 0 && selectedItemIds.size === segregatedBoqItems.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemIds(new Set(segregatedBoqItems.map(i => i.id)));
                          } else {
                            setSelectedItemIds(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="py-2.5 px-3">Material Code</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-2 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-right w-24">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate (PKR)</th>
                    <th className="py-2.5 px-3 text-right">Material Amount (PKR)</th>
                    <th className="py-2.5 px-2 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {segregatedBoqItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                        {boqSegregationTab !== 'all'
                          ? `No ${boqSegregationTab.toUpperCase()} materials found in BOQ for this estimate.`
                          : tableFilterQuery 
                            ? `No items found in BOQ matching "${tableFilterQuery}".`
                            : 'No materials in BOQ yet. Use the search bar above or click "Calculate Required Materials".'}
                      </td>
                    </tr>
                  ) : (
                    segregatedBoqItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2 text-center text-slate-400 font-sans text-[11px]">
                          <input 
                            type="checkbox"
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={selectedItemIds.has(item.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedItemIds);
                              if (e.target.checked) newSet.add(item.id);
                              else newSet.delete(item.id);
                              setSelectedItemIds(newSet);
                            }}
                          />
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {item.materialCode}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans max-w-xs">
                          <span className="font-bold text-slate-900 block leading-tight">{item.description}</span>
                          {item.calculationNotes && (
                            <span className="text-[10px] text-blue-700 font-medium block mt-0.5 leading-tight">
                              {item.calculationNotes}
                            </span>
                          )}
                          {item.manualOverride && (
                            <span className="text-[10px] text-amber-700 font-mono font-bold block mt-0.5">
                              [Manually Adjusted]
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-sans text-slate-600 font-medium">{item.unit}</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                            className="w-20 px-1.5 py-1 text-right bg-white border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitRate}
                            onChange={(e) => handleUpdateItem(item.id, 'unitRate', e.target.value)}
                            className="w-24 px-1.5 py-1 text-right bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {item.materialAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateItem(item)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                              title="Duplicate row"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-rose-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                              title="Delete from BOQ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Dismantle Material Section */}
            <DismantleMaterialSection 
              materials={materials}
              items={dismantleItems}
              onUpdateItems={setDismantleItems}
            />
            
            {/* Foundation Charges Section */}
            <FoundationChargesSection 
              details={lineDetails}
              onUpdateDetails={setLineDetails}
            />

            {/* BOQ Subtotals Summary */}
            <div className="flex flex-wrap items-center justify-end gap-6 pt-3 text-xs border-t border-slate-200">
              <div>
                <span className="text-slate-500">Material Subtotal: </span>
                <strong className="text-slate-900 font-mono">PKR {computedCharges.materialCost.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500">Labour Subtotal ({percentages.labourPercent}% on Material): </span>
                <strong className="text-slate-900 font-mono">PKR {computedCharges.labourCost.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500">Foundation Charges: </span>
                <strong className="text-emerald-700 font-mono">PKR {calculateFoundationCharges(lineDetails).toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500">Prime Subtotal (Material + Labour): </span>
                <strong className="text-blue-900 font-mono font-bold">
                  PKR {(computedCharges.materialCost + computedCharges.labourCost + calculateFoundationCharges(lineDetails)).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          {/* 4. Transportation & Handling Charges */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                Transportation, Hauling & Loading Charges
              </h3>
              <span className="font-mono text-xs font-bold text-slate-900">
                PKR {computedCharges.transportationCost.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Calculation Method</label>
                <select
                  value={transportSettings.method}
                  onChange={(e) => setTransportSettings({ ...transportSettings, method: e.target.value as any })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="PER_KM">Per Kilometer Haulage</option>
                  <option value="PERCENT_OF_MATERIAL">5% of Material Cost</option>
                  <option value="FIXED">Fixed Lump-Sum</option>
                </select>
              </div>

              {transportSettings.method === 'PER_KM' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">One-Way Distance (km)</label>
                    <input
                      type="number"
                      min="0"
                      value={transportSettings.distanceKm}
                      onChange={(e) => setTransportSettings({ ...transportSettings, distanceKm: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Haulage Rate (PKR / km)</label>
                    <input
                      type="number"
                      min="0"
                      value={transportSettings.ratePerKm}
                      onChange={(e) => setTransportSettings({ ...transportSettings, ratePerKm: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Loading / Unloading (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={transportSettings.loadingUnloadingFixed}
                  onChange={(e) => setTransportSettings({ ...transportSettings, loadingUnloadingFixed: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Additional Charges & Executive Estimate Summary */}
        <div className="space-y-6">

          {/* Additional Charges / Overheads Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Overheads, Contingencies & Percentage Charges</h3>
                <p className="text-[11px] text-slate-500">All percentage rates calculated directly on total Material Cost (PKR {computedCharges.materialCost.toLocaleString()})</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* 1. Labour Cost Percentage Input */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <label className="font-semibold text-slate-800 block">Labour Cost (% on Material)</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    PKR {computedCharges.labourCost.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={percentages.labourPercent}
                    onChange={(e) => setPercentages({ ...percentages, labourPercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-20 px-2 py-1 text-xs font-bold font-mono text-right bg-white border border-slate-300 rounded-md text-slate-900 shadow-2xs focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>

              {/* 2. Engineering & Supervision Charges Input */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <label className="font-semibold text-slate-800 block">Engineering & Supervision Charges</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    PKR {computedCharges.engineeringChargesAmount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={percentages.engineeringPercent}
                    onChange={(e) => setPercentages({ ...percentages, engineeringPercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-20 px-2 py-1 text-xs font-bold font-mono text-right bg-white border border-slate-300 rounded-md text-slate-900 shadow-2xs focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>

              {/* 3. Contingency Allowance Input */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <label className="font-semibold text-slate-800 block">Contingency Allowance</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    PKR {computedCharges.contingencyAmount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={percentages.contingencyPercent}
                    onChange={(e) => setPercentages({ ...percentages, contingencyPercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-20 px-2 py-1 text-xs font-bold font-mono text-right bg-white border border-slate-300 rounded-md text-slate-900 shadow-2xs focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>

              {/* 4. Departmental Overheads Input */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <label className="font-semibold text-slate-800 block">Departmental Overheads</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    PKR {computedCharges.departmentalOverheadAmount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={percentages.departmentalPercent}
                    onChange={(e) => setPercentages({ ...percentages, departmentalPercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-20 px-2 py-1 text-xs font-bold font-mono text-right bg-white border border-slate-300 rounded-md text-slate-900 shadow-2xs focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>

              {/* 5. Contractor Overheads / Profit Input */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <label className="font-semibold text-slate-800 block">Contractor Overheads / Profit</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    PKR {computedCharges.contractorOverheadAmount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={percentages.contractorPercent}
                    onChange={(e) => setPercentages({ ...percentages, contractorPercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-20 px-2 py-1 text-xs font-bold font-mono text-right bg-white border border-slate-300 rounded-md text-slate-900 shadow-2xs focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>

              {/* 6. Taxes / GST Applicable Input */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <label className="font-semibold text-slate-800 block">Taxes / GST Applicable</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    PKR {computedCharges.taxGstAmount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={percentages.taxPercent}
                    onChange={(e) => setPercentages({ ...percentages, taxPercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-20 px-2 py-1 text-xs font-bold font-mono text-right bg-white border border-slate-300 rounded-md text-slate-900 shadow-2xs focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <label className="font-semibold text-slate-700">Other Lump-Sum Charges (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={percentages.otherChargesFixed}
                  onChange={(e) => setPercentages({ ...percentages, otherChargesFixed: Number(e.target.value) })}
                  className="w-24 px-1.5 py-1 text-right bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>
              
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDismantleDeducted}
                    onChange={(e) => setIsDismantleDeducted(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Deduct Dismantle Cost</span>
                  {isDismantleDeducted && (
                    <span className="text-slate-600 font-normal ml-auto">
                      (Rs. {netDismantleCost.toLocaleString('en-PK', {minimumFractionDigits: 2})})
                    </span>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Official PESCO Estimate Summary Card */}
          <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-mono text-amber-400 font-bold tracking-widest uppercase">
                {computedCharges.overheadBasis === 'MATERIAL' ? '25 KVA TRANSFORMER · LUMP SUM PACKAGE' : 'PESCO · ESTIMATE SUMMARY'}
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                {computedCharges.overheadBasis === 'MATERIAL' ? 'Net Estimated Sub-Station Cost' : 'Total Sanctioned Estimate Cost'}
              </h3>
              <p className="text-xs text-slate-400">
                {computedCharges.overheadBasis === 'MATERIAL' 
                  ? `18-Item Official Material Schedule + ${percentages.labourPercent}% Labour + ${percentages.departmentalPercent + percentages.contractorPercent}% Over Heads`
                  : `${estimateType.replace(/_/g, ' ')} · ${totalKm.toFixed(2)} km Line`}
              </p>
            </div>

            {computedCharges.overheadBasis === 'MATERIAL' ? (
              <div className="space-y-2 text-xs divide-y divide-slate-800/80 font-mono">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Material Cost (18 WAPDA Items):</span>
                  <span className="text-slate-100 font-bold">Rs. {computedCharges.materialCost.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Labour Cost ({percentages.labourPercent}% on Material Cost):</span>
                  <span className="text-rose-400 font-bold">Rs. {computedCharges.labourCost.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1 text-slate-300">
                  <span className="text-slate-400 font-sans">Subtotal (Material + {percentages.labourPercent}% Labour):</span>
                  <span className="font-bold">Rs. {(computedCharges.materialCost + computedCharges.labourCost).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Departmental Overhead ({percentages.departmentalPercent}% on Material):</span>
                  <span className="text-slate-200">Rs. {computedCharges.departmentalOverheadAmount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Contractor Overhead ({percentages.contractorPercent}% on Material):</span>
                  <span className="text-slate-200">Rs. {computedCharges.contractorOverheadAmount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1 text-amber-300 font-bold">
                  <span className="font-sans">Total Over Heads ({percentages.departmentalPercent + percentages.contractorPercent}% on Material):</span>
                  <span>Rs. {(computedCharges.departmentalOverheadAmount + computedCharges.contractorOverheadAmount).toLocaleString()}</span>
                </div>

                {computedCharges.transportationCost > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 font-sans">Transportation & Hauling:</span>
                    <span className="text-slate-200">Rs. {computedCharges.transportationCost.toLocaleString()}</span>
                  </div>
                )}

                {computedCharges.taxGstAmount > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 font-sans">Taxes / GST ({percentages.taxPercent}%):</span>
                    <span className="text-slate-200">Rs. {computedCharges.taxGstAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-xs divide-y divide-slate-800/80 font-mono">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Material Cost:</span>
                  <span className="text-slate-200">Rs. {computedCharges.materialCost.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Labour / Erection Cost ({percentages.labourPercent}% on Material):</span>
                  <span className="text-slate-200">Rs. {computedCharges.labourCost.toLocaleString()}</span>
                </div>

                {computedCharges.transportationCost > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 font-sans">Transportation & Hauling:</span>
                    <span className="text-slate-200">Rs. {computedCharges.transportationCost.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Engineering Charges ({percentages.engineeringPercent}% on Material):</span>
                  <span className="text-slate-200">Rs. {computedCharges.engineeringChargesAmount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Contingency ({percentages.contingencyPercent}% on Material):</span>
                  <span className="text-slate-200">Rs. {computedCharges.contingencyAmount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Departmental Overhead ({percentages.departmentalPercent}% on Material):</span>
                  <span className="text-slate-200">Rs. {computedCharges.departmentalOverheadAmount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Contractor Overhead ({percentages.contractorPercent}% on Material):</span>
                  <span className="text-slate-200">Rs. {computedCharges.contractorOverheadAmount.toLocaleString()}</span>
                </div>

                {computedCharges.taxGstAmount > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 font-sans">Taxes / GST ({percentages.taxPercent}% on Material):</span>
                    <span className="text-slate-200">Rs. {computedCharges.taxGstAmount.toLocaleString()}</span>
                  </div>
                )}

                {computedCharges.otherChargesAmount > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 font-sans">Other Charges:</span>
                    <span className="text-slate-200">Rs. {computedCharges.otherChargesAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Grand Total & Final Estimated Cost Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 font-sans uppercase block tracking-wider">
                  {computedCharges.overheadBasis === 'MATERIAL' ? 'NET ESTIMATED COST (GRAND TOTAL):' : 'ESTIMATED GRAND TOTAL:'}
                </span>
                <div className="text-xl font-bold text-slate-200 font-mono tracking-tight mt-0.5">
                  Rs. {finalTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-800">
                <span className="text-[11px] text-amber-400 font-sans uppercase font-bold block tracking-wider">
                  Final Estimated Cost (incl. 0.5% Add-on):
                </span>
                <div className="text-2xl font-black text-amber-400 font-mono tracking-tight mt-0.5">
                  Rs. {finalEstimatedCostWith05.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Current Status:</span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                status === 'SUBMITTED' ? 'bg-blue-950 text-blue-300 border border-blue-700' :
                'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {status}
              </span>
            </div>

            {onSaveUnifiedProject && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleSave(status);
                    onSaveUnifiedProject();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer ring-1 ring-emerald-300 active:scale-95"
                  title="Save both 1. FLADIX Feeder Loss Analysis and 2. Line Cost Estimation together as One Project"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>Save as One Project (FLADIX & Cost)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Material Catalog Browser Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Material Catalog Browser & Search</h3>
                  <p className="text-xs text-slate-300">
                    Search by Material Name, Store Code, or Category to insert materials into the Bill of Quantities (BOQ).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search and Filters Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={catalogModalSearch}
                  onChange={(e) => setCatalogModalSearch(e.target.value)}
                  placeholder="Search material through Name or Store Code (e.g. 08110, 08120, DOG, stay, 15310, transformer, pole)..."
                  className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  autoFocus
                />
                {catalogModalSearch && (
                  <button
                    type="button"
                    onClick={() => setCatalogModalSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
                {(['ALL', 'TRANSFORMERS', 'POLES', 'CONDUCTORS', 'HARDWARE', 'INSULATORS', 'OTHER'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogModalCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap text-xs ${
                      catalogModalCategory === cat
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Items' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Catalog Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 bg-slate-100">
                    <th className="py-2.5 px-3">Store Code</th>
                    <th className="py-2.5 px-3">Material Name & Specification</th>
                    <th className="py-2.5 px-2 text-center">Category</th>
                    <th className="py-2.5 px-2 text-center">Voltage</th>
                    <th className="py-2.5 px-2 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-right">Material Rate</th>
                    <th className="py-2.5 px-3 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {modalFilteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                        No materials found matching your search query "{catalogModalSearch}".
                      </td>
                    </tr>
                  ) : (
                    modalFilteredMaterials.map(mat => {
                      const inBoq = items.find(i => i.materialCode === mat.code);
                      const isRecentlyAdded = recentlyAddedCode === mat.code;

                      return (
                        <tr
                          key={mat.id}
                          className={`hover:bg-blue-50/40 transition-colors ${
                            isRecentlyAdded ? 'bg-emerald-50/70' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono font-bold text-[11px] border border-slate-800">
                              {mat.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-bold text-slate-900 block">{mat.name}</span>
                            {mat.specification && (
                              <span className="text-[11px] text-slate-500 block line-clamp-1">{mat.specification}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-sans">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                              {mat.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-sans">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              mat.voltageApplicability === 'HT' ? 'bg-blue-100 text-blue-800' :
                              mat.voltageApplicability === 'LT' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {mat.voltageApplicability || 'BOTH'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-sans text-slate-600 font-medium">{mat.unit}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            PKR {mat.materialRate.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            {inBoq ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  Qty: {inBoq.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddMaterialToBoq(mat.code, 1)}
                                  className="px-2 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-colors"
                                  title="Add another unit"
                                >
                                  +1
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddMaterialToBoq(mat.code, 1)}
                                className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                + Add
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Showing <strong>{modalFilteredMaterials.length}</strong> of <strong>{materials.length}</strong> materials</span>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11kV HT Extension Mini Estimate BOQ Slip Modal */}
      {showMiniEstModal && miniEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-900/60 rounded-lg">
                  <FileText className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    11kV HT Line Extension Mini-Estimate BOQ Slip
                  </h3>
                  <p className="text-xs text-emerald-200">
                    WAPDA / DISCO 11kV Electrical Feeder Standard Assemblies (DDS-23:89 / DDS-10:84)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-1.5 border border-white/20 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMiniEstModal(false)}
                  className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Official Printable Header on Slip Print */}
              <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
                <div className="flex items-center justify-between gap-4">
                  <img
                    src="/pesco-logo.svg"
                    alt="PESCO Logo"
                    className="w-12 h-12 shrink-0 object-contain"
                  />
                  <div className="text-center flex-1">
                    <div className="text-xs font-black tracking-widest text-slate-800 uppercase">
                      PESHAWAR ELECTRIC SUPPLY COMPANY (PESCO) · WAPDA
                    </div>
                    <h1 className="text-base sm:text-xl font-black text-slate-950 tracking-tight mt-0.5">
                      FLADIX, Feeder Loss Analysis and Data Indexing
                    </h1>
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      11kV HT Line Extension Mini-Estimate BOQ Slip
                    </p>
                  </div>
                  <div className="text-right text-[11px] font-mono text-slate-600 shrink-0">
                    <div>WAPDA Standard</div>
                    <div className="text-[10px] text-slate-500 font-sans">Official BOQ</div>
                  </div>
                </div>
              </div>

              {/* Technical Information Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs">
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Extension Length:</span>
                  <span className="font-bold text-slate-900 text-sm font-mono">{miniEstimate.meters} Meters</span>
                  <span className="text-[10px] text-slate-500 block font-mono">({miniEstimate.km} KM)</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Spans & Spacing:</span>
                  <span className="font-bold text-slate-900 text-sm font-mono">{miniEstimate.calculatedSpans} Spans</span>
                  <span className="text-[10px] text-slate-500 block">@ {miniEstimate.spanMeters}m / Span</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Conductor Type:</span>
                  <span className="font-bold text-slate-900 text-sm">{miniEstimate.conductorName}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">3-Ph Qty: {miniEstimate.conductorQtyKm} KM</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Poles & Structure:</span>
                  <span className="font-bold text-slate-900 text-sm">{miniEstimate.totalPoles} Poles</span>
                  <span className="text-[10px] text-slate-500 block">{miniEstimate.poleType}</span>
                </div>
              </div>

              {/* BOQ Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3 text-center w-8">#</th>
                      <th className="py-2.5 px-2.5 w-20">Code</th>
                      <th className="py-2.5 px-3">Description & WAPDA Specification</th>
                      <th className="py-2.5 px-2 text-center w-14">Unit</th>
                      <th className="py-2.5 px-2 text-right w-16">Qty</th>
                      <th className="py-2.5 px-3 text-right">Material Rate</th>
                      <th className="py-2.5 px-3 text-right">Material Amt</th>
                      <th className="py-2.5 px-3 text-right">Labour Rate</th>
                      <th className="py-2.5 px-3 text-right">Labour Amt</th>
                      <th className="py-2.5 px-3 text-right">Total (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {miniEstimate.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                        <td className="py-2 px-2.5 font-bold text-emerald-900">{item.materialCode}</td>
                        <td className="py-2 px-3 font-sans">
                          <div className="font-bold text-slate-900">{item.description}</div>
                          <div className="text-[10px] text-slate-500">{item.specification}</div>
                        </td>
                        <td className="py-2 px-2 text-center font-sans text-slate-600">{item.unit}</td>
                        <td className="py-2 px-2 text-right font-bold text-slate-900">{item.quantity}</td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          Rs. {item.unitRate.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          Rs. {item.materialAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          Rs. {item.labourRate.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          Rs. {item.labourAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-900 bg-emerald-50/40">
                          Rs. {item.totalAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/90 font-bold text-emerald-950 border-t-2 border-emerald-300 text-xs">
                      <td colSpan={6} className="py-3 px-3 font-sans text-right">
                        Total 11kV Line Extension ({miniEstimate.meters}m):
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-900">
                        Rs. {miniEstimate.materialTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                      </td>
                      <td></td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-900">
                        Rs. {miniEstimate.labourTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-950 bg-emerald-100">
                        Rs. {miniEstimate.grandTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Sanction & Signatures Block */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
                <div className="border-t border-slate-400 pt-2 mt-8">
                  <div className="font-bold text-slate-800">Sub-Divisional Officer (SDO)</div>
                  <div className="text-[10px]">Prepared & Verified</div>
                </div>
                <div className="border-t border-slate-400 pt-2 mt-8">
                  <div className="font-bold text-slate-800">Executive Engineer (XEN)</div>
                  <div className="text-[10px]">Checked & Recommended</div>
                </div>
                <div className="border-t border-slate-400 pt-2 mt-8">
                  <div className="font-bold text-slate-800">Superintending Engineer (SE)</div>
                  <div className="text-[10px]">Technical Sanction Authority</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                HT Extension BOQ Total: <strong>Rs. {miniEstimate.grandTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowMiniEstModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
