import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useMaterials } from '../../context/MaterialContext';
import { MaterialItem } from '../../types/costEstimation';

export const MaterialPriceUploader: React.FC = () => {
  const { materials, setAllMaterials } = useMaterials();
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      const updatedMaterials = materials.map((m) => {
        const found = json.find((row) => String(row['Stock Code']) === String(m.code));
        if (found && found.Rate) {
          return { ...m, materialRate: parseFloat(found.Rate) };
        }
        return m;
      });

      setAllMaterials(updatedMaterials);
      alert('Materials updated successfully!');
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-2">Update Material Prices</h3>
      <p className="text-sm text-gray-600 mb-4">Upload an Excel/CSV file to update material rates.</p>
      <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls, .csv" />
      {fileName && <p className="mt-2 text-sm text-green-600">Selected: {fileName}</p>}
    </div>
  );
};
