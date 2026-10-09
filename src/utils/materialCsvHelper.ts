/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { MaterialItem } from '../types/costEstimation';

export const CSV_TEMPLATE_HEADER = 'Stock Code,Description,Unit,Rate,Labour Rate';

export const SAMPLE_CSV_ROWS = [
  '008110,"25 KVA DISTRIBUTION T/F",NO,309786,15000',
  '008120,"50 KVA DISTRIBUTION T/F",NO,434200,18000',
  '008130,"100 KVA DISTRIBUTION T/F",NO,631000,22000',
  '008140,"200 KVA DISTRIBUTION T/F",NO,1067000,28000',
  '01110,"POLE PC HC TYPE (36ft HT Spun)",EA,13000,2500',
  '01120,"POLE PC LC TYPE (31ft LT PC)",EA,8000,1800',
  '01210,"STRUCTURE LATTICE STEEL H TYPE (34.8ft)",EA,33402,4500',
  '01220,"STRUCTURE LATTICE STEEL L TYPE (30ft)",EA,21151,3200',
  '75007,"HT STRUCTURE 45 FT",EA,62530,6500',
  '02110,"CONDUCTOR ACSR DOG (100 mm²)",Km,137260,28000',
  '02120,"CONDUCTOR ACSR RABBIT (50 mm²)",Km,66798,22000',
  '05110,"INSULATOR PORCELAIN LT SPOOL TYPE",EA,148,60',
  '05210,"INSULATOR PORCELAIN 11KV PIN TYPE",EA,391,150',
  '05230,"INSULATOR PORCELAIN 11KV DISC TYPE",EA,1535,350',
  '15310,"STAY ROD WITH ELBOW AND THIMBLE",EA,1595,500',
  '15220,"EARTHING UNIT WELDED TYPE",EA,595,250',
  '15390,"EYE NUT (5/8\")",EA,109,25',
  '11111,"BOLT AND NUT 5/8\" X 1 1/2\"",EA,26.50,10',
  '11132,"BOLT & HEX.STEEL NUT 5/8\" X 2\" FULL THREAD",EA,25.00,10',
  '11420,"BOLT DOUBLE ARMING 355X16MM DA-14",EA,340,35',
  '11440,"BOLT DOUBLE ARMING 560X16MM DA-22",EA,395,40',
  '11250,"WASHER SQUARE 2.25\" X 11/16\"",EA,33.00,3',
  '04130,"CONNECTOR P.G TYPE T-110",EA,540,35',
  '04150,"CONNECTOR P.G TYPE T-150",EA,427,40'
];

export function generateCsvTemplateContent(): string {
  return [CSV_TEMPLATE_HEADER, ...SAMPLE_CSV_ROWS].join('\n');
}

export function generateAllMaterialsCsv(materials: MaterialItem[]): string {
  const header = 'Stock Code,Description,Unit,Voltage,Rate,Labour Rate,Specification';
  const rows = materials.map(m => {
    const safeDesc = `"${(m.name || '').replace(/"/g, '""')}"`;
    const safeSpec = `"${(m.specification || '').replace(/"/g, '""')}"`;
    return `${m.code || ''},${safeDesc},${m.unit || 'EA'},${m.voltageApplicability || 'HT'},${m.materialRate || 0},${m.labourRate || 0},${safeSpec}`;
  });
  return [header, ...rows].join('\n');
}

export function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function normalizeCode(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim().toUpperCase();
  // Strip non-alphanumeric except hyphen
  return s.replace(/[^A-Z0-9-]/g, '');
}

export interface MatchedUpdateResult {
  updatedMaterials: MaterialItem[];
  matchedCount: number;
  unmatchedRows: Array<{ code: string; desc: string; rate: number }>;
  updatedItems: Array<{ code: string; name: string; oldRate: number; newRate: number; oldLabour?: number; newLabour?: number }>;
}

export function parseAndApplyMaterialRates(
  fileData: ArrayBuffer,
  currentMaterials: MaterialItem[]
): MatchedUpdateResult {
  const data = new Uint8Array(fileData);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const updatedItems: MatchedUpdateResult['updatedItems'] = [];
  const unmatchedRows: MatchedUpdateResult['unmatchedRows'] = [];

  // Build lookup index for existing materials: by normalized code, zero-trimmed code, and uppercase id
  const codeIndex = new Map<string, number>();
  currentMaterials.forEach((m, idx) => {
    const norm = normalizeCode(m.code);
    if (norm) codeIndex.set(norm, idx);
    // Also without leading zeros
    const unpadded = norm.replace(/^0+/, '');
    if (unpadded && unpadded !== norm) {
      if (!codeIndex.has(unpadded)) codeIndex.set(unpadded, idx);
    }
    // Also id suffix
    const idNorm = normalizeCode(m.id.replace('mat-code-', '').replace('mat-', ''));
    if (idNorm && !codeIndex.has(idNorm)) {
      codeIndex.set(idNorm, idx);
    }
  });

  const updatedList = [...currentMaterials];
  let matchedCount = 0;

  for (const row of rawRows) {
    // Find Code column
    const rawCode = 
      row['Stock Code'] ??
      row['stock code'] ??
      row['StockCode'] ??
      row['Material Code'] ??
      row['material code'] ??
      row['MaterialCode'] ??
      row['Code'] ??
      row['code'] ??
      row['Store Code'] ??
      '';

    const rawRate = 
      row['Rate'] ??
      row['rate'] ??
      row['Material Rate'] ??
      row['material rate'] ??
      row['materialRate'] ??
      row['MaterialRate'] ??
      row['Rate (PKR)'] ??
      row['Price'] ??
      row['Unit Rate'] ??
      '';

    const rawLabour =
      row['Labour Rate'] ??
      row['labour rate'] ??
      row['labourRate'] ??
      row['Labour'] ??
      row['labour'] ??
      '';

    const desc = row['Description'] || row['description'] || row['Name'] || row['name'] || '';

    const rateNum = typeof rawRate === 'number' ? rawRate : parseFloat(String(rawRate).replace(/,/g, ''));
    const labourNum = typeof rawLabour === 'number' ? rawLabour : parseFloat(String(rawLabour).replace(/,/g, ''));

    if (isNaN(rateNum) || rateNum <= 0) {
      continue; // Skip invalid or zero rates
    }

    const norm = normalizeCode(rawCode);
    const unpadded = norm.replace(/^0+/, '');

    let matchIdx = -1;
    if (norm && codeIndex.has(norm)) {
      matchIdx = codeIndex.get(norm)!;
    } else if (unpadded && codeIndex.has(unpadded)) {
      matchIdx = codeIndex.get(unpadded)!;
    } else if (desc) {
      // Fallback search by description similarity
      const cleanDesc = String(desc).trim().toUpperCase();
      matchIdx = updatedList.findIndex(m => 
        m.name.toUpperCase() === cleanDesc ||
        m.name.toUpperCase().includes(cleanDesc) ||
        cleanDesc.includes(m.name.toUpperCase())
      );
    }

    if (matchIdx >= 0) {
      const orig = updatedList[matchIdx];
      const hasLabourUpdate = !isNaN(labourNum) && labourNum >= 0;

      const updatedMat: MaterialItem = {
        ...orig,
        materialRate: rateNum,
        labourRate: hasLabourUpdate ? labourNum : orig.labourRate,
        effectiveFrom: new Date().toISOString().split('T')[0]
      };

      updatedList[matchIdx] = updatedMat;
      matchedCount++;

      updatedItems.push({
        code: orig.code,
        name: orig.name,
        oldRate: orig.materialRate,
        newRate: rateNum,
        oldLabour: orig.labourRate,
        newLabour: hasLabourUpdate ? labourNum : undefined
      });
    } else {
      unmatchedRows.push({
        code: String(rawCode),
        desc: String(desc),
        rate: rateNum
      });
    }
  }

  return {
    updatedMaterials: updatedList,
    matchedCount,
    unmatchedRows,
    updatedItems
  };
}
