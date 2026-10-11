/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  CostEstimateRecord, 
  MaterialItem, 
  DesignFactorsConfig, 
  ConstructionTemplate,
  EstimateType,
  EstimateLineDetails
} from '../types/costEstimation';
import { 
  INITIAL_MATERIALS, 
  DEFAULT_DESIGN_FACTORS, 
  STANDARD_TEMPLATES 
} from '../data/materialMaster';
import { 
  calculateQuantitiesForLine, 
  computeEstimateCharges, 
  generateEstimateNumber 
} from './costEngine';
import { PRESET_FEEDERS } from '../data/presetFeeders';
import { FeederData } from '../types/feeder';

import { doc, getDoc, getDocs, setDoc, collection, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const MATERIALS_COLLECTION = 'materials';

export async function getAllMaterialsFromDb(): Promise<MaterialItem[]> {
  const querySnapshot = await getDocs(collection(db, MATERIALS_COLLECTION));
  return querySnapshot.docs.map(doc => doc.data() as MaterialItem);
}

export async function saveMaterialToDb(material: MaterialItem): Promise<void> {
  await setDoc(doc(db, MATERIALS_COLLECTION, material.id), material);
}
// ... rest of the implementation would follow similarly for other collections

/**
 * Initialize DB and seed default PESCO materials, templates, design factors, and sample estimates.
 */
export async function initCostDatabase(): Promise<{
  estimates: CostEstimateRecord[];
  materials: MaterialItem[];
  designFactors: DesignFactorsConfig;
  templates: ConstructionTemplate[];
}> {
  const db = await openCostDb();

  // 1. Check & Seed Materials (with automatic sync for newly added standard materials/codes)
  const existingMaterials = await getAllRecords<MaterialItem>(db, 'materials');
  const existingMap = new Map(existingMaterials.map(m => [m.id, m]));

  for (const initial of INITIAL_MATERIALS) {
    if (!existingMap.has(initial.id)) {
      await putRecord(db, 'materials', initial);
      existingMap.set(initial.id, initial);
    } else {
      const existing = existingMap.get(initial.id)!;
      if (
        existing.code !== initial.code || 
        existing.materialRate !== initial.materialRate ||
        existing.name !== initial.name || 
        existing.category !== initial.category ||
        existing.specification !== initial.specification
      ) {
        const updated: MaterialItem = {
          ...existing,
          code: initial.code,
          name: initial.name,
          category: initial.category,
          unit: initial.unit || existing.unit,
          materialRate: initial.materialRate,
          labourRate: initial.labourRate ?? existing.labourRate,
          installationRate: initial.installationRate ?? existing.installationRate,
          transportationRate: initial.transportationRate ?? existing.transportationRate,
          specification: initial.specification || existing.specification,
          voltageApplicability: initial.voltageApplicability || existing.voltageApplicability
        };
        await putRecord(db, 'materials', updated);
        existingMap.set(initial.id, updated);
      }
    }
  }
  const activeMaterials = Array.from(existingMap.values());

  // 2. Check & Seed Design Factors
  let designFactors = await getSetting<DesignFactorsConfig>(db, 'design_factors');
  if (!designFactors) {
    designFactors = DEFAULT_DESIGN_FACTORS;
    await putSetting(db, 'design_factors', DEFAULT_DESIGN_FACTORS);
  }

  // 3. Check & Seed Templates
  const templates = await getAllRecords<ConstructionTemplate>(db, 'templates');
  let activeTemplates = templates;
  if (templates.length === 0) {
    for (const tmpl of STANDARD_TEMPLATES) {
      await putRecord(db, 'templates', tmpl);
    }
    activeTemplates = STANDARD_TEMPLATES;
  }

  // 4. Check & Seed Initial Estimates
  let estimates = await getAllRecords<CostEstimateRecord>(db, 'estimates');
  const seedEstimates = createSeedEstimates(activeMaterials, designFactors);
  const estimateMap = new Map(estimates.map(e => [e.id, e]));

  for (const seed of seedEstimates) {
    if (!estimateMap.has(seed.id)) {
      await putRecord(db, 'estimates', seed);
      estimateMap.set(seed.id, seed);
    } else if (seed.id === 'est-dt-25kva-lump-sum' || seed.id === 'est-dt-50kva-lump-sum' || seed.id === 'est-dt-100kva-lump-sum') {
      // Keep official 25 kVA, 50 kVA & 100 kVA packages in sync with latest WAPDA schedule rates & overhead percentages
      await putRecord(db, 'estimates', seed);
      estimateMap.set(seed.id, seed);
    }
  }

  // Ensure any existing 50 kVA estimate replaces 25 kVA item with 50 kVA Transformer Store Code 08120 @ Rate 434200
  for (const [id, est] of estimateMap.entries()) {
    const is50Kva = Boolean(
      est.lineDetails?.transformerCapacityKva === 50 ||
      est.lineDetails?.is50KvaLumpSumPackage ||
      est.projectInfo?.schemeProjectName?.includes('50 KVA') ||
      est.projectInfo?.purposeOfWork?.includes('50 KVA') ||
      id.includes('50kva')
    );
    if (is50Kva && est.items.some(i => i.materialCode === '08110' || i.description?.includes('25 KVA') || (i.materialCode === '08120' && i.unitRate !== 434200))) {
      const updatedItems = est.items.map(item => {
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

      const updatedCharges = computeEstimateCharges(updatedItems, (est.lineDetails.htLengthKm || 0) + (est.lineDetails.ltLengthKm || 0), undefined, {
        departmentalPercent: 6.0,
        contractorPercent: 10.0,
        engineeringPercent: 0.0,
        contingencyPercent: 0.0,
        taxPercent: 0.0,
        otherChargesFixed: 0,
        overheadBasis: 'MATERIAL'
      });

      const updatedEst: CostEstimateRecord = {
        ...est,
        items: updatedItems,
        charges: updatedCharges,
        lineDetails: {
          ...est.lineDetails,
          transformerCapacityKva: 50,
          is50KvaLumpSumPackage: true,
          staySets: 0
        },
        updatedAt: new Date().toISOString()
      };
      await putRecord(db, 'estimates', updatedEst);
      estimateMap.set(id, updatedEst);
    }
  }
  estimates = Array.from(estimateMap.values());

  return {
    estimates,
    materials: activeMaterials,
    designFactors,
    templates: activeTemplates
  };
}

function createSeedEstimates(materials: MaterialItem[], factors: DesignFactorsConfig): CostEstimateRecord[] {
  // Combination 1: 4 Spans HT Line with Dog Conductor & HT Steel Structure Poles
  const ld1 = {
    htLengthKm: 0.4,
    ltLengthKm: 0,
    htPoles: 4,
    ltPoles: 0,
    staySets: 2,
    roadCrossings: 0,
    canalCrossings: 0,
    transformerStructures: 0,
    transformerCount: 0,
    transformerCapacityKva: 0,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'DOG',
    poleType: 'STEEL_STRUCTURE',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC'
  };
  const calc1 = calculateQuantitiesForLine('HT_LINE_EXTENSION', ld1, factors, materials);
  const charges1 = computeEstimateCharges(calc1.items, 0.4, {
    method: 'PER_KM',
    distanceKm: 15,
    ratePerKm: 180,
    loadingUnloadingFixed: 8000
  });

  const est1: CostEstimateRecord = {
    id: 'est-ht-4spans-dog-steel',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-00401',
      revisionNo: 'Rev-00',
      estimateDate: '2026-09-28',
      workOrderNo: '26147126042',
      schemeCategory: 'ELR',
      elrCode: 'ELR-71-26-042',
      accountHead: '4-71 ELR Capital Loss Reduction',
      division: 'Peshawar City Division',
      subDivision: 'University Sub-Division',
      circle: 'Peshawar Circle-1',
      district: 'Peshawar',
      feederName: 'University Town 11kV Feeder',
      feederCode: 'FDR-UTN-02',
      proposedLocation: 'University Road Sector B-2 Extension',
      villageLocality: 'University Town',
      gpsLatitude: '34.0020 N',
      gpsLongitude: '71.4850 E',
      applicantDepartment: 'High Highway Department / Commercial Expansion',
      schemeProjectName: 'HT Line Shift & Extension Scheme (4 Spans Dog Conductor on Steel Lattice Structure Poles)',
      purposeOfWork: 'Construction of 4 Spans (0.4 km) 11kV HT Overhead Line using ACSR Dog Conductor and HT Steel Structure Poles (34.8 ft).',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: 'Engr. Tariq Khan (XEN Peshawar)',
      approvedBy: 'Engr. Abdul Rehman (SE Circle-1)'
    },
    type: 'HT_LINE_EXTENSION',
    status: 'APPROVED',
    lineDetails: ld1,
    items: calc1.items,
    charges: charges1,
    calculationSteps: calc1.steps,
    auditTrail: [
      { id: 'aud-s1', timestamp: '2026-09-28 09:00', user: 'Engr. M. Inayat', role: 'SDO', action: 'Created estimate for 4 Spans HT Line (Dog + Steel Structures)' },
      { id: 'aud-s2', timestamp: '2026-09-28 11:30', user: 'Engr. Tariq Khan', role: 'XEN', action: 'Approved technical BOQ' }
    ],
    createdAt: '2026-09-28T09:00:00.000Z',
    updatedAt: '2026-09-28T11:30:00.000Z'
  };

  // Combination 2: 1 Kilometer HT Line with Osprey Conductor & HT Spun Poles 45 Feet
  const ld2 = {
    htLengthKm: 1.0,
    ltLengthKm: 0,
    htPoles: 12,
    ltPoles: 0,
    staySets: 6,
    roadCrossings: 2,
    canalCrossings: 0,
    transformerStructures: 0,
    transformerCount: 0,
    transformerCapacityKva: 0,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'OSPREY',
    poleType: 'SPUN_45FT',
    poleHeightMeters: 13.7,
    insulatorType: 'PIN_DISC'
  };
  const calc2 = calculateQuantitiesForLine('HT_LINE_EXTENSION', ld2, factors, materials);
  const charges2 = computeEstimateCharges(calc2.items, 1.0, {
    method: 'PER_KM',
    distanceKm: 25,
    ratePerKm: 180,
    loadingUnloadingFixed: 12000
  });

  const est2: CostEstimateRecord = {
    id: 'est-ht-1km-osprey-spun45',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-01002',
      revisionNo: 'Rev-00',
      estimateDate: '2026-09-28',
      workOrderNo: '26147126043',
      schemeCategory: 'ELR',
      elrCode: 'ELR-71-26-043',
      accountHead: '4-71 ELR Capital Loss Reduction',
      division: 'Cantt Division Peshawar',
      subDivision: 'Saddar Sub-Division',
      circle: 'Peshawar Circle-1',
      district: 'Peshawar',
      feederName: 'Saddar Heavy Trunk 11kV Feeder',
      feederCode: 'FDR-SDR-01',
      proposedLocation: 'Khyber Road to Mall Road Trunk Reinforcement',
      villageLocality: 'Peshawar Cantt',
      gpsLatitude: '34.0110 N',
      gpsLongitude: '71.5320 E',
      applicantDepartment: 'PESCO System Reinforcement / ELR Division',
      schemeProjectName: '1.0 KM Heavy Feeder Construction (Osprey Conductor on 45-Feet HT Spun Poles)',
      purposeOfWork: 'Erection of 1.0 Kilometer 11kV Trunk Line with ACSR Osprey Conductor and 45 Feet Heavy HT Spun PCC Poles for high load capacity.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: 'Engr. Tariq Khan (XEN)'
    },
    type: 'HT_LINE_EXTENSION',
    status: 'SUBMITTED',
    lineDetails: ld2,
    items: calc2.items,
    charges: charges2,
    calculationSteps: calc2.steps,
    auditTrail: [
      { id: 'aud-s3', timestamp: '2026-09-28 14:00', user: 'Engr. M. Inayat', role: 'SDO', action: 'Submitted estimate for 1.0 km Osprey + 45ft Spun Poles' }
    ],
    createdAt: '2026-09-28T14:00:00.000Z',
    updatedAt: '2026-09-28T14:00:00.000Z'
  };

  // Combination 3: 4 Spans HT Line with Osprey Conductor & HT Steel Structure Poles (45ft)
  const ld3 = {
    htLengthKm: 0.4,
    ltLengthKm: 0,
    htPoles: 4,
    ltPoles: 0,
    staySets: 2,
    roadCrossings: 0,
    canalCrossings: 0,
    transformerStructures: 0,
    transformerCount: 0,
    transformerCapacityKva: 0,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'OSPREY',
    poleType: 'STEEL_STRUCTURE_45FT',
    poleHeightMeters: 13.7,
    insulatorType: 'PIN_DISC'
  };
  const calc3 = calculateQuantitiesForLine('HT_LINE_EXTENSION', ld3, factors, materials);
  const charges3 = computeEstimateCharges(calc3.items, 0.4, { method: 'PER_KM', distanceKm: 20, ratePerKm: 180, loadingUnloadingFixed: 8000 });

  const est3: CostEstimateRecord = {
    id: 'est-ht-4spans-osprey-steel45',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-00403',
      revisionNo: 'Rev-00',
      estimateDate: '2026-09-29',
      workOrderNo: '29147126044',
      schemeCategory: 'ELR',
      elrCode: 'ELR-71-26-044',
      accountHead: '4-71 ELR Capital Loss Reduction',
      division: 'Swat Division',
      subDivision: 'Mingora Sub-Division',
      circle: 'Swat Circle',
      district: 'Swat',
      feederName: 'Mingora Express 11kV Feeder',
      feederCode: 'FDR-MNG-03',
      proposedLocation: 'River Swat Crossing Section',
      villageLocality: 'Mingora',
      gpsLatitude: '34.7710 N',
      gpsLongitude: '72.3600 E',
      applicantDepartment: 'Irrigation & Power Dept / PESCO',
      schemeProjectName: 'River Crossing HT Line (4 Spans Osprey Conductor on 45ft Steel Structure Towers)',
      purposeOfWork: '4 Spans (0.4 km) heavy span river crossing with Osprey conductor on 45ft Steel Structure Towers.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)'
    },
    type: 'HT_LINE_EXTENSION',
    status: 'DRAFT',
    lineDetails: ld3,
    items: calc3.items,
    charges: charges3,
    calculationSteps: calc3.steps,
    auditTrail: [],
    createdAt: '2026-09-29T08:00:00.000Z',
    updatedAt: '2026-09-29T08:00:00.000Z'
  };

  // Combination 4: 1.0 km HT Line with Dog Conductor & HT Spun Poles 36 Feet
  const ld4 = {
    htLengthKm: 1.0,
    ltLengthKm: 0,
    htPoles: 12,
    ltPoles: 0,
    staySets: 6,
    roadCrossings: 2,
    canalCrossings: 0,
    transformerStructures: 0,
    transformerCount: 0,
    transformerCapacityKva: 0,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'DOG',
    poleType: 'PCC',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC'
  };
  const calc4 = calculateQuantitiesForLine('HT_LINE_EXTENSION', ld4, factors, materials);
  const charges4 = computeEstimateCharges(calc4.items, 1.0, { method: 'PER_KM', distanceKm: 30, ratePerKm: 180, loadingUnloadingFixed: 10000 });

  const est4: CostEstimateRecord = {
    id: 'est-ht-1km-dog-spun36',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-01004',
      revisionNo: 'Rev-00',
      estimateDate: '2026-09-29',
      workOrderNo: '28147126045',
      schemeCategory: 'ELR',
      elrCode: 'ELR-71-26-045',
      accountHead: '4-71 ELR Capital Loss Reduction',
      division: 'Mardan Division',
      subDivision: 'Mardan City Sub-Division',
      circle: 'Mardan Circle',
      district: 'Mardan',
      feederName: 'Mardan City 11kV Feeder',
      feederCode: 'FDR-MDN-01',
      proposedLocation: 'Nowshera Road Rural Extension',
      villageLocality: 'Mardan',
      gpsLatitude: '34.1980 N',
      gpsLongitude: '72.0400 E',
      applicantDepartment: 'Rural Electrification Division',
      schemeProjectName: 'Standard 1.0 KM 11kV HT Extension (ACSR Dog Conductor on 36ft PCC Spun Poles)',
      purposeOfWork: 'Standard 1.0 km 11kV line extension using Dog Conductor and 36ft PCC Spun Poles.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)'
    },
    type: 'HT_LINE_EXTENSION',
    status: 'APPROVED',
    lineDetails: ld4,
    items: calc4.items,
    charges: charges4,
    calculationSteps: calc4.steps,
    auditTrail: [],
    createdAt: '2026-09-29T08:30:00.000Z',
    updatedAt: '2026-09-29T08:30:00.000Z'
  };

  // Combination 5: 1.0 km HT Line with ACSR WASP Conductor (7/0.170, Code 2130) & HT Spun Poles 36 Feet
  const ld5 = {
    htLengthKm: 1.0,
    ltLengthKm: 0,
    htPoles: 12,
    ltPoles: 0,
    staySets: 6,
    roadCrossings: 1,
    canalCrossings: 0,
    transformerStructures: 0,
    transformerCount: 0,
    transformerCapacityKva: 0,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'WASP',
    poleType: 'PCC',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC'
  };
  const calc5 = calculateQuantitiesForLine('HT_LINE_EXTENSION', ld5, factors, materials);
  const charges5 = computeEstimateCharges(calc5.items, 1.0, { method: 'PER_KM', distanceKm: 20, ratePerKm: 180, loadingUnloadingFixed: 9000 });

  const est5: CostEstimateRecord = {
    id: 'est-ht-1km-wasp-spun36',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-01005',
      revisionNo: 'Rev-00',
      estimateDate: '2026-09-30',
      workOrderNo: '26147126046',
      schemeCategory: 'ELR',
      elrCode: 'ELR-71-26-046',
      accountHead: '4-71 ELR Capital Loss Reduction',
      division: 'Peshawar Cantt Division',
      subDivision: 'Gulbhar Sub-Division',
      circle: 'Peshawar Circle-1',
      district: 'Peshawar',
      feederName: 'Gulbhar 11kV Feeder',
      feederCode: 'FDR-GLB-02',
      proposedLocation: 'Gulbhar Sector C Industrial/Residential Spur',
      villageLocality: 'Gulbhar Peshawar',
      gpsLatitude: '34.0150 N',
      gpsLongitude: '71.5240 E',
      applicantDepartment: 'PESCO ELR & System Augmentation',
      schemeProjectName: '1.0 KM 11kV HT Extension with ACSR Wasp Conductor 7/0.170 (Code 2130) on 36ft Spun Poles',
      purposeOfWork: 'Construction of 1.0 km 11kV HT line extension using ACSR Wasp Conductor 7/0.170 (80mm² - Code 2130) and 36ft PCC HT Spun Poles.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: 'Engr. Tariq Khan (XEN Peshawar)'
    },
    type: 'HT_LINE_EXTENSION',
    status: 'APPROVED',
    lineDetails: ld5,
    items: calc5.items,
    charges: charges5,
    calculationSteps: calc5.steps,
    auditTrail: [
      { id: 'aud-s5', timestamp: '2026-09-30 10:00', user: 'Engr. M. Inayat', role: 'SDO', action: 'Created estimate with ACSR Wasp Conductor 7/0.170 (Code 2130)' }
    ],
    createdAt: '2026-09-30T10:00:00.000Z',
    updatedAt: '2026-09-30T10:00:00.000Z'
  };

  // Combination 0: 25 KVA Transformer Installation (18-Item Official Lump Sum Schedule)
  const ld0 = {
    htLengthKm: 0,
    ltLengthKm: 0,
    htPoles: 0,
    ltPoles: 0,
    staySets: 0,
    roadCrossings: 0,
    canalCrossings: 0,
    transformerStructures: 1,
    transformerCount: 1,
    transformerCapacityKva: 25,
    is25KvaLumpSumPackage: true,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'DOG',
    poleType: 'PCC',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC'
  };
  const calc0 = calculateQuantitiesForLine('NEW_DISTRIBUTION_TRANSFORMER', ld0, factors, materials);
  const charges0 = computeEstimateCharges(calc0.items, 0, {
    method: 'FIXED',
    distanceKm: 0,
    ratePerKm: 0,
    loadingUnloadingFixed: 0
  }, {
    departmentalPercent: 6.0,
    contractorPercent: 10.0,
    engineeringPercent: 0.0,
    contingencyPercent: 0.0,
    taxPercent: 0.0,
    otherChargesFixed: 0,
    overheadBasis: 'MATERIAL'
  });

  const est0: CostEstimateRecord = {
    id: 'est-dt-25kva-lump-sum',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-00025',
      revisionNo: 'Rev-00',
      estimateDate: '2026-10-02',
      workOrderNo: '26147526047',
      schemeCategory: 'TRF',
      elrCode: 'TRF-75-26-047',
      accountHead: '4-75 Substation/Trf Augmentation',
      division: 'Peshawar City Division',
      subDivision: 'University Sub-Division',
      circle: 'Peshawar Circle-1',
      district: 'Peshawar',
      feederName: 'University Town 11kV Feeder',
      feederCode: 'FDR-UTN-02',
      proposedLocation: 'Sector B-3 Distribution Transformer Installation Site',
      villageLocality: 'University Town Peshawar',
      gpsLatitude: '34.0045 N',
      gpsLongitude: '71.4880 E',
      applicantDepartment: 'PESCO Distribution Operations / System Augmentation',
      schemeProjectName: 'Installation of 25 KVA Distribution Transformer Sub-Station (Lump Sum Package)',
      purposeOfWork: 'Installation of 25 KVA Transformer using 18-item lump sum material list (Rs. 447,128.07). Net cost is estimated adding 10% Labour Cost (Rs. 44,712.81) and 16% Over Heads on material cost (Rs. 71,540.49) = Rs. 563,381.37.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: 'Engr. Tariq Khan (XEN Peshawar)',
      approvedBy: 'Engr. Abdul Rehman (SE Circle-1)'
    },
    type: 'NEW_DISTRIBUTION_TRANSFORMER',
    status: 'APPROVED',
    lineDetails: ld0,
    items: calc0.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD')),
    charges: charges0,
    calculationSteps: calc0.steps,
    auditTrail: [
      { id: 'aud-s0', timestamp: '2026-10-02 08:30', user: 'Engr. M. Inayat', role: 'SDO', action: 'Created estimate for 25 KVA Transformer Installation with 18-item lump sum schedule + 10% Labour + 16% Over Heads on Material Cost' },
      { id: 'aud-s0-appr', timestamp: '2026-10-02 10:15', user: 'Engr. Tariq Khan', role: 'XEN', action: 'Approved technical sanction for 25 KVA package (Net Cost Rs. 563,381.37)' }
    ],
    createdAt: '2026-10-02T08:30:00.000Z',
    updatedAt: '2026-10-02T10:15:00.000Z'
  };

  // Combination 0B: 50 KVA Transformer Installation (18-Item Official Lump Sum Schedule)
  const ld0b = {
    htLengthKm: 0,
    ltLengthKm: 0,
    htPoles: 0,
    ltPoles: 0,
    staySets: 0,
    roadCrossings: 0,
    canalCrossings: 0,
    transformerStructures: 1,
    transformerCount: 1,
    transformerCapacityKva: 50,
    is50KvaLumpSumPackage: true,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'DOG',
    poleType: 'PCC',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC'
  };
  const calc0b = calculateQuantitiesForLine('NEW_DISTRIBUTION_TRANSFORMER', ld0b, factors, materials);
  const charges0b = computeEstimateCharges(calc0b.items, 0, {
    method: 'FIXED',
    distanceKm: 0,
    ratePerKm: 0,
    loadingUnloadingFixed: 0
  }, {
    departmentalPercent: 6.0,
    contractorPercent: 10.0,
    engineeringPercent: 0.0,
    contingencyPercent: 0.0,
    taxPercent: 0.0,
    otherChargesFixed: 0,
    overheadBasis: 'MATERIAL'
  });

  const est0b: CostEstimateRecord = {
    id: 'est-dt-50kva-lump-sum',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-00050',
      revisionNo: 'Rev-00',
      estimateDate: '2026-10-02',
      workOrderNo: '26147526048',
      schemeCategory: 'TRF',
      elrCode: 'TRF-75-26-048',
      accountHead: '4-75 Substation/Trf Augmentation',
      division: 'Peshawar City Division',
      subDivision: 'University Sub-Division',
      circle: 'Peshawar Circle-1',
      district: 'Peshawar',
      feederName: 'University Town 11kV Feeder',
      feederCode: 'FDR-UTN-02',
      proposedLocation: 'Sector B-4 Distribution Transformer Sub-Station Site',
      villageLocality: 'University Town Peshawar',
      gpsLatitude: '34.0055 N',
      gpsLongitude: '71.4895 E',
      applicantDepartment: 'PESCO Distribution Operations / System Augmentation',
      schemeProjectName: 'Installation of 50 KVA Distribution Transformer Sub-Station (Lump Sum Package)',
      purposeOfWork: 'Installation of 50 KVA Transformer using 18-item lump sum material list including Store Code 08120 @ Rate Rs. 434,200 (Total Material Rs. 571,542.07). Net cost is estimated adding 10% Labour Cost (Rs. 57,154.21) and 16% Over Heads on material cost (Rs. 91,446.73) = Rs. 720,143.01.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: 'Engr. Tariq Khan (XEN Peshawar)',
      approvedBy: 'Engr. Abdul Rehman (SE Circle-1)'
    },
    type: 'NEW_DISTRIBUTION_TRANSFORMER',
    status: 'APPROVED',
    lineDetails: ld0b,
    items: calc0b.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD')),
    charges: charges0b,
    calculationSteps: calc0b.steps,
    auditTrail: [
      { id: 'aud-s0b', timestamp: '2026-10-02 08:45', user: 'Engr. M. Inayat', role: 'SDO', action: 'Created estimate for 50 KVA Transformer Installation with 18-item lump sum schedule + Store Code 08120 (@ Rs. 434,200) + 10% Labour + 16% Over Heads on Material Cost' },
      { id: 'aud-s0b-appr', timestamp: '2026-10-02 10:30', user: 'Engr. Tariq Khan', role: 'XEN', action: 'Approved technical sanction for 50 KVA package (Net Cost Rs. 720,143.01)' }
    ],
    createdAt: '2026-10-02T08:45:00.000Z',
    updatedAt: '2026-10-02T10:30:00.000Z'
  };

  // Combination 0C: 100 KVA Transformer Installation (20-Item Official Lump Sum Schedule)
  const ld0c = {
    htLengthKm: 0,
    ltLengthKm: 0,
    htPoles: 0,
    ltPoles: 0,
    staySets: 0,
    roadCrossings: 0,
    canalCrossings: 0,
    transformerStructures: 1,
    transformerCount: 1,
    transformerCapacityKva: 100,
    is100KvaLumpSumPackage: true,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'DOG',
    poleType: 'PCC',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC'
  };
  const calc0c = calculateQuantitiesForLine('NEW_DISTRIBUTION_TRANSFORMER', ld0c, factors, materials);
  const charges0c = computeEstimateCharges(calc0c.items, 0, {
    method: 'FIXED',
    distanceKm: 0,
    ratePerKm: 0,
    loadingUnloadingFixed: 0
  }, {
    departmentalPercent: 6.0,
    contractorPercent: 10.0,
    engineeringPercent: 0.0,
    contingencyPercent: 0.0,
    taxPercent: 0.0,
    otherChargesFixed: 0,
    overheadBasis: 'MATERIAL'
  });

  const est0c: CostEstimateRecord = {
    id: 'est-dt-100kva-lump-sum',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-00100',
      revisionNo: 'Rev-00',
      estimateDate: '2026-10-02',
      workOrderNo: '26147526049',
      schemeCategory: 'TRF',
      elrCode: 'TRF-75-26-049',
      accountHead: '4-75 Substation/Trf Augmentation',
      division: 'Peshawar City Division',
      subDivision: 'University Sub-Division',
      circle: 'Peshawar Circle-1',
      district: 'Peshawar',
      feederName: 'University Town 11kV Feeder',
      feederCode: 'FDR-UTN-02',
      proposedLocation: 'Sector B-5 Distribution Transformer Sub-Station Site',
      villageLocality: 'University Town Peshawar',
      gpsLatitude: '34.0065 N',
      gpsLongitude: '71.4910 E',
      applicantDepartment: 'PESCO Distribution Operations / System Augmentation',
      schemeProjectName: 'Installation of 100 KVA Distribution Transformer Sub-Station (Lump Sum Package)',
      purposeOfWork: 'Installation of 100 KVA Transformer using 20-item lump sum material list including Store Code 08130 @ Rate Rs. 631,000 (Total Material Rs. 851,227.21). Net cost is estimated adding 10% Labour Cost (Rs. 85,122.72) and 16% Over Heads on material cost (Rs. 136,196.35) = Rs. 1,072,546.28.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: 'Engr. Tariq Khan (XEN Peshawar)',
      approvedBy: 'Engr. Abdul Rehman (SE Circle-1)'
    },
    type: 'NEW_DISTRIBUTION_TRANSFORMER',
    status: 'APPROVED',
    lineDetails: ld0c,
    items: calc0c.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD')),
    charges: charges0c,
    calculationSteps: calc0c.steps,
    auditTrail: [
      { id: 'aud-s0c', timestamp: '2026-10-02 09:00', user: 'Engr. M. Inayat', role: 'SDO', action: 'Created estimate for 100 KVA Transformer Installation with 20-item lump sum schedule + Store Code 08130 (@ Rs. 631,000) + 10% Labour + 16% Over Heads on Material Cost' },
      { id: 'aud-s0c-appr', timestamp: '2026-10-02 11:00', user: 'Engr. Tariq Khan', role: 'XEN', action: 'Approved technical sanction for 100 KVA package (Net Cost Rs. 1,072,546.28)' }
    ],
    createdAt: '2026-10-02T09:00:00.000Z',
    updatedAt: '2026-10-02T11:00:00.000Z'
  };

  // Combination 0D: 200 KVA Transformer Installation (Lump Sum Schedule)
  const ld0d = {
    htLengthKm: 0,
    ltLengthKm: 0,
    htPoles: 0,
    ltPoles: 0,
    staySets: 0,
    roadCrossings: 0,
    canalCrossings: 0,
    transformerStructures: 1,
    transformerCount: 1,
    transformerCapacityKva: 200,
    is200KvaLumpSumPackage: true,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'WASP',
    poleType: 'PCC',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC'
  };
  const calc0d = calculateQuantitiesForLine('NEW_DISTRIBUTION_TRANSFORMER', ld0d, factors, materials);
  const charges0d = computeEstimateCharges(calc0d.items, 0, {
    method: 'FIXED',
    distanceKm: 0,
    ratePerKm: 0,
    loadingUnloadingFixed: 0
  }, {
    departmentalPercent: 6.0,
    contractorPercent: 10.0,
    engineeringPercent: 0.0,
    contingencyPercent: 0.0,
    taxPercent: 0.0,
    otherChargesFixed: 0,
    overheadBasis: 'MATERIAL'
  });

  const est0d: CostEstimateRecord = {
    id: 'est-dt-200kva-lump-sum',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-00200',
      revisionNo: 'Rev-00',
      estimateDate: '2026-10-02',
      workOrderNo: '26147526050',
      schemeCategory: 'TRF',
      elrCode: 'TRF-75-26-050',
      accountHead: '4-75 Substation/Trf Augmentation',
      division: 'Peshawar City Division',
      subDivision: 'University Sub-Division',
      circle: 'Peshawar Circle-1',
      district: 'Peshawar',
      feederName: 'University Town 11kV Feeder',
      feederCode: 'FDR-UTN-02',
      proposedLocation: 'Sector B-6 Distribution Transformer Sub-Station Site',
      villageLocality: 'University Town Peshawar',
      gpsLatitude: '34.0075 N',
      gpsLongitude: '71.4925 E',
      applicantDepartment: 'PESCO Distribution Operations / System Augmentation',
      schemeProjectName: 'Installation of 200 KVA Distribution Transformer Sub-Station (Lump Sum Package)',
      purposeOfWork: 'Installation of 200 KVA Transformer using lump sum material list (Total Material Rs. 1,981,233.97). Net cost is estimated adding 10% Labour Cost (Rs. 198,123.40) and 16% Over Heads on material cost (Rs. 316,997.44) = Rs. 2,496,354.81.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: 'Engr. Tariq Khan (XEN Peshawar)',
      approvedBy: 'Engr. Abdul Rehman (SE Circle-1)'
    },
    type: 'NEW_DISTRIBUTION_TRANSFORMER',
    status: 'APPROVED',
    lineDetails: ld0d,
    items: calc0d.items.filter(i => i.materialCode !== '15310' && !i.description.toUpperCase().includes('STAY ROD')),
    charges: charges0d,
    calculationSteps: calc0d.steps,
    auditTrail: [
      { id: 'aud-s0d', timestamp: '2026-10-02 09:30', user: 'Engr. M. Inayat', role: 'SDO', action: 'Created estimate for 200 KVA Transformer Installation with lump sum schedule + 10% Labour + 16% Over Heads on Material Cost' },
      { id: 'aud-s0d-appr', timestamp: '2026-10-02 11:30', user: 'Engr. Tariq Khan', role: 'XEN', action: 'Approved technical sanction for 200 KVA package (Net Cost Rs. 2,496,354.81)' }
    ],
    createdAt: '2026-10-02T09:30:00.000Z',
    updatedAt: '2026-10-02T11:30:00.000Z'
  };

  // Combination 0E: 1.0 KM HT Line with DOG Conductor & H-Type Steel Structures (Lump Sum Schedule)
  const ld0e = {
    htLengthKm: 1.0,
    ltLengthKm: 0,
    htPoles: 16,
    ltPoles: 0,
    staySets: 8,
    roadCrossings: 0,
    canalCrossings: 0,
    transformerStructures: 0,
    transformerCount: 0,
    transformerCapacityKva: 0,
    is1KmHtDogHTypePackage: true,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'DOG',
    poleType: 'H_STEEL_STRUCTURE',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC'
  };
  const calc0e = calculateQuantitiesForLine('HT_LINE_EXTENSION', ld0e, factors, materials);
  const charges0e = computeEstimateCharges(calc0e.items, 1.0, {
    method: 'FIXED',
    distanceKm: 0,
    ratePerKm: 0,
    loadingUnloadingFixed: 0
  }, {
    departmentalPercent: 6.0,
    contractorPercent: 10.0,
    engineeringPercent: 0.0,
    contingencyPercent: 0.0,
    taxPercent: 0.0,
    otherChargesFixed: 0,
    overheadBasis: 'MATERIAL'
  });

  const est0e: CostEstimateRecord = {
    id: 'est-ht-1km-dog-h-type-lump-sum',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-01060',
      revisionNo: 'Rev-00',
      estimateDate: '2026-10-03',
      workOrderNo: '26147126051',
      schemeCategory: 'ELR',
      elrCode: 'ELR-71-26-051',
      accountHead: '4-71 ELR Capital Loss Reduction',
      division: 'Peshawar Transmission & Line Division',
      subDivision: 'Peshawar City Sub-Division',
      circle: 'Peshawar Circle-1',
      district: 'Peshawar',
      feederName: 'University Town 11kV Feeder',
      feederCode: 'FDR-UTN-02',
      proposedLocation: '1.0 KM HT Line Extension Site with H-Type Steel Structures',
      villageLocality: 'Peshawar',
      gpsLatitude: '34.0100 N',
      gpsLongitude: '71.5000 E',
      applicantDepartment: 'PESCO Line Construction & System Augmentation',
      schemeProjectName: 'Construction of 1.0 KM HT Line with DOG Conductor & H-Type Steel Structures (Lump Sum Package)',
      purposeOfWork: 'Construction of 1.0 KM 11kV HT line extension using ACSR DOG conductor and H-Type Steel Structures (Total Material Rs. 3,399,531.32). Net cost is estimated adding 10% Labour Cost (Rs. 339,953.13) and 16% Over Heads on material cost (Rs. 543,925.01) = Rs. 4,283,409.46.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: 'Engr. Tariq Khan (XEN Peshawar)',
      approvedBy: 'Engr. Abdul Rehman (SE Circle-1)'
    },
    type: 'HT_LINE_EXTENSION',
    status: 'APPROVED',
    lineDetails: ld0e,
    items: calc0e.items,
    charges: charges0e,
    calculationSteps: calc0e.steps,
    auditTrail: [
      { id: 'aud-s0e', timestamp: '2026-10-03 10:00', user: 'Engr. M. Inayat', role: 'SDO', action: 'Created estimate for 1.0 KM HT Line with DOG Conductor and H-Type Steel Structures lump sum schedule + 10% Labour + 16% Over Heads on Material Cost' },
      { id: 'aud-s0e-appr', timestamp: '2026-10-03 12:00', user: 'Engr. Tariq Khan', role: 'XEN', action: 'Approved technical sanction for 1.0 KM HT Line H-Type package (Net Cost Rs. 4,283,409.46)' }
    ],
    createdAt: '2026-10-03T10:00:00.000Z',
    updatedAt: '2026-10-03T12:00:00.000Z'
  };

  // Generate Linked Estimates for all Preset ELR Feeders
  const presetLinkedEstimates = PRESET_FEEDERS.map(f => buildLinkedEstimateForFeeder(f, materials, factors));

  return [
    ...presetLinkedEstimates,
    est0, 
    est0b, 
    est0c, 
    est0d, 
    est0e, 
    est1, 
    est2, 
    est3, 
    est4, 
    est5
  ];
}

/**
 * Builds or synthesizes a linked Cost Estimate record for any given FeederData project.
 * Automatically synchronizes 11-digit work order, scheme category, feeder name, sub-division,
 * division, circle, conductor sizes, line lengths, and transformer capacity into a unified project.
 */
export function buildLinkedEstimateForFeeder(
  feeder: FeederData,
  materials: MaterialItem[],
  factors: DesignFactorsConfig
): CostEstimateRecord {
  const isHt = feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000;
  const totalLengthKm = feeder.segments.reduce((acc, s) => acc + s.lengthKm, 0);
  const totalPoles = feeder.nodes.length;
  
  // Calculate estimate type
  const estType: EstimateType = isHt ? 'HT_LINE_EXTENSION' : 'LT_LINE_EXTENSION';
  
  // Find standard conductor used most in this feeder
  const conductorUsage: Record<string, number> = {};
  feeder.segments.forEach(s => {
    conductorUsage[s.conductorCode] = (conductorUsage[s.conductorCode] || 0) + s.lengthKm;
  });
  let primaryConductor = isHt ? 'DOG' : 'ANT';
  let maxLen = 0;
  Object.entries(conductorUsage).forEach(([code, len]) => {
    if (len > maxLen) {
      maxLen = len;
      primaryConductor = code;
    }
  });

  const lineDetails: EstimateLineDetails = {
    htLengthKm: isHt ? Number(totalLengthKm.toFixed(3)) : 0,
    ltLengthKm: isHt ? 0 : Number(totalLengthKm.toFixed(3)),
    htPoles: isHt ? Math.max(2, totalPoles) : 0,
    ltPoles: isHt ? 0 : Math.max(2, totalPoles),
    staySets: Math.max(2, Math.round(totalLengthKm * (isHt ? factors.staySetsPerKm : 4))),
    roadCrossings: 0,
    canalCrossings: 0,
    transformerStructures: 1,
    transformerCount: 1,
    transformerCapacityKva: feeder.proposedTransformerKva || feeder.existingTransformerKva || (isHt ? 1200 : 100),
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: primaryConductor.toUpperCase(),
    poleType: isHt ? 'PCC' : 'PCC',
    poleHeightMeters: isHt ? 11 : 9.5,
    insulatorType: 'PIN_DISC'
  };

  const calc = calculateQuantitiesForLine(estType, lineDetails, factors, materials);
  const charges = computeEstimateCharges(calc.items, totalLengthKm, {
    method: 'PER_KM',
    distanceKm: 20,
    ratePerKm: 180,
    loadingUnloadingFixed: 8000
  });

  const year = new Date().getFullYear();
  const wo = feeder.workOrderNo || '26147126042';

  return {
    id: feeder.linkedEstimateId || `est-elr-${feeder.id}`,
    projectInfo: {
      estimateNo: `EST-${feeder.id.slice(0, 4).toUpperCase()}-${year}-001`,
      revisionNo: 'Rev-00',
      estimateDate: new Date().toISOString().split('T')[0],
      workOrderNo: wo,
      schemeCategory: feeder.schemeCategory || 'ELR',
      elrCode: feeder.elrCode || `ELR-71-26-${feeder.id.slice(0, 3).toUpperCase()}`,
      accountHead: feeder.accountHead || '4-71 ELR Capital Loss Reduction',
      division: feeder.division || 'Peshawar Cantt Division',
      subDivision: feeder.subDivision || 'Gulbhar Sub-Division',
      circle: feeder.circle || 'Peshawar Circle-1',
      district: feeder.district || 'Peshawar',
      feederName: feeder.name,
      feederCode: `FDR-${feeder.id.slice(0, 4).toUpperCase()}-01`,
      proposedLocation: feeder.substationName || 'Peshawar Grid Site',
      villageLocality: feeder.villageLocality || feeder.name,
      gpsLatitude: '34.0151 N',
      gpsLongitude: '71.5249 E',
      applicantDepartment: feeder.applicantDepartment || 'PESCO Planning & Engineering (ELR Directorate)',
      schemeProjectName: feeder.schemeProjectName || `${feeder.name} - Loss Reduction & Line Cost Estimate`,
      purposeOfWork: feeder.purposeOfWork || `Comprehensive Energy Loss Reduction (ELR), network augmentation, and line cost estimation for ${feeder.name}.`,
      preparedBy: feeder.preparedBy || 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: feeder.checkedBy || 'Engr. Tariq Khan (XEN Peshawar)',
      approvedBy: feeder.approvedBy || 'Engr. Abdul Rehman (SE Circle-1)'
    },
    type: estType,
    status: 'APPROVED',
    lineDetails,
    items: calc.items,
    charges,
    calculationSteps: calc.steps,
    auditTrail: [
      {
        id: `aud-elr-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        user: feeder.preparedBy || 'Engr. M. Inayat',
        role: 'SDO',
        action: `Linked estimate created for unified project: ${feeder.name}`
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// -------------------------------------------------------------
// IndexedDB Helper Functions
// -------------------------------------------------------------
async function getAllRecords<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function putRecord<T>(db: IDBDatabase, storeName: string, item: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteRecord(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getSetting<T>(db: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function putSetting<T>(db: IDBDatabase, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// -------------------------------------------------------------
// Public Data Access APIs (Firestore Implementation)
// -------------------------------------------------------------
export async function getAllEstimatesFromDb(): Promise<CostEstimateRecord[]> {
  // TODO: Implement Firestore for estimates
  return [];
}

export async function saveEstimateToDb(estimate: CostEstimateRecord): Promise<void> {
  // TODO: Implement Firestore for estimates
}

export async function deleteEstimateFromDb(id: string): Promise<void> {
  // TODO: Implement Firestore for estimates
}

// Already defined above for Firestore:
// export async function getAllMaterialsFromDb(): Promise<MaterialItem[]>
// export async function saveMaterialToDb(material: MaterialItem): Promise<void>

export async function saveDesignFactorsToDb(factors: DesignFactorsConfig): Promise<void> {
  // TODO: Implement Firestore for settings
}

export async function resetCostDbToDefaults(): Promise<{
  estimates: CostEstimateRecord[];
  materials: MaterialItem[];
  designFactors: DesignFactorsConfig;
  templates: ConstructionTemplate[];
}> {
  // TODO: Implement Firestore reset
  return { estimates: [], materials: [], designFactors: {} as any, templates: [] };
}
