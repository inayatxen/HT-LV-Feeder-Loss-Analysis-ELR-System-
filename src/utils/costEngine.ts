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
  LUMP_SUM_200KVA_TOTALS
} from '../data/materialMaster';
import * as XLSX from 'xlsx';

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

      steps.push({
        component: '200 KVA Distribution Transformer Sub-Station',
        parameter: 'Official WAPDA / PESCO Lump Sum Material Schedule',
        formula: 'Lump Sum Materials (Rs. 1,981,233.97) + 10% Labour Cost (Rs. 198,123.40) + 16% Over Heads on Material Cost (Rs. 316,997.44)',
        calculation: `WAPDA CSR Schedule Items: Material = Rs. 1,981,233.97, Labour (10%) = Rs. 198,123.40, Over Heads (16% on Material) = Rs. 316,997.44. Net Cost = Rs. 2,496,354.81`,
        resultQuantity: count,
        unit: 'Job / Set',
        notes: 'Includes 200 KVA Copper Transformer Sub-Station installation with WASP and ANT conductors, PCC Poles, Cross Arms, Drop Out Cut Outs, and Platform.'
      });

      LUMP_SUM_200KVA_TRANSFORMER_ITEMS.forEach(lsItem => {
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
          calculationNotes: `200 kVA Transformer Installation Schedule item: 10% Labour Cost applied`
        });
      });
    } else if (targetKva === 100 || details.is100KvaLumpSumPackage || is100Kva) {
      // -------------------------------------------------------------
      // OFFICIAL 20-ITEM WAPDA / PESCO LUMP SUM MATERIAL SCHEDULE: 100 KVA TRANSFORMER
      // Total Material: Rs. 851,227.21 | 10% Labour: Rs. 85,122.72 | 16% Over Heads on Material: Rs. 136,196.35
      // Net Cost: Rs. 1,072,546.28
      // -------------------------------------------------------------
      itemMap.delete('15310');
      itemMap.delete('mat-code-15310');
      itemMap.delete('HW-STAY-SET');
      itemMap.delete('mat-hw-stay-set');

      if (htKm === 0 && ltKm === 0) {
        itemMap.clear();
      }

      steps.push({
        component: '100 KVA Distribution Transformer Sub-Station',
        parameter: '20-Item Official WAPDA / PESCO Lump Sum Material Schedule',
        formula: 'Lump Sum Materials (Rs. 851,227.21) + 10% Labour Cost (Rs. 85,122.72) + 16% Over Heads on Material Cost (Rs. 136,196.35)',
        calculation: `20 WAPDA CSR Schedule Items: Material = Rs. 851,227.21 (Transformer 100 kVA Code 08130 @ Rs. 631,000), Labour (10%) = Rs. 85,122.72, Over Heads (16% on Material) = Rs. 136,196.35. Net Cost = Rs. 1,072,546.28`,
        resultQuantity: count,
        unit: 'Job / Set',
        notes: 'Includes 100 KVA Copper Transformer (08130 @ Rs. 631,000), 11kV Drop Out Cut Outs (13311), Double Structure Platform (10720), 11kV Lattice Cross Arms (06250), LT Spool & 11kV Pin Insulators, Earthing Unit, Wasp Conductor, Rabbit Conductor, L Type Lattice Steel Structure (01220), Fuse Links & Fasteners (Stay Rods 15310 excluded).'
      });

      LUMP_SUM_100KVA_TRANSFORMER_ITEMS.forEach(lsItem => {
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
          calculationNotes: `100 kVA Transformer Installation Schedule item: 10% Labour Cost applied`
        });
      });
    } else if (targetKva === 50 || details.is50KvaLumpSumPackage || is50Kva) {
      // -------------------------------------------------------------
      // OFFICIAL 18-ITEM WAPDA / PESCO LUMP SUM MATERIAL SCHEDULE: 50 KVA TRANSFORMER
      // Total Material: Rs. 571,542.07 | 10% Labour: Rs. 57,154.21 | 16% Over Heads on Material: Rs. 91,446.73
      // Net Cost: Rs. 720,143.01
      // -------------------------------------------------------------
      itemMap.delete('15310');
      itemMap.delete('mat-code-15310');
      itemMap.delete('HW-STAY-SET');
      itemMap.delete('mat-hw-stay-set');

      if (htKm === 0 && ltKm === 0) {
        itemMap.clear();
      }

      steps.push({
        component: '50 KVA Distribution Transformer Sub-Station',
        parameter: '18-Item Official WAPDA / PESCO Lump Sum Material Schedule',
        formula: 'Lump Sum Materials (Rs. 571,542.07) + 10% Labour Cost (Rs. 57,154.21) + 16% Over Heads on Material Cost (Rs. 91,446.73)',
        calculation: `18 WAPDA CSR Schedule Items: Material = Rs. 571,542.07 (Transformer 50 kVA Code 08120 @ Rs. 434,200), Labour (10%) = Rs. 57,154.21, Over Heads (16% on Material) = Rs. 91,446.73. Net Cost = Rs. 720,143.01`,
        resultQuantity: count,
        unit: 'Job / Set',
        notes: 'Includes 50 KVA Copper Transformer (08120 @ Rs. 434,200), 11kV Drop Out Cut Outs (13311), Single Structure Platform (10710), 11kV Lattice Cross Arm (06250), LT Spool & 11kV Pin Insulators, Earthing Unit, LT 4-Core Cable, PG Connectors, Fuse Links & Fasteners (Stay Rods 15310 excluded).'
      });

      LUMP_SUM_50KVA_TRANSFORMER_ITEMS.forEach(lsItem => {
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
          calculationNotes: `50 kVA Transformer Installation Schedule item: 10% Labour Cost applied`
        });
      });
    } else if (targetKva === 25 || details.is25KvaLumpSumPackage || is25Kva) {
      // -------------------------------------------------------------
      // OFFICIAL 18-ITEM WAPDA / PESCO LUMP SUM MATERIAL SCHEDULE: 25 KVA TRANSFORMER
      // Total Material: Rs. 447,128.07 | 10% Labour: Rs. 44,712.81 | 16% Over Heads on Material: Rs. 71,540.49
      // Net Cost: Rs. 563,381.37
      // -------------------------------------------------------------
      // Exclude Stay Rod 15310 from 25 kVA Transformer Installation BOQ
      itemMap.delete('15310');
      itemMap.delete('mat-code-15310');
      itemMap.delete('HW-STAY-SET');
      itemMap.delete('mat-hw-stay-set');

      if (htKm === 0 && ltKm === 0) {
        // Pure transformer installation package contains ONLY the official 18 items
        itemMap.clear();
      }

      steps.push({
        component: '25 KVA Distribution Transformer Sub-Station',
        parameter: '18-Item Official WAPDA / PESCO Lump Sum Material Schedule',
        formula: 'Lump Sum Materials (Rs. 447,128.07) + 10% Labour Cost (Rs. 44,712.81) + 16% Over Heads on Material Cost (Rs. 71,540.49)',
        calculation: `18 WAPDA CSR Schedule Items: Material = Rs. 447,128.07, Labour (10%) = Rs. 44,712.81, Over Heads (16% on Material) = Rs. 71,540.49. Net Cost = Rs. 563,381.37`,
        resultQuantity: count,
        unit: 'Job / Set',
        notes: 'Includes 25 KVA Copper Transformer (08110), 11kV Drop Out Cut Outs (13311), Single Structure Platform (10710), 11kV Lattice Cross Arm (06250), LT Spool & 11kV Pin Insulators, Earthing Unit, LT 4-Core Cable, PG Connectors, Fuse Links & Fasteners (Stay Rods 15310 excluded).'
      });

      LUMP_SUM_25KVA_TRANSFORMER_ITEMS.forEach(lsItem => {
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
          calculationNotes: `25 kVA Transformer Installation Schedule item: 10% Labour Cost applied`
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
    finalItems = finalItems.filter(item => item.materialCode !== '15310' && !item.description.toUpperCase().includes('STAY ROD'));
  }

  return {
    items: finalItems,
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
    engineeringPercent: number;
    contingencyPercent: number;
    departmentalPercent: number;
    contractorPercent: number;
    taxPercent: number;
    otherChargesFixed?: number;
    overheadBasis?: 'MATERIAL' | 'PRIME_COST';
  }
): EstimateCharges {
  const materialCost = Number(items.reduce((sum, item) => sum + (Number(item.materialAmount) || 0), 0).toFixed(2));
  const labourCost = Number(items.reduce((sum, item) => sum + (Number(item.labourAmount) || 0), 0).toFixed(2));

  // Detect whether this estimate is the 25 kVA, 50 kVA or 100 kVA Transformer lump sum package
  const isLumpSumPackage = Boolean(
    percentages?.overheadBasis === 'MATERIAL' ||
    (items.some(i => i.materialCode === '08110') && Math.abs(materialCost - LUMP_SUM_25KVA_TOTALS.materialCost) < 5) ||
    (items.some(i => i.materialCode === '08120') && Math.abs(materialCost - LUMP_SUM_50KVA_TOTALS.materialCost) < 5) ||
    (items.some(i => i.materialCode === '08130') && Math.abs(materialCost - LUMP_SUM_100KVA_TOTALS.materialCost) < 5)
  );

  const overheadBasis = isLumpSumPackage || percentages?.overheadBasis === 'MATERIAL' ? 'MATERIAL' : 'PRIME_COST';

  // Transportation Cost calculation
  let transportationCost = 0;
  if (isLumpSumPackage && (!transportSettings || transportSettings.loadingUnloadingFixed === 0)) {
    transportationCost = 0; // Pure lump sum package has transportation inclusive
  } else if (transportSettings) {
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

  const basePrimeCost = Number((materialCost + labourCost + transportationCost).toFixed(2));

  const engPercent = percentages?.engineeringPercent ?? (overheadBasis === 'MATERIAL' ? 0.0 : 2.0);
  const contPercent = percentages?.contingencyPercent ?? (overheadBasis === 'MATERIAL' ? 0.0 : 3.0);
  const deptPercent = percentages?.departmentalPercent ?? (overheadBasis === 'MATERIAL' ? 6.0 : 5.0);
  const contOverheadPercent = percentages?.contractorPercent ?? 10.0;
  const taxPercent = percentages?.taxPercent ?? 0.0;
  const otherCharges = percentages?.otherChargesFixed ?? 0;

  // Overhead calculation basis: on Material Cost for 25 kVA Lump Sum Package, or on Base Prime Cost for general line extensions
  const overheadBasisAmount = overheadBasis === 'MATERIAL' ? materialCost : basePrimeCost;

  const engineeringChargesAmount = Math.round((overheadBasis === 'MATERIAL' ? 0 : basePrimeCost) * (engPercent / 100));
  const contingencyAmount = Math.round((overheadBasis === 'MATERIAL' ? 0 : basePrimeCost) * (contPercent / 100));
  const departmentalOverheadAmount = Number((overheadBasisAmount * (deptPercent / 100)).toFixed(2));
  const contractorOverheadAmount = Number((overheadBasisAmount * (contOverheadPercent / 100)).toFixed(2));
  const taxGstAmount = Math.round((overheadBasis === 'MATERIAL' ? materialCost : basePrimeCost) * (taxPercent / 100));

  const totalOverheadsOnMaterial = overheadBasis === 'MATERIAL'
    ? Number((departmentalOverheadAmount + contractorOverheadAmount).toFixed(2))
    : undefined;

  const subTotal = overheadBasis === 'MATERIAL'
    ? Number((materialCost + labourCost).toFixed(2))
    : Number((basePrimeCost + engineeringChargesAmount + contingencyAmount).toFixed(2));

  const grandTotal = overheadBasis === 'MATERIAL'
    ? Number((materialCost + labourCost + departmentalOverheadAmount + contractorOverheadAmount + transportationCost + taxGstAmount + otherCharges).toFixed(2))
    : Number((subTotal + departmentalOverheadAmount + contractorOverheadAmount + taxGstAmount + otherCharges).toFixed(2));

  const effectiveKm = Math.max(0.01, lineKm);
  const costPerKm = Math.round(grandTotal / effectiveKm);

  return {
    materialCost,
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
    costPerKm,
    overheadBasis,
    totalOverheadsOnMaterial
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
    ['PESHAWAR ELECTRIC SUPPLY COMPANY (PESCO) · WAPDA'],
    ['DETAILED ELECTRICAL LINE ESTIMATE & BOQ SUMMARY'],
    [],
    ['Estimate Number:', estimate.projectInfo.estimateNo, 'Revision No:', estimate.projectInfo.revisionNo],
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
    [`Labour / Erection Cost ${estimate.charges.overheadBasis === 'MATERIAL' ? '(10% on Material Cost)' : ''}`, estimate.charges.labourCost],
    ...(estimate.charges.overheadBasis === 'MATERIAL' ? [
      [`Departmental Overhead (${estimate.charges.departmentalOverheadPercent}% on Material Cost)`, estimate.charges.departmentalOverheadAmount],
      [`Contractor Overhead (${estimate.charges.contractorOverheadPercent}% on Material Cost)`, estimate.charges.contractorOverheadAmount],
      [`Total Overheads (${estimate.charges.departmentalOverheadPercent + estimate.charges.contractorOverheadPercent}% on Material Cost)`, (estimate.charges.departmentalOverheadAmount + estimate.charges.contractorOverheadAmount)]
    ] : [
      ['Transportation & Handling Charges', estimate.charges.transportationCost],
      ['Civil Works & Foundation Works', estimate.charges.civilWorksCost],
      [`Engineering Charges (${estimate.charges.engineeringChargesPercent}%)`, estimate.charges.engineeringChargesAmount],
      [`Contingency Allowance (${estimate.charges.contingencyPercent}%)`, estimate.charges.contingencyAmount],
      [`Departmental Overhead (${estimate.charges.departmentalOverheadPercent}%)`, estimate.charges.departmentalOverheadAmount],
      [`Contractor Overhead (${estimate.charges.contractorOverheadPercent}%)`, estimate.charges.contractorOverheadAmount],
      [`Taxes / GST (${estimate.charges.taxGstPercent}%)`, estimate.charges.taxGstAmount],
      ['Other Applicable Charges', estimate.charges.otherChargesAmount]
    ]),
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
    'Quantity', 'Material Rate (PKR)', 'Material Amount (PKR)', 
    'Labour Rate (PKR)', 'Labour Amount (PKR)', 'Total Amount (PKR)', 'Remarks'
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
    item.labourRate,
    item.labourAmount,
    item.totalAmount,
    item.remarks || item.calculationNotes || ''
  ]);
  // Add Total Row
  boqRows.push([
    '', 'TOTAL', '', '', '', 
    '', '', estimate.charges.materialCost, 
    '', estimate.charges.labourCost, 
    estimate.charges.materialCost + estimate.charges.labourCost, ''
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
