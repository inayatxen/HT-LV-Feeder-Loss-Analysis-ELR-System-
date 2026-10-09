import React, { useState } from 'react';
import { useMaterials } from '../../context/MaterialContext';
import { saveMaterialToDb } from '../../utils/costDatabase';
import { 
  downloadCsvFile, 
  generateCsvTemplateContent, 
  generateAllMaterialsCsv,
  parseAndApplyMaterialRates,
  MatchedUpdateResult 
} from '../../utils/materialCsvHelper';
import { Download, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';

export const MaterialPriceUploader: React.FC = () => {
  const { materials, setAllMaterials } = useMaterials();
  const [fileName, setFileName] = useState<string>('');
  const [updateResult, setUpdateResult] = useState<MatchedUpdateResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleDownloadTemplate = () => {
    downloadCsvFile('pesco_material_price_template.csv', generateCsvTemplateContent());
  };

  const handleExportCurrentMaterials = () => {
    downloadCsvFile('pesco_current_materials_list.csv', generateAllMaterialsCsv(materials));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setSuccessMessage('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const result = parseAndApplyMaterialRates(buffer, materials);
        setUpdateResult(result);

        if (result.matchedCount > 0) {
          // Update Context and local storage
          setAllMaterials(result.updatedMaterials);

          // Persist each updated material to IndexedDB
          for (const item of result.updatedItems) {
            const mat = result.updatedMaterials.find(m => m.code === item.code);
            if (mat) {
              await saveMaterialToDb(mat);
            }
          }

          setSuccessMessage(`Successfully updated ${result.matchedCount} material rate(s) in Material Master!`);
        }
      } catch (err: any) {
        alert('Failed to parse file: ' + (err.message || 'Invalid format'));
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset file input so user can re-upload same file if desired
    e.target.value = '';
  };

  return (
    <div className="p-5 border border-slate-200 rounded-2xl shadow-sm bg-white space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Update Material Prices via CSV / Excel
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Bulk-update composite schedule of rates (CSR), material rates, and labour rates from a spreadsheet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Download blank sample CSV template with standard column headers"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download CSV Template</span>
          </button>

          <button
            type="button"
            onClick={handleExportCurrentMaterials}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Export all current catalog materials and rates to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Current Catalog (.csv)</span>
          </button>
        </div>
      </div>

      {/* Required CSV Format Guide */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
        <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          Accepted CSV / Excel Format & Column Headers:
        </h4>
        <div className="font-mono text-[11px] bg-slate-900 text-emerald-400 p-2.5 rounded-lg overflow-x-auto select-all">
          Stock Code,Description,Unit,Rate,Labour Rate
        </div>
        <p className="text-[11px] text-slate-500">
          The system matches items using <strong>Stock Code</strong> (e.g. <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded">008110</code>, <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded">01110</code>, <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded">02110</code>, <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded">15310</code>). You can upload either <code className="font-bold">.csv</code> or <code className="font-bold">.xlsx</code>.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-colors">
          <Upload className="w-4 h-4" />
          <span>Select CSV or Excel File (.csv, .xlsx)</span>
          <input 
            type="file" 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
          />
        </label>
        {fileName && (
          <p className="mt-2 text-xs font-mono font-semibold text-slate-700">
            Uploaded file: <span className="text-emerald-700 font-bold">{fileName}</span>
          </p>
        )}
      </div>

      {/* Status Messages */}
      {isProcessing && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          <span>Processing and applying material rate updates...</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Results Preview */}
      {updateResult && updateResult.updatedItems.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-800">
            Updated Items Preview ({updateResult.matchedCount} matched):
          </h4>
          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                <tr>
                  <th className="py-2 px-3">Code</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Old Rate (PKR)</th>
                  <th className="py-2 px-3 text-right text-emerald-700">New Rate (PKR)</th>
                  {updateResult.updatedItems.some(i => i.newLabour !== undefined) && (
                    <th className="py-2 px-3 text-right text-blue-700">New Labour (PKR)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {updateResult.updatedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">{item.code}</td>
                    <td className="py-2 px-3 font-sans text-slate-800 truncate max-w-xs">{item.name}</td>
                    <td className="py-2 px-3 text-right text-slate-400 line-through">{item.oldRate.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{item.newRate.toLocaleString()}</td>
                    {updateResult.updatedItems.some(i => i.newLabour !== undefined) && (
                      <td className="py-2 px-3 text-right font-semibold text-blue-700">
                        {item.newLabour !== undefined ? item.newLabour.toLocaleString() : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {updateResult && updateResult.unmatchedRows.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{updateResult.unmatchedRows.length} item(s) could not be matched by Code:</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Codes in CSV: {updateResult.unmatchedRows.slice(0, 8).map(u => u.code || u.desc).join(', ')}
            {updateResult.unmatchedRows.length > 8 ? '...' : ''}
          </p>
        </div>
      )}
    </div>
  );
};
