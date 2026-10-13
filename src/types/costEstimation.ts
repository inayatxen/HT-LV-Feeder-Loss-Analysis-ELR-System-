/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EstimateType = 
  | 'LT_LINE_EXTENSION'
  | 'HT_LINE_EXTENSION'
  | 'HT_LINE_TO_DT'
  | 'LT_LINE_FROM_DT'
  | 'NEW_DISTRIBUTION_TRANSFORMER'
  | 'TRANSFORMER_AUGMENTATION'
  | 'COMPLETE_HT_FEEDER'
  | 'COMBINED_HT_LT'
  | 'OTHER';

export type EstimateStatus = 
  | 'DRAFT'
  | 'PREPARED'
  | 'CHECKED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED';

export type UserRole = 'SDO' | 'XEN' | 'SE' | 'ADMIN';

export type MaterialCategory = 
  | 'POLES'
  | 'CONDUCTORS'
  | 'INSULATORS'
  | 'HARDWARE'
  | 'TRANSFORMERS'
  | 'OTHER';

export type VoltageApplicability = 'HT' | 'LT' | 'BOTH';

export interface RateHistoryEntry {
  id: string;
  rate: number;
  labourRate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  approvedBy: string;
  remarks?: string;
}

export interface MaterialItem {
  id: string;
  code: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  specification: string;
  voltageApplicability: VoltageApplicability;
  defaultQtyFactor: number;
  materialRate: number;
  labourRate: number;
  installationRate: number;
  transportationRate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  rateHistory?: RateHistoryEntry[];
}

export interface EstimateLineDetails {
  htLengthKm: number;
  ltLengthKm: number;
  htPoles: number;
  ltPoles: number;
  staySets: number;
  roadCrossings: number;
  canalCrossings: number;
  transformerStructures: number;
  transformerCount: number;
  transformerCapacityKva: number;
  circuitsCount: number;
  conductorType: string;
  conductorSize: string;
  poleType: string;
  poleHeightMeters: number;
  insulatorType: string;
  // Bifurcation & Cut-Off Point Configuration for existing vs remaining lines
  bifurcationEnabled?: boolean;
  cutOffPoleNo?: string;
  existingPortionKm?: number;
  remainingPortionKm?: number;
  bifurcationType?: 'tee_off' | 'section_split' | 'tap_off' | 'spur_line';
  // HT Extension for proposed transformer & 11kV Feeder Line Assemblies
  htExtensionMeters?: number;
  htExtensionConductorType?: string;
  htExtensionSpanMeters?: number;
  htExtensionPoleType?: 'PC_SPUN_36FT' | 'STEEL_LATTICE_34_8FT';
  htExtensionConductorLengthKm?: number;
  htExtensionIncludeCutouts?: boolean;
  htExtensionIncludeLightningArresters?: boolean;
  htExtensionIncludeStaySets?: boolean;
  htExtensionIncludeEarthing?: boolean;
  htExtensionIncludePgClamps?: boolean;
  htExtensionIncludeDangerPlates?: boolean;
  htExtensionMergeWithTransformer?: boolean;
  // LT Extension fields
  ltExtensionMeters?: number;
  ltExtensionPoleType?: string;
  ltExtensionSpanMeters?: number;
  ltExtensionConductorType?: string;
  ltExtensionConductorLengthKm?: number;
  ltExtensionIncludeCrossArms?: boolean;
  ltExtensionIncludeHardware?: boolean;
  ltExtensionIncludeStaySets?: boolean;
  ltExtensionIncludeEarthing?: boolean;
  ltExtensionIncludeDangerPlates?: boolean;
  // 25 kVA, 50 kVA, 100 kVA & 200 kVA Transformer Lump Sum Package Flags & 1KM HT Line Package Flags
  is25KvaLumpSumPackage?: boolean;
  is50KvaLumpSumPackage?: boolean;
  is100KvaLumpSumPackage?: boolean;
  is200KvaLumpSumPackage?: boolean;
  is1KmHtDogHTypePackage?: boolean;
  foundationEnabled?: boolean;
  // Tracking whether values were auto-calculated or manually overridden
  autoCalculatedFlags?: Record<string, boolean>;
}

export interface CalculationStep {
  component: string;
  parameter: string;
  formula: string;
  calculation: string;
  resultQuantity: number;
  unit: string;
  notes?: string;
}

export interface EstimateItem {
  id: string;
  materialId: string;
  materialCode: string;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  unitRate: number;
  materialAmount: number;
  labourRate: number;
  labourAmount: number;
  transportRate?: number;
  transportAmount?: number;
  totalAmount: number;
  isAutoCalculated?: boolean;
  manualOverride?: boolean;
  calculationNotes?: string;
  remarks?: string;
  isDismantled?: boolean;
}

export interface EstimateCharges {
  materialCost: number;
  labourPercent?: number;
  labourCost: number;
  transportationCost: number;
  civilWorksCost: number;
  engineeringChargesPercent: number;
  engineeringChargesAmount: number;
  contingencyPercent: number;
  contingencyAmount: number;
  departmentalOverheadPercent: number;
  departmentalOverheadAmount: number;
  contractorOverheadPercent: number;
  contractorOverheadAmount: number;
  taxGstPercent: number;
  taxGstAmount: number;
  otherChargesAmount: number;
  subTotal: number;
  grandTotal: number;
  finalEstimatedCost?: number;
  costPerKm: number;
  overheadBasis?: 'MATERIAL' | 'PRIME_COST';
  totalOverheadsOnMaterial?: number;
  dismantleMaterialCredit?: number;
  dismantleLabourCost?: number;
  dismantleNetTotal?: number;
}

export interface EstimateProjectInfo {
  estimateNo: string;
  revisionNo: string;
  estimateDate: string;
  workOrderNo?: string;        // 11-digit WAPDA/DISCO Work Order Number (e.g. '26147126042' or '26-14-71-26-042')
  schemeCategory?: string;     // 'ELR' | 'DOP' | 'LINE_EXTENSION' | 'SDI' | 'REHABILITATION' | 'DEPOSIT'
  elrCode?: string;            // ELR Scheme reference code (e.g. 'ELR-71-26-042')
  accountHead?: string;        // Head of Account (e.g. 'ELR-71 Capital Account / Loss Reduction')
  division: string;
  subDivision: string;
  circle: string;
  district: string;
  feederName: string;
  feederCode: string;
  proposedLocation: string;
  villageLocality: string;
  gpsLatitude: string;
  gpsLongitude: string;
  applicantDepartment: string;
  schemeProjectName: string;
  purposeOfWork: string;
  preparedBy: string;
  designation: string;
  checkedBy?: string;
  approvedBy?: string;
}

export interface EstimateAuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  remarks?: string;
}

export interface DesignFactorsConfig {
  htPoleSpacingMeters: number;       // standard: 100m
  ltPoleSpacingMeters: number;       // standard: 45m
  conductorSagWastagePercent: number;// standard: 3%
  terminalPolesPerLine: number;      // standard: 2
  pinInsulatorsPerHtPole: number;    // standard: 3
  discInsulatorsPerTerminalPole: number; // standard: 3
  staySetsPerKm: number;             // standard: 3
  terminalStaySets: number;          // standard: 4
  earthingIntervalPoles: number;     // standard: every 5 poles
  dangerPlatesPerPole: number;       // standard: 1
  crossArmsPerHtPole: number;        // standard: 1
  transportRatePerKmDefault: number; // Rs. / km
}

export interface ConstructionTemplate {
  id: string;
  name: string;
  type: EstimateType;
  description: string;
  standardConductorCode: string;
  standardPoleCode: string;
  defaultTransformerKva?: number;
  defaultAdditionalPercentages?: {
    labourPercent?: number;
    engineeringPercent: number;
    contingencyPercent: number;
    departmentalPercent: number;
    contractorPercent: number;
    taxPercent: number;
  };
}

export interface CostEstimateRecord {
  id: string;
  projectInfo: EstimateProjectInfo;
  type: EstimateType;
  status: EstimateStatus;
  lineDetails: EstimateLineDetails;
  items: EstimateItem[];
  charges: EstimateCharges;
  dismantledItems?: EstimateItem[];
  dismantledCharges?: EstimateCharges;
  calculationSteps?: CalculationStep[];
  auditTrail: EstimateAuditLog[];
  transportationSettings?: {
    method: 'FIXED' | 'PER_KM' | 'PERCENT_OF_MATERIAL';
    distanceKm: number;
    ratePerKm: number;
    loadingUnloadingFixed: number;
    vehicleType: string;
  };
  createdAt: string;
  updatedAt: string;
  previousRevisions?: CostEstimateRecord[];
}
