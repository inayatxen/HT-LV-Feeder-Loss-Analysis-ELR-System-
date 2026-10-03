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
  UserRole
} from '../../types/costEstimation';
import { 
  calculateQuantitiesForLine, 
  computeEstimateCharges, 
  generateEstimateNumber, 
  exportEstimateToExcelWorkbook 
} from '../../utils/costEngine';
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
  FileText
} from 'lucide-react';

interface EstimateFormViewProps {
  initialEstimate?: CostEstimateRecord | null;
  materials: MaterialItem[];
  designFactors: DesignFactorsConfig;
  templates: ConstructionTemplate[];
  userRole: UserRole;
  userName: string;
  onSaveEstimate: (estimate: CostEstimateRecord) => void;
  onCancel: () => void;
  onPrintEstimate: (estimate: CostEstimateRecord, mode?: 'preview' | 'print' | 'pdf') => void;
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
  onPrintEstimate
}) => {
  // 1. Project Information State
  const [projectInfo, setProjectInfo] = useState({
    estimateNo: initialEstimate?.projectInfo.estimateNo || generateEstimateNumber('PESH'),
    revisionNo: initialEstimate?.projectInfo.revisionNo || 'Rev-00',
    estimateDate: initialEstimate?.projectInfo.estimateDate || new Date().toISOString().split('T')[0],
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
    applicantDepartment: initialEstimate?.projectInfo.applicantDepartment || '',
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
              labourRate: 43420,
              labourAmount: 43420,
              totalAmount: 477620,
              calculationNotes: '50 kVA Transformer Installation Schedule item: 10% Labour Cost applied'
            };
          }
          return item;
        }).filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD'));
      }
      if (initialEstimate.lineDetails.is25KvaLumpSumPackage || initialEstimate.lineDetails.transformerCapacityKva === 25) {
        return initialEstimate.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD'));
      }
      return initialEstimate.items;
    }
    // Auto calculate initial default BOQ
    const calc = calculateQuantitiesForLine(estimateType, lineDetails, designFactors, materials);
    if (lineDetails.is50KvaLumpSumPackage || lineDetails.transformerCapacityKva === 50) {
      return calc.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD'));
    }
    if (lineDetails.is25KvaLumpSumPackage || lineDetails.transformerCapacityKva === 25) {
      return calc.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD'));
    }
    return calc.items;
  });

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
    engineeringPercent: number;
    contingencyPercent: number;
    departmentalPercent: number;
    contractorPercent: number;
    taxPercent: number;
    otherChargesFixed: number;
    overheadBasis?: 'MATERIAL' | 'PRIME_COST';
  }>({
    engineeringPercent: initialEstimate?.charges.engineeringChargesPercent ?? 2.0,
    contingencyPercent: initialEstimate?.charges.contingencyPercent ?? 3.0,
    departmentalPercent: initialEstimate?.charges.departmentalOverheadPercent ?? 5.0,
    contractorPercent: initialEstimate?.charges.contractorOverheadPercent ?? 10.0,
    taxPercent: initialEstimate?.charges.taxGstPercent ?? 0.0,
    otherChargesFixed: initialEstimate?.charges.otherChargesAmount ?? 0,
    overheadBasis: initialEstimate?.charges.overheadBasis
  });

  // Material search / adder dropdown state
  const [selectedMaterialToAdd, setSelectedMaterialToAdd] = useState<string>('');
  const [materialSearchText, setMaterialSearchText] = useState('');
  const [saveToast, setSaveToast] = useState('');
  const [activePresetKey, setActivePresetKey] = useState<string | null>(null);
  const [lastAppliedPresetName, setLastAppliedPresetName] = useState<string | null>(null);

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
    },
    {
      key: 'preset-1km-osprey-spun45',
      label: '⚡ 1.0 KM HT + Osprey Conductor + HT Spun Poles 45ft',
      badgeColor: 'bg-sky-300 hover:bg-sky-200 text-slate-900 border-sky-400',
      activeRing: 'ring-2 ring-sky-500 ring-offset-1 font-black shadow-md',
      htLengthKm: 1.0,
      conductorSize: 'OSPREY',
      poleType: 'SPUN_45FT',
      poleHeightMeters: 13.7,
      htPoles: 12,
      staySets: 6,
      schemeName: '1.0 KM Heavy HT Trunk Line (Osprey Conductor on 45ft Spun PCC Poles)'
    },
    {
      key: 'preset-4spans-osprey-steel45',
      label: '⚡ 4 Spans HT + Osprey + Steel Structure 45ft',
      badgeColor: 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700',
      activeRing: 'ring-2 ring-indigo-400 ring-offset-1 font-black shadow-md',
      htLengthKm: 0.4,
      conductorSize: 'OSPREY',
      poleType: 'STEEL_STRUCTURE_45FT',
      poleHeightMeters: 13.7,
      htPoles: 4,
      staySets: 2,
      schemeName: '4 Spans Heavy Span HT Line (Osprey Conductor on 45ft Steel Structure Towers)'
    },
    {
      key: 'preset-1km-dog-spun36',
      label: '⚡ 1.0 KM HT + Dog + Spun Poles 36ft (PCC)',
      badgeColor: 'bg-emerald-300 hover:bg-emerald-200 text-slate-800 border-emerald-400',
      activeRing: 'ring-2 ring-emerald-500 ring-offset-1 font-black shadow-md',
      htLengthKm: 1.0,
      conductorSize: 'DOG',
      poleType: 'PCC',
      poleHeightMeters: 11,
      htPoles: 12,
      staySets: 6,
      schemeName: 'Standard 1.0 KM 11kV HT Extension (ACSR Dog Conductor on 36ft PCC Spun Poles)'
    },
    {
      key: 'preset-4spans-rabbit-spun45',
      label: '⚡ 4 Spans HT + Rabbit + Spun Poles 45ft',
      badgeColor: 'bg-purple-300 hover:bg-purple-200 text-slate-800 border-purple-400',
      activeRing: 'ring-2 ring-purple-500 ring-offset-1 font-black shadow-md',
      htLengthKm: 0.4,
      conductorSize: 'RABBIT',
      poleType: 'SPUN_45FT',
      poleHeightMeters: 13.7,
      htPoles: 4,
      staySets: 2,
      schemeName: '4 Spans 11kV HT Line (ACSR Rabbit Conductor on 45ft Spun PCC Poles)'
    },
    {
      key: 'preset-1km-wasp-spun36',
      label: '⚡ 1.0 KM HT + WASP Conductor (Code 2130) + Spun Poles 36ft',
      badgeColor: 'bg-teal-300 hover:bg-teal-200 text-teal-950 border-teal-400',
      activeRing: 'ring-2 ring-teal-500 ring-offset-1 font-black shadow-md',
      htLengthKm: 1.0,
      conductorSize: 'WASP',
      poleType: 'PCC',
      poleHeightMeters: 11,
      htPoles: 12,
      staySets: 6,
      schemeName: '1.0 KM HT Extension (ACSR WASP Conductor 7/0.170 on 36ft Spun PCC Poles)'
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
        departmentalPercent: 6.0,
        contractorPercent: 10.0,
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
        departmentalPercent: 6.0,
        contractorPercent: 10.0,
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

  // 7. Computed Charges (Live)
  const totalKm = (Number(lineDetails.htLengthKm) || 0) + (Number(lineDetails.ltLengthKm) || 0);
  const computedCharges = useMemo(() => {
    return computeEstimateCharges(items, totalKm, transportSettings, percentages);
  }, [items, totalKm, transportSettings, percentages]);

  // Handler: Run Automatic Material Calculation Engine
  const handleCalculateRequiredMaterials = () => {
    const is25Kva = lineDetails.is25KvaLumpSumPackage || 
                    (estimateType === 'NEW_DISTRIBUTION_TRANSFORMER' && lineDetails.transformerCapacityKva === 25) ||
                    (lineDetails.transformerCapacityKva === 25 && (!lineDetails.htLengthKm || lineDetails.htLengthKm === 0));

    const res = calculateQuantitiesForLine(estimateType, lineDetails, designFactors, materials);
    const cleanedItems = is25Kva 
      ? res.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD'))
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
        departmentalPercent: 6.0,
        contractorPercent: 10.0,
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
        updated.labourAmount = Math.round(updated.quantity * updated.labourRate);
        updated.totalAmount = updated.materialAmount + updated.labourAmount;
      } else if (field === 'unitRate') {
        updated.unitRate = Math.max(0, numVal);
        updated.materialAmount = Math.round(updated.quantity * updated.unitRate);
        updated.totalAmount = updated.materialAmount + updated.labourAmount;
      } else if (field === 'labourRate') {
        updated.labourRate = Math.max(0, numVal);
        updated.labourAmount = Math.round(updated.quantity * updated.labourRate);
        updated.totalAmount = updated.materialAmount + updated.labourAmount;
      } else if (field === 'remarks') {
        updated.remarks = String(value);
      }
      return updated;
    }));
  };

  // Handler: Add Custom Material from Catalog
  const handleAddMaterialToBoq = (matCode: string) => {
    const mat = materials.find(m => m.code === matCode);
    if (!mat) return;

    const existing = items.find(i => i.materialCode === mat.code);
    if (existing) {
      handleUpdateItem(existing.id, 'quantity', existing.quantity + 1);
      return;
    }

    const newItem: EstimateItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      materialId: mat.id,
      materialCode: mat.code,
      description: mat.name,
      specification: mat.specification,
      unit: mat.unit,
      quantity: 1,
      unitRate: mat.materialRate,
      materialAmount: mat.materialRate,
      labourRate: mat.labourRate,
      labourAmount: mat.labourRate,
      totalAmount: mat.materialRate + mat.labourRate,
      isAutoCalculated: false,
      manualOverride: true,
      remarks: 'Manually added to BOQ'
    };

    setItems(prev => [...prev, newItem]);
    setSelectedMaterialToAdd('');
  };

  // Handler: Delete BOQ Item
  const handleDeleteItem = (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the BOQ?')) return;
    setItems(prev => prev.filter(i => i.id !== itemId));
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
    const finalRecord: CostEstimateRecord = {
      id: initialEstimate?.id || `est-${Date.now()}`,
      projectInfo,
      type: estimateType,
      status: newStatus,
      lineDetails,
      items,
      charges: computedCharges,
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
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-amber-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Quick HT Line Combination Presets:
                </span>
                <span className="text-[10px] text-slate-400">Click to auto-configure line length, conductor & pole structure</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_COMBINATIONS.map(preset => {
                  const isActive = activePresetKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 ${preset.badgeColor} ${
                        isActive ? `${preset.activeRing} scale-102 ring-2` : 'opacity-90 hover:opacity-100'
                      }`}
                      title={`Click to auto-configure line parameters and update required material quantities below`}
                    >
                      {isActive ? <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-800" /> : null}
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
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
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">HT Line Length (km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={lineDetails.htLengthKm}
                  onChange={(e) => setLineDetails({ ...lineDetails, htLengthKm: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
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
                  {items.length} items included. Quantities and approved CSR rates can be edited or overridden.
                </span>
              </div>

              {/* Add Material Select Dropdown & Quick Export */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMaterialToAdd}
                  onChange={(e) => {
                    if (e.target.value) handleAddMaterialToBoq(e.target.value);
                  }}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
                >
                  <option value="">+ Add Item from Catalog...</option>
                  {materials.map(m => (
                    <option key={m.code} value={m.code}>
                      [{m.code}] {m.name} (PKR {m.materialRate.toLocaleString()})
                    </option>
                  ))}
                </select>

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

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-2 text-center w-10">Sr.</th>
                    <th className="py-2.5 px-3">Material Code</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-2 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-right w-24">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate (PKR)</th>
                    <th className="py-2.5 px-3 text-right">Material (PKR)</th>
                    <th className="py-2.5 px-3 text-right">Labour (PKR)</th>
                    <th className="py-2.5 px-3 text-right">Total (PKR)</th>
                    <th className="py-2.5 px-2 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                        No materials in BOQ yet. Click "Calculate Required Materials" or add from the catalog above.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2 text-center text-slate-400 font-sans text-[11px]">{idx + 1}</td>
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
                        <td className="py-2 px-3 text-right text-slate-600">
                          {item.labourAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-blue-900 bg-blue-50/20">
                          {item.totalAmount.toLocaleString()}
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

            {/* BOQ Subtotals Summary */}
            <div className="flex flex-wrap items-center justify-end gap-6 pt-3 text-xs border-t border-slate-200">
              <div>
                <span className="text-slate-500">Material Subtotal: </span>
                <strong className="text-slate-900 font-mono">PKR {computedCharges.materialCost.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500">Labour Subtotal: </span>
                <strong className="text-slate-900 font-mono">PKR {computedCharges.labourCost.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500">Combined Base Prime: </span>
                <strong className="text-blue-900 font-mono font-bold">
                  PKR {(computedCharges.materialCost + computedCharges.labourCost).toLocaleString()}
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
              <h3 className="text-sm font-bold text-slate-900">Overheads, Contingencies & Charges</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <label className="font-semibold text-slate-700">Engineering & Supervision Charges</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={percentages.engineeringPercent}
                    onChange={(e) => setPercentages({ ...percentages, engineeringPercent: Number(e.target.value) })}
                    className="w-14 px-1.5 py-1 text-right bg-slate-50 border border-slate-300 rounded font-mono"
                  />
                  <span className="text-slate-500 font-mono">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="font-semibold text-slate-700">Contingency Allowance</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={percentages.contingencyPercent}
                    onChange={(e) => setPercentages({ ...percentages, contingencyPercent: Number(e.target.value) })}
                    className="w-14 px-1.5 py-1 text-right bg-slate-50 border border-slate-300 rounded font-mono"
                  />
                  <span className="text-slate-500 font-mono">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="font-semibold text-slate-700">Departmental Overheads</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={percentages.departmentalPercent}
                    onChange={(e) => setPercentages({ ...percentages, departmentalPercent: Number(e.target.value) })}
                    className="w-14 px-1.5 py-1 text-right bg-slate-50 border border-slate-300 rounded font-mono"
                  />
                  <span className="text-slate-500 font-mono">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="font-semibold text-slate-700">Contractor Overheads / Profit</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={percentages.contractorPercent}
                    onChange={(e) => setPercentages({ ...percentages, contractorPercent: Number(e.target.value) })}
                    className="w-14 px-1.5 py-1 text-right bg-slate-50 border border-slate-300 rounded font-mono"
                  />
                  <span className="text-slate-500 font-mono">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="font-semibold text-slate-700">Taxes / GST Applicable</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    value={percentages.taxPercent}
                    onChange={(e) => setPercentages({ ...percentages, taxPercent: Number(e.target.value) })}
                    className="w-14 px-1.5 py-1 text-right bg-slate-50 border border-slate-300 rounded font-mono"
                  />
                  <span className="text-slate-500 font-mono">%</span>
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
                  ? '18-Item Official Material Schedule + 10% Labour + 16% Over Heads'
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
                  <span className="text-slate-400 font-sans">Labour Cost (10% on Material Cost):</span>
                  <span className="text-rose-400 font-bold">Rs. {computedCharges.labourCost.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1 text-slate-300">
                  <span className="text-slate-400 font-sans">Subtotal (Material + 10% Labour):</span>
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
                  <span className="font-sans">Total Over Heads (16% on Material):</span>
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
                  <span className="text-slate-400 font-sans">Labour / Erection Cost:</span>
                  <span className="text-slate-200">Rs. {computedCharges.labourCost.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Transportation & Hauling:</span>
                  <span className="text-slate-200">Rs. {computedCharges.transportationCost.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Engineering Charges ({percentages.engineeringPercent}%):</span>
                  <span className="text-slate-200">Rs. {computedCharges.engineeringChargesAmount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Contingency ({percentages.contingencyPercent}%):</span>
                  <span className="text-slate-200">Rs. {computedCharges.contingencyAmount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Departmental Overhead ({percentages.departmentalPercent}%):</span>
                  <span className="text-slate-200">Rs. {computedCharges.departmentalOverheadAmount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Contractor Overhead ({percentages.contractorPercent}%):</span>
                  <span className="text-slate-200">Rs. {computedCharges.contractorOverheadAmount.toLocaleString()}</span>
                </div>

                {computedCharges.taxGstAmount > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 font-sans">Taxes / GST ({percentages.taxPercent}%):</span>
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

            {/* Grand Total Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 font-sans block">
                {computedCharges.overheadBasis === 'MATERIAL' ? 'NET ESTIMATED COST (GRAND TOTAL):' : 'ESTIMATED GRAND TOTAL:'}
              </span>
              <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                Rs. {computedCharges.grandTotal.toLocaleString()}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                {computedCharges.overheadBasis === 'MATERIAL' ? (
                  <>
                    <span>Package Basis:</span>
                    <strong className="text-emerald-400 font-bold">
                      25 kVA Transformer Installation
                    </strong>
                  </>
                ) : (
                  <>
                    <span>Cost per Kilometer:</span>
                    <strong className="text-emerald-400 font-bold">
                      Rs. {computedCharges.costPerKm.toLocaleString()} / km
                    </strong>
                  </>
                )}
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
          </div>
        </div>
      </div>
    </div>
  );
};
