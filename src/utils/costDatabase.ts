import { supabase } from '../lib/supabase';
import { FeederData } from '../types/feeder';
import { 
  CostEstimateRecord, 
  MaterialItem, 
  DesignFactorsConfig, 
  ConstructionTemplate,
  EstimateType
} from '../types/costEstimation';
import { 
  INITIAL_MATERIALS, 
  DEFAULT_DESIGN_FACTORS, 
  STANDARD_TEMPLATES 
} from '../data/materialMaster';
import { calculateQuantitiesForLine, computeEstimateCharges } from './costEngine';

const LOCAL_STORAGE_KEY_ESTIMATES = 'pesco_cost_db_estimates';
const LOCAL_STORAGE_KEY_MATERIALS = 'pesco_cost_db_materials';

const CostFallbackStorage = {
  getEstimates(): CostEstimateRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ESTIMATES);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage read estimates error:', e);
    }
    return [];
  },
  saveEstimates(estimates: CostEstimateRecord[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ESTIMATES, JSON.stringify(estimates));
    } catch (e) {
      console.warn('LocalStorage write estimates error:', e);
    }
  },
  getMaterials(): MaterialItem[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MATERIALS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage read materials error:', e);
    }
    return [];
  },
  saveMaterials(materials: MaterialItem[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_MATERIALS, JSON.stringify(materials));
    } catch (e) {
      console.warn('LocalStorage write materials error:', e);
    }
  }
};

export async function getAllMaterialsFromDb(): Promise<MaterialItem[]> {
  try {
    const { data, error } = await supabase.from('materials').select('*');
    if (!error && data && data.length > 0) {
      CostFallbackStorage.saveMaterials(data as MaterialItem[]);
      return data as MaterialItem[];
    }
  } catch (err) {
    console.warn('Supabase materials offline, using local fallback:', err);
  }
  const cached = CostFallbackStorage.getMaterials();
  return cached.length > 0 ? cached : INITIAL_MATERIALS;
}

export async function saveMaterialToDb(material: MaterialItem): Promise<void> {
  const current = CostFallbackStorage.getMaterials();
  const filtered = current.filter(m => m.id !== material.id && m.code !== material.code);
  filtered.push(material);
  CostFallbackStorage.saveMaterials(filtered);

  try {
    const { error } = await supabase.from('materials').upsert(material);
    if (error) {
      console.warn('Supabase material upsert warning:', error);
    }
  } catch (err) {
    console.warn('Supabase material upsert network error:', err);
  }
}

export async function getAllEstimatesFromDb(): Promise<CostEstimateRecord[]> {
  try {
    const { data, error } = await supabase.from('estimates').select('*');
    if (!error && data) {
      CostFallbackStorage.saveEstimates(data as unknown as CostEstimateRecord[]);
      return data as unknown as CostEstimateRecord[];
    }
  } catch (err) {
    console.warn('Supabase estimates offline, using local fallback:', err);
  }
  return CostFallbackStorage.getEstimates();
}

export async function saveEstimateToDb(estimate: CostEstimateRecord): Promise<void> {
  const cleanEstimate = {
    id: estimate.id,
    projectInfo: estimate.projectInfo,
    type: estimate.type,
    status: estimate.status,
    lineDetails: estimate.lineDetails,
    items: estimate.items,
    charges: estimate.charges
  };

  const current = CostFallbackStorage.getEstimates();
  const filtered = current.filter(e => e.id !== estimate.id);
  filtered.unshift(estimate);
  CostFallbackStorage.saveEstimates(filtered);

  try {
    const { error } = await supabase.from('estimates').upsert(cleanEstimate);
    if (error) {
      console.warn('Supabase estimate upsert warning:', error);
    }
  } catch (err) {
    console.warn('Supabase estimate upsert network error:', err);
  }
}

export async function deleteEstimateFromDb(id: string): Promise<void> {
  const current = CostFallbackStorage.getEstimates();
  CostFallbackStorage.saveEstimates(current.filter(e => e.id !== id));

  try {
    const { error } = await supabase.from('estimates').delete().eq('id', id);
    if (error) {
      console.warn('Supabase estimate delete warning:', error);
    }
  } catch (err) {
    console.warn('Supabase estimate delete network error:', err);
  }
}

export async function initCostDatabase(): Promise<{
  estimates: CostEstimateRecord[];
  materials: MaterialItem[];
  designFactors: DesignFactorsConfig;
  templates: ConstructionTemplate[];
}> {
  let materialsData = await getAllMaterialsFromDb();
  
  if (materialsData.length === 0) {
    for (const mat of INITIAL_MATERIALS) {
      await saveMaterialToDb(mat);
    }
    materialsData = INITIAL_MATERIALS;
  }
  
  const estimatesData = await getAllEstimatesFromDb();
  
  return {
    estimates: estimatesData,
    materials: materialsData,
    designFactors: DEFAULT_DESIGN_FACTORS,
    templates: STANDARD_TEMPLATES
  };
}

export async function saveDesignFactorsToDb(factors: DesignFactorsConfig): Promise<void> {
  // TODO: Implement Supabase for settings
}

export async function resetCostDbToDefaults(): Promise<{
  estimates: CostEstimateRecord[];
  materials: MaterialItem[];
  designFactors: DesignFactorsConfig;
  templates: ConstructionTemplate[];
}> {
  await supabase.from('materials').delete().neq('id', 'dummy_id_for_delete_all'); // Supabase doesn't support DELETE * directly easily without a filter, using a dummy filter or .select('*').delete()
  await supabase.from('estimates').delete().neq('id', 'dummy_id_for_delete_all');
  
  return initCostDatabase();
}

/**
 * Builds or synthesizes a linked Cost Estimate record for any given FeederData project.
 */
export function buildLinkedEstimateForFeeder(
  feeder: FeederData,
  materials: MaterialItem[],
  factors: DesignFactorsConfig
): CostEstimateRecord {
  // ... (implementation of buildLinkedEstimateForFeeder)
  const isHt = feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000;
  const totalLengthKm = feeder.segments.reduce((acc, s) => acc + s.lengthKm, 0);
  const totalPoles = feeder.nodes.length;
  
  // Calculate estimate type
  const estType: EstimateType = isHt ? 'HT_LINE_EXTENSION' : 'LT_LINE_EXTENSION';
  
  // Find standard conductor used most in this feeder
  const conductorUsage: Record<string, number> = {};
  feeder.segments.forEach(s => {
    conductorUsage[s.conductorCode] = (conductorUsage[s.conductorCode] || 0) + s.lengthKm;
  });
  let primaryConductor = isHt ? 'DOG' : 'ANT';
  let maxLen = 0;
  Object.entries(conductorUsage).forEach(([code, len]) => {
    if (len > maxLen) {
      maxLen = len;
      primaryConductor = code;
    }
  });

  const lineDetails: any = { // Keeping it simple for now
    htLengthKm: isHt ? Number(totalLengthKm.toFixed(3)) : 0,
    ltLengthKm: isHt ? 0 : Number(totalLengthKm.toFixed(3)),
    htPoles: isHt ? Math.max(2, totalPoles) : 0,
    ltPoles: isHt ? 0 : Math.max(2, totalPoles),
    staySets: Math.max(2, Math.round(totalLengthKm * (isHt ? factors.staySetsPerKm : 4))),
    roadCrossings: 0,
    canalCrossings: 0,
    transformerStructures: 1,
    transformerCount: 1,
    transformerCapacityKva: feeder.proposedTransformerKva || feeder.existingTransformerKva || (isHt ? 1200 : 100),
    circuitsCount: 1,
    conductorType: 'ACSR',
    conductorSize: primaryConductor.toUpperCase(),
    poleType: isHt ? 'PCC' : 'PCC',
    poleHeightMeters: isHt ? 11 : 9.5,
    insulatorType: 'PIN_DISC'
  };

  const calc = calculateQuantitiesForLine(estType, lineDetails, factors, materials);
  const charges = computeEstimateCharges(calc.items, totalLengthKm, {
    method: 'PER_KM',
    distanceKm: 20,
    ratePerKm: 180,
    loadingUnloadingFixed: 8000
  });

  const year = new Date().getFullYear();
  const wo = feeder.workOrderNo || '26147126042';

  return {
    id: feeder.linkedEstimateId || `est-elr-${feeder.id}`,
    projectInfo: {
      estimateNo: `EST-${feeder.id.slice(0, 4).toUpperCase()}-${year}-001`,
      revisionNo: 'Rev-00',
      estimateDate: new Date().toISOString().split('T')[0],
      workOrderNo: wo,
      schemeCategory: feeder.schemeCategory || 'ELR',
      elrCode: feeder.elrCode || `ELR-71-26-${feeder.id.slice(0, 3).toUpperCase()}`,
      accountHead: feeder.accountHead || '4-71 ELR Capital Loss Reduction',
      division: feeder.division || 'Peshawar Cantt Division',
      subDivision: feeder.subDivision || 'Gulbhar Sub-Division',
      circle: feeder.circle || 'Peshawar Circle-1',
      district: feeder.district || 'Peshawar',
      feederName: feeder.name,
      feederCode: `FDR-${feeder.id.slice(0, 4).toUpperCase()}-01`,
      proposedLocation: feeder.substationName || 'Peshawar Grid Site',
      villageLocality: feeder.villageLocality || feeder.name,
      gpsLatitude: '34.0151 N',
      gpsLongitude: '71.5249 E',
      applicantDepartment: feeder.applicantDepartment || 'PESCO Planning & Engineering (ELR Directorate)',
      schemeProjectName: feeder.schemeProjectName || `${feeder.name} - Loss Reduction & Line Cost Estimate`,
      purposeOfWork: feeder.purposeOfWork || `Comprehensive Energy Loss Reduction (ELR), network augmentation, and line cost estimation for ${feeder.name}.`,
      preparedBy: feeder.preparedBy || 'Engr. M. Inayat',
      designation: 'Sub-Divisional Officer (SDO)',
      checkedBy: feeder.checkedBy || 'Engr. Tariq Khan (XEN Peshawar)',
      approvedBy: feeder.approvedBy || 'Engr. Abdul Rehman (SE Circle-1)'
    },
    type: estType,
    status: 'APPROVED',
    lineDetails,
    items: calc.items,
    charges,
    calculationSteps: calc.steps,
    auditTrail: [
      {
        id: `aud-elr-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        user: feeder.preparedBy || 'Engr. M. Inayat',
        role: 'SDO',
        action: `Linked estimate created for unified project: ${feeder.name}`
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
