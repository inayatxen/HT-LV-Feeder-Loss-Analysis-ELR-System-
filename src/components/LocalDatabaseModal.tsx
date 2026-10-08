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
  Minimize2
} from 'lucide-react';
import { FeederData, FeederAnalysisSummary } from '../types/feeder';
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
  const [activeTab, setActiveTab] = useState<'save_new' | 'snapshots' | 'feeders' | 'backup'>('save_new');
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
          </div>

          <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
            Storage: <strong className="text-slate-700">FeederLossAnalysisDB</strong>
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
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Select a saved snapshot to restore it into the active calculation workspace:
                </span>
                <button
                  onClick={() => setActiveTab('save_new')}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save New Snapshot</span>
                </button>
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
                  placeholder={`{"appName": "HT LV Feeder Loss Analysis", "feeders": [...], "snapshots": [...]}`}
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
    </div>
  );
};
