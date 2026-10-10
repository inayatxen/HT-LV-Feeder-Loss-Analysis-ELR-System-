/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FeederData, FeederAnalysisSummary } from '../types/feeder';
import { PRESET_FEEDERS, GULBHAR_COLONY_LT_FEEDER } from '../data/presetFeeders';

export interface SavedAnalysisSnapshot {
  id: string;
  name: string;
  notes?: string;
  timestamp: number;
  feederId: string;
  feederName: string;
  category: 'LV' | 'HV';
  transformerKva: number;
  totalCircuitLengthKm: number;
  totalSystemDemandKva: number;
  totalLineLossKw: number;
  worstVoltageDropPercent: number;
  worstVoltageVolts: number;
  annualEnergyLossKwh: number;
  isTransformerOverloaded: boolean;
  feederData: FeederData;
  summary: FeederAnalysisSummary;
  linkedEstimate?: any;
}

const DB_NAME = 'FeederLossAnalysisDB';
const DB_VERSION = 1;
const STORE_FEEDERS = 'feeders';
const STORE_SNAPSHOTS = 'saved_snapshots';
const STORE_METADATA = 'metadata';

const LOCAL_STORAGE_KEY_FEEDERS = 'feeder_loss_db_feeders';
const LOCAL_STORAGE_KEY_SNAPSHOTS = 'feeder_loss_db_snapshots';

/**
 * Open or upgrade IndexedDB with full error handling and fallback
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store 1: Feeders
      if (!db.objectStoreNames.contains(STORE_FEEDERS)) {
        db.createObjectStore(STORE_FEEDERS, { keyPath: 'id' });
      }

      // Store 2: Saved Analysis Snapshots
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        const snapStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
        snapStore.createIndex('by_feederId', 'feederId', { unique: false });
        snapStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }

      // Store 3: General app metadata & preferences
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Fallback to localStorage when IndexedDB is blocked or throws
 */
const FallbackStorage = {
  getFeeders(): Record<string, FeederData> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_FEEDERS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    const defaults: Record<string, FeederData> = {};
    PRESET_FEEDERS.forEach(f => {
      defaults[f.id] = JSON.parse(JSON.stringify(f));
    });
    return defaults;
  },

  saveFeeders(feeders: Record<string, FeederData>): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_FEEDERS, JSON.stringify(feeders));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
  },

  getSnapshots(): SavedAnalysisSnapshot[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SNAPSHOTS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    return [];
  },

  saveSnapshots(snapshots: SavedAnalysisSnapshot[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
  }
};

/**
 * Initialize local database: seeds with default WAPDA preset feeders if empty
 */
export async function initLocalDatabase(): Promise<{
  feeders: Record<string, FeederData>;
  source: 'indexeddb' | 'localstorage';
}> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FEEDERS, 'readonly');
    const store = tx.objectStore(STORE_FEEDERS);
    const getAllReq = store.getAll();

    const storedFeeders: FeederData[] = await new Promise((res, rej) => {
      getAllReq.onsuccess = () => res(getAllReq.result || []);
      getAllReq.onerror = () => rej(getAllReq.error);
    });

    if (storedFeeders.length === 0) {
      // Seed initial preset feeders into IndexedDB
      const writeTx = db.transaction(STORE_FEEDERS, 'readwrite');
      const writeStore = writeTx.objectStore(STORE_FEEDERS);

      const feederMap: Record<string, FeederData> = {};
      for (const feeder of PRESET_FEEDERS) {
        writeStore.put(feeder);
        feederMap[feeder.id] = feeder;
      }

      await new Promise((res, rej) => {
        writeTx.oncomplete = () => res(true);
        writeTx.onerror = () => rej(writeTx.error);
      });

      return { feeders: feederMap, source: 'indexeddb' };
    } else {
      const feederMap: Record<string, FeederData> = {};
      storedFeeders.forEach(f => {
        feederMap[f.id] = f;
      });
      return { feeders: feederMap, source: 'indexeddb' };
    }
  } catch (err) {
    console.warn('IndexedDB failed to init, falling back to localStorage:', err);
    const feeders = FallbackStorage.getFeeders();
    return { feeders, source: 'localstorage' };
  }
}

/**
 * Save a single feeder to local database
 */
export async function saveFeederToLocalDb(feeder: FeederData): Promise<void> {
  // Sync to fallback localStorage first
  const currentFeeders = FallbackStorage.getFeeders();
  currentFeeders[feeder.id] = feeder;
  FallbackStorage.saveFeeders(currentFeeders);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FEEDERS, 'readwrite');
    const store = tx.objectStore(STORE_FEEDERS);
    store.put(feeder);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Saved to localStorage fallback (IndexedDB unavailable):', err);
  }
}

/**
 * Save multiple feeders to local database
 */
export async function saveAllFeedersToLocalDb(feeders: Record<string, FeederData>): Promise<void> {
  FallbackStorage.saveFeeders(feeders);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FEEDERS, 'readwrite');
    const store = tx.objectStore(STORE_FEEDERS);

    Object.values(feeders).forEach(f => store.put(f));

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Saved to localStorage fallback:', err);
  }
}

/**
 * Save an Analysis Snapshot to the local database
 */
export async function saveAnalysisSnapshotToDb(snapshot: SavedAnalysisSnapshot): Promise<void> {
  const currentSnaps = FallbackStorage.getSnapshots();
  const filtered = currentSnaps.filter(s => s.id !== snapshot.id);
  filtered.unshift(snapshot);
  FallbackStorage.saveSnapshots(filtered);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    const store = tx.objectStore(STORE_SNAPSHOTS);
    store.put(snapshot);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Saved snapshot to localStorage fallback:', err);
  }
}

/**
 * Get all saved snapshots from local database
 */
export async function getAllSnapshotsFromDb(): Promise<SavedAnalysisSnapshot[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORE_SNAPSHOTS);
    const req = store.getAll();

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const results = req.result || [];
        // Sort newest first
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Reading snapshots from localStorage fallback:', err);
    return FallbackStorage.getSnapshots();
  }
}

/**
 * Delete a snapshot from local database
 */
export async function deleteSnapshotFromDb(snapshotId: string): Promise<void> {
  const current = FallbackStorage.getSnapshots();
  FallbackStorage.saveSnapshots(current.filter(s => s.id !== snapshotId));

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    const store = tx.objectStore(STORE_SNAPSHOTS);
    store.delete(snapshotId);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Deleted snapshot via localStorage fallback:', err);
  }
}

/**
 * Delete a custom feeder from local database
 */
export async function deleteFeederFromDb(feederId: string): Promise<void> {
  const current = FallbackStorage.getFeeders();
  delete current[feederId];
  FallbackStorage.saveFeeders(current);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FEEDERS, 'readwrite');
    const store = tx.objectStore(STORE_FEEDERS);
    store.delete(feederId);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Deleted feeder via localStorage fallback:', err);
  }
}

/**
 * Reset local database to factory defaults
 */
export async function resetDatabaseToDefaults(): Promise<Record<string, FeederData>> {
  const freshMap: Record<string, FeederData> = {};
  PRESET_FEEDERS.forEach(f => {
    freshMap[f.id] = JSON.parse(JSON.stringify(f));
  });

  FallbackStorage.saveFeeders(freshMap);
  FallbackStorage.saveSnapshots([]);

  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FEEDERS, STORE_SNAPSHOTS], 'readwrite');
    const feederStore = tx.objectStore(STORE_FEEDERS);
    const snapStore = tx.objectStore(STORE_SNAPSHOTS);

    feederStore.clear();
    snapStore.clear();

    Object.values(freshMap).forEach(f => feederStore.put(f));

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Database reset fallback to memory/localStorage:', err);
  }

  return freshMap;
}

/**
 * Export full local database to a downloadable JSON file
 */
export async function exportLocalDatabaseBackup(): Promise<string> {
  const [feeders, snapshots] = await Promise.all([
    (async () => {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_FEEDERS, 'readonly');
        const req = tx.objectStore(STORE_FEEDERS).getAll();
        return new Promise<FeederData[]>((res, rej) => {
          req.onsuccess = () => res(req.result || []);
          req.onerror = () => rej(req.error);
        });
      } catch {
        return Object.values(FallbackStorage.getFeeders());
      }
    })(),
    getAllSnapshotsFromDb()
  ]);

  const backupData = {
    appName: 'FLADIX - Feeder Loss Analysis and Data Indexing',
    exportDate: new Date().toISOString(),
    version: DB_VERSION,
    feeders,
    snapshots
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Import a database backup JSON into local database
 */
export async function importLocalDatabaseBackup(jsonString: string): Promise<{
  feederCount: number;
  snapshotCount: number;
}> {
  const data = JSON.parse(jsonString);
  if (!data.feeders || !Array.isArray(data.feeders)) {
    throw new Error('Invalid database backup file format: missing feeders list.');
  }

  const feeders: FeederData[] = data.feeders;
  const snapshots: SavedAnalysisSnapshot[] = Array.isArray(data.snapshots) ? data.snapshots : [];

  const feederMap: Record<string, FeederData> = {};
  feeders.forEach(f => {
    feederMap[f.id] = f;
  });

  await saveAllFeedersToLocalDb(feederMap);

  for (const snap of snapshots) {
    await saveAnalysisSnapshotToDb(snap);
  }

  return {
    feederCount: feeders.length,
    snapshotCount: snapshots.length
  };
}
