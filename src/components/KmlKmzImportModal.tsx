/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Compass, 
  Zap, 
  Layers, 
  ArrowRight,
  List,
  Eye
} from 'lucide-react';
import { FeederData } from '../types/feeder';
import { extractKmlTextFromFile, parseKmlToFeederData, KmlParseResult } from '../utils/kmlKmzParser';
import { GUJAR_GARHI_11KV_HT_FEEDER } from '../data/presetFeeders';
import { VisualMapComponent } from './VisualMapComponent';

interface KmlKmzImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFeeder: (feeder: FeederData) => void;
}

export const KmlKmzImportModal: React.FC<KmlKmzImportModalProps> = ({
  isOpen,
  onClose,
  onImportFeeder
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<KmlParseResult | null>(null);
  const [previewTab, setPreviewTab] = useState<'map' | 'table'>('map');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setError(null);
    setLoading(true);
    setParseResult(null);

    try {
      if (!file.name.toLowerCase().endsWith('.kmz') && !file.name.toLowerCase().endsWith('.kml')) {
        throw new Error('Please select a valid .kmz or .kml file exported from Google Earth or GIS mapping tools.');
      }

      const { kmlText, fileName } = await extractKmlTextFromFile(file);
      const result = parseKmlToFeederData(kmlText, fileName);
      setParseResult(result);
      setPreviewTab('map');
    } catch (err: any) {
      console.error('Error importing KML/KMZ:', err);
      setError(err.message || 'Failed to parse KML/KMZ file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleApplyImportedFeeder = () => {
    if (parseResult) {
      onImportFeeder(parseResult.feeder);
      onClose();
    }
  };

  const handleLoadGujarGarhiPreset = () => {
    onImportFeeder(GUJAR_GARHI_11KV_HT_FEEDER);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Compass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  Import Node-to-Node GIS Data (KML / KMZ)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Auto Lat/Lng Plot
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Reads longitude & latitude of every point and automatically plots the feeder network on Google Maps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Quick Preset Banner for Gujar Garhi */}
          <div className="p-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-600 text-white">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">
                  Gujar Garhi 11 kV Feeder (PESCO Mardan)
                </h4>
                <p className="text-[11px] text-slate-600">
                  Pre-configured from GujarGarhi_MapToKML dataset with 13 nodes & GIS coordinates.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLoadGujarGarhiPreset}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Load Gujar Garhi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 sm:p-7 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-blue-500 bg-blue-50/70 scale-[0.99]' 
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml"
              className="hidden"
            />
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-2.5 shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {loading ? 'Reading Longitudes & Latitudes from KMZ / KML...' : 'Drop your .KMZ or .KML file here, or click to browse'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Supports <span className="font-semibold text-slate-700">GujarGarhi_MapToKML - Copy.kmz</span>, Google Earth exports, AutoCAD MapToKML files
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Result Preview with Live Map & Coordinates */}
          {parseResult && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
              {/* Header Bar */}
              <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">{parseResult.feeder.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-900 text-blue-200 font-mono text-[10px] font-bold">
                    {parseResult.summary.detectedType} {parseResult.feeder.nominalVoltage}V
                  </span>

                  {/* Switch between Live Map Plot & Coordinates Table */}
                  <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('map')}
                      className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        previewTab === 'map' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Live Map Plot</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('table')}
                      className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        previewTab === 'table' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <List className="w-3 h-3" />
                      <span>Coordinates Table</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Metric Highlights */}
              <div className="p-3 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-slate-200">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Poles / Nodes Plotted</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {parseResult.summary.totalNodes} Nodes
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Conductor Spans</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {parseResult.summary.totalSegments} Spans
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Feeder Route Length</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {parseResult.summary.totalLengthKm} km
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Connected Load</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {parseResult.feeder.existingTransformerKva} kVA
                  </span>
                </div>
              </div>

              {/* LIVE MAP PREVIEW: Shows all points plotted with their coordinates */}
              {previewTab === 'map' ? (
                <div className="p-0 border-t border-slate-200">
                  <VisualMapComponent 
                    feeder={parseResult.feeder} 
                    height="320px"
                  />
                </div>
              ) : (
                /* Node Coordinates Table Preview */
                <div className="max-h-64 overflow-y-auto p-2 bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase">
                        <th className="py-1 px-2">Node</th>
                        <th className="py-1 px-2">Pole Label</th>
                        <th className="py-1 px-2">Latitude</th>
                        <th className="py-1 px-2">Longitude</th>
                        <th className="py-1 px-2">Load (kVA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {parseResult.feeder.nodes.map(n => (
                        <tr key={n.id} className="hover:bg-slate-50">
                          <td className="py-1 px-2 font-bold text-slate-800">{n.id}</td>
                          <td className="py-1 px-2 text-slate-700">{n.label}</td>
                          <td className="py-1 px-2 text-blue-700 font-bold">{n.lat?.toFixed(6)}</td>
                          <td className="py-1 px-2 text-emerald-700 font-bold">{n.lng?.toFixed(6)}</td>
                          <td className="py-1 px-2 text-slate-700">
                            {n.spotLoadKva ? `${n.spotLoadKva} kVA` : `${n.singlePhaseCustomers} cust`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="button"
            disabled={!parseResult}
            onClick={handleApplyImportedFeeder}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply & Plot on Main Geographic Map</span>
          </button>
        </div>
      </div>
    </div>
  );
};
