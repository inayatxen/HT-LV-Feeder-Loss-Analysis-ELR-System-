/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  CostEstimateRecord, 
  MaterialItem, 
  DesignFactorsConfig, 
  ConstructionTemplate 
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

const DB_NAME = 'pesco_cost_estimation_db';
const DB_VERSION = 1;

export async function openCostDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('estimates')) {
        db.createObjectStore('estimates', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('materials')) {
        db.createObjectStore('materials', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

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
      if (existing.code !== initial.code || existing.name !== initial.name || existing.category !== initial.category) {
        const updated = {
          ...existing,
          code: initial.code,
          name: initial.name,
          category: initial.category,
          unit: initial.unit || existing.unit,
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
    htPoles: 6,
    ltPoles: 0,
    staySets: 4,
    roadCrossings: 1,
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
    htPoles: 6,
    ltPoles: 0,
    staySets: 4,
    roadCrossings: 1,
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

  return [est1, est2, est3, est4, est5];
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
// Public Data Access APIs
// -------------------------------------------------------------
export async function getAllEstimatesFromDb(): Promise<CostEstimateRecord[]> {
  const db = await openCostDb();
  return getAllRecords<CostEstimateRecord>(db, 'estimates');
}

export async function saveEstimateToDb(estimate: CostEstimateRecord): Promise<void> {
  const db = await openCostDb();
  await putRecord(db, 'estimates', estimate);
}

export async function deleteEstimateFromDb(id: string): Promise<void> {
  const db = await openCostDb();
  await deleteRecord(db, 'estimates', id);
}

export async function getAllMaterialsFromDb(): Promise<MaterialItem[]> {
  const db = await openCostDb();
  return getAllRecords<MaterialItem>(db, 'materials');
}

export async function saveMaterialToDb(material: MaterialItem): Promise<void> {
  const db = await openCostDb();
  await putRecord(db, 'materials', material);
}

export async function saveDesignFactorsToDb(factors: DesignFactorsConfig): Promise<void> {
  const db = await openCostDb();
  await putSetting(db, 'design_factors', factors);
}

export async function resetCostDbToDefaults(): Promise<{
  estimates: CostEstimateRecord[];
  materials: MaterialItem[];
  designFactors: DesignFactorsConfig;
  templates: ConstructionTemplate[];
}> {
  const db = await openCostDb();
  // Clear all stores
  const storeNames = ['estimates', 'materials', 'settings', 'templates'];
  for (const name of storeNames) {
    const tx = db.transaction(name, 'readwrite');
    tx.objectStore(name).clear();
  }
  return initCostDatabase();
}
