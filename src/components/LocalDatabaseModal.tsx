/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  X, 
  Save, 
  Trash2, 
  Download, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Zap, 
  RotateCcw, 
  Layers, 
  FileText, 
  AlertTriangle, 
  FolderOpen, 
  Plus, 
  Maximize2, 
  Minimize2, 
  Settings, 
  Printer,
  Cloud,
  CloudOff,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { FeederData, FeederAnalysisSummary } from '../types/feeder';
import { FladixOfficialHeader } from './FladixOfficialHeader';
import { 
  SavedAnalysisSnapshot, 
  getAllSnapshotsFromDb, 
  saveAnalysisSnapshotToDb, 
  deleteSnapshotFromDb, 
  deleteFeederFromDb, 
  resetDatabaseToDefaults, 
  exportLocalDatabaseBackup, 
  importLocalDatabaseBackup,
  saveFeederToLocalDb
} from '../utils/localDatabase';
import { MaterialPriceUploader } from './admin/MaterialPriceUploader';
import { supabase } from '../lib/supabase';

interface LocalDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFeeder: FeederData;
  activeSummary: FeederAnalysisSummary;
  activeTransformerKva: number;
  customFeeders: Record<string, FeederData>;
  onLoadSnapshot: (snapshot: SavedAnalysisSnapshot) => void;
  onLoadFeeder: (feederId: string) => void;
  onRefreshFeeders: (feeders: Record<string, FeederData>) => void;
}

export const LocalDatabaseModal: React.FC<LocalDatabaseModalProps> = ({
  isOpen,
  onClose,
  activeFeeder,
  activeSummary,
  activeTransformerKva,
  customFeeders,
  onLoadSnapshot,
  onLoadFeeder,
  onRefreshFeeders
}) => {
  const [activeTab, setActiveTab] = useState<'save_new' | 'snapshots' | 'feeders' | 'backup' | 'materials'>('save_new');
  const [isMaximized, setIsMaximized] = useState(false);
  const [snapshots, setSnapshots] = useState<SavedAnalysisSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Save New Snapshot state
  const [snapshotName, setSnapshotName] = useState(`${activeFeeder.name} - ${activeTransformerKva} kVA Analysis`);
  const [snapshotNotes, setSnapshotNotes] = useState('');

  // Backup Import state
  const [importJsonText, setImportJsonText] = useState('');

  // Print Snapshots modal state
  const [printSnapshotsModal, setPrintSnapshotsModal] = useState<SavedAnalysisSnapshot[] | null>(null);

  // Offline Sync to Supabase state
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fladix_offline_sync');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    try {
      return localStorage.getItem('fladix_last_sync_time') || '';
    } catch {
      return '';
    }
  });

  const toggleOfflineSync = (enabled: boolean) => {
    setOfflineSyncEnabled(enabled);
    try {
      localStorage.setItem('fladix_offline_sync', enabled ? 'true' : 'false');
    } catch {}
    if (enabled && navigator.onLine) {
      setSuccessMsg('Offline Sync enabled: Pushing local cache to Supabase cloud...');
      syncLocalChangesToSupabase().then(() => {
        setTimeout(() => setSuccessMsg(''), 4000);
      });
    }
  };

  const syncLocalChangesToSupabase = async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    try {
      setSyncStatus('syncing');
      const allSnaps = await getAllSnapshotsFromDb();
      
      // 1. Sync linked estimates to Supabase estimates table
      for (const snap of allSnaps) {
        if (snap.linkedEstimate) {
          try {
            const { auditTrail, ...cleanEstimate } = snap.linkedEstimate as any;
            await supabase.from('estimates').upsert(cleanEstimate);
          } catch (e) {
            console.warn('Supabase estimate upsert warning:', e);
          }
        }
      }

      // 2. Sync snapshots to Supabase snapshots table if present
      for (const snap of allSnaps) {
        try {
          await supabase.from('snapshots').upsert({
            id: snap.id,
            name: snap.name,
            notes: snap.notes,
            feeder_id: snap.feederId,
            feeder_name: snap.feederName,
            category: snap.category,
            data: snap,
            updated_at: new Date().toISOString()
          });
        } catch {
          // Table may not exist yet, fallback gracefully
        }
      }

      const timeStr = new Date().toLocaleTimeString();
      setLastSyncTime(timeStr);
      try {
        localStorage.setItem('fladix_last_sync_time', timeStr);
      } catch {}
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Offline sync error:', err);
      setSyncStatus('error');
    }
  };

  // Auto-sync listener when network connection is restored
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineSyncEnabled) {
        setSuccessMsg('Network connection detected. Automatically syncing local cache to Supabase...');
        syncLocalChangesToSupabase().then(() => {
          setTimeout(() => setSuccessMsg(''), 4000);
        });
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineSyncEnabled]);

  // Load snapshots when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
      setSnapshotName(`${activeFeeder.name} - ${activeTransformerKva} kVA (${activeSummary.totalLineLossKw} kW Loss)`);
    }
  }, [isOpen, activeFeeder, activeTransformerKva, activeSummary]);

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      const list = await getAllSnapshotsFromDb();
      setSnapshots(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrentSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotName.trim()) {
      setErrorMsg('Please enter a name for this database snapshot.');
      return;
    }

    try {
      setLoading(true);
      const newSnapshot: SavedAnalysisSnapshot = {
        id: `snap-${Date.now()}`,
        name: snapshotName.trim(),
        notes: snapshotNotes.trim(),
        timestamp: Date.now(),
        feederId: activeFeeder.id,
        feederName: activeFeeder.name,
        category: activeFeeder.category || (activeFeeder.type === 'HT' ? 'HV' : 'LV'),
        transformerKva: activeTransformerKva,
        totalCircuitLengthKm: activeSummary.totalCircuitLengthKm,
        totalSystemDemandKva: activeSummary.totalSystemDemandKva,
        totalLineLossKw: activeSummary.totalLineLossKw,
        worstVoltageDropPercent: activeSummary.worstVoltageDropPercent,
        worstVoltageVolts: activeSummary.worstVoltageVolts,
        annualEnergyLossKwh: activeSummary.annualEnergyLossKwh,
        isTransformerOverloaded: activeSummary.isTransformerOverloaded,
        feederData: JSON.parse(JSON.stringify(activeFeeder)),
        summary: JSON.parse(JSON.stringify(activeSummary)),
        linkedEstimate: activeFeeder.linkedEstimate ? JSON.parse(JSON.stringify(activeFeeder.linkedEstimate)) : undefined
      };

      await saveAnalysisSnapshotToDb(newSnapshot);
      // Also persist the feeder definition itself
      await saveFeederToLocalDb(activeFeeder);

      await loadSnapshots();
      setSuccessMsg('Data and analysis snapshot successfully saved to local database (IndexedDB)!');
      
      // Auto push to Supabase if Offline Sync is enabled and currently online
      if (offlineSyncEnabled && navigator.onLine) {
        syncLocalChangesToSupabase();
      }

      setSnapshotNotes('');
      setActiveTab('snapshots');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save to local database.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved analysis snapshot from the local database?')) return;
    try {
      await deleteSnapshotFromDb(id);
      await loadSnapshots();
      setSuccessMsg('Snapshot removed from local database.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete snapshot.');
    }
  };

  const handleDeleteFeeder = async (feederId: string) => {
    if (Object.keys(customFeeders).length <= 1) {
      alert('You cannot delete the last remaining feeder.');
      return;
    }
    if (!confirm(`Are you sure you want to delete feeder "${customFeeders[feederId]?.name}" from the local database?`)) return;
    try {
      await deleteFeederFromDb(feederId);
      const updated = { ...customFeeders };
      delete updated[feederId];
      onRefreshFeeders(updated);
      setSuccessMsg('Feeder removed from local database.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete feeder.');
    }
  };

  const handleExportBackup = async () => {
    try {
      const jsonStr = await exportLocalDatabaseBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feeder_loss_local_db_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSuccessMsg('Complete database exported to JSON file successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to export backup.');
    }
  };

  const handleImportBackup = async () => {
    if (!importJsonText.trim()) {
      setErrorMsg('Please paste a valid JSON database backup content.');
      return;
    }
    try {
      setLoading(true);
      const res = await importLocalDatabaseBackup(importJsonText);
      await loadSnapshots();
      setSuccessMsg(`Database backup successfully restored: ${res.feederCount} feeders and ${res.snapshotCount} snapshots loaded.`);
      setImportJsonText('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid JSON database file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFactory = async () => {
    if (!confirm('Warning: This will reset your local database to original factory WAPDA presets (Gulbhar Colony, Hayatabad, Warsak, Agri Tubewell). Continue?')) return;
    try {
      setLoading(true);
      const defaults = await resetDatabaseToDefaults();
      onRefreshFeeders(defaults);
      await loadSnapshots();
      setSuccessMsg('Local database successfully reset to factory defaults.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset database.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center ${isMaximized ? 'p-0' : 'p-3 sm:p-4'}`}>
      <div className={`bg-white w-full ${isMaximized ? 'h-full max-w-none rounded-none' : 'max-w-5xl rounded-2xl max-h-[92vh]'} shadow-2xl border border-slate-200 overflow-hidden flex flex-col`}>
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/pesco-logo.svg"
              alt="PESCO Logo"
              className="w-10 h-10 rounded-full border border-amber-500/40 shadow-xs shrink-0"
            />
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                PESCO Local Database Manager
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  IndexedDB
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Peshawar Electric Supply Company · Persistent client-side storage for feeder models, calculations, and analysis snapshots.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isMaximized ? "Restore Window View" : "Maximize Full Screen"}
            >
              {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs Bar */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('save_new')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'save_new'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Current Data</span>
            </button>

            <button
              onClick={() => setActiveTab('snapshots')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'snapshots'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Saved Snapshots ({snapshots.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('feeders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'feeders'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stored Feeders ({Object.keys(customFeeders).length})</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup & Restore</span>
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'materials'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Material Prices</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Offline Sync to Supabase Toggle */}
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs shadow-xs">
              <span className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                {offlineSyncEnabled ? (
                  isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Offline Sync:</span>
              </span>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => toggleOfflineSync(!offlineSyncEnabled)}
                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  offlineSyncEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
                title="Automatically push local changes to Supabase cloud whenever network connection is detected"
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    offlineSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>

              <span className={`text-[10px] font-mono font-bold ${offlineSyncEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                {offlineSyncEnabled ? 'ON' : 'OFF'}
              </span>

              {offlineSyncEnabled && (
                <button
                  type="button"
                  onClick={syncLocalChangesToSupabase}
                  disabled={syncStatus === 'syncing' || !isOnline}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition-colors"
                  title="Push local cache to Supabase cloud now"
                >
                  <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin text-blue-500' : ''}`} />
                </button>
              )}
            </div>

            {offlineSyncEnabled && lastSyncTime && (
              <span className="text-[10px] font-mono text-slate-400 hidden lg:inline">
                Synced: {lastSyncTime}
              </span>
            )}

            <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
              Storage: <strong className="text-slate-700">FeederLossAnalysisDB</strong>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: SAVE CURRENT DATA */}
          {activeTab === 'save_new' && (
            <form onSubmit={handleSaveCurrentSnapshot} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Current Active Workspace Data Snapshot</span>
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                    {activeFeeder.category || (activeFeeder.type === 'HT' ? 'HV' : 'LV')} Feeder
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Feeder:</span>
                    <span className="font-bold text-slate-900 truncate block">{activeFeeder.name}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Transformer:</span>
                    <span className="font-bold text-slate-900">{activeTransformerKva} kVA</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Line Loss:</span>
                    <span className="font-bold text-amber-600">{activeSummary.totalLineLossKw} kW</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Worst Voltage:</span>
                    <span className="font-bold text-rose-600">-{activeSummary.worstVoltageDropPercent}%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Snapshot Name / Title:
                </label>
                <input
                  type="text"
                  required
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="e.g., Gulbhar Colony - 100kVA Baseline Calculation"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Notes / Engineering Remarks (Optional):
                </label>
                <textarea
                  rows={3}
                  value={snapshotNotes}
                  onChange={(e) => setSnapshotNotes(e.target.value)}
                  placeholder="e.g., Calibrated 12-node model matching image1.png. Overloaded at 118% with 100 kVA transformer. Proposed 200 kVA upgrade."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  Data will be saved into the browser's persistent IndexedDB local storage.
                </span>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save to Local Database'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SAVED SNAPSHOTS */}
          {activeTab === 'snapshots' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  Select a saved snapshot to restore it into the active calculation workspace:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintSnapshotsModal(snapshots)}
                    disabled={snapshots.length === 0}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-2xs"
                    title="Print all saved snapshots (each snapshot printed on a separate page)"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-600" />
                    <span>Print All Snapshots</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('save_new')}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save New Snapshot</span>
                  </button>
                </div>
              </div>

              {snapshots.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No Saved Snapshots Yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Save your current feeder configuration and analysis using the "Save Current Data" tab.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-400 transition-all shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{snap.name}</h4>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            snap.category === 'HV' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {snap.category === 'HV' ? '11kV HT' : '400V LT'}
                          </span>
                          {snap.feederData?.workOrderNo && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-900 border border-blue-200">
                              WO: {snap.feederData.workOrderNo}
                            </span>
                          )}
                          {snap.linkedEstimate && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                              🔗 2-in-1: ELR + Cost Est. (Rs. {snap.linkedEstimate.charges?.grandTotal?.toLocaleString() || 0})
                            </span>
                          )}
                        </div>
                        {snap.notes && (
                          <p className="text-xs text-slate-600 line-clamp-1">{snap.notes}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500">
                          <span>Trf: <strong className="text-slate-800">{snap.transformerKva} kVA</strong></span>
                          <span>•</span>
                          <span>Line Loss: <strong className="text-amber-700">{snap.totalLineLossKw} kW</strong></span>
                          <span>•</span>
                          <span>Drop: <strong className="text-rose-600">-{snap.worstVoltageDropPercent}%</strong></span>
                          <span>•</span>
                          <span>Saved: {new Date(snap.timestamp).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setPrintSnapshotsModal([snap])}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Print this snapshot as a separate page"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            onLoadSnapshot(snap);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Load Snapshot</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STORED FEEDERS */}
          {activeTab === 'feeders' && (
            <div className="space-y-4">
              <span className="text-xs text-slate-500 block">
                Manage feeder topology records stored in your browser's local database:
              </span>

              <div className="space-y-2.5">
                {Object.values(customFeeders).map((f) => (
                  <div
                    key={f.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{f.name}</h4>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          f.category === 'HV' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {f.category === 'HV' ? '11kV HT' : '400V LT'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{f.substationName} · {f.nominalVoltage} V</p>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 mt-1">
                        <span>{f.nodes.length} Poles/Nodes</span>
                        <span>•</span>
                        <span>{f.segments.length} Spans</span>
                        <span>•</span>
                        <span>{f.existingTransformerKva} kVA Default</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onLoadFeeder(f.id);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
                        <span>Open Feeder</span>
                      </button>

                      {f.id !== 'gulbhar-colony-peshawar' && f.id !== 'hayatabad-11kv-feeder' && (
                        <button
                          onClick={() => handleDeleteFeeder(f.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete feeder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Export Box */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>Export Database Backup</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Download all your saved feeder networks, spans data, and analysis snapshots into a single JSON file.
                  </p>
                </div>

                <button
                  onClick={handleExportBackup}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup (.json)</span>
                </button>
              </div>

              {/* Import Box */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Import Database Backup</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Paste previously exported JSON backup data to restore saved records into your local database.
                  </p>
                </div>

                <textarea
                  rows={4}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`{"appName": "FLADIX - Feeder Loss Analysis and Data Indexing", "feeders": [...], "snapshots": [...]}`}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleImportBackup}
                    disabled={loading || !importJsonText.trim()}
                    className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Restore into Database</span>
                  </button>
                </div>
              </div>

              {/* Reset to Defaults Box */}
              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Reset to Factory Presets</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Clear custom database entries and re-seed authentic WAPDA ELR benchmarks.
                  </p>
                </div>
                <button
                  onClick={handleResetFactory}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Factory Reset</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: MATERIAL PRICES */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <MaterialPriceUploader />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Database: <strong>IndexedDB / FeederLossAnalysisDB</strong> · Auto-Persisted
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* ========================================================
          SNAPSHOT PRINT DOSSIER (EACH SNAPSHOT AS SEPARATE PAGE)
         ======================================================== */}
      {printSnapshotsModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-xs flex flex-col p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
          {/* Print Toolbar */}
          <div className="no-print bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-xl flex items-center justify-between mb-4 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2.5">
              <Printer className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Print Snapshot Dossier</h3>
                <p className="text-[11px] text-slate-400">
                  {printSnapshotsModal.length} saved snapshot{printSnapshotsModal.length > 1 ? 's' : ''} — each snapshot is formatted as a separate page with FLADIX header
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintSnapshotsModal(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Document Container */}
          <div className="max-w-5xl mx-auto w-full space-y-8 bg-white p-6 sm:p-8 rounded-2xl shadow-2xl print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
            {printSnapshotsModal.map((snap, idx) => (
              <div 
                key={snap.id} 
                className="print-page-unit flex flex-col justify-between space-y-4 border-b-2 border-dashed border-slate-200 pb-8 last:border-b-0 print:border-none print:pb-0"
              >
                {/* Official Running Header */}
                <FladixOfficialHeader
                  subtitle="Saved Workspace Technical Analysis Snapshot"
                  badgeLabel="SNAP"
                  badgeStd="WAPDA"
                  refCode={snap.feederData?.workOrderNo || snap.id.substring(0, 8).toUpperCase()}
                  dateStr={new Date(snap.timestamp).toLocaleDateString()}
                  category={snap.category === 'HV' ? '11kV High Tension (HT)' : '400V Low Tension (LT)'}
                  nominalVoltage={snap.transformerKva ? `${snap.transformerKva} kVA` : undefined}
                  division={snap.feederData?.name || snap.name}
                  pageNumberText={`Page ${idx + 1} of ${printSnapshotsModal.length}`}
                />

                {/* Snapshot Details Content */}
                <div className="space-y-4 flex-1">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-3">
                      <h2 className="text-base font-black text-slate-900">{snap.name}</h2>
                      <span className="text-xs font-mono text-slate-500">Record ID: {snap.id}</span>
                    </div>
                    {snap.notes && (
                      <p className="text-xs text-slate-700 mb-3 bg-white p-2.5 rounded border border-slate-200 italic">
                        "{snap.notes}"
                      </p>
                    )}

                    {/* Key Technical Indicators Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-sans uppercase block">Total Line Loss:</span>
                        <span className="text-base font-black text-amber-700">{snap.totalLineLossKw} kW</span>
                        <span className="text-[10px] text-slate-500 font-sans block mt-0.5">Calculated peak loss</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-sans uppercase block">Worst Volt Drop:</span>
                        <span className="text-base font-black text-rose-600">-{snap.worstVoltageDropPercent}%</span>
                        <span className="text-[10px] text-slate-500 font-sans block mt-0.5">End-of-line regulation</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-sans uppercase block">Transformer Rating:</span>
                        <span className="text-base font-black text-blue-800">{snap.transformerKva} kVA</span>
                        <span className="text-[10px] text-slate-500 font-sans block mt-0.5">{snap.category === 'HV' ? '11kV Feeder' : 'Distribution Sub'}</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-sans uppercase block">Network Spans:</span>
                        <span className="text-base font-black text-purple-800">{snap.feederData?.segments?.length || 0} Spans</span>
                        <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                          {(snap.feederData?.segments?.reduce((acc, s) => acc + (s.lengthKm || 0), 0) || 0).toFixed(2)} km line
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linked Cost Estimate (if any) */}
                  {snap.linkedEstimate && (
                    <div className="border border-emerald-300 bg-emerald-50/50 p-4 rounded-xl text-xs">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2 mb-2">
                        <span className="font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🔗 Paired Cost Estimate: {snap.linkedEstimate.generalInfo?.estimateNo || 'EST-RECORD'}</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-800">
                          Total: Rs. {snap.linkedEstimate.charges?.grandTotal?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-emerald-900">
                        <div>Material Cost: Rs. {snap.linkedEstimate.charges?.totalMaterialCost?.toLocaleString() || 0}</div>
                        <div>Labor Cost: Rs. {snap.linkedEstimate.charges?.totalLaborCost?.toLocaleString() || 0}</div>
                        <div>Overheads: Rs. {((snap.linkedEstimate.charges?.grandTotal || 0) - (snap.linkedEstimate.charges?.subtotal || 0)).toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  {/* Spans Summary Table */}
                  {snap.feederData?.segments && snap.feederData.segments.length > 0 && (
                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                        Feeder Spans Topology Schedule ({snap.feederData.segments.length} segments)
                      </div>
                      <table className="w-full text-left text-[11px] font-mono border-collapse">
                        <thead>
                          <tr className="bg-slate-200 text-slate-700 font-bold border-b border-slate-300">
                            <th className="py-1 px-2 text-center w-8">#</th>
                            <th className="py-1 px-2 text-center">From</th>
                            <th className="py-1 px-2 text-center">To</th>
                            <th className="py-1 px-2 text-right">Length (m)</th>
                            <th className="py-1 px-2 text-right">3Φ Cust</th>
                            <th className="py-1 px-2 text-right">1Φ Cust</th>
                            <th className="py-1 px-2 text-left">Conductor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {snap.feederData.segments.slice(0, 15).map((seg, sIdx) => {
                            const node = snap.feederData?.nodes?.find(n => n.id === seg.toNodeId);
                            const lengthM = Math.round((seg.lengthKm || 0) * 1000);
                            return (
                              <tr key={seg.id || sIdx} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="py-1 px-2 text-center text-slate-400">{sIdx + 1}</td>
                                <td className="py-1 px-2 text-center font-bold text-slate-900">{seg.fromNodeId}</td>
                                <td className="py-1 px-2 text-center font-bold text-slate-900">{seg.toNodeId}</td>
                                <td className="py-1 px-2 text-right">{lengthM} m</td>
                                <td className="py-1 px-2 text-right">{node?.threePhaseCustomers ?? '-'}</td>
                                <td className="py-1 px-2 text-right">{node?.singlePhaseCustomers ?? '-'}</td>
                                <td className="py-1 px-2 text-left font-sans">{seg.conductorCode || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {snap.feederData.segments.length > 15 && (
                        <div className="bg-slate-50 text-slate-500 text-[10px] text-center py-1">
                          + {snap.feederData.segments.length - 15} additional spans in full database model
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sign-off footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>FLADIX Local Database Snapshot Record</span>
                  <span>Peshawar Electric Supply Company</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
