/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  EstimateType, 
  EstimateLineDetails, 
  DesignFactorsConfig, 
  MaterialItem, 
  EstimateItem, 
  CalculationStep, 
  EstimateCharges, 
  CostEstimateRecord 
} from '../types/costEstimation';
import { 
  LUMP_SUM_25KVA_TRANSFORMER_ITEMS, 
  LUMP_SUM_25KVA_TOTALS,
  LUMP_SUM_50KVA_TRANSFORMER_ITEMS,
  LUMP_SUM_50KVA_TOTALS,
  LUMP_SUM_100KVA_TRANSFORMER_ITEMS,
  LUMP_SUM_100KVA_TOTALS,
  LUMP_SUM_200KVA_TRANSFORMER_ITEMS,
  LUMP_SUM_200KVA_TOTALS,
  LUMP_SUM_1KM_HT_DOG_H_TYPE_ITEMS,
  LUMP_SUM_1KM_HT_DOG_H_TYPE_TOTALS,
  getLatestLumpSum25KvaSchedule,
  getLatestLumpSum50KvaSchedule,
  getLatestLumpSum100KvaSchedule,
  getLatestLumpSum200KvaSchedule,
  getLatestLumpSum1KmHtSchedule,
  DEFAULT_DESIGN_FACTORS,
  INITIAL_MATERIALS
} from '../data/materialMaster';
import * as XLSX from 'xlsx';

export interface HtExtensionMiniEstimate {
  meters: number;
  km: number;
  calculatedSpans: number;
  spanMeters: number;
  intermediatePoles: number;
  terminalPoles: number;
  totalPoles: number;
  conductorCode: string;
  conductorName: string;
  conductorQtyKm: number;
  poleType: string;
  items: EstimateItem[];
  materialTotal: number;
  labourTotal: number;
  grandTotal: number;
}

/**
 * Calculates a complete 11kV HT Electrical Feeder Line Extension mini-estimate
 * using standard 11kV assemblies (Poles, V-Cross Arms, Pin & Disc Insulators,
 * Conductor, Tapping PG Clamps, D-Fuse Cutouts, Lightning Arresters, Stay Sets, Earthing).
 */
export interface LtExtensionMiniEstimate {
  meters: number;
  calculatedSpans: number;
  totalPoles: number;
  conductorQtyKm: number;
  conductorName: string;
  materialTotal: number;
  labourTotal: number;
  grandTotal: number;
  items: EstimateItem[];
}

export function calculateLtExtensionMiniEstimate(
  details: EstimateLineDetails,
  factors?: DesignFactorsConfig,
  materialsList?: MaterialItem[]
): LtExtensionMiniEstimate | null {
  const meters = Number(details.ltExtensionMeters || 0);
  if (meters <= 0) return null;

  const mats = materialsList && materialsList.length > 0 ? materialsList : INITIAL_MATERIALS;

  const findMat = (code: string) => {
    const query = code.trim().toUpperCase();
    const cleanQuery = query.replace(/^0+/, '');
    return mats.find(m => {
      const mCode = m.code.trim().toUpperCase();
      const cleanMCode = mCode.replace(/^0+/, '');
      return mCode === query || cleanMCode === cleanQuery;
    });
  };

  const spanLength = details.ltExtensionSpanMeters || 45;
  const km = meters / 1000;
  const calculatedSpans = Math.max(1, Math.ceil(meters / spanLength));
  const totalPoles = calculatedSpans + 1; // intermediate + terminal poles

  const items: EstimateItem[] = [];

  const condType = (details.ltExtensionConductorType || 'WASP').toUpperCase();
  let conductorCode = '02330'; // Wasp
  if (condType.includes('RABBIT')) conductorCode = '02120';
  else if (condType.includes('SQUIRREL')) conductorCode = '02170';
  else if (condType.includes('ANT')) conductorCode = '02340';
  else if (condType.includes('ABC')) conductorCode = '2361';

  const condMat = findMat(conductorCode) || {
    id: `mat-${conductorCode}`,
    code: conductorCode,
    name: `ACSR ${condType} Conductor (LT)`,
    specification: `LT Overhead Line Conductor (${condType})`,
    unit: 'KM',
    materialRate: 95000,
    labourRate: 12000
  };

  const conductorQtyKm = details.ltExtensionConductorLengthKm && details.ltExtensionConductorLengthKm > 0
    ? details.ltExtensionConductorLengthKm
    : parseFloat((km * 4 * 1.15).toFixed(3)); // 4-wire × 1.15 sag
  const condMatAmt = Math.round(conductorQtyKm * condMat.materialRate);
  const condLabAmt = Math.round(conductorQtyKm * condMat.labourRate);

  items.push({
    id: `item-${condMat.code}-lt-ext`,
    materialId: condMat.id,
    materialCode: condMat.code,
    description: `${condMat.name} (LT Line Extension)`,
    specification: `LT Line Extension Conductor, 4-Wires × 1.15 sag (${meters}m = ${conductorQtyKm} KM)`,
    unit: condMat.unit,
    quantity: conductorQtyKm,
    unitRate: condMat.materialRate,
    materialAmount: condMatAmt,
    labourRate: condMat.labourRate,
    labourAmount: condLabAmt,
    totalAmount: condMatAmt + condLabAmt,
    isAutoCalculated: true,
    calculationNotes: `${meters}m (${km} km) × 4 wires × 1.15 allowance = ${conductorQtyKm} km`
  });

  const poleType = (details.ltExtensionPoleType || '').toUpperCase();
  let poleCode = '01120'; // 9m PCC Pole
  if (poleType.includes('STEEL') || poleType.includes('LATTICE') || poleType.includes('STRUCTURE')) {
    poleCode = '01220';
  }
  const poleMat = findMat(poleCode) || {
    id: 'mat-01120',
    code: poleCode,
    name: 'POLE PCC 9 METER (30FT LT)',
    specification: 'Pre-Stressed Concrete LT Pole 9 Meters (Code 01120)',
    unit: 'EA',
    materialRate: 8500,
    labourRate: 1800
  };

  const poleQty = totalPoles;
  const poleMatAmt = poleQty * poleMat.materialRate;
  const poleLabAmt = poleQty * poleMat.labourRate;
  items.push({
    id: `item-${poleMat.code}-lt-ext`,
    materialId: poleMat.id,
    materialCode: poleMat.code,
    description: `${poleMat.name} (LT Extension)`,
    specification: poleMat.specification,
    unit: poleMat.unit,
    quantity: poleQty,
    unitRate: poleMat.materialRate,
    materialAmount: poleMatAmt,
    labourRate: poleMat.labourRate,
    labourAmount: poleLabAmt,
    totalAmount: poleMatAmt + poleLabAmt,
    isAutoCalculated: true,
    calculationNotes: `${calculatedSpans} spans (${meters}m @ ${spanLength}m/span) + 1 terminal = ${poleQty} LT Poles`
  });

  const caMat = findMat('06270') || {
    id: 'mat-06270',
    code: '06270',
    name: 'LT CHANNEL IRON CROSS ARM / BRACKET',
    specification: 'Galvanized LT Channel Iron Cross Arm & Bracket',
    unit: 'EA',
    materialRate: 350.00,
    labourRate: 100
  };
  const caQty = totalPoles;
  const caMatAmt = Math.round(caQty * caMat.materialRate);
  const caLabAmt = Math.round(caQty * caMat.labourRate);
  items.push({
    id: 'item-lt-ca-ext',
    materialId: caMat.id,
    materialCode: caMat.code,
    description: `${caMat.name} (LT Extension)`,
    specification: caMat.specification,
    unit: caMat.unit,
    quantity: caQty,
    unitRate: caMat.materialRate,
    materialAmount: caMatAmt,
    labourRate: caMat.labourRate,
    labourAmount: caLabAmt,
    totalAmount: caMatAmt + caLabAmt,
    isAutoCalculated: true,
    calculationNotes: `1 LT Cross Arm / Bracket per pole = ${caQty} Nos`
  });

  const insMat = findMat('05310') || {
    id: 'mat-05310',
    code: '05310',
    name: 'LT SHACKLE INSULATOR WITH D-IRON',
    specification: 'Porcelain LT Shackle Insulator with Galvanized D-Iron Bracket',
    unit: 'EA',
    materialRate: 220.00,
    labourRate: 80
  };
  const insQty = totalPoles * 4;
  const insMatAmt = Math.round(insQty * insMat.materialRate);
  const insLabAmt = Math.round(insQty * insMat.labourRate);
  items.push({
    id: 'item-lt-ins-ext',
    materialId: insMat.id,
    materialCode: insMat.code,
    description: `${insMat.name} (LT Extension)`,
    specification: insMat.specification,
    unit: insMat.unit,
    quantity: insQty,
    unitRate: insMat.materialRate,
    materialAmount: insMatAmt,
    labourRate: insMat.labourRate,
    labourAmount: insLabAmt,
    totalAmount: insMatAmt + insLabAmt,
    isAutoCalculated: true,
    calculationNotes: `4 Shackle Insulators per pole (4-wire line) = ${insQty} Nos`
  });

  const nbMat = findMat('11115') || {
    id: 'mat-11115',
    code: '11115',
    name: 'GALVANIZED NUTS, BOLTS & WASHERS (LT)',
    specification: 'Assorted Galvanized Structural Bolts, Nuts & Washers',
    unit: 'KG',
    materialRate: 280.00,
    labourRate: 50
  };
  const nbQty = Math.round(poleQty * 2.0);
  const nbMatAmt = Math.round(nbQty * nbMat.materialRate);
  const nbLabAmt = Math.round(nbQty * nbMat.labourRate);
  items.push({
    id: 'item-lt-nb-ext',
    materialId: nbMat.id,
    materialCode: nbMat.code,
    description: `${nbMat.name} (LT Extension)`,
    specification: nbMat.specification,
    unit: nbMat.unit,
    quantity: nbQty,
    unitRate: nbMat.materialRate,
    materialAmount: nbMatAmt,
    labourRate: nbMat.labourRate,
    labourAmount: nbLabAmt,
    totalAmount: nbMatAmt + nbLabAmt,
    isAutoCalculated: true,
    calculationNotes: `Structural fasteners (2 kg per LT pole)`
  });

  const materialTotal = items.reduce((sum, i) => sum + i.materialAmount, 0);
  const labourTotal = items.reduce((sum, i) => sum + i.labourAmount, 0);
  const grandTotal = materialTotal + labourTotal;

  return {
    meters,
    calculatedSpans,
    totalPoles: poleQty,
    conductorQtyKm,
    conductorName: condMat.name,
    materialTotal,
    labourTotal,
    grandTotal,
    items
  };
}

export function calculateHtExtensionMiniEstimate(
  details: EstimateLineDetails,
  factors?: DesignFactorsConfig,
  materialsList?: MaterialItem[]
): HtExtensionMiniEstimate | null {
  const meters = Number(details.htExtensionMeters || 0);
  if (meters <= 0) return null;

  const activeFactors = factors || DEFAULT_DESIGN_FACTORS;
  const mats = materialsList && materialsList.length > 0 ? materialsList : INITIAL_MATERIALS;

  const findMat = (code: string) => {
    const query = code.trim().toUpperCase();
    const cleanQuery = query.replace(/^0+/, '');
    return mats.find(m => {
      const mCode = m.code.trim().toUpperCase();
      const cleanMCode = mCode.replace(/^0+/, '');
      return mCode === query || cleanMCode === cleanQuery;
    });
  };

  const spanLength = details.htExtensionSpanMeters || activeFactors.htPoleSpacingMeters || 100;
  const km = meters / 1000;
  const calculatedSpans = Math.max(1, Math.ceil(meters / spanLength));
  // 1 terminal pole at proposed transformer end + intermediate poles for remaining spans
  const intermediatePoles = Math.max(0, calculatedSpans - 1);
  const terminalPoles = 1;
  const totalPoles = calculatedSpans; // 1 span = 1 new pole (tapping from existing pole); 2 spans = 2 new poles, etc.

  const items: EstimateItem[] = [];

  // 1. Conductor Selection & BOQ
  const condType = (details.htExtensionConductorType || 'DOG').toUpperCase();
  let conductorCode = '02110'; // Default DOG
  if (condType.includes('RABBIT') || condType === '02120') conductorCode = '02120';
  else if (condType.includes('WASP') || condType === '02330') conductorCode = '02330';
  else if (condType.includes('PANTHER') || condType === '02150') conductorCode = '02150';
  else if (condType.includes('OSPREY') || condType === '02160') conductorCode = '02160';

  const condMat = findMat(conductorCode) || {
    id: `mat-${conductorCode}`,
    code: conductorCode,
    name: `ACSR ${condType} Conductor`,
    specification: `ACSR ${condType} Conductor 11kV Overhead Line`,
    unit: 'KM',
    materialRate: condType === 'RABBIT' ? 66800 : condType === 'WASP' ? 106400 : condType === 'PANTHER' ? 264200 : condType === 'OSPREY' ? 236000 : 137260,
    labourRate: 15000
  };

  const conductorQtyKm = parseFloat((km * 3 * 1.15).toFixed(3));
  const condMatAmt = Math.round(conductorQtyKm * condMat.materialRate);
  const condLabAmt = Math.round(conductorQtyKm * condMat.labourRate);

  items.push({
    id: `item-${condMat.code}-ext`,
    materialId: condMat.id,
    materialCode: condMat.code,
    description: `${condMat.name} (HT Line Extension)`,
    specification: `11kV HT Extension Conductor, 3 Phases × 1.15 sag/wastage/jumpers (${meters}m = ${conductorQtyKm} KM)`,
    unit: condMat.unit,
    quantity: conductorQtyKm,
    unitRate: condMat.materialRate,
    materialAmount: condMatAmt,
    labourRate: condMat.labourRate,
    labourAmount: condLabAmt,
    totalAmount: condMatAmt + condLabAmt,
    isAutoCalculated: true,
    calculationNotes: `${meters}m (${km} km) × 3 phases × 1.15 allowance = ${conductorQtyKm} km`
  });

  // 2. Poles / Structures (36ft PC Spun Pole or 34.8ft Steel Lattice H-Type)
  const isSteelLattice = details.htExtensionPoleType === 'STEEL_LATTICE_34_8FT';
  const poleCode = isSteelLattice ? '01210' : '01110';
  const poleMat = findMat(poleCode) || findMat(isSteelLattice ? '1210' : '1113') || {
    id: `mat-${poleCode}`,
    code: poleCode,
    name: isSteelLattice ? 'HT Structure 34.8 Feet (Lattice H Type)' : 'POLE PC HC TYPE (36ft HT Spun)',
    specification: isSteelLattice ? 'Galvanized Steel HT Lattice Structure 34.8ft (Code 01210)' : 'Pre-Stressed Concrete HT Spun Pole 36ft DDS-23:89 (Code 01110)',
    unit: 'EA',
    materialRate: isSteelLattice ? 33402 : 13000,
    labourRate: isSteelLattice ? 4500 : 2500
  };

  const poleQty = totalPoles;
  const poleMatAmt = poleQty * poleMat.materialRate;
  const poleLabAmt = poleQty * poleMat.labourRate;
  items.push({
    id: `item-${poleMat.code}-ext`,
    materialId: poleMat.id,
    materialCode: poleMat.code,
    description: `${poleMat.name} (HT Extension)`,
    specification: poleMat.specification,
    unit: poleMat.unit,
    quantity: poleQty,
    unitRate: poleMat.materialRate,
    materialAmount: poleMatAmt,
    labourRate: poleMat.labourRate,
    labourAmount: poleLabAmt,
    totalAmount: poleMatAmt + poleLabAmt,
    isAutoCalculated: true,
    calculationNotes: `${calculatedSpans} spans (${meters}m @ ${spanLength}m/span) = ${poleQty} HT Poles`
  });

  // 3. 11kV V-Cross Arms (Code 06260, DDS-6260 Angle Steel)
  const caMat = findMat('06260') || findMat('6260') || {
    id: 'mat-06260',
    code: '06260',
    name: 'ANGLE STEEL V-CROSS ARM 11KV',
    specification: 'Hot-Dip Galvanized Angle Steel V-Cross Arm 11kV (WAPDA Code 06260)',
    unit: 'EA',
    materialRate: 462.12,
    labourRate: 150
  };
  const caQty = totalPoles;
  const caMatAmt = Math.round(caQty * caMat.materialRate);
  const caLabAmt = Math.round(caQty * caMat.labourRate);
  items.push({
    id: 'item-ca-ext',
    materialId: caMat.id,
    materialCode: caMat.code,
    description: `${caMat.name} (HT Extension)`,
    specification: caMat.specification,
    unit: caMat.unit,
    quantity: caQty,
    unitRate: caMat.materialRate,
    materialAmount: caMatAmt,
    labourRate: caMat.labourRate,
    labourAmount: caLabAmt,
    totalAmount: caMatAmt + caLabAmt,
    isAutoCalculated: true,
    calculationNotes: `1 11kV V-Cross Arm per extension pole = ${caQty} Nos`
  });

  // 4. Cross Arm Braces B-11 (Code 07210)
  const braceMat = findMat('07210') || {
    id: 'mat-07210',
    code: '07210',
    name: 'BRACE (B-11) FOR 11KV CROSS ARM',
    specification: 'Galvanized Cross Arm Brace B-11 (Code 07210)',
    unit: 'EA',
    materialRate: 30.64,
    labourRate: 15
  };
  const braceQty = totalPoles;
  const braceMatAmt = Math.round(braceQty * braceMat.materialRate);
  const braceLabAmt = Math.round(braceQty * braceMat.labourRate);
  items.push({
    id: 'item-brace-ext',
    materialId: braceMat.id,
    materialCode: braceMat.code,
    description: `${braceMat.name} (HT Extension)`,
    specification: braceMat.specification,
    unit: braceMat.unit,
    quantity: braceQty,
    unitRate: braceMat.materialRate,
    materialAmount: braceMatAmt,
    labourRate: braceMat.labourRate,
    labourAmount: braceLabAmt,
    totalAmount: braceMatAmt + braceLabAmt,
    isAutoCalculated: true,
    calculationNotes: `1 Cross Arm Brace per pole = ${braceQty} Nos`
  });

  // 5. Pin Insulators (Code 05210) & GI Pins (Code 05410) (for Intermediate structures)
  if (intermediatePoles > 0) {
    const pinCount = intermediatePoles * 3;
    const pinMat = findMat('05210') || findMat('5210') || {
      id: 'mat-05210',
      code: '05210',
      name: 'PIN INSULATOR 11KV',
      specification: 'Glazed Porcelain Pin Insulator 11kV Class Normal, DDS-11 (Code 05210)',
      unit: 'EA',
      materialRate: 391.00,
      labourRate: 50
    };
    const giPinMat = findMat('05410') || findMat('5410') || {
      id: 'mat-05410',
      code: '05410',
      name: 'STEEL INSULATOR PIN 11KV',
      specification: 'Galvanized Steel Insulator Pin for 11kV Normal (Code 05410)',
      unit: 'EA',
      materialRate: 410.00,
      labourRate: 40
    };

    const pinMatAmt = Math.round(pinCount * pinMat.materialRate);
    const pinLabAmt = Math.round(pinCount * pinMat.labourRate);
    items.push({
      id: 'item-pin-ext',
      materialId: pinMat.id,
      materialCode: pinMat.code,
      description: `${pinMat.name} (HT Extension)`,
      specification: pinMat.specification,
      unit: pinMat.unit,
      quantity: pinCount,
      unitRate: pinMat.materialRate,
      materialAmount: pinMatAmt,
      labourRate: pinMat.labourRate,
      labourAmount: pinLabAmt,
      totalAmount: pinMatAmt + pinLabAmt,
      isAutoCalculated: true,
      calculationNotes: `${intermediatePoles} intermediate poles × 3 phases = ${pinCount} Pin Insulators`
    });

    const giMatAmt = Math.round(pinCount * giPinMat.materialRate);
    const giLabAmt = Math.round(pinCount * giPinMat.labourRate);
    items.push({
      id: 'item-gipin-ext',
      materialId: giPinMat.id,
      materialCode: giPinMat.code,
      description: `${giPinMat.name} (HT Extension)`,
      specification: giPinMat.specification,
      unit: giPinMat.unit,
      quantity: pinCount,
      unitRate: giPinMat.materialRate,
      materialAmount: giMatAmt,
      labourRate: giPinMat.labourRate,
      labourAmount: giLabAmt,
      totalAmount: giMatAmt + giLabAmt,
      isAutoCalculated: true,
      calculationNotes: `${intermediatePoles} intermediate poles × 3 phases = ${pinCount} GI Pins`
    });

    // Binding Wire for Pin Insulators (Code 03320)
    const bindMat = findMat('03320') || {
      id: 'mat-03320',
      code: '03320',
      name: 'WIRE SOFT ANNEALED ALUMINIUM',
      specification: 'Soft Annealed Aluminium Binding Wire (Code 03320)',
      unit: 'KG',
      materialRate: 60.00,
      labourRate: 15
    };
    const bindQty = Math.max(0.5, parseFloat((intermediatePoles * 0.5).toFixed(1)));
    const bindMatAmt = Math.round(bindQty * bindMat.materialRate);
    const bindLabAmt = Math.round(bindQty * bindMat.labourRate);
    items.push({
      id: 'item-bindwire-ext',
      materialId: bindMat.id,
      materialCode: bindMat.code,
      description: `${bindMat.name} (HT Extension Binding)`,
      specification: bindMat.specification,
      unit: bindMat.unit,
      quantity: bindQty,
      unitRate: bindMat.materialRate,
      materialAmount: bindMatAmt,
      labourRate: bindMat.labourRate,
      labourAmount: bindLabAmt,
      totalAmount: bindMatAmt + bindLabAmt,
      isAutoCalculated: true,
      calculationNotes: `0.5 KG per intermediate pole for pin insulator binding`
    });
  }

  // 6. Tension Disc Insulator Strings (Code 05230, DDS-12 45kN) for Terminal Structure
  const discMat = findMat('05230') || findMat('5230') || {
    id: 'mat-05230',
    code: '05230',
    name: 'TENSION DISC INSULATOR 11KV',
    specification: 'Tension Disc Insulator 11kV Class 45kN WAPDA DDS-12 (Code 05230)',
    unit: 'EA',
    materialRate: 1535.00,
    labourRate: 150
  };
  const discCount = 3; // 3 phases dead-end string at transformer take-off
  const discMatAmt = Math.round(discCount * discMat.materialRate);
  const discLabAmt = Math.round(discCount * discMat.labourRate);
  items.push({
    id: 'item-disc-ext',
    materialId: discMat.id,
    materialCode: discMat.code,
    description: `${discMat.name} (HT Terminal Dead-End)`,
    specification: discMat.specification,
    unit: discMat.unit,
    quantity: discCount,
    unitRate: discMat.materialRate,
    materialAmount: discMatAmt,
    labourRate: discMat.labourRate,
    labourAmount: discLabAmt,
    totalAmount: discMatAmt + discLabAmt,
    isAutoCalculated: true,
    calculationNotes: `1 terminal dead-end structure × 3 phases = 3 Disc Insulator Strings`
  });

  // 7. PG Tapping Clamps (Code 06510 / 04130) for HT Line Tee-Off / Take-Off
  if (details.htExtensionIncludePgClamps !== false) {
    const pgMat = findMat('04130') || findMat('06510') || {
      id: 'mat-pg-ext',
      code: '04130',
      name: 'PARALLEL GROOVE (PG) CONNECTOR 11KV',
      specification: 'PG Clamps / Bi-Metallic Connectors for 11kV Conductor Tap-Off',
      unit: 'EA',
      materialRate: 280.00,
      labourRate: 40
    };
    const pgCount = 3; // 3 phases tapping into existing 11kV feeder
    const pgMatAmt = Math.round(pgCount * pgMat.materialRate);
    const pgLabAmt = Math.round(pgCount * pgMat.labourRate);
    items.push({
      id: 'item-pg-ext',
      materialId: pgMat.id,
      materialCode: pgMat.code,
      description: `${pgMat.name} (Tapping Connectors)`,
      specification: pgMat.specification,
      unit: pgMat.unit,
      quantity: pgCount,
      unitRate: pgMat.materialRate,
      materialAmount: pgMatAmt,
      labourRate: pgMat.labourRate,
      labourAmount: pgLabAmt,
      totalAmount: pgMatAmt + pgLabAmt,
      isAutoCalculated: true,
      calculationNotes: `3 PG connectors for 3-phase tapping into existing 11kV feeder line`
    });
  }

  // 8. 11kV Drop Out Fuse Cutouts (Code 13311) & Fuse Links (Code 13323)
  if (details.htExtensionIncludeCutouts !== false) {
    const fuseCutoutMat = findMat('13311') || {
      id: 'mat-13311',
      code: '13311',
      name: 'DROP OUT CUT OUT 11KV',
      specification: '11kV Porcelain Drop-Out Cut Out Assembly (WAPDA Code 13311)',
      unit: 'EA',
      materialRate: 6630.00,
      labourRate: 800
    };
    const fuseLinkMat = findMat('13323') || {
      id: 'mat-13323',
      code: '13323',
      name: 'FUSE LINK 10K',
      specification: 'High Voltage Fuse Link 10K (Code 13323)',
      unit: 'EA',
      materialRate: 50.62,
      labourRate: 30
    };
    const cutoutCount = 3;
    const cutoutMatAmt = Math.round(cutoutCount * fuseCutoutMat.materialRate);
    const cutoutLabAmt = Math.round(cutoutCount * fuseCutoutMat.labourRate);
    items.push({
      id: 'item-cutout-ext',
      materialId: fuseCutoutMat.id,
      materialCode: fuseCutoutMat.code,
      description: `${fuseCutoutMat.name} (HT Line Protection)`,
      specification: fuseCutoutMat.specification,
      unit: fuseCutoutMat.unit,
      quantity: cutoutCount,
      unitRate: fuseCutoutMat.materialRate,
      materialAmount: cutoutMatAmt,
      labourRate: fuseCutoutMat.labourRate,
      labourAmount: cutoutLabAmt,
      totalAmount: cutoutMatAmt + cutoutLabAmt,
      isAutoCalculated: true,
      calculationNotes: `3 Drop Out Fuses for 11kV feeder line extension branch protection`
    });

    const linkMatAmt = Math.round(cutoutCount * fuseLinkMat.materialRate);
    const linkLabAmt = Math.round(cutoutCount * fuseLinkMat.labourRate);
    items.push({
      id: 'item-fuselink-ext',
      materialId: fuseLinkMat.id,
      materialCode: fuseLinkMat.code,
      description: `${fuseLinkMat.name} (HT Cutout Links)`,
      specification: fuseLinkMat.specification,
      unit: fuseLinkMat.unit,
      quantity: cutoutCount,
      unitRate: fuseLinkMat.materialRate,
      materialAmount: linkMatAmt,
      labourRate: fuseLinkMat.labourRate,
      labourAmount: linkLabAmt,
      totalAmount: linkMatAmt + linkLabAmt,
      isAutoCalculated: true,
      calculationNotes: `3 Fuse links (10K) for 11kV D-Fuses`
    });
  }

  // 9. 11kV Lightning Arresters (Code 07110, 9kV/10kA)
  if (details.htExtensionIncludeLightningArresters !== false) {
    const laMat = findMat('07110') || findMat('7110') || {
      id: 'mat-07110',
      code: '07110',
      name: 'LIGHTENING ARRESTOR (11-KV)',
      specification: '11kV Distribution Lightning Arrester (Code 07110 / 7110, 9kV/10kA)',
      unit: 'EA',
      materialRate: 986.57,
      labourRate: 250
    };
    const laCount = 3;
    const laMatAmt = Math.round(laCount * laMat.materialRate);
    const laLabAmt = Math.round(laCount * laMat.labourRate);
    items.push({
      id: 'item-la-ext',
      materialId: laMat.id,
      materialCode: laMat.code,
      description: `${laMat.name} (Surge Protection)`,
      specification: laMat.specification,
      unit: laMat.unit,
      quantity: laCount,
      unitRate: laMat.materialRate,
      materialAmount: laMatAmt,
      labourRate: laMat.labourRate,
      labourAmount: laLabAmt,
      totalAmount: laMatAmt + laLabAmt,
      isAutoCalculated: true,
      calculationNotes: `3 Surge arresters for 11kV line extension terminal protection`
    });
  }

  // 10. Stay Sets (Code 15310 + 03120 stay wire)
  if (details.htExtensionIncludeStaySets !== false) {
    const stayMat = findMat('15310') || {
      id: 'mat-15310',
      code: '15310',
      name: 'STAY ROD WITH ELBOW AND THIMBLE ASSEMBLY',
      specification: 'Stay Rod with Elbow and Thimble Complete Assembly (Code 15310)',
      unit: 'EA',
      materialRate: 1595.00,
      labourRate: 350
    };
    const stayWireMat = findMat('03120') || {
      id: 'mat-03120',
      code: '03120',
      name: 'GALVANIZED STEEL STAY WIRE 6MM',
      specification: 'Galvanized Steel Wire 6mm Stranded (Code 03120)',
      unit: 'KG',
      materialRate: 47.09,
      labourRate: 15
    };

    const stayCount = 2; // 2 stay sets for terminal structure dead-end pull
    const stayMatAmt = Math.round(stayCount * stayMat.materialRate);
    const stayLabAmt = Math.round(stayCount * stayMat.labourRate);
    items.push({
      id: 'item-stay-ext',
      materialId: stayMat.id,
      materialCode: stayMat.code,
      description: `${stayMat.name} (HT Terminal Guy)`,
      specification: stayMat.specification,
      unit: stayMat.unit,
      quantity: stayCount,
      unitRate: stayMat.materialRate,
      materialAmount: stayMatAmt,
      labourRate: stayMat.labourRate,
      labourAmount: stayLabAmt,
      totalAmount: stayMatAmt + stayLabAmt,
      isAutoCalculated: true,
      calculationNotes: `2 Stay sets complete for terminal dead-end pole counteracting line tension`
    });

    const wireQty = 20; // 10kg per stay set
    const wireMatAmt = Math.round(wireQty * stayWireMat.materialRate);
    const wireLabAmt = Math.round(wireQty * stayWireMat.labourRate);
    items.push({
      id: 'item-staywire-ext',
      materialId: stayWireMat.id,
      materialCode: stayWireMat.code,
      description: `${stayWireMat.name} (Guy Wire)`,
      specification: stayWireMat.specification,
      unit: stayWireMat.unit,
      quantity: wireQty,
      unitRate: stayWireMat.materialRate,
      materialAmount: wireMatAmt,
      labourRate: stayWireMat.labourRate,
      labourAmount: wireLabAmt,
      totalAmount: wireMatAmt + wireLabAmt,
      isAutoCalculated: true,
      calculationNotes: `20 KG 7/8 SWG stay wire (10 KG per stay set)`
    });
  }

  // 11. Earthing Assembly (Code 03110)
  if (details.htExtensionIncludeEarthing !== false) {
    const earthMat = findMat('03110') || {
      id: 'mat-03110',
      code: '03110',
      name: 'EARTHING SET & 8 SWG GROUND WIRE',
      specification: 'Solid Galvanized Steel Ground Wire 4mm 8 SWG & Ground Rod (Code 03110)',
      unit: 'SET',
      materialRate: 1450.00,
      labourRate: 250
    };
    const earthCount = 1;
    const earthMatAmt = Math.round(earthCount * earthMat.materialRate);
    const earthLabAmt = Math.round(earthCount * earthMat.labourRate);
    items.push({
      id: 'item-earth-ext',
      materialId: earthMat.id,
      materialCode: earthMat.code,
      description: `${earthMat.name} (HT Terminal Earthing)`,
      specification: earthMat.specification,
      unit: earthMat.unit,
      quantity: earthCount,
      unitRate: earthMat.materialRate,
      materialAmount: earthMatAmt,
      labourRate: earthMat.labourRate,
      labourAmount: earthLabAmt,
      totalAmount: earthMatAmt + earthLabAmt,
      isAutoCalculated: true,
      calculationNotes: `Complete earthing set for HT extension terminal and surge arresters`
    });
  }

  // 12. Danger Notice Plates (Code 07310)
  if (details.htExtensionIncludeDangerPlates !== false) {
    const dangerMat = findMat('07310') || findMat('7310') || {
      id: 'mat-07310',
      code: '07310',
      name: 'DANGER PLATE WITH FITTINGS 11KV',
      specification: 'Enamelled Steel Danger Notice Plate 11kV with Clamps (Code 07310)',
      unit: 'EA',
      materialRate: 52.03,
      labourRate: 20
    };
    const dangerQty = totalPoles;
    const dangerMatAmt = Math.round(dangerQty * dangerMat.materialRate);
    const dangerLabAmt = Math.round(dangerQty * dangerMat.labourRate);
    items.push({
      id: 'item-danger-ext',
      materialId: dangerMat.id,
      materialCode: dangerMat.code,
      description: `${dangerMat.name} (HT Line Warning)`,
      specification: dangerMat.specification,
      unit: dangerMat.unit,
      quantity: dangerQty,
      unitRate: dangerMat.materialRate,
      materialAmount: dangerMatAmt,
      labourRate: dangerMat.labourRate,
      labourAmount: dangerLabAmt,
      totalAmount: dangerMatAmt + dangerLabAmt,
      isAutoCalculated: true,
      calculationNotes: `1 Danger notice plate per extension pole = ${dangerQty} Nos`
    });
  }

  const sanitizedItems = items.map(item => ({
    ...item,
    labourRate: 0,
    labourAmount: 0,
    totalAmount: item.materialAmount
  }));

  const materialTotal = Number(sanitizedItems.reduce((s, i) => s + (i.materialAmount || 0), 0).toFixed(2));
  const labourTotal = 0;
  const grandTotal = materialTotal;

  return {
    meters,
    km,
    calculatedSpans,
    spanMeters: spanLength,
    intermediatePoles,
    terminalPoles,
    totalPoles,
    conductorCode,
    conductorName: condMat.name,
    conductorQtyKm,
    poleType: isSteelLattice ? '34.8ft Steel Lattice H-Type' : '36ft PC Spun Pole (PC HC)',
    items: sanitizedItems,
    materialTotal,
    labourTotal,
    grandTotal
  };
}

/**
 * Automatically calculates required line materials, pole counts, insulator counts,
 * conductor lengths (including sag/wastage allowance), and hardware fittings.
 */
export function calculateQuantitiesForLine(
  type: EstimateType,
  details: EstimateLineDetails,
  factors: DesignFactorsConfig,
  materials: MaterialItem[]
): {
  items: EstimateItem[];
  steps: CalculationStep[];
  updatedLineDetails: Partial<EstimateLineDetails>;
} {
  const steps: CalculationStep[] = [];
  const itemMap = new Map<string, EstimateItem>();

  const findMat = (code: string) => {
    const query = code.trim().toUpperCase();
    const cleanQuery = query.replace(/^0+/, '');
    
    // 1. Try exact code match (with or without leading zeros)
    const exact = materials.find(m => {
      if (!m.isActive) return false;
      const mCode = m.code.trim().toUpperCase();
      const cleanMCode = mCode.replace(/^0+/, '');
      return mCode === query || cleanMCode === cleanQuery;
    });
    if (exact) return exact;

    // 2. Try exact ID match
    const byId = materials.find(m => {
      if (!m.isActive) return false;
      return m.id.toUpperCase() === query;
    });
    if (byId) return byId;

    // 3. Fallback to name/spec search if query is text
    return materials.find(m => {
      if (!m.isActive) return false;
      const name = (m.name || '').toUpperCase();
      const spec = (m.specification || '').toUpperCase();
      return name.includes(query) || spec.includes(query);
    });
  };

  if (details.is1KmHtDogHTypePackage) {
    const rawKm = Number(details.htLengthKm);
    const lineKm = rawKm > 0 ? rawKm : 1.0;
    const multiplier = lineKm;
    itemMap.clear();

    const latest1KmSchedule = getLatestLumpSum1KmHtSchedule(materials);
    const baseMaterialTotal = latest1KmSchedule.totals.materialCost;
    const scaledMaterialTotal = Number((baseMaterialTotal * multiplier).toFixed(2));
    const scaledLabourTotal = Number((scaledMaterialTotal * 0.10).toFixed(2));
    const scaledOverheadTotal = Number((scaledMaterialTotal * 0.16).toFixed(2));
    const scaledNetTotal = Number((scaledMaterialTotal + scaledLabourTotal + scaledOverheadTotal).toFixed(2));

    steps.push({
      component: `${multiplier} KM HT Line Extension (DOG Conductor & H-Type Steel Structures)`,
      parameter: `Official WAPDA / PESCO Lump Sum Material Schedule (${multiplier}x multiple for ${multiplier} KM Line)`,
      formula: `Lump Sum Base Materials (Rs. ${baseMaterialTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})} × ${multiplier}) + 10% Labour Cost (Rs. ${scaledLabourTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}) + 16% Over Heads on Material Cost (Rs. ${scaledOverheadTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})})`,
      calculation: `WAPDA CSR Schedule Items for ${multiplier} KM: Material = Rs. ${scaledMaterialTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Labour (10%) = Rs. ${scaledLabourTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Over Heads (16% on Material) = Rs. ${scaledOverheadTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}. Net Cost = Rs. ${scaledNetTotal.toLocaleString('en-PK', {minimumFractionDigits: 2})}`,
      resultQuantity: multiplier,
      unit: 'KM',
      notes: `Includes ${multiplier} KM 11kV HT line extension using ACSR DOG conductor (${Math.round(3150 * multiplier)}m) and H-Type Steel Structures (${Math.round(16 * multiplier)} Nos), Pin and Disc insulators, cross arms, stays, and hardware fittings (Latest Material Master Rates applied).`
    });

    latest1KmSchedule.items.forEach(lsItem => {
      const itemMat = findMat(lsItem.code);
      const rawQty = lsItem.quantity * multiplier;
      const itemQty = lsItem.unit === 'EA' || lsItem.unit === 'NOS' ? Math.round(rawQty) : Number(rawQty.toFixed(2));
      const itemMatAmount = Number((lsItem.unitRate * itemQty).toFixed(2));
      const itemLabourRate = lsItem.labourRate;
      const itemLabourAmount = Number((lsItem.labourRate * itemQty).toFixed(2));
      const itemTotal = Number((itemMatAmount + itemLabourAmount).toFixed(2));

      itemMap.set(lsItem.code, {
        id: `item-${lsItem.code}`,
        materialId: itemMat ? itemMat.id : `mat-code-${lsItem.code}`,
        materialCode: lsItem.code,
        description: lsItem.description,
        specification: lsItem.specification,
        unit: lsItem.unit,
        quantity: itemQty,
        unitRate: lsItem.unitRate,
        materialAmount: itemMatAmount,
        labourRate: itemLabourRate,
        labourAmount: itemLabourAmount,
        totalAmount: itemTotal,
        isAutoCalculated: true,
        calculationNotes: `${multiplier} KM HT Line (DOG & H-Type) Schedule item (${multiplier}x multiple of base ${lsItem.quantity} ${lsItem.unit}): Latest Material Rate Rs. ${lsItem.unitRate.toLocaleString()}, 10% Labour Cost applied`
      });
    });

    const dogItems = Array.from(itemMap.values()).map(it => ({
      ...it,
      labourRate: 0,
      labourAmount: 0,
      totalAmount: it.materialAmount
    }));
    return {
      items: dogItems,
      steps,
      updatedLineDetails: {
        htPoles: Math.round(16 * multiplier),
        staySets: Math.round(8 * multiplier)
      }
    };
  }

  // 1. HT Pole Calculation
  const htKm = Number(details.htLengthKm) || 0;
  let calculatedHtPoles = 0;
  if (htKm > 0 || type === 'HT_LINE_EXTENSION' || type === 'COMPLETE_HT_FEEDER' || type === 'HT_LINE_TO_DT' || type === 'COMBINED_HT_LT') {
    if (Math.abs(htKm - 0.4) < 0.01) {
      calculatedHtPoles = 4;
      steps.push({
        component: 'HT Overhead Poles',
        parameter: details.poleType || 'HT Pole',
        formula: '4 Spans HT Line Extension = 4 Poles',
        calculation: `4 spans × 1 pole = 4 poles`,
        resultQuantity: 4,
        unit: 'Nos',
        notes: `Standard 4-span 11kV line extension (3 intermediate + 1 terminal).`
      });
    } else {
      const intermediatePoles = Math.ceil((htKm * 1000) / factors.htPoleSpacingMeters);
      const terminalPoles = factors.terminalPolesPerLine;
      const crossingPoles = Number(details.roadCrossings || 0) * 1 + Number(details.canalCrossings || 0) * 2;
      calculatedHtPoles = intermediatePoles + terminalPoles + crossingPoles;

      steps.push({
        component: 'HT Overhead Poles',
        parameter: 'PCC Pole 11 Meter',
        formula: '(Line Length × 1000 / Spacing) + Terminal Poles + Crossings',
        calculation: `(${htKm.toFixed(2)} km × 1000 / ${factors.htPoleSpacingMeters}m) + ${terminalPoles} term + ${crossingPoles} cross = ${calculatedHtPoles} poles`,
        resultQuantity: calculatedHtPoles,
        unit: 'Nos',
        notes: `Standard 100m span between poles on straight runs.`
      });
    }
  }

  // 2. LT Pole Calculation
  const ltKm = Number(details.ltLengthKm) || 0;
  let calculatedLtPoles = 0;
  if (ltKm > 0 || type === 'LT_LINE_EXTENSION' || type === 'LT_LINE_FROM_DT' || type === 'COMBINED_HT_LT') {
    const intermediatePoles = Math.ceil((ltKm * 1000) / factors.ltPoleSpacingMeters);
    const terminalPoles = 2;
    calculatedLtPoles = intermediatePoles + terminalPoles;

    steps.push({
      component: 'LT Overhead Poles',
      parameter: 'PCC Pole 9 Meter',
      formula: '(LT Length × 1000 / Spacing) + Terminal Poles',
      calculation: `(${ltKm.toFixed(2)} km × 1000 / ${factors.ltPoleSpacingMeters}m) + ${terminalPoles} = ${calculatedLtPoles} poles`,
      resultQuantity: calculatedLtPoles,
      unit: 'Nos',
      notes: `Standard 45m span between LT poles in rural/semi-urban areas.`
    });
  }

  // 4. Stay Sets Calculation (3 sets per km + terminal, exactly 2 for 4-span lines; 0 for 25kVA/50kVA transformer or line-less sub-station)
  const is25Kva = Boolean(
    details.is25KvaLumpSumPackage || 
    (type === 'NEW_DISTRIBUTION_TRANSFORMER' && details.transformerCapacityKva === 25) ||
    (Number(details.transformerCapacityKva) === 25 && htKm === 0 && ltKm === 0)
  );

  const is50Kva = Boolean(
    details.is50KvaLumpSumPackage || 
    (type === 'NEW_DISTRIBUTION_TRANSFORMER' && details.transformerCapacityKva === 50) ||
    (Number(details.transformerCapacityKva) === 50 && htKm === 0 && ltKm === 0)
  );

  const is100Kva = Boolean(
    details.is100KvaLumpSumPackage || 
    (type === 'NEW_DISTRIBUTION_TRANSFORMER' && details.transformerCapacityKva === 100) ||
    (Number(details.transformerCapacityKva) === 100 && htKm === 0 && ltKm === 0)
  );

  const isFourSpans = Math.abs(htKm - 0.4) < 0.01 && (!details.ltLengthKm || details.ltLengthKm === 0);
  const calculatedStaySets = (is25Kva || is50Kva || is100Kva || (htKm === 0 && ltKm === 0)) ? 0 : (
    isFourSpans ? 2 : (
      Math.ceil(htKm * factors.staySetsPerKm) + 
      Math.ceil(ltKm * 2) + 
      factors.terminalStaySets + 
      (Number(details.roadCrossings || 0) * 2)
    )
  );

  if (calculatedStaySets > 0) {
    steps.push({
      component: 'Guy & Stay Sets',
      parameter: 'Stay Set Complete 7/8 SWG',
      formula: isFourSpans ? '4 Spans HT Line = 2 Stay Sets' : '(HT km × 3) + (LT km × 2) + 4 Terminal + (Road Crossings × 2)',
      calculation: isFourSpans ? `Terminal guy sets = 2 sets` : `(${htKm.toFixed(2)} × 3) + (${ltKm.toFixed(2)} × 2) + 4 + (${details.roadCrossings || 0} × 2) = ${calculatedStaySets} sets`,
      resultQuantity: calculatedStaySets,
      unit: 'Sets',
      notes: 'Provides mechanical stability at angles, dead-ends, and terminal structures.'
    });
  }

  // Effective quantities used (respect manual override flag if locked by user)
  const actualHtPoles = details.autoCalculatedFlags?.htPoles === false ? details.htPoles : calculatedHtPoles;
  const actualLtPoles = details.autoCalculatedFlags?.ltPoles === false ? details.ltPoles : calculatedLtPoles;
  const actualStaySets = details.autoCalculatedFlags?.staySets === false ? details.staySets : calculatedStaySets;
  const isFourSpansLine = actualHtPoles === 4 || Math.abs(htKm - 0.4) < 0.01;

  // -------------------------------------------------------------
  // BOQ ITEM 1: HT Poles (4 Poles for 4 spans line)
  // -------------------------------------------------------------
  if (actualHtPoles > 0) {
    let poleCode = '01110'; // Default HT Spun Pole 36ft / PCC
    const poleUpper = (details.poleType || '').toUpperCase();
    if (poleUpper.includes('45FT') || poleUpper.includes('SPUN_45') || poleUpper.includes('1114') || details.poleHeightMeters === 13.7 || details.poleHeightMeters === 14) {
      poleCode = '1114'; // HT Spun Pole 45 Feet
    } else if (poleUpper.includes('STEEL') || poleUpper.includes('STRUCTURE') || poleUpper.includes('1210') || poleUpper.includes('75007') || poleUpper.includes('1213')) {
      if (poleUpper.includes('45') || poleUpper.includes('75007')) {
        poleCode = '75007'; // HT Structure 45 Feet
      } else if (poleUpper.includes('58') || poleUpper.includes('1213')) {
        poleCode = '1213'; // HT Structure 58 Feet
      } else {
        poleCode = '01210'; // HT Structure 34.8 Feet
      }
    } else {
      poleCode = '01110'; // HT Spun Pole 36 Feet
    }

    const mat = findMat(poleCode) || findMat('01210') || findMat('1210') || findMat('01110') || findMat('1113') || findMat('POL-11-PCC');
    if (mat) {
      itemMap.set(mat.code, {
        id: `item-${mat.code}`,
        materialId: mat.id,
        materialCode: mat.code,
        description: mat.name,
        specification: mat.specification,
        unit: mat.unit,
        quantity: actualHtPoles,
        unitRate: mat.materialRate,
        materialAmount: actualHtPoles * mat.materialRate,
        labourRate: mat.labourRate,
        labourAmount: actualHtPoles * mat.labourRate,
        totalAmount: actualHtPoles * (mat.materialRate + mat.labourRate),
        isAutoCalculated: true,
        calculationNotes: isFourSpansLine ? '4 Spans HT Line = 4 Poles (3 Intermediate + 1 Terminal)' : `${htKm.toFixed(2)} km @ 100m spacing + terminal/crossing poles`
      });
    }
  }

  // -------------------------------------------------------------
  // BOQ ITEM 2: Conductor Length = span length * 3.15
  // (3 phases × 1.05 sag, jumpering and termination allowance)
  // -------------------------------------------------------------
  if (htKm > 0) {
    const htConductorKm = parseFloat((htKm * 3 * 1.15).toFixed(3));
    
    let condCode = '02110'; // Default Dog
    const sizeUpper = (details.conductorSize || '').toUpperCase();
    if (sizeUpper.includes('OSPREY') || sizeUpper.includes('OSPRAY') || sizeUpper === '2160' || sizeUpper === '02160') {
      condCode = '02160';
    } else if (sizeUpper.includes('WASP') || sizeUpper === '2130' || sizeUpper === '02330' || sizeUpper === '2330') {
      condCode = '02330';
    } else if (sizeUpper.includes('PANTHER') || sizeUpper === '02150' || sizeUpper === '2150') {
      condCode = '02150';
    } else if (sizeUpper.includes('RABBIT') || sizeUpper === '2120' || sizeUpper === '02120') {
      condCode = '02120';
    } else if (sizeUpper.includes('ANT') || sizeUpper === '2340' || sizeUpper === '02340') {
      condCode = '02340';
    } else if (sizeUpper.includes('GOPHER') || sizeUpper === '02130') {
      condCode = '02130';
    } else if (sizeUpper.includes('INSULATED') || sizeUpper === '2361') {
      condCode = '2361';
    } else {
      condCode = '02110';
    }
    
    const mat = findMat(condCode) || findMat('02110') || findMat('2110') || findMat('CND-DOG-ACSR');

    steps.push({
      component: 'HT 11kV Conductor',
      parameter: mat?.name || 'ACSR Conductor',
      formula: 'Span Length × 3 × 1.15 (3 Phases × 1.15 Sag, Jumpering & Wastage Allowance)',
      calculation: `${htKm.toFixed(2)} km × 3 × 1.15 = ${htConductorKm} km (${Math.round(htConductorKm * 1000)} m)`,
      resultQuantity: htConductorKm,
      unit: 'Km',
      notes: `Standard: Span Length × 3 × 1.15 allowance for 3-phase line, sag, jumpering, and dead-end binding.`
    });

    if (mat) {
      itemMap.set(mat.code, {
        id: `item-${mat.code}`,
        materialId: mat.id,
        materialCode: mat.code,
        description: mat.name,
        specification: mat.specification,
        unit: mat.unit,
        quantity: htConductorKm,
        unitRate: mat.materialRate,
        materialAmount: Math.round(htConductorKm * mat.materialRate),
        labourRate: mat.labourRate,
        labourAmount: Math.round(htConductorKm * mat.labourRate),
        totalAmount: Math.round(htConductorKm * (mat.materialRate + mat.labourRate)),
        isAutoCalculated: true,
        calculationNotes: `Length of conductor = Span length (${htKm} km) × 3 × 1.15 = ${htConductorKm} km (${Math.round(htConductorKm * 1000)} m)`
      });
    }
  }

  // -------------------------------------------------------------
  // BOQ ITEM 3: Disc Insulators = 6 (Terminal dead-end strings)
  // -------------------------------------------------------------
  if (actualHtPoles > 0) {
    const discCount = isFourSpansLine ? 6 : Math.max(6, (2 + (Number(details.roadCrossings || 0) * 2)) * 3);
    const discMat = findMat('05230') || findMat('5230') || findMat('INS-DISC-11');
    if (discMat) {
      steps.push({
        component: '11kV Tension Disc Insulators',
        parameter: 'Disc Insulators 45kN',
        formula: isFourSpansLine ? 'Terminal Dead-End Strings = 6 Disc Insulators' : '(Terminal Poles + Road Crossing Poles) × 3 Strings',
        calculation: isFourSpansLine ? `2 dead-end strings × 3 discs = 6 discs` : `(2 + ${Number(details.roadCrossings || 0) * 2}) × 3 = ${discCount} discs`,
        resultQuantity: discCount,
        unit: 'Nos'
      });

      itemMap.set(discMat.code, {
        id: `item-${discMat.code}`,
        materialId: discMat.id,
        materialCode: discMat.code,
        description: discMat.name,
        specification: discMat.specification,
        unit: discMat.unit,
        quantity: discCount,
        unitRate: discMat.materialRate,
        materialAmount: discCount * discMat.materialRate,
        labourRate: discMat.labourRate,
        labourAmount: discCount * discMat.labourRate,
        totalAmount: discCount * (discMat.materialRate + discMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: isFourSpansLine ? '4 Spans HT Line = 6 Disc Insulators (terminal dead-end strings)' : 'Terminal dead-end strings & crossing tension sets'
      });
    }

    // -------------------------------------------------------------
    // BOQ ITEM 4: 11 KV Pins = 9 (GI Pins for 11kV Insulators)
    // -------------------------------------------------------------
    const pinCount = isFourSpansLine ? 9 : Math.max(3, (actualHtPoles - 2) * factors.pinInsulatorsPerHtPole);
    const giPinCount = pinCount;
    const giPinMat = findMat('05410') || findMat('05430') || findMat('5410') || findMat('5430');
    if (giPinMat && giPinCount > 0) {
      steps.push({
        component: '11 KV Pins',
        parameter: 'GI Pin for 11kV Insulator',
        formula: isFourSpansLine ? '4 Spans HT Line = 9 GI Pins (3 Intermediate Poles × 3 Phases)' : 'Matches 11kV Pin Insulator Count',
        calculation: `${giPinCount} insulator mounting pins = ${giPinCount} Nos`,
        resultQuantity: giPinCount,
        unit: 'Nos'
      });

      itemMap.set(giPinMat.code, {
        id: `item-${giPinMat.code}`,
        materialId: giPinMat.id,
        materialCode: giPinMat.code,
        description: giPinMat.name,
        specification: giPinMat.specification,
        unit: giPinMat.unit,
        quantity: giPinCount,
        unitRate: giPinMat.materialRate,
        materialAmount: giPinCount * giPinMat.materialRate,
        labourRate: giPinMat.labourRate,
        labourAmount: giPinCount * giPinMat.labourRate,
        totalAmount: giPinCount * (giPinMat.materialRate + giPinMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: isFourSpansLine ? '4 Spans HT Line = 9 GI Pins (3 intermediate poles × 3 phases)' : '11kV GI Steel Pins for mounting pin insulators'
      });
    }

    // -------------------------------------------------------------
    // BOQ ITEM 5: 11KV Insulator Normal = 9 (3 Intermediate Poles × 3 Phases)
    // -------------------------------------------------------------
    const pinMat = findMat('05210') || findMat('5210') || findMat('INS-PIN-11');
    if (pinMat && pinCount > 0) {
      steps.push({
        component: '11KV Insulator Normal',
        parameter: '11KV Insulator Normal (Porcelain)',
        formula: isFourSpansLine ? '4 Spans HT Line = 9 Pin Insulators (3 Intermediate Poles × 3 Phases)' : 'Straight HT Poles × 3 Phases',
        calculation: isFourSpansLine ? `3 intermediate poles × 3 phases = 9 insulators` : `${Math.max(1, actualHtPoles - 2)} poles × 3 = ${pinCount} insulators`,
        resultQuantity: pinCount,
        unit: 'Nos'
      });

      itemMap.set(pinMat.code, {
        id: `item-${pinMat.code}`,
        materialId: pinMat.id,
        materialCode: pinMat.code,
        description: pinMat.name,
        specification: pinMat.specification,
        unit: pinMat.unit,
        quantity: pinCount,
        unitRate: pinMat.materialRate,
        materialAmount: pinCount * pinMat.materialRate,
        labourRate: pinMat.labourRate,
        labourAmount: pinCount * pinMat.labourRate,
        totalAmount: pinCount * (pinMat.materialRate + pinMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: isFourSpansLine ? '4 Spans HT Line = 9 Pin Insulators (3 intermediate poles × 3 phases)' : `3 pin insulators per intermediate HT pole`
      });
    }

    // -------------------------------------------------------------
    // BOQ ITEM 6: Stay Sets Complete = 2
    // -------------------------------------------------------------
    if (actualStaySets > 0) {
      const stayMat = findMat('15310') || findMat('mat-hw-stay-set') || findMat('HW-STAY-SET') || findMat('03140');
      if (stayMat) {
        itemMap.set(stayMat.code, {
          id: `item-${stayMat.code}`,
          materialId: stayMat.id,
          materialCode: stayMat.code,
          description: stayMat.name,
          specification: stayMat.specification,
          unit: stayMat.unit,
          quantity: actualStaySets,
          unitRate: stayMat.materialRate,
          materialAmount: actualStaySets * stayMat.materialRate,
          labourRate: stayMat.labourRate,
          labourAmount: actualStaySets * stayMat.labourRate,
          totalAmount: actualStaySets * (stayMat.materialRate + stayMat.labourRate),
          isAutoCalculated: true,
          calculationNotes: isFourSpansLine ? '4 Spans HT Line = 2 Stay Sets complete (terminal guy support)' : 'Terminal, angle, and line guy sets with turnbuckles'
        });
      }
    }

    // -------------------------------------------------------------
    // BOQ ITEM 7: Cross Arms (1 V-Cross Arm per HT Pole)
    // -------------------------------------------------------------
    const caMat = findMat('06260') || findMat('6260') || findMat('HW-CA-V5');
    if (caMat) {
      itemMap.set(caMat.code, {
        id: `item-${caMat.code}`,
        materialId: caMat.id,
        materialCode: caMat.code,
        description: caMat.name,
        specification: caMat.specification,
        unit: caMat.unit,
        quantity: actualHtPoles,
        unitRate: caMat.materialRate,
        materialAmount: actualHtPoles * caMat.materialRate,
        labourRate: caMat.labourRate,
        labourAmount: actualHtPoles * caMat.labourRate,
        totalAmount: actualHtPoles * (caMat.materialRate + caMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: `1 V-Shape cross arm per HT pole`
      });
    }

    // -------------------------------------------------------------
    // BOQ ITEM 8: Danger Notice Plates (1 per HT Pole)
    // -------------------------------------------------------------
    const dangerMat = findMat('07310') || findMat('7310') || findMat('85012') || findMat('HW-DANGER-PLT');
    if (dangerMat) {
      itemMap.set(dangerMat.code, {
        id: `item-${dangerMat.code}`,
        materialId: dangerMat.id,
        materialCode: dangerMat.code,
        description: dangerMat.name,
        specification: dangerMat.specification,
        unit: dangerMat.unit,
        quantity: actualHtPoles,
        unitRate: dangerMat.materialRate,
        materialAmount: actualHtPoles * dangerMat.materialRate,
        labourRate: dangerMat.labourRate,
        labourAmount: actualHtPoles * dangerMat.labourRate,
        totalAmount: actualHtPoles * (dangerMat.materialRate + dangerMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: `1 warning danger plate per HT pole`
      });
    }

    // -------------------------------------------------------------
    // BOQ ITEM 9: Earthing Sets (Pole Earthing Coil & Lead)
    // -------------------------------------------------------------
    const earthingCount = Math.max(2, Math.ceil(actualHtPoles / factors.earthingIntervalPoles));
    const earthMat = findMat('15220') || findMat('03110') || findMat('3110') || findMat('HW-EARTH-SET');
    if (earthMat) {
      steps.push({
        component: 'Line Earthing Sets',
        parameter: 'Pole Earthing Coil & Lead',
        formula: 'HT Poles / 5 (minimum 2)',
        calculation: `${actualHtPoles} / 5 = ${earthingCount} sets`,
        resultQuantity: earthingCount,
        unit: 'Sets'
      });

      itemMap.set(earthMat.code, {
        id: `item-${earthMat.code}`,
        materialId: earthMat.id,
        materialCode: earthMat.code,
        description: earthMat.name,
        specification: earthMat.specification,
        unit: earthMat.unit,
        quantity: earthingCount,
        unitRate: earthMat.materialRate,
        materialAmount: earthingCount * earthMat.materialRate,
        labourRate: earthMat.labourRate,
        labourAmount: earthingCount * earthMat.labourRate,
        totalAmount: earthingCount * (earthMat.materialRate + earthMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: `System earthing at regular intervals (minimum 2 sets)`
      });
    }

    // -------------------------------------------------------------
    // BOQ ITEM 10: PG Connectors for Jumpers & Dead-Ends
    // -------------------------------------------------------------
    let pgCode = '04130'; // T-110 for Dog
    const sizeUpper = (details.conductorSize || '').toUpperCase();
    if (sizeUpper.includes('OSPREY') || sizeUpper.includes('2160')) {
      pgCode = '04150'; // T-150 for Osprey
    } else if (sizeUpper.includes('WASP') || sizeUpper.includes('2130') || sizeUpper.includes('2330')) {
      pgCode = '04160'; // T-120 for Wasp
    } else if (sizeUpper.includes('RABBIT') || sizeUpper.includes('2120')) {
      pgCode = '04120'; // S-157 for Rabbit
    }
    const pgMat = findMat(pgCode) || findMat('04130') || findMat('4130');
    if (pgMat) {
      const pgCount = actualHtPoles <= 6 ? 6 : 12;
      itemMap.set(pgMat.code, {
        id: `item-${pgMat.code}`,
        materialId: pgMat.id,
        materialCode: pgMat.code,
        description: pgMat.name,
        specification: pgMat.specification,
        unit: pgMat.unit,
        quantity: pgCount,
        unitRate: pgMat.materialRate,
        materialAmount: pgCount * pgMat.materialRate,
        labourRate: pgMat.labourRate,
        labourAmount: pgCount * pgMat.labourRate,
        totalAmount: pgCount * (pgMat.materialRate + pgMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: `Parallel Groove PG Connectors for jumpers and terminations`
      });
    }

    // -------------------------------------------------------------
    // BOQ ITEM 11: Hardware Nuts, Bolts & Fasteners
    // -------------------------------------------------------------
    const nbMat = findMat('11115') || findMat('11116') || findMat('HW-NB-ASSORTED');
    if (nbMat) {
      const nbKg = Math.round(actualHtPoles * 2.5);
      itemMap.set(nbMat.code, {
        id: `item-${nbMat.code}`,
        materialId: nbMat.id,
        materialCode: nbMat.code,
        description: nbMat.name,
        specification: nbMat.specification,
        unit: nbMat.unit,
        quantity: nbKg,
        unitRate: nbMat.materialRate,
        materialAmount: nbKg * nbMat.materialRate,
        labourRate: nbMat.labourRate,
        labourAmount: nbKg * nbMat.labourRate,
        totalAmount: nbKg * (nbMat.materialRate + nbMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: `Galvanized structural fasteners (2.5 kg per pole)`
      });
    }
  }

  // 12. Add LT Poles to BOQ
  if (actualLtPoles > 0) {
    const ltMat = findMat('01120') || findMat('1120') || findMat('POL-09-PCC');
    if (ltMat) {
      itemMap.set(ltMat.code, {
        id: `item-${ltMat.code}`,
        materialId: ltMat.id,
        materialCode: ltMat.code,
        description: ltMat.name,
        specification: ltMat.specification,
        unit: ltMat.unit,
        quantity: actualLtPoles,
        unitRate: ltMat.materialRate,
        materialAmount: actualLtPoles * ltMat.materialRate,
        labourRate: ltMat.labourRate,
        labourAmount: actualLtPoles * ltMat.labourRate,
        totalAmount: actualLtPoles * (ltMat.materialRate + ltMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: `${ltKm.toFixed(2)} km @ 45m spacing + terminal poles`
      });
    }
  }

  // 13. Stay Sets for pure LT line (if not already added in HT section, and not for 25kVA/50kVA transformer or line-less schemes)
  if (actualStaySets > 0 && actualHtPoles === 0 && !is25Kva && !is50Kva && (htKm > 0 || ltKm > 0)) {
    const stayMat = findMat('15310') || findMat('mat-hw-stay-set') || findMat('HW-STAY-SET') || findMat('03140');
    if (stayMat && !itemMap.has(stayMat.code)) {
      itemMap.set(stayMat.code, {
        id: `item-${stayMat.code}`,
        materialId: stayMat.id,
        materialCode: stayMat.code,
        description: stayMat.name,
        specification: stayMat.specification,
        unit: stayMat.unit,
        quantity: actualStaySets,
        unitRate: stayMat.materialRate,
        materialAmount: actualStaySets * stayMat.materialRate,
        labourRate: stayMat.labourRate,
        labourAmount: actualStaySets * stayMat.labourRate,
        totalAmount: actualStaySets * (stayMat.materialRate + stayMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: `Terminal, angle, and line guy sets with turnbuckles`
      });
    }
  }

  // HT Extension Calculation & Standard 11kV Feeder Line Assemblies
  if (details.htExtensionMeters && details.htExtensionMeters > 0 && details.htExtensionMergeWithTransformer !== false) {
    const miniEst = calculateHtExtensionMiniEstimate(details, factors, materials);
    if (miniEst) {
      for (const item of miniEst.items) {
        itemMap.set(item.id, item);
      }

      steps.push({
        component: '11kV HT Line Extension Mini-Estimate Assembly',
        parameter: `${miniEst.meters} Meters (${miniEst.calculatedSpans} Spans, ${miniEst.totalPoles} Poles)`,
        formula: '11kV Electrical Feeder Standard Assemblies (WAPDA DDS-23/DDS-10/DDS-11/DDS-12)',
        calculation: `${miniEst.totalPoles} Poles, ${miniEst.conductorQtyKm} km ${miniEst.conductorName}, V-Cross Arms, Pin & Disc Insulators, D-Fuses, Lightning Arresters, Stay Sets: Material=Rs. ${miniEst.materialTotal.toLocaleString()}, Labour=Rs. ${miniEst.labourTotal.toLocaleString()}, Total=Rs. ${miniEst.grandTotal.toLocaleString()}`,
        resultQuantity: miniEst.meters,
        unit: 'Meters',
        notes: 'Complete 11kV HT feeder line extension mini-estimate merged into transformer project estimate.'
      });
    }
  }

  // LT Extension Calculation & Standard LT Line Assemblies
  if (details.ltExtensionMeters && details.ltExtensionMeters > 0) {
    const ltMiniEst = calculateLtExtensionMiniEstimate(details, factors, materials);
    if (ltMiniEst) {
      for (const item of ltMiniEst.items) {
        itemMap.set(item.id, item);
      }

      steps.push({
        component: 'LT Line Extension Mini-Estimate Assembly',
        parameter: `${ltMiniEst.meters} Meters (${ltMiniEst.calculatedSpans} Spans, ${ltMiniEst.totalPoles} Poles)`,
        formula: 'LT Line Standard Assemblies (WAPDA / PESCO LT Standards)',
        calculation: `${ltMiniEst.totalPoles} Poles, ${ltMiniEst.conductorQtyKm} km ${ltMiniEst.conductorName}, LT Cross Arms, Shackle Insulators & D-Irons, Fasteners: Material=Rs. ${ltMiniEst.materialTotal.toLocaleString()}, Labour=Rs. ${ltMiniEst.labourTotal.toLocaleString()}, Total=Rs. ${ltMiniEst.grandTotal.toLocaleString()}`,
        resultQuantity: ltMiniEst.meters,
        unit: 'Meters',
        notes: 'Complete LT line extension mini-estimate merged into project estimate.'
      });
    }
  }

  // 14. Transformer & Sub-station Hardware (if DT included)
  const trfCount = Number(details.transformerCount || 0);
  const trfKva = Number(details.transformerCapacityKva || 0);
  const hasTransformer = trfCount > 0 || type === 'NEW_DISTRIBUTION_TRANSFORMER' || 
                         type === 'TRANSFORMER_AUGMENTATION' || type === 'HT_LINE_TO_DT' || 
                         type === 'COMBINED_HT_LT';

  if (hasTransformer) {
    const targetKva = trfKva > 0 ? trfKva : 100;
    const count = Math.max(1, trfCount);

    if (targetKva === 200 || details.is200KvaLumpSumPackage) {
      // -------------------------------------------------------------
      // OFFICIAL WAPDA / PESCO LUMP SUM MATERIAL SCHEDULE: 200 KVA TRANSFORMER
      // Total Material: Rs. 1,981,233.97 | 10% Labour: Rs. 198,123.40 | 16% Over Heads on Material: Rs. 316,997.44
      // Net Cost: Rs. 2,496,354.81
      // -------------------------------------------------------------
      itemMap.delete('15310');
      itemMap.delete('mat-code-15310');
      itemMap.delete('HW-STAY-SET');
      itemMap.delete('mat-hw-stay-set');

      if (htKm === 0 && ltKm === 0) {
        itemMap.clear();
      }

      const latest200Schedule = getLatestLumpSum200KvaSchedule(materials);
      steps.push({
        component: '200 KVA Distribution Transformer Sub-Station',
        parameter: 'Official WAPDA / PESCO Lump Sum Material Schedule',
        formula: `Lump Sum Materials (Rs. ${latest200Schedule.totals.materialCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}) + 10% Labour Cost (Rs. ${latest200Schedule.totals.labourCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}) + 16% Over Heads on Material Cost (Rs. ${latest200Schedule.totals.overheadAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})})`,
        calculation: `WAPDA CSR Schedule Items: Material = Rs. ${latest200Schedule.totals.materialCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Labour (10%) = Rs. ${latest200Schedule.totals.labourCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Over Heads (16% on Material) = Rs. ${latest200Schedule.totals.overheadAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})}. Net Cost = Rs. ${latest200Schedule.totals.netCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}`,
        resultQuantity: count,
        unit: 'Job / Set',
        notes: 'Includes 200 KVA Copper Transformer Sub-Station installation with WASP and ANT conductors, PCC Poles, Cross Arms, Drop Out Cut Outs, and Platform with latest material rates.'
      });

      latest200Schedule.items.forEach(lsItem => {
        const itemMat = findMat(lsItem.code);
        const itemQty = lsItem.quantity * count;
        const itemMatAmount = Number((lsItem.unitRate * itemQty).toFixed(2));
        const itemLabourRate = lsItem.labourRate;
        const itemLabourAmount = Number((lsItem.labourRate * itemQty).toFixed(2));
        const itemTotal = Number((itemMatAmount + itemLabourAmount).toFixed(2));

        itemMap.set(lsItem.code, {
          id: `item-${lsItem.code}`,
          materialId: itemMat ? itemMat.id : `mat-code-${lsItem.code}`,
          materialCode: lsItem.code,
          description: lsItem.description,
          specification: lsItem.specification,
          unit: lsItem.unit,
          quantity: itemQty,
          unitRate: lsItem.unitRate,
          materialAmount: itemMatAmount,
          labourRate: itemLabourRate,
          labourAmount: itemLabourAmount,
          totalAmount: itemTotal,
          isAutoCalculated: true,
          calculationNotes: `200 kVA Transformer Installation Schedule item: Latest Rate Rs. ${lsItem.unitRate.toLocaleString()}, 10% Labour Cost applied`
        });
      });
    } else if (targetKva === 100 || details.is100KvaLumpSumPackage || is100Kva) {
      // -------------------------------------------------------------
      // OFFICIAL 20-ITEM WAPDA / PESCO LUMP SUM MATERIAL SCHEDULE: 100 KVA TRANSFORMER
      // Dynamic Latest Rates Synced
      // -------------------------------------------------------------
      itemMap.delete('15310');
      itemMap.delete('mat-code-15310');
      itemMap.delete('HW-STAY-SET');
      itemMap.delete('mat-hw-stay-set');

      if (htKm === 0 && ltKm === 0) {
        itemMap.clear();
      }

      const latest100Schedule = getLatestLumpSum100KvaSchedule(materials);
      steps.push({
        component: '100 KVA Distribution Transformer Sub-Station',
        parameter: '20-Item Official WAPDA / PESCO Lump Sum Material Schedule',
        formula: `Lump Sum Materials (Rs. ${latest100Schedule.totals.materialCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}) + 10% Labour Cost (Rs. ${latest100Schedule.totals.labourCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}) + 16% Over Heads on Material Cost (Rs. ${latest100Schedule.totals.overheadAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})})`,
        calculation: `20 WAPDA CSR Schedule Items: Material = Rs. ${latest100Schedule.totals.materialCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Labour (10%) = Rs. ${latest100Schedule.totals.labourCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Over Heads (16% on Material) = Rs. ${latest100Schedule.totals.overheadAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})}. Net Cost = Rs. ${latest100Schedule.totals.netCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}`,
        resultQuantity: count,
        unit: 'Job / Set',
        notes: 'Includes 100 KVA Copper Transformer, Drop Out Cut Outs, Double Structure Platform, Lattice Cross Arms, LT Spool & 11kV Pin Insulators, Earthing Unit, Wasp & Rabbit Conductors with latest updated material rates.'
      });

      latest100Schedule.items.forEach(lsItem => {
        const itemMat = findMat(lsItem.code);
        const itemQty = lsItem.quantity * count;
        const itemMatAmount = Number((lsItem.unitRate * itemQty).toFixed(2));
        const itemLabourRate = lsItem.labourRate;
        const itemLabourAmount = Number((lsItem.labourRate * itemQty).toFixed(2));
        const itemTotal = Number((itemMatAmount + itemLabourAmount).toFixed(2));

        itemMap.set(lsItem.code, {
          id: `item-${lsItem.code}`,
          materialId: itemMat ? itemMat.id : `mat-code-${lsItem.code}`,
          materialCode: lsItem.code,
          description: lsItem.description,
          specification: lsItem.specification,
          unit: lsItem.unit,
          quantity: itemQty,
          unitRate: lsItem.unitRate,
          materialAmount: itemMatAmount,
          labourRate: itemLabourRate,
          labourAmount: itemLabourAmount,
          totalAmount: itemTotal,
          isAutoCalculated: true,
          calculationNotes: `100 kVA Transformer Installation Schedule item: Latest Rate Rs. ${lsItem.unitRate.toLocaleString()}, 10% Labour Cost applied`
        });
      });
    } else if (targetKva === 50 || details.is50KvaLumpSumPackage || is50Kva) {
      // -------------------------------------------------------------
      // OFFICIAL 18-ITEM WAPDA / PESCO LUMP SUM MATERIAL SCHEDULE: 50 KVA TRANSFORMER
      // Dynamic Latest Rates Synced
      // -------------------------------------------------------------
      itemMap.delete('15310');
      itemMap.delete('mat-code-15310');
      itemMap.delete('HW-STAY-SET');
      itemMap.delete('mat-hw-stay-set');

      if (htKm === 0 && ltKm === 0) {
        itemMap.clear();
      }

      const latest50Schedule = getLatestLumpSum50KvaSchedule(materials);
      steps.push({
        component: '50 KVA Distribution Transformer Sub-Station',
        parameter: '18-Item Official WAPDA / PESCO Lump Sum Material Schedule',
        formula: `Lump Sum Materials (Rs. ${latest50Schedule.totals.materialCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}) + 10% Labour Cost (Rs. ${latest50Schedule.totals.labourCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}) + 16% Over Heads on Material Cost (Rs. ${latest50Schedule.totals.overheadAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})})`,
        calculation: `18 WAPDA CSR Schedule Items: Material = Rs. ${latest50Schedule.totals.materialCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Labour (10%) = Rs. ${latest50Schedule.totals.labourCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Over Heads (16% on Material) = Rs. ${latest50Schedule.totals.overheadAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})}. Net Cost = Rs. ${latest50Schedule.totals.netCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}`,
        resultQuantity: count,
        unit: 'Job / Set',
        notes: 'Includes 50 KVA Copper Transformer, Drop Out Cut Outs, Single Structure Platform, Lattice Cross Arm, LT Spool & 11kV Pin Insulators, Earthing Unit, LT 4-Core Cable with latest updated material rates.'
      });

      latest50Schedule.items.forEach(lsItem => {
        const itemMat = findMat(lsItem.code);
        const itemQty = lsItem.quantity * count;
        const itemMatAmount = Number((lsItem.unitRate * itemQty).toFixed(2));
        const itemLabourRate = lsItem.labourRate;
        const itemLabourAmount = Number((lsItem.labourRate * itemQty).toFixed(2));
        const itemTotal = Number((itemMatAmount + itemLabourAmount).toFixed(2));

        itemMap.set(lsItem.code, {
          id: `item-${lsItem.code}`,
          materialId: itemMat ? itemMat.id : `mat-code-${lsItem.code}`,
          materialCode: lsItem.code,
          description: lsItem.description,
          specification: lsItem.specification,
          unit: lsItem.unit,
          quantity: itemQty,
          unitRate: lsItem.unitRate,
          materialAmount: itemMatAmount,
          labourRate: itemLabourRate,
          labourAmount: itemLabourAmount,
          totalAmount: itemTotal,
          isAutoCalculated: true,
          calculationNotes: `50 kVA Transformer Installation Schedule item: Latest Rate Rs. ${lsItem.unitRate.toLocaleString()}, 10% Labour Cost applied`
        });
      });
    } else if (targetKva === 25 || details.is25KvaLumpSumPackage || is25Kva) {
      // -------------------------------------------------------------
      // OFFICIAL 18-ITEM WAPDA / PESCO LUMP SUM MATERIAL SCHEDULE: 25 KVA TRANSFORMER
      // Dynamic Latest Rates Synced
      // -------------------------------------------------------------
      itemMap.delete('15310');
      itemMap.delete('mat-code-15310');
      itemMap.delete('HW-STAY-SET');
      itemMap.delete('mat-hw-stay-set');

      if (htKm === 0 && ltKm === 0) {
        itemMap.clear();
      }

      const latest25Schedule = getLatestLumpSum25KvaSchedule(materials);
      steps.push({
        component: '25 KVA Distribution Transformer Sub-Station',
        parameter: '18-Item Official WAPDA / PESCO Lump Sum Material Schedule',
        formula: `Lump Sum Materials (Rs. ${latest25Schedule.totals.materialCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}) + 10% Labour Cost (Rs. ${latest25Schedule.totals.labourCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}) + 16% Over Heads on Material Cost (Rs. ${latest25Schedule.totals.overheadAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})})`,
        calculation: `18 WAPDA CSR Schedule Items: Material = Rs. ${latest25Schedule.totals.materialCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Labour (10%) = Rs. ${latest25Schedule.totals.labourCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}, Over Heads (16% on Material) = Rs. ${latest25Schedule.totals.overheadAmount.toLocaleString('en-PK', {minimumFractionDigits: 2})}. Net Cost = Rs. ${latest25Schedule.totals.netCost.toLocaleString('en-PK', {minimumFractionDigits: 2})}`,
        resultQuantity: count,
        unit: 'Job / Set',
        notes: 'Includes 25 KVA Copper Transformer (08110), 11kV Drop Out Cut Outs (13311), Single Structure Platform (10710), 11kV Lattice Cross Arm (06250), LT Spool & 11kV Pin Insulators, Earthing Unit, LT 4-Core Cable, PG Connectors with latest updated material rates.'
      });

      latest25Schedule.items.forEach(lsItem => {
        const itemMat = findMat(lsItem.code);
        const itemQty = lsItem.quantity * count;
        const itemMatAmount = Number((lsItem.unitRate * itemQty).toFixed(2));
        const itemLabourRate = lsItem.labourRate;
        const itemLabourAmount = Number((lsItem.labourRate * itemQty).toFixed(2));
        const itemTotal = Number((itemMatAmount + itemLabourAmount).toFixed(2));

        itemMap.set(lsItem.code, {
          id: `item-${lsItem.code}`,
          materialId: itemMat ? itemMat.id : `mat-code-${lsItem.code}`,
          materialCode: lsItem.code,
          description: lsItem.description,
          specification: lsItem.specification,
          unit: lsItem.unit,
          quantity: itemQty,
          unitRate: lsItem.unitRate,
          materialAmount: itemMatAmount,
          labourRate: itemLabourRate,
          labourAmount: itemLabourAmount,
          totalAmount: itemTotal,
          isAutoCalculated: true,
          calculationNotes: `25 kVA Transformer Installation Schedule item: Latest Rate Rs. ${lsItem.unitRate.toLocaleString()}, 10% Labour Cost applied`
        });
      });
    } else {
      const trfCode = targetKva === 50 ? '08120' :
                      targetKva === 200 ? '08140' :
                      targetKva === 400 ? '08150' :
                      targetKva === 630 ? '08160' : '08130';
      const trfMat = findMat(trfCode) || findMat(`TRF-${targetKva}-11KV`);

      if (trfMat) {
        itemMap.set(trfMat.code, {
          id: `item-${trfMat.code}`,
          materialId: trfMat.id,
          materialCode: trfMat.code,
          description: trfMat.name,
          specification: trfMat.specification,
          unit: trfMat.unit,
          quantity: count,
          unitRate: trfMat.materialRate,
          materialAmount: count * trfMat.materialRate,
          labourRate: trfMat.labourRate,
          labourAmount: count * trfMat.labourRate,
          totalAmount: count * (trfMat.materialRate + trfMat.labourRate),
          isAutoCalculated: true,
          calculationNotes: `Distribution Transformer (${targetKva} kVA)`
        });
      }

      // Transformer Sub-station Protection & Platform
      const laMat = findMat('07110') || findMat('7110') || findMat('SW-LA-11KV');
      if (laMat) {
        itemMap.set(laMat.code, {
          id: `item-${laMat.code}`,
          materialId: laMat.id,
          materialCode: laMat.code,
          description: laMat.name,
          specification: laMat.specification,
          unit: laMat.unit,
          quantity: count,
          unitRate: laMat.materialRate,
          materialAmount: count * laMat.materialRate,
          labourRate: laMat.labourRate,
          labourAmount: count * laMat.labourRate,
          totalAmount: count * (laMat.materialRate + laMat.labourRate),
          isAutoCalculated: true,
          calculationNotes: `1 set of 3 surge arresters per transformer`
        });
      }

      const dofMat = findMat('13311') || findMat('10740') || findMat('SW-DOF-11KV');
      if (dofMat) {
        itemMap.set(dofMat.code, {
          id: `item-${dofMat.code}`,
          materialId: dofMat.id,
          materialCode: dofMat.code,
          description: dofMat.name,
          specification: dofMat.specification,
          unit: dofMat.unit,
          quantity: count,
          unitRate: dofMat.materialRate,
          materialAmount: count * dofMat.materialRate,
          labourRate: dofMat.labourRate,
          labourAmount: count * dofMat.labourRate,
          totalAmount: count * (dofMat.materialRate + dofMat.labourRate),
          isAutoCalculated: true,
          calculationNotes: `1 set of 3 drop-out cutouts for transformer protection`
        });
      }

      const platMat = findMat('10720') || findMat('10710') || findMat('STR-TRF-PLAT');
      if (platMat) {
        itemMap.set(platMat.code, {
          id: `item-${platMat.code}`,
          materialId: platMat.id,
          materialCode: platMat.code,
          description: platMat.name,
          specification: platMat.specification,
          unit: platMat.unit,
          quantity: count,
          unitRate: platMat.materialRate,
          materialAmount: count * platMat.materialRate,
          labourRate: platMat.labourRate,
          labourAmount: count * platMat.labourRate,
          totalAmount: count * (platMat.materialRate + platMat.labourRate),
          isAutoCalculated: true,
          calculationNotes: `H-Frame platform structure with clamps`
        });
      }

      const distBoxMat = findMat('PNL-LT-DIST');
      if (distBoxMat) {
        itemMap.set(distBoxMat.code, {
          id: `item-${distBoxMat.code}`,
          materialId: distBoxMat.id,
          materialCode: distBoxMat.code,
          description: distBoxMat.name,
          specification: distBoxMat.specification,
          unit: distBoxMat.unit,
          quantity: count,
          unitRate: distBoxMat.materialRate,
          materialAmount: count * distBoxMat.materialRate,
          labourRate: distBoxMat.labourRate,
          labourAmount: count * distBoxMat.labourRate,
          totalAmount: count * (distBoxMat.materialRate + distBoxMat.labourRate),
          isAutoCalculated: true,
          calculationNotes: `LT distribution box with circuit breakers`
        });
      }

      const civilMat = findMat('STR-CIVIL-PAD');
      if (civilMat) {
        itemMap.set(civilMat.code, {
          id: `item-${civilMat.code}`,
          materialId: civilMat.id,
          materialCode: civilMat.code,
          description: civilMat.name,
          specification: civilMat.specification,
          unit: civilMat.unit,
          quantity: count,
          unitRate: civilMat.materialRate,
          materialAmount: count * civilMat.materialRate,
          labourRate: civilMat.labourRate,
          labourAmount: count * civilMat.labourRate,
          totalAmount: count * (civilMat.materialRate + civilMat.labourRate),
          isAutoCalculated: true,
          calculationNotes: `Civil foundation and pole muffling works`
        });
      }
    }
  }

  // 15. Complete Feeder Switchgear
  if (type === 'COMPLETE_HT_FEEDER') {
    const abMat = findMat('SW-AB-400A');
    if (abMat) {
      const switchCount = Math.max(1, Math.ceil(htKm / 2));
      itemMap.set(abMat.code, {
        id: `item-${abMat.code}`,
        materialId: abMat.id,
        materialCode: abMat.code,
        description: abMat.name,
        specification: abMat.specification,
        unit: abMat.unit,
        quantity: switchCount,
        unitRate: abMat.materialRate,
        materialAmount: switchCount * abMat.materialRate,
        labourRate: abMat.labourRate,
        labourAmount: switchCount * abMat.labourRate,
        totalAmount: switchCount * (abMat.materialRate + abMat.labourRate),
        isAutoCalculated: true,
        calculationNotes: `Gang-operated sectionalizing Air Break (AB) switches`
      });
    }
  }

  let finalItems = Array.from(itemMap.values());
  if (is25Kva || is50Kva || is100Kva || details.is25KvaLumpSumPackage || details.is50KvaLumpSumPackage || details.is100KvaLumpSumPackage || ((Number(details.transformerCapacityKva) === 25 || Number(details.transformerCapacityKva) === 50 || Number(details.transformerCapacityKva) === 100) && htKm === 0 && ltKm === 0)) {
    finalItems = finalItems.filter(item => {
      // Retain stay sets and guy accessories specifically configured for the HT extension mini-estimate
      if (item.id === 'item-stay-ext' || item.id?.endsWith('-ext')) return true;
      return item.materialCode !== '15310' && !item.description.toUpperCase().includes('STAY ROD');
    });
  }

  const sanitizedFinalItems = finalItems.map(item => ({
    ...item,
    labourRate: 0,
    labourAmount: 0,
    totalAmount: item.materialAmount
  }));

  return {
    items: sanitizedFinalItems,
    steps,
    updatedLineDetails: {
      htPoles: calculatedHtPoles,
      ltPoles: calculatedLtPoles,
      staySets: calculatedStaySets
    }
  };
}

/**
 * Computes all grand totals, overheads, transportation, and cost per km
 */
export function computeEstimateCharges(
  items: EstimateItem[],
  lineKm: number,
  transportSettings?: {
    method: 'FIXED' | 'PER_KM' | 'PERCENT_OF_MATERIAL';
    distanceKm: number;
    ratePerKm: number;
    loadingUnloadingFixed: number;
  },
  percentages?: {
    labourPercent?: number;
    engineeringPercent: number;
    contingencyPercent: number;
    departmentalPercent: number;
    contractorPercent: number;
    taxPercent: number;
    otherChargesFixed?: number;
    overheadBasis?: 'MATERIAL' | 'PRIME_COST';
  }
): EstimateCharges {
  const standardItems = items.filter(i => !i.isDismantled);
  const dismantledItems = items.filter(i => !!i.isDismantled);

  const materialCost = Number(standardItems.reduce((sum, item) => sum + (Number(item.materialAmount) || 0), 0).toFixed(2));

  // Labour cost is calculated strictly on Material Cost from dropdown percentage
  const labourPercent = percentages?.labourPercent !== undefined ? percentages.labourPercent : 10.0;
  const labourCost = Number((materialCost * (labourPercent / 100)).toFixed(2));

  const dismantleMaterialCredit = Number(dismantledItems.reduce((sum, item) => sum + (Number(item.materialAmount) || 0), 0).toFixed(2));
  const dismantleLabourCost = Number((dismantleMaterialCredit * (labourPercent / 100)).toFixed(2));
  const dismantleNetTotal = Number((dismantleLabourCost - dismantleMaterialCredit).toFixed(2));

  // Transportation Cost calculation
  let transportationCost = 0;
  if (transportSettings) {
    if (transportSettings.method === 'PER_KM') {
      transportationCost = (transportSettings.distanceKm * transportSettings.ratePerKm) + (transportSettings.loadingUnloadingFixed || 0);
    } else if (transportSettings.method === 'PERCENT_OF_MATERIAL') {
      transportationCost = Math.round(materialCost * 0.05); // 5% default
    } else {
      transportationCost = transportSettings.loadingUnloadingFixed || 0;
    }
  } else {
    // default 25 km distance @ 180 PKR/km
    transportationCost = Math.round(25 * 180 + 15000);
  }

  // Civil works cost
  const civilWorksCost = items
    .filter(i => i.materialCode.includes('CIVIL'))
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const engPercent = percentages?.engineeringPercent ?? 2.0;
  const contPercent = percentages?.contingencyPercent ?? 3.0;
  const deptPercent = percentages?.departmentalPercent ?? 5.0;
  const contOverheadPercent = percentages?.contractorPercent ?? 10.0;
  const taxPercent = percentages?.taxPercent ?? 0.0;
  const otherCharges = percentages?.otherChargesFixed ?? 0;

  // All percentage costs calculated directly on Material Cost from dropdown percentages
  const engineeringChargesAmount = Number((materialCost * (engPercent / 100)).toFixed(2));
  const contingencyAmount = Number((materialCost * (contPercent / 100)).toFixed(2));
  const departmentalOverheadAmount = Number((materialCost * (deptPercent / 100)).toFixed(2));
  const contractorOverheadAmount = Number((materialCost * (contOverheadPercent / 100)).toFixed(2));
  const taxGstAmount = Number((materialCost * (taxPercent / 100)).toFixed(2));

  const totalOverheadsOnMaterial = Number((departmentalOverheadAmount + contractorOverheadAmount).toFixed(2));

  const subTotal = Number((materialCost + labourCost).toFixed(2));

  const rawGrandTotal = Number((
    materialCost + 
    labourCost + 
    transportationCost + 
    civilWorksCost + 
    engineeringChargesAmount + 
    contingencyAmount + 
    departmentalOverheadAmount + 
    contractorOverheadAmount + 
    taxGstAmount + 
    otherCharges
  ).toFixed(2));

  const grandTotal = Number((rawGrandTotal + dismantleNetTotal).toFixed(2));
  const finalEstimatedCost = Number((grandTotal * 1.005).toFixed(2));

  const effectiveKm = Math.max(0.01, lineKm);
  const costPerKm = Math.round(grandTotal / effectiveKm);

  return {
    materialCost,
    labourPercent,
    labourCost,
    transportationCost,
    civilWorksCost,
    engineeringChargesPercent: engPercent,
    engineeringChargesAmount,
    contingencyPercent: contPercent,
    contingencyAmount,
    departmentalOverheadPercent: deptPercent,
    departmentalOverheadAmount,
    contractorOverheadPercent: contOverheadPercent,
    contractorOverheadAmount,
    taxGstPercent: taxPercent,
    taxGstAmount,
    otherChargesAmount: otherCharges,
    subTotal,
    grandTotal,
    finalEstimatedCost,
    costPerKm,
    overheadBasis: 'MATERIAL',
    totalOverheadsOnMaterial,
    dismantleMaterialCredit,
    dismantleLabourCost,
    dismantleNetTotal
  };
}

/**
 * Official WAPDA/PESCO 11-Digit Work Order Code References
 * Structure: [Circle 2D][Division 2D][Category/ELR 2D][FiscalYear 2D][Serial 3D] = 11 Digits
 */
export const WO_CIRCLE_CODES: Record<string, string> = {
  '26': 'Peshawar Circle (26)',
  '27': 'Khyber Circle (27)',
  '28': 'Mardan Circle (28)',
  '29': 'Swat Circle (29)',
  '30': 'Hazara-1 Circle (30)',
  '31': 'Bannu Circle (31)',
  '32': 'D.I. Khan Circle (32)'
};

export const WO_DIVISION_CODES: Record<string, string> = {
  '14': 'Peshawar Cantt Division (14)',
  '15': 'Peshawar City Division (15)',
  '16': 'Khyber Division (16)',
  '17': 'Charsadda Division (17)',
  '18': 'Nowshera Division (18)',
  '19': 'Mardan-1 Division (19)',
  '20': 'Swabi Division (20)'
};

export const WO_SCHEME_CATEGORIES: Record<string, { name: string; prefix: string; head: string }> = {
  '71': { name: 'ELR - Energy Loss Reduction Scheme', prefix: 'ELR', head: '4-71 ELR Capital Loss Reduction' },
  '72': { name: 'DOP - Distribution Optimization Program', prefix: 'DOP', head: '4-72 DOP Network Optimization' },
  '73': { name: 'SDI - System Deposit Improvement Scheme', prefix: 'SDI', head: '4-73 SDI Deposit Works' },
  '74': { name: 'LE - HT/LT Line Extension (Capital Works)', prefix: 'LE', head: '4-74 HT/LT Line Extension' },
  '75': { name: 'TRF - Transformer Augmentation & Relief', prefix: 'TRF', head: '4-75 Substation/Trf Augmentation' },
  '76': { name: 'VE - Village Electrification Scheme', prefix: 'VE', head: '4-76 Village Electrification' },
  '77': { name: 'REHAB - Conductor & Line Rehabilitation', prefix: 'REHAB', head: '4-77 System Rehabilitation' }
};

/**
 * Generate 11-Digit WAPDA/DISCO Work Order Number (e.g., '26147126042')
 */
export function generate11DigitWorkOrder(options?: {
  circleCode?: string;
  divisionCode?: string;
  categoryCode?: string;
  fiscalYear?: string;
  serialNo?: string | number;
}): string {
  const circle = (options?.circleCode || '26').padStart(2, '0').slice(-2);
  const division = (options?.divisionCode || '14').padStart(2, '0').slice(-2);
  const category = (options?.categoryCode || '71').padStart(2, '0').slice(-2); // default 71 = ELR
  
  // Fiscal Year 2 digits (e.g. 2026 -> 26)
  const currentYear = new Date().getFullYear();
  const defaultFy = String(currentYear).slice(-2);
  const fy = (options?.fiscalYear || defaultFy).padStart(2, '0').slice(-2);
  
  // 3-digit sequential number
  const defaultSerial = Math.floor(10 + Math.random() * 900);
  const serial = String(options?.serialNo ?? defaultSerial).padStart(3, '0').slice(-3);
  
  return `${circle}${division}${category}${fy}${serial}`;
}

/**
 * Format 11-Digit Work Order into standardized hyphenated format: CC-DD-KK-YY-SSS
 */
export function format11DigitWorkOrder(wo?: string): string {
  if (!wo) return '';
  const digits = wo.replace(/\D/g, '');
  if (digits.length !== 11) return wo;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 11)}`;
}

/**
 * Parse and validate 11-Digit Work Order breakdown
 */
export function parse11DigitWorkOrder(wo?: string) {
  const digits = (wo || '').replace(/\D/g, '');
  const isValid = digits.length === 11;
  
  if (!isValid) {
    return {
      isValid: false,
      raw: wo || '',
      digits,
      formatted: wo || '',
      circleCode: '',
      circleName: 'Unknown Circle',
      divisionCode: '',
      divisionName: 'Unknown Division',
      categoryCode: '',
      categoryName: 'Standard Works',
      categoryPrefix: 'GEN',
      headOfAccount: '',
      fiscalYear: '',
      serialNo: '',
      elrCode: ''
    };
  }

  const circleCode = digits.slice(0, 2);
  const divisionCode = digits.slice(2, 4);
  const categoryCode = digits.slice(4, 6);
  const fiscalYear = digits.slice(6, 8);
  const serialNo = digits.slice(8, 11);

  const categoryMeta = WO_SCHEME_CATEGORIES[categoryCode] || {
    name: 'General Line Scheme',
    prefix: 'GEN',
    head: '4-74 General Line Works'
  };

  const circleName = WO_CIRCLE_CODES[circleCode] || `Circle ${circleCode}`;
  const divisionName = WO_DIVISION_CODES[divisionCode] || `Division ${divisionCode}`;
  const formatted = `${circleCode}-${divisionCode}-${categoryCode}-${fiscalYear}-${serialNo}`;
  const elrCode = `${categoryMeta.prefix}-${categoryCode}-${fiscalYear}-${serialNo}`;

  return {
    isValid: true,
    raw: wo || '',
    digits,
    formatted,
    circleCode,
    circleName,
    divisionCode,
    divisionName,
    categoryCode,
    categoryName: categoryMeta.name,
    categoryPrefix: categoryMeta.prefix,
    headOfAccount: categoryMeta.head,
    fiscalYear: `20${fiscalYear}`,
    fiscalYearShort: fiscalYear,
    serialNo,
    elrCode
  };
}

/**
 * Generate formatted official Estimate number
 */
export function generateEstimateNumber(divisionCode: string = 'PESH'): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EST-${divisionCode.toUpperCase()}-${year}-${rand}`;
}

/**
 * Export full estimate workbook to multi-sheet Excel file (.xlsx)
 */
export function exportEstimateToExcelWorkbook(estimate: CostEstimateRecord): void {
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryData = [
    ['FLADIX, FEEDER LOSS ANALYSIS AND DATA INDEXING'],
    ['PESHAWAR ELECTRIC SUPPLY COMPANY (PESCO) · WAPDA'],
    ['DETAILED ELECTRICAL LINE ESTIMATE & BOQ SUMMARY'],
    [],
    ['Estimate Number:', estimate.projectInfo.estimateNo, 'Revision No:', estimate.projectInfo.revisionNo],
    ['11-Digit Work Order:', estimate.projectInfo.workOrderNo || '26147126042', 'ELR Scheme Code:', estimate.projectInfo.elrCode || 'ELR-71-26-042'],
    ['Head of Account:', estimate.projectInfo.accountHead || '4-71 ELR Capital Loss Reduction', 'Scheme Category:', estimate.projectInfo.schemeCategory || 'ELR'],
    ['Date:', estimate.projectInfo.estimateDate, 'Status:', estimate.status],
    ['Division:', estimate.projectInfo.division, 'Sub-Division:', estimate.projectInfo.subDivision],
    ['Circle:', estimate.projectInfo.circle, 'District:', estimate.projectInfo.district],
    ['Feeder Name:', estimate.projectInfo.feederName, 'Feeder Code:', estimate.projectInfo.feederCode],
    ['Location:', estimate.projectInfo.proposedLocation, 'Village/Locality:', estimate.projectInfo.villageLocality],
    ['GPS Coordinates:', `${estimate.projectInfo.gpsLatitude}, ${estimate.projectInfo.gpsLongitude}`],
    ['Applicant / Department:', estimate.projectInfo.applicantDepartment],
    ['Scheme / Project Name:', estimate.projectInfo.schemeProjectName],
    ['Purpose of Work:', estimate.projectInfo.purposeOfWork],
    ['Prepared By:', `${estimate.projectInfo.preparedBy} (${estimate.projectInfo.designation})`],
    ['Checked By:', estimate.projectInfo.checkedBy || 'SDO / XEN'],
    ['Approved By:', estimate.projectInfo.approvedBy || 'XEN / SE PESCO'],
    [],
    ['TECHNICAL LINE PARAMETERS'],
    ['HT Line Length (km):', estimate.lineDetails.htLengthKm, 'LT Line Length (km):', estimate.lineDetails.ltLengthKm],
    ['HT Poles:', estimate.lineDetails.htPoles, 'LT Poles:', estimate.lineDetails.ltPoles],
    ['Stay Sets:', estimate.lineDetails.staySets, 'Road Crossings:', estimate.lineDetails.roadCrossings],
    ['Transformer Structures:', estimate.lineDetails.transformerStructures, 'Transformer Capacity:', `${estimate.lineDetails.transformerCapacityKva} kVA`],
    [],
    ['ESTIMATE COST BREAKDOWN', 'AMOUNT (PKR)'],
    ['Material Cost', estimate.charges.materialCost],
    [`Labour / Erection Cost (${estimate.charges.labourPercent ?? 10}% on Material Cost)`, estimate.charges.labourCost],
    [`Engineering Charges (${estimate.charges.engineeringChargesPercent}% on Material Cost)`, estimate.charges.engineeringChargesAmount],
    [`Contingency Allowance (${estimate.charges.contingencyPercent}% on Material Cost)`, estimate.charges.contingencyAmount],
    [`Departmental Overhead (${estimate.charges.departmentalOverheadPercent}% on Material Cost)`, estimate.charges.departmentalOverheadAmount],
    [`Contractor Overhead (${estimate.charges.contractorOverheadPercent}% on Material Cost)`, estimate.charges.contractorOverheadAmount],
    [`Taxes / GST (${estimate.charges.taxGstPercent}% on Material Cost)`, estimate.charges.taxGstAmount],
    ['Transportation & Handling Charges', estimate.charges.transportationCost],
    ['Civil Works & Foundation Works', estimate.charges.civilWorksCost],
    ['Other Applicable Charges', estimate.charges.otherChargesAmount],
    ['----------------------------------------', '---------------------'],
    ['NET / GRAND TOTAL ESTIMATE COST (PKR)', estimate.charges.grandTotal],
    ['Total Project Line Length (km)', (estimate.lineDetails.htLengthKm + estimate.lineDetails.ltLengthKm).toFixed(2)],
    ['COST PER KILOMETER (PKR / km)', estimate.charges.costPerKm]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Estimate Summary');

  // 2. Detailed BOQ Sheet
  const boqHeaders = [
    'Sr No', 'Material Code', 'Description', 'Specification', 'Unit', 
    'Quantity', 'Unit Rate (PKR)', 'Material Amount (PKR)', 'Remarks'
  ];
  const boqRows = estimate.items.map((item, idx) => [
    idx + 1,
    item.materialCode,
    item.description,
    item.specification,
    item.unit,
    item.quantity,
    item.unitRate,
    item.materialAmount,
    item.remarks || item.calculationNotes || ''
  ]);
  // Add Total Row
  boqRows.push([
    '', 'TOTAL', '', '', '', 
    '', '', estimate.charges.materialCost, ''
  ]);
  const wsBoq = XLSX.utils.aoa_to_sheet([boqHeaders, ...boqRows]);
  XLSX.utils.book_append_sheet(wb, wsBoq, 'Detailed BOQ');

  // 3. Calculation Steps Sheet
  if (estimate.calculationSteps && estimate.calculationSteps.length > 0) {
    const calcHeaders = ['Sr No', 'Component', 'Material Parameter', 'Engineering Formula', 'Detailed Calculation', 'Calculated Quantity', 'Unit', 'Standard Notes'];
    const calcRows = estimate.calculationSteps.map((step, idx) => [
      idx + 1,
      step.component,
      step.parameter,
      step.formula,
      step.calculation,
      step.resultQuantity,
      step.unit,
      step.notes || ''
    ]);
    const wsCalc = XLSX.utils.aoa_to_sheet([calcHeaders, ...calcRows]);
    XLSX.utils.book_append_sheet(wb, wsCalc, 'Calculation Transparency');
  }

  // Write file
  const fileName = `${estimate.projectInfo.estimateNo}_${estimate.projectInfo.revisionNo}_Cost_Estimate.xlsx`;
  XLSX.writeFile(wb, fileName);
}
