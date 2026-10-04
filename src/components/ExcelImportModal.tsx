/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  FileText, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  Layers,
  Table as TableIcon,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  ParsedExcelResult, 
  parseUploadedExcelFile, 
  parsePastedClipboardText, 
  downloadExcelTemplate 
} from '../utils/excelImport';
import { FeederData, FeederNode, FeederSegment } from '../types/feeder';
import { TRANSFORMER_CAPACITIES } from '../data/transformers';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImportedData: (newRows: {
    fromNode: string;
    toNode: string;
    lengthKm: number;
    lengthMeters: number;
    threePhaseCust: number;
    singlePhaseCust: number;
    nodeKva?: number;
    conductorCode: string;
  }[], feederOverrides?: { name?: string; transformerKva?: number; voltage?: number }) => void;
  feeder: FeederData;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onApplyImportedData,
  feeder
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'template'>('upload');
  const [parsedResult, setParsedResult] = useState<ParsedExcelResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customFeederName, setCustomFeederName] = useState(feeder.name);
  const [customTransformerKva, setCustomTransformerKva] = useState(feeder.existingTransformerKva);
  const [isMaximized, setIsMaximized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const result = await parseUploadedExcelFile(file);
      setParsedResult(result);
    } catch (err: any) {
      alert("Error reading file: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePasteParse = () => {
    if (!pasteText.trim()) return;
    const result = parsePastedClipboardText(pasteText);
    setParsedResult(result);
  };

  const handleApply = () => {
    if (!parsedResult || parsedResult.rows.length === 0) return;

    const isHt = feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000;
    const validRows = parsedResult.rows
      .filter(r => r.isValid)
      .map(r => ({
        fromNode: r.fromNode,
        toNode: r.toNode,
        lengthKm: r.lengthKm,
        lengthMeters: r.lengthMeters,
        threePhaseCust: r.threePhaseCust,
        singlePhaseCust: r.singlePhaseCust,
        nodeKva: r.nodeKva || (isHt ? 100 : 0),
        conductorCode: r.conductorCode
      }));

    if (validRows.length === 0) {
      alert("No valid span rows found in imported data.");
      return;
    }

    onApplyImportedData(validRows, {
      name: customFeederName,
      transformerKva: customTransformerKva
    });
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMaximized ? 'p-0' : 'p-2 sm:p-4'} bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in`}>
      <div className={`bg-white shadow-2xl border border-slate-200 w-full ${isMaximized ? 'h-full max-w-none rounded-none my-0' : 'max-w-5xl rounded-2xl max-h-[92vh] my-auto'} flex flex-col overflow-hidden`}>
        
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  Import Feeder Spans from Excel / Spreadsheet
                </h2>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded font-bold">
                  image1.png Columns
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Upload .xlsx, .xls, .csv or copy-paste directly from Microsoft Excel or Google Sheets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isMaximized ? "Restore Window View" : "Maximize Full Screen"}
            >
              {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs Bar */}
        <div className="px-6 py-2.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-slate-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Upload Excel File (.xlsx / .csv)</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white text-slate-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Paste from Clipboard</span>
            </button>

            <button
              onClick={() => setActiveTab('template')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'template'
                  ? 'bg-white text-slate-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Download Excel Template</span>
            </button>
          </div>

          <button
            onClick={() => downloadExcelTemplate(feeder)}
            className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .xlsx Template</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: FILE UPLOAD & DRAG DROP */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/60 scale-[0.99]'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>

                <h3 className="text-sm font-bold text-slate-900">
                  Click to select Excel file or drag & drop here
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV spreadsheet files
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    From Node
                  </span>
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    To Node
                  </span>
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    Length (km / m)
                  </span>
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    3-Ph Cust
                  </span>
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    1-Ph Cust
                  </span>
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    Conductor Code
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE FROM CLIPBOARD */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Paste rows copied directly from Excel / Google Sheets:
                </span>
                <span className="text-slate-500">
                  Tab-separated or comma-separated rows
                </span>
              </div>

              <textarea
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="From Node	To Node	Length (km)	Length (m)	3-Ph Customer	1-Ph Customer	Conductor Code&#10;0.0	1.0	0.005	5	0	0	A&#10;1.0	2.0	0.054	54	4	18	A&#10;2.0	3.0	0.038	38	2	8	A"
                className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPasteText(
`0.0	1.0	0.005	5	0	0	A
1.0	2.0	0.054	54	4	18	A
2.0	3.0	0.038	38	2	8	A
3.0	4.0	0.042	42	0	10	A
3.0	8.0	0.038	38	0	5	A
4.0	5.0	0.053	53	0	8	A
5.0	6.0	0.040	40	2	10	A
6.0	7.0	0.038	38	0	8	A
6.0	11.0	0.013	13	0	0	A
8.0	9.0	0.038	38	0	5	A
9.0	10.0	0.046	46	0	15	A
11.0	12.0	0.030	30	0	15	A`
                  )}
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                >
                  Load Sample Gulbhar Benchmark Paste Data
                </button>

                <button
                  type="button"
                  onClick={handlePasteParse}
                  disabled={!pasteText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Parse Clipboard Data
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TEMPLATE DOWNLOAD & SPECIFICATIONS */}
          {activeTab === 'template' && (
            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Official Feeder Spans Input Excel Template (image1.png Format)
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl">
                    Download this pre-formatted template, fill in your survey spans (pole numbers, lengths, customer load, conductor codes), and upload it back.
                  </p>
                </div>
                <button
                  onClick={() => downloadExcelTemplate(feeder)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .xlsx File</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-2">From Node</th>
                      <th className="p-2">To Node</th>
                      <th className="p-2">Length (km)</th>
                      <th className="p-2">Length (m)</th>
                      <th className="p-2">3-Ph Customer</th>
                      <th className="p-2">1-Ph Customer</th>
                      <th className="p-2">Conductor Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2">0.0</td>
                      <td className="p-2">1.0</td>
                      <td className="p-2">0.005</td>
                      <td className="p-2">5</td>
                      <td className="p-2">0</td>
                      <td className="p-2">0</td>
                      <td className="p-2 font-bold text-emerald-700">A (7/0.122")</td>
                    </tr>
                    <tr>
                      <td className="p-2">1.0</td>
                      <td className="p-2">2.0</td>
                      <td className="p-2">0.054</td>
                      <td className="p-2">54</td>
                      <td className="p-2">4</td>
                      <td className="p-2">18</td>
                      <td className="p-2 font-bold text-emerald-700">A (7/0.122")</td>
                    </tr>
                    <tr>
                      <td className="p-2">2.0</td>
                      <td className="p-2">3.0</td>
                      <td className="p-2">0.038</td>
                      <td className="p-2">38</td>
                      <td className="p-2">2</td>
                      <td className="p-2">8</td>
                      <td className="p-2 font-bold text-emerald-700">A (7/0.122")</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PARSED DATA PREVIEW & VALIDATION SECTION */}
          {parsedResult && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-emerald-950">
                        Parsed {parsedResult.validRows} Feeder Spans Successfully
                      </h4>
                      {parsedResult.fileName && (
                        <span className="text-xs font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-medium">
                          {parsedResult.fileName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Total Route Length: <strong>{parsedResult.totalLengthKm} km</strong> ({parsedResult.totalLengthMeters} m) · Customers: <strong>{parsedResult.totalSinglePhaseCust}</strong> (1-Ph) + <strong>{parsedResult.totalThreePhaseCust}</strong> (3-Ph)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setParsedResult(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Clear Preview
                </button>
              </div>

              {/* Basic Feeder Meta Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Feeder Name:</label>
                  <input
                    type="text"
                    value={customFeederName}
                    onChange={(e) => setCustomFeederName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Installed Transformer Rating (T-1):</label>
                  <select
                    value={customTransformerKva}
                    onChange={(e) => setCustomTransformerKva(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {TRANSFORMER_CAPACITIES.map(cap => (
                      <option key={cap} value={cap}>
                        {cap} kVA
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Data Preview ({parsedResult.rows.length} Spans)</span>
                  <span className="font-mono text-slate-500">
                    {feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000 
                      ? 'HT Line Columns (From, To, Length, Node KVA, Conductor)' 
                      : 'image1.png Columns'}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono tabular-nums">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-center w-8">#</th>
                        <th className="py-2 px-3 text-center">From Node</th>
                        <th className="py-2 px-3 text-center">To Node</th>
                        <th className="py-2 px-3 text-right">Length (km)</th>
                        <th className="py-2 px-3 text-right">Length (m)</th>
                        {(feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000) ? (
                          <th className="py-2 px-3 text-right bg-blue-100/80 text-blue-950 font-extrabold">Node KVA</th>
                        ) : (
                          <>
                            <th className="py-2 px-3 text-right">3-Ph Cust</th>
                            <th className="py-2 px-3 text-right">1-Ph Cust</th>
                          </>
                        )}
                        <th className="py-2 px-3 text-left">Conductor Code</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedResult.rows.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="py-1.5 px-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                          <td className="py-1.5 px-3 text-center font-bold text-slate-900">{row.fromNode}</td>
                          <td className="py-1.5 px-3 text-center font-bold text-slate-900">{row.toNode}</td>
                          <td className="py-1.5 px-3 text-right">{row.lengthKm.toFixed(3)}</td>
                          <td className="py-1.5 px-3 text-right">{row.lengthMeters}</td>
                          {(feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000) ? (
                            <td className="py-1.5 px-3 text-right font-bold text-blue-900 bg-blue-50/40">
                              {(row.nodeKva || 0).toLocaleString()} kVA
                            </td>
                          ) : (
                            <>
                              <td className="py-1.5 px-3 text-right text-purple-700 font-bold">{row.threePhaseCust}</td>
                              <td className="py-1.5 px-3 text-right font-bold text-slate-900">{row.singlePhaseCust}</td>
                            </>
                          )}
                          <td className="py-1.5 px-3 text-left font-sans font-semibold text-slate-800">{row.conductorCode}</td>
                          <td className="py-1.5 px-3 text-center font-sans">
                            {row.isValid ? (
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                                Valid
                              </span>
                            ) : (
                              <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded">
                                Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {parsedResult ? (
              <span>Ready to apply {parsedResult.validRows} spans to the active feeder model.</span>
            ) : (
              <span>Upload an Excel spreadsheet or paste clipboard data to preview.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={!parsedResult || parsedResult.validRows === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Imported Spans ({parsedResult?.validRows || 0} Spans)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
