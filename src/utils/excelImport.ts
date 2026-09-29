/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { FeederData, FeederAnalysisSummary } from '../types/feeder';
import { getConductor, CONDUCTOR_LIST } from '../data/conductors';

export interface ParsedSpanRow {
  id: string;
  fromNode: string;
  toNode: string;
  lengthKm: number;
  lengthMeters: number;
  threePhaseCust: number;
  singlePhaseCust: number;
  conductorCode: string;
  isValid: boolean;
  warning?: string;
}

export interface ParsedExcelResult {
  fileName?: string;
  sheetName?: string;
  rows: ParsedSpanRow[];
  totalRows: number;
  validRows: number;
  totalLengthKm: number;
  totalLengthMeters: number;
  totalThreePhaseCust: number;
  totalSinglePhaseCust: number;
  detectedConductors: string[];
  feederName?: string;
  transformerKva?: number;
  errors: string[];
}

/**
 * Normalizes node names into string format (e.g. 0 -> '0', '1.0' -> '1', 'Pole 2' -> '2')
 */
function cleanNodeName(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  // Remove '.0' at the end if present e.g. "1.0" -> "1"
  return str.replace(/\.0$/, '');
}

/**
 * Parses raw 2D array of cells (from Excel or TSV/CSV clipboard)
 */
export function parseExcelRowsData(dataRows: any[][], fileName?: string): ParsedExcelResult {
  const errors: string[] = [];

  if (!dataRows || dataRows.length === 0) {
    return {
      fileName,
      rows: [],
      totalRows: 0,
      validRows: 0,
      totalLengthKm: 0,
      totalLengthMeters: 0,
      totalThreePhaseCust: 0,
      totalSinglePhaseCust: 0,
      detectedConductors: [],
      errors: ['The selected Excel sheet or table contains no data rows.']
    };
  }

  // Find header row or default to first row if it contains text headers
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(10, dataRows.length); r++) {
    const row = dataRows[r];
    if (!row || row.length === 0) continue;
    const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
    if (rowStr.includes('from') || rowStr.includes('to') || rowStr.includes('node') || rowStr.includes('length') || rowStr.includes('conductor')) {
      headerRowIndex = r;
      break;
    }
  }

  let fromIdx = -1;
  let toIdx = -1;
  let lengthKmIdx = -1;
  let lengthMIdx = -1;
  let threePhIdx = -1;
  let singlePhIdx = -1;
  let conductorIdx = -1;

  let startDataRow = 0;

  if (headerRowIndex !== -1) {
    const headerRow = dataRows[headerRowIndex].map(c => String(c || '').trim());
    startDataRow = headerRowIndex + 1;

    headerRow.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (/from/i.test(lower) || /start/i.test(lower) || /source/i.test(lower)) {
        if (fromIdx === -1) fromIdx = idx;
      } else if (/to/i.test(lower) || /end/i.test(lower) || /target/i.test(lower) || /dest/i.test(lower)) {
        if (toIdx === -1) toIdx = idx;
      } else if (/length.*km/i.test(lower) || /km/i.test(lower)) {
        if (lengthKmIdx === -1) lengthKmIdx = idx;
      } else if (/length.*m/i.test(lower) || /meter/i.test(lower) || /length/i.test(lower) || /distance/i.test(lower)) {
        if (lengthMIdx === -1) lengthMIdx = idx;
      } else if (/3.*ph/i.test(lower) || /three/i.test(lower) || /3p/i.test(lower)) {
        if (threePhIdx === -1) threePhIdx = idx;
      } else if (/1.*ph/i.test(lower) || /single/i.test(lower) || /1p/i.test(lower) || /cust/i.test(lower)) {
        if (singlePhIdx === -1) singlePhIdx = idx;
      } else if (/conductor/i.test(lower) || /code/i.test(lower) || /wire/i.test(lower) || /cable/i.test(lower)) {
        if (conductorIdx === -1) conductorIdx = idx;
      }
    });
  }

  // Fallback defaults if specific indices weren't found
  if (fromIdx === -1) fromIdx = 0;
  if (toIdx === -1) toIdx = 1;
  if (lengthKmIdx === -1 && lengthMIdx === -1) {
    lengthKmIdx = 2;
    lengthMIdx = 3;
  }
  if (threePhIdx === -1) threePhIdx = 4;
  if (singlePhIdx === -1) singlePhIdx = 5;
  if (conductorIdx === -1) conductorIdx = 6;

  const parsedRows: ParsedSpanRow[] = [];
  const conductorsSet = new Set<string>();

  for (let r = startDataRow; r < dataRows.length; r++) {
    const row = dataRows[r];
    if (!row || row.length === 0) continue;

    // Check if entire row is empty
    const hasContent = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasContent) continue;

    const rawFrom = cleanNodeName(row[fromIdx]);
    const rawTo = cleanNodeName(row[toIdx]);

    if (!rawFrom && !rawTo) continue;

    let lengthKm = 0;
    let lengthMeters = 0;

    if (lengthKmIdx !== -1 && row[lengthKmIdx] !== undefined && row[lengthKmIdx] !== null && String(row[lengthKmIdx]).trim() !== '') {
      const parsedKm = parseFloat(String(row[lengthKmIdx]).replace(/,/g, ''));
      if (!isNaN(parsedKm) && parsedKm > 0) {
        lengthKm = parsedKm;
        lengthMeters = Math.round(lengthKm * 1000);
      }
    }

    if (lengthMIdx !== -1 && row[lengthMIdx] !== undefined && row[lengthMIdx] !== null && String(row[lengthMIdx]).trim() !== '') {
      const parsedM = parseFloat(String(row[lengthMIdx]).replace(/,/g, ''));
      if (!isNaN(parsedM) && parsedM > 0) {
        lengthMeters = Math.round(parsedM);
        if (lengthKm === 0) {
          lengthKm = Number((lengthMeters / 1000).toFixed(3));
        }
      }
    }

    // Default span length if neither was valid
    if (lengthKm <= 0 && lengthMeters <= 0) {
      lengthKm = 0.050;
      lengthMeters = 50;
    } else if (lengthKm > 0 && lengthMeters <= 0) {
      lengthMeters = Math.round(lengthKm * 1000);
    } else if (lengthMeters > 0 && lengthKm <= 0) {
      lengthKm = Number((lengthMeters / 1000).toFixed(3));
    }

    // Customer counts
    let threeCust = 0;
    if (threePhIdx !== -1 && row[threePhIdx] !== undefined) {
      const parsed = parseInt(String(row[threePhIdx]).replace(/,/g, ''), 10);
      if (!isNaN(parsed)) threeCust = Math.max(0, parsed);
    }

    let singleCust = 0;
    if (singlePhIdx !== -1 && row[singlePhIdx] !== undefined) {
      const parsed = parseInt(String(row[singlePhIdx]).replace(/,/g, ''), 10);
      if (!isNaN(parsed)) singleCust = Math.max(0, parsed);
    }

    // Conductor Code
    let rawConductor = 'A';
    if (conductorIdx !== -1 && row[conductorIdx] !== undefined && row[conductorIdx] !== null) {
      const cStr = String(row[conductorIdx]).trim().toUpperCase();
      if (cStr) {
        rawConductor = cStr;
      }
    }

    // Normalize conductor code
    let conductorCode = 'A';
    if (rawConductor.includes('DOG')) conductorCode = 'DOG';
    else if (rawConductor.includes('RABBIT')) conductorCode = 'RABBIT';
    else if (rawConductor.includes('PU3') || rawConductor.includes('37/0.083') || rawConductor.includes('0.083')) conductorCode = 'PU3';
    else if (rawConductor.includes('ANT')) conductorCode = 'ANT';
    else if (rawConductor.includes('PANTHER')) conductorCode = 'PANTHER';
    else if (rawConductor.includes('GOPHER')) conductorCode = 'GOPHER';
    else if (rawConductor.includes('7/0.122') || rawConductor === 'A') conductorCode = 'A';
    else {
      // Check if code exists in list
      const matched = CONDUCTOR_LIST.find(c => c.code.toUpperCase() === rawConductor);
      conductorCode = matched ? matched.code : 'A';
    }

    conductorsSet.add(conductorCode);

    const isValid = Boolean(rawFrom && rawTo);
    let warning = undefined;
    if (!isValid) {
      warning = 'Missing From or To node identifiers.';
    }

    parsedRows.push({
      id: `span-imp-${r}`,
      fromNode: rawFrom || `N${r}`,
      toNode: rawTo || `N${r + 1}`,
      lengthKm: Number(lengthKm.toFixed(3)),
      lengthMeters,
      threePhaseCust: threeCust,
      singlePhaseCust: singleCust,
      conductorCode,
      isValid,
      warning
    });
  }

  const validRows = parsedRows.filter(r => r.isValid).length;
  const totalLengthKm = Number(parsedRows.reduce((acc, r) => acc + r.lengthKm, 0).toFixed(3));
  const totalLengthMeters = parsedRows.reduce((acc, r) => acc + r.lengthMeters, 0);
  const totalThreePhaseCust = parsedRows.reduce((acc, r) => acc + r.threePhaseCust, 0);
  const totalSinglePhaseCust = parsedRows.reduce((acc, r) => acc + r.singlePhaseCust, 0);

  return {
    fileName,
    rows: parsedRows,
    totalRows: parsedRows.length,
    validRows,
    totalLengthKm,
    totalLengthMeters,
    totalThreePhaseCust,
    totalSinglePhaseCust,
    detectedConductors: Array.from(conductorsSet),
    errors
  };
}

/**
 * Reads and parses an uploaded Excel (.xlsx, .xls) or CSV file
 */
export async function parseUploadedExcelFile(file: File): Promise<ParsedExcelResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("No worksheets found in this Excel file.");
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    const result = parseExcelRowsData(jsonData, file.name);
    result.sheetName = firstSheetName;
    return result;
  } catch (err: any) {
    return {
      fileName: file.name,
      rows: [],
      totalRows: 0,
      validRows: 0,
      totalLengthKm: 0,
      totalLengthMeters: 0,
      totalThreePhaseCust: 0,
      totalSinglePhaseCust: 0,
      detectedConductors: [],
      errors: [err.message || "Failed to read Excel file format."]
    };
  }
}

/**
 * Parses pasted clipboard text (tab-separated TSV from Excel or comma-separated CSV)
 */
export function parsePastedClipboardText(clipboardText: string): ParsedExcelResult {
  const lines = clipboardText.trim().split(/\r?\n/);
  const dataRows: string[][] = lines.map(line => {
    // If contains tabs (standard Excel copy-paste), split by tab. Else split by comma
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim());
    }
    return line.split(',').map(c => c.trim());
  });

  return parseExcelRowsData(dataRows, 'Clipboard Paste');
}

/**
 * Generates and downloads a clean Excel (.xlsx) template matching image1.png columns
 */
export function downloadExcelTemplate(feeder?: FeederData): void {
  const wb = XLSX.utils.book_new();

  // Benchmark / Sample Spans matching image1.png
  const sampleData = [
    ['From Node', 'To Node', 'Length (km)', 'Length (m)', '3-Ph Customer', '1-Ph Customer', 'Conductor Code'],
    ['0.0', '1.0', 0.005, 5, 0, 0, 'A'],
    ['1.0', '2.0', 0.054, 54, 4, 18, 'A'],
    ['2.0', '3.0', 0.038, 38, 2, 8, 'A'],
    ['3.0', '4.0', 0.042, 42, 0, 10, 'A'],
    ['3.0', '8.0', 0.038, 38, 0, 5, 'A'],
    ['4.0', '5.0', 0.053, 53, 0, 8, 'A'],
    ['5.0', '6.0', 0.040, 40, 2, 10, 'A'],
    ['6.0', '7.0', 0.038, 38, 0, 8, 'A'],
    ['6.0', '11.0', 0.013, 13, 0, 0, 'A'],
    ['8.0', '9.0', 0.038, 38, 0, 5, 'A'],
    ['9.0', '10.0', 0.046, 46, 0, 15, 'A'],
    ['11.0', '12.0', 0.030, 30, 0, 15, 'A']
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // From Node
    { wch: 14 }, // To Node
    { wch: 14 }, // Length km
    { wch: 14 }, // Length m
    { wch: 16 }, // 3-Ph Cust
    { wch: 16 }, // 1-Ph Cust
    { wch: 18 }  // Conductor Code
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Feeder Spans (image1.png)');

  // Conductor reference sheet
  const conductorRef = [
    ['Conductor Code', 'Standard Name', 'Type', 'Resistance (Ω/km)', 'Ampacity (A)', 'Description'],
    ...CONDUCTOR_LIST.map(c => [
      c.code,
      c.name,
      c.type,
      c.resistancePerKm,
      c.ampacity,
      c.description
    ])
  ];
  const wsConduct = XLSX.utils.aoa_to_sheet(conductorRef);
  wsConduct['!cols'] = [
    { wch: 16 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsConduct, 'Conductor Database');

  const fileName = feeder ? `${feeder.id}_image1_template.xlsx` : 'wapda_feeder_spans_template.xlsx';
  XLSX.writeFile(wb, fileName);
}

/**
 * Exports complete feeder calculation to a rich multi-sheet Excel (.xlsx) workbook
 */
export function exportFullFeederToExcel(feeder: FeederData, summary: FeederAnalysisSummary): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Input Data Form (image1.png)
  const inputData = [
    ['FORM DISPLAY A: FEEDER SPANS INPUT DATA TABLE (image1.png Columns)'],
    [`Feeder Name: ${feeder.name}`, `Substation: ${feeder.substationName}`, `Base Voltage: ${feeder.nominalVoltage}V`, `Transformer: ${summary.existingTransformerKva} kVA`],
    [],
    ['#', 'Zone', 'From Node', 'To Node', 'Length (km)', 'Length (m)', '3-Ph Customer', '1-Ph Customer', 'Conductor Code'],
    ...summary.segmentResults.map((r, idx) => [
      idx + 1,
      r.fedByTransformer === 'T2' ? 'T-2 Added' : 'T-1 Main',
      r.fromNodeId.replace('.0', ''),
      r.toNodeId.replace('.0', ''),
      r.lengthKm,
      r.lengthMeters,
      r.threePhaseCustomers,
      r.singlePhaseCustomers,
      r.conductor.code
    ]),
    [],
    ['TOTALS', '', '', '', summary.totalCircuitLengthKm, Math.round(summary.totalCircuitLengthKm * 1000), summary.totalThreePhaseCustomers, summary.totalSinglePhaseCustomers, `${summary.segmentResults.length} Spans`]
  ];
  const wsInput = XLSX.utils.aoa_to_sheet(inputData);
  wsInput['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsInput, 'Input Data (image1)');

  // Sheet 2: Calculated Schedule (image2.png)
  const outputData = [
    ['FORM DISPLAY B: CALCULATED LOAD FLOW & LINE LOSS SCHEDULE (image2.png Columns)'],
    [`Total Line Loss: ${summary.totalLineLossKw} kW`, `Total Demand: ${summary.totalSystemDemandKva} kVA (${summary.totalSourceCurrentAmps} A)`, `Annual Energy Loss: ${summary.annualEnergyLossKwh} kWh`],
    [],
    ['#', 'Zone', 'From', 'To', 'Length (km)', 'Code', 'Current (A)', 'Loading %', 'Volt Drop %', 'Voltage (V)', 'Loss (kW)'],
    ...summary.segmentResults.map((r, idx) => [
      idx + 1,
      r.fedByTransformer === 'T2' ? 'T-2' : 'T-1',
      r.fromNodeId.replace('.0', ''),
      r.toNodeId.replace('.0', ''),
      r.lengthKm,
      r.conductor.code,
      r.currentAmps,
      r.percentLoading,
      r.percentVoltDrop,
      r.receivingVoltage,
      r.lineLossKw
    ]),
    [],
    ['TOTALS & PEAKS', '', '', '', summary.totalCircuitLengthKm, '', summary.totalSourceCurrentAmps, `${summary.existingTransformerLoadingPercent}% Trf`, `${summary.worstVoltageDropPercent}% Worst`, `${summary.worstVoltageVolts}V Min`, summary.totalLineLossKw]
  ];
  const wsOutput = XLSX.utils.aoa_to_sheet(outputData);
  wsOutput['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsOutput, 'Calculated Schedule (image2)');

  // Sheet 3: Summary & Upgradation Matrix
  const matrixData = [
    ['WAPDA ELR FEASIBILITY & UPGRADATION MATRIX'],
    [],
    ['Parameter', 'Existing Baseline', 'Proposed System'],
    ['Feeder Name', feeder.name, feeder.name],
    ['Base Voltage', `${feeder.nominalVoltage} V`, `${feeder.nominalVoltage} V`],
    ['Transformer Capacity', `${summary.existingTransformerKva} kVA`, `${summary.proposedTransformerKva} kVA`],
    ['Transformer Loading', `${summary.existingTransformerLoadingPercent}%`, `${summary.proposedTransformerLoadingPercent}%`],
    ['Total Circuit Length', `${summary.totalCircuitLengthKm} km`, `${summary.totalCircuitLengthKm} km`],
    ['Total Demand', `${summary.totalSystemDemandKva} kVA`, `${summary.totalSystemDemandKva} kVA`],
    ['Peak Line Loss', `${summary.totalLineLossKw} kW`, `${summary.totalLineLossKw} kW`],
    ['Power Loss Ratio', `${summary.percentPowerLoss}%`, `${summary.percentPowerLoss}%`],
    ['Annual Energy Loss', `${summary.annualEnergyLossKwh} kWh/yr`, `${summary.annualEnergyLossKwh} kWh/yr`],
    ['Worst Voltage Drop', `${summary.worstVoltageDropPercent}%`, `${summary.worstVoltageDropPercent}%`],
    ['Minimum Voltage', `${summary.worstVoltageVolts} V`, `${summary.worstVoltageVolts} V`],
    ['Annual Financial Loss', `Rs. ${Math.round(summary.annualEnergyLossKwh * (feeder.tariffPerKwh || 38.5)).toLocaleString()}`, `Rs. ${Math.round(summary.annualEnergyLossKwh * (feeder.tariffPerKwh || 38.5)).toLocaleString()}`]
  ];
  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
  wsMatrix['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Upgradation Summary');

  XLSX.writeFile(wb, `${feeder.id}_complete_elr_analysis.xlsx`);
}
