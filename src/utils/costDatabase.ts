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

  // 1. Check & Seed Materials
  const materials = await getAllRecords<MaterialItem>(db, 'materials');
  let activeMaterials = materials;
  if (materials.length === 0) {
    for (const mat of INITIAL_MATERIALS) {
      await putRecord(db, 'materials', mat);
    }
    activeMaterials = INITIAL_MATERIALS;
  }

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
  if (estimates.length === 0) {
    const seedEstimates = createSeedEstimates(activeMaterials, designFactors);
    for (const est of seedEstimates) {
      await putRecord(db, 'estimates', est);
    }
    estimates = seedEstimates;
  }

  return {
    estimates,
    materials: activeMaterials,
    designFactors,
    templates: activeTemplates
  };
}

function createSeedEstimates(materials: MaterialItem[], factors: DesignFactorsConfig): CostEstimateRecord[] {
  // Sample 1: 11kV HT Extension at Gulbhar Colony
  const lineDetails1 = {
    htLengthKm: 2.2,
    ltLengthKm: 0.8,
    htPoles: 24,
    ltPoles: 20,
    staySets: 12,
    roadCrossings: 2,
    canalCrossings: 0,
    transformerStructures: 1,
    transformerCount: 1,
    transformerCapacityKva: 100,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'DOG',
    poleType: 'PCC',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC'
  };
  const calc1 = calculateQuantitiesForLine('COMBINED_HT_LT', lineDetails1, factors, materials);
  const charges1 = computeEstimateCharges(calc1.items, 3.0, {
    method: 'PER_KM',
    distanceKm: 28,
    ratePerKm: 180,
    loadingUnloadingFixed: 15000
  });

  const est1: CostEstimateRecord = {
    id: 'est-gulbhar-2026-001',
    projectInfo: {
      estimateNo: 'EST-PESH-2026-00101',
      revisionNo: 'Rev-00',
      estimateDate: '2026-09-15',
      division: 'Peshawar City',
      subDivision: 'Gulbhar Sub-Division',
      circle: 'Peshawar Circle-1',
      district: 'Peshawar',
      feederName: 'Gulbhar Colony 11kV Feeder',
      feederCode: 'FDR-GLB-01',
      proposedLocation: 'Gulbhar Mohallah New Abadi Sector B',
      villageLocality: 'Gulbhar Colony',
      gpsLatitude: '34.0151 N',
      gpsLongitude: '71.5249 E',
      applicantDepartment: 'Local Community / Provincial Govt Electrification Scheme',
      schemeProjectName: 'Khyber Pakhtunkhwa Village Electrification Phase-IV',
      purposeOfWork: 'Extension of 11kV Line & Installation of 100 kVA Transformer for voltage improvement and loss reduction.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: 'Engr. Tariq Khan (XEN Peshawar City)',
      approvedBy: 'Engr. Abdul Rehman (SE Circle-1)'
    },
    type: 'COMBINED_HT_LT',
    status: 'APPROVED',
    lineDetails: lineDetails1,
    items: calc1.items,
    charges: charges1,
    calculationSteps: calc1.steps,
    auditTrail: [
      { id: 'aud-1', timestamp: '2026-09-15 10:30', user: 'Engr. M. Inayat', role: 'SDO', action: 'Created initial estimate draft' },
      { id: 'aud-2', timestamp: '2026-09-16 14:15', user: 'Engr. Tariq Khan', role: 'XEN', action: 'Verified technical BOQ & forwarded for sanction' },
      { id: 'aud-3', timestamp: '2026-09-18 11:00', user: 'Engr. Abdul Rehman', role: 'SE', action: 'Officially sanctioned and approved under Work Order #PESCO/W-9442' }
    ],
    createdAt: '2026-09-15T10:30:00.000Z',
    updatedAt: '2026-09-18T11:00:00.000Z'
  };

  // Sample 2: 11kV Feeder Trunk Line for Hayatabad
  const lineDetails2 = {
    htLengthKm: 4.5,
    ltLengthKm: 0,
    htPoles: 48,
    ltPoles: 0,
    staySets: 18,
    roadCrossings: 3,
    canalCrossings: 1,
    transformerStructures: 0,
    transformerCount: 0,
    transformerCapacityKva: 0,
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: 'PANTHER',
    poleType: 'PCC',
    poleHeightMeters: 11,
    insulatorType: 'PIN_DISC'
  };
  const calc2 = calculateQuantitiesForLine('COMPLETE_HT_FEEDER', lineDetails2, factors, materials);
  const charges2 = computeEstimateCharges(calc2.items, 4.5, {
    method: 'PER_KM',
    distanceKm: 40,
    ratePerKm: 180,
    loadingUnloadingFixed: 25000
  });

  const est2: CostEstimateRecord = {
    id: 'est-hayatabad-2026-002',
    projectInfo: {
      estimateNo: 'EST-KHYB-2026-00102',
      revisionNo: 'Rev-01',
      estimateDate: '2026-09-22',
      division: 'Khyber Division',
      subDivision: 'Hayatabad Sub-Division',
      circle: 'Khyber Circle',
      district: 'Peshawar',
      feederName: 'Hayatabad Industrial Feeder',
      feederCode: 'FDR-HYD-04',
      proposedLocation: 'Industrial Estate Phase-VII Extension',
      villageLocality: 'Hayatabad Phase-VII',
      gpsLatitude: '33.9850 N',
      gpsLongitude: '71.4320 E',
      applicantDepartment: 'Khyber Pakhtunkhwa Economic Zones Dev & Mgmt Co (KPEZDMC)',
      schemeProjectName: 'PESCO ELR Feeder Bifurcation & Industrial Relief Scheme',
      purposeOfWork: 'Construction of 4.5 km Dedicated 11kV ACSR Panther Feeder to relieve overloaded 11kV feeder.',
      preparedBy: 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: 'Engr. Tariq Khan (XEN)'
    },
    type: 'COMPLETE_HT_FEEDER',
    status: 'SUBMITTED',
    lineDetails: lineDetails2,
    items: calc2.items,
    charges: charges2,
    calculationSteps: calc2.steps,
    auditTrail: [
      { id: 'aud-4', timestamp: '2026-09-22 09:00', user: 'Engr. M. Inayat', role: 'SDO', action: 'Created estimate from Template 4' },
      { id: 'aud-5', timestamp: '2026-09-24 16:20', user: 'Engr. M. Inayat', role: 'SDO', action: 'Submitted for Technical Sanction to XEN' }
    ],
    createdAt: '2026-09-22T09:00:00.000Z',
    updatedAt: '2026-09-24T16:20:00.000Z'
  };

  return [est1, est2];
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
