/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FeederCategory = 'LV' | 'HV';
export type FeederType = 'LT' | 'HT' | 'LV' | 'HV';

export type JobTitle = string;

export interface JobTitleOption {
  code: string;
  shortLabel: string;
  fullTitle: string;
  roleDescription: string;
  department: string;
}

export const PRESET_JOB_TITLES: string[] = [
  'Sub-Divisional Officer (SDO)',
  'Executive Engineer (XEN)',
  'Superintending Engineer (SE)',
  'Chief Engineer (CE)',
  'Planning & Design Engineer (ELR)',
  'Assistant Manager (Operations)',
  'Line Superintendent (LS-1)',
  'Line Superintendent (LS-2)',
  'Junior Engineer (JE)',
  'Distribution Feeder Incharge',
  'Energy Loss Reduction (ELR) Officer',
  'Power Distribution Consultant'
];

export const JOB_TITLE_OPTIONS: JobTitleOption[] = [
  {
    code: 'SDO',
    shortLabel: 'SDO',
    fullTitle: 'Sub-Divisional Officer (SDO)',
    roleDescription: 'Assistant Manager (Operations) & Field Feeder Incharge',
    department: 'Operation Sub-Division'
  },
  {
    code: 'XEN',
    shortLabel: 'XEN',
    fullTitle: 'Executive Engineer (XEN)',
    roleDescription: 'Deputy Manager (Operations) & Division Head',
    department: 'Operation Division'
  },
  {
    code: 'SE',
    shortLabel: 'SE',
    fullTitle: 'Superintending Engineer (SE)',
    roleDescription: 'Manager (Planning, Design & ELR Directorate)',
    department: 'Circle Office & ELR Directorate'
  },
  {
    code: 'CE',
    shortLabel: 'Chief Engineer',
    fullTitle: 'Chief Engineer (CE)',
    roleDescription: 'General Manager (Operations & Technical Planning)',
    department: 'DISCO Headquarters'
  },
  {
    code: 'PLANNING',
    shortLabel: 'Planning Engr',
    fullTitle: 'Planning & Design Engineer',
    roleDescription: 'Energy Loss Reduction (ELR) Specialist',
    department: 'Planning & Engineering Directorate'
  },
  {
    code: 'LS',
    shortLabel: 'Line Supt (LS-1)',
    fullTitle: 'Line Superintendent (LS-1 / LS-2)',
    roleDescription: 'Feeder Inspection & Network Maintenance Supervisor',
    department: 'Distribution Field Crew'
  },
  {
    code: 'JE',
    shortLabel: 'Junior Engr (JE)',
    fullTitle: 'Junior Engineer (JE)',
    roleDescription: 'Distribution Network Field Engineer',
    department: 'Sub-Division Engineering'
  },
  {
    code: 'CONSULTANT',
    shortLabel: 'Consultant',
    fullTitle: 'Power Distribution Consultant',
    roleDescription: 'Independent Loss Reduction & Grid Auditor',
    department: 'External Technical Advisory'
  }
];

export interface Conductor {
  code: string;
  name: string;
  resistancePerKm: number; // Ohms/km at 50/75°C
  reactancePerKm: number;  // Ohms/km at 50Hz
  ampacity: number;        // Maximum continuous current in Amperes
  type: 'ACSR' | 'COPPER' | 'PVC_ALUM' | 'ABC';
  description: string;
}

export interface TransformerSpec {
  capacityKva: number;
  primaryVoltageKv: number;
  secondaryVoltageKv: number;
  ironLossKw: number;      // No-load losses
  copperLossKw: number;    // Full-load copper loss
  impedancePercent: number;
}

export interface FeederNode {
  id: string;              // e.g. "0.0", "1.0", "2.0"
  label: string;           // Display name e.g. "Node 0 (Transformer)", "Pole 1"
  poleNumber?: string;
  threePhaseCustomers: number;
  singlePhaseCustomers: number;
  spotLoadAmps?: number;
  spotLoadKva?: number;
  spotLoadPowerFactor?: number;
  spotLoadVoltage?: number;
  capacitorKvar?: number;  // Shunt capacitor installed at this node
  isTransformerNode?: boolean;
  x?: number;              // Diagram visual layout coordinate
  y?: number;
}

export interface FeederSegment {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  lengthKm: number;        // Length in kilometers
  conductorCode: string;
  proposedConductorCode?: string; // For what-if reconductoring
}

export interface BifurcationConfig {
  enabled: boolean;
  bifurcationNodeId: string;           // The node where cut-off / line split occurs
  transformerNodeId?: string;          // Independent node where proposed transformer T-2 is placed
  transformerCapacityKva: number;      // Rating of newly installed transformer (e.g. 50, 100, 200 kVA)
  mode: 'ADDITIONAL_TRANSFORMER' | 'EXPRESS_FEEDER';
  name?: string;
}

export interface SegmentAnalysisResult {
  segment: FeederSegment;
  fromNodeId: string;
  toNodeId: string;
  lengthKm: number;
  lengthMeters: number;
  threePhaseCustomers: number;
  singlePhaseCustomers: number;
  toNodeKva?: number;       // Direct Node KVA connected at To Node (for HT Line Analysis)
  conductor: Conductor;
  currentAmps: number;
  percentLoading: number;  // Current / Conductor Ampacity * 100
  voltDropVolts: number;
  percentVoltDrop: number; // Cumulative voltage drop % from source
  cumulativeVoltDropVolts: number;
  receivingVoltage: number;
  lineLossKw: number;
  powerFactor: number;
  downstreamKva: number;
  downstreamKw: number;
  downstreamKvar: number;
  isHighLoss: boolean;
  isHighDrop: boolean;
  isBifurcated?: boolean;  // Belongs to the bifurcated / additional transformer sub-network
  fedByTransformer?: 'T1' | 'T2';
}

export interface FeederAnalysisSummary {
  feederName: string;
  feederType: FeederType;
  baseVoltage: number;            // 400V for LT, 11000V for HT
  injectedVoltageAtNode0?: number; // Injected line voltage at Node 0 (e.g. 11000, 11200, 11500 V)
  totalNodeKva?: number;          // Total connected node load in kVA across all HT nodes
  loadPerSinglePhaseKva: number;  // e.g. 2.0 kVA
  operatingPowerFactor: number;   // e.g. 0.85
  loadFactor: number;             // e.g. 0.60
  lossLoadFactor: number;         // e.g. 0.408 (0.2*LF + 0.8*LF^2)
  annualGrowthRate: number;       // e.g. 0.05 (5%)
  
  // Transformer specs
  existingTransformerKva: number;
  proposedTransformerKva: number;
  
  // Results
  totalCircuitLengthKm: number;
  totalSinglePhaseCustomers: number;
  totalThreePhaseCustomers: number;
  totalSystemDemandKva: number;
  totalSystemDemandKw: number;
  totalSourceCurrentAmps: number;
  totalCapacitorKvar: number;
  
  // Transformer Loading
  existingTransformerLoadingPercent: number;
  proposedTransformerLoadingPercent: number;
  isTransformerOverloaded: boolean;

  // Bifurcation & Additional Transformer Details
  bifurcationActive?: boolean;
  bifurcationNodeId?: string;
  transformerNodeId?: string;
  additionalTransformerKva?: number;
  transformer1DemandKva?: number;
  transformer2DemandKva?: number;
  transformer1LoadingPercent?: number;
  transformer2LoadingPercent?: number;
  isTransformer1Overloaded?: boolean;
  isTransformer2Overloaded?: boolean;
  bifurcationReliefKva?: number;
  t1LineLossKw?: number;
  t2LineLossKw?: number;
  
  // Losses
  totalLineLossKw: number;
  transformationLossKw: number;
  totalPowerLossKw: number;
  percentPowerLoss: number;
  
  annualEnergyLossKwh: number;
  percentAnnualEnergyLoss: number;
  
  // Worst node drop
  worstVoltageDropPercent: number;
  worstVoltageDropNodeId: string;
  worstVoltageVolts: number;
  
  // Segment details
  segmentResults: SegmentAnalysisResult[];
}

export interface ForecastYearResult {
  year: number;
  demandKva: number;
  currentAmps: number;
  existingLoadingPercent: number;
  proposedLoadingPercent: number;
  lineLossesKw: number;
  totalPowerLossKw: number;
  annualEnergyLossKwh: number;
  percentPowerLoss: number;
  percentEnergyLoss: number;

  // Bifurcation T1 and T2 multi-year metrics
  bifurcationActive?: boolean;
  t1DemandKva?: number;
  t2DemandKva?: number;
  t1LoadingPercent?: number;
  t2LoadingPercent?: number;
  t1CurrentAmps?: number;
  t2CurrentAmps?: number;
  t1LineLossKw?: number;
  t2LineLossKw?: number;
}

export interface BifurcationZoneAnalysisStatement {
  transformerId: 'T1' | 'T2' | 'EXIST';
  lineLabel?: string;
  transformerName: string;
  year: 0 | 5;
  yearLabel: string;
  capacityKva: number;
  injectionNodeId: string;
  connected1PhCust: number;
  connected3PhCust: number;
  totalConnectedCust: number;
  zoneLengthKm: number;
  zoneLengthMeters: number;
  spansCount: number;
  demandKva: number;
  demandKw: number;
  currentAmps: number;
  powerFactor: number;
  transformerLoadingPercent: number;
  isOverloaded: boolean;
  worstVoltageDropPercent: number;
  worstVoltageDropNodeId: string;
  worstVoltageVolts: number;
  lineLossKw: number;
  transformationLossKw: number;
  totalPowerLossKw: number;
  percentPowerLoss: number;
  annualEnergyLossKwh: number;
  annualLossCostPkr: number;
  segmentResults: SegmentAnalysisResult[];
}

export interface BifurcationFourStatementDossier {
  isActive: boolean;
  bifurcationNodeId: string;
  transformerNodeId?: string;
  additionalTransformerKva: number;
  growthRatePercent: number;
  tariffPerKwh: number;
  
  // Exist Line Statements (Baseline Radial Feeder)
  existYear0: BifurcationZoneAnalysisStatement;
  existYear5: BifurcationZoneAnalysisStatement;

  // Proposed-1 Line Statements (Main Transformer T-1 Zone)
  t1Year0: BifurcationZoneAnalysisStatement;
  t1Year5: BifurcationZoneAnalysisStatement;

  // Proposed-2 Line Statements (Additional Transformer T-2 Zone)
  t2Year0: BifurcationZoneAnalysisStatement;
  t2Year5: BifurcationZoneAnalysisStatement;
  
  // Combined totals & Comparative Summary
  combinedYear0: {
    totalCapacityKva: number;
    totalDemandKva: number;
    totalDemandKw: number;
    totalLineLossKw: number;
    totalPowerLossKw: number;
    percentPowerLoss: number;
    annualEnergyLossKwh: number;
    annualLossCostPkr: number;
    worstVoltageVolts: number;
    worstVoltageDropPercent: number;
  };
  combinedYear5: {
    totalCapacityKva: number;
    totalDemandKva: number;
    totalDemandKw: number;
    totalLineLossKw: number;
    totalPowerLossKw: number;
    percentPowerLoss: number;
    annualEnergyLossKwh: number;
    annualLossCostPkr: number;
    worstVoltageVolts: number;
    worstVoltageDropPercent: number;
  };
  // Benefits vs baseline single line
  reliefBenefits: {
    t1ReliefKva: number;
    t1CurrentReliefAmps: number;
    lossReductionKwYear0: number;
    lossReductionKwYear5: number;
    annualEnergySavedKwhYear0: number;
    annualEnergySavedKwhYear5: number;
    annualFinancialSavingPkrYear0: number;
    annualFinancialSavingPkrYear5: number;
  };
}

export interface FeederData {
  id: string;
  name: string;
  description: string;
  type: FeederType;
  category?: FeederCategory;
  substationName: string;
  gridVoltageKv: number;
  nominalVoltage: number; // 400 for LT, 11000 for HT
  loadPerSinglePhaseCustomerKva: number;
  operatingPowerFactor: number;
  loadFactor: number;
  annualGrowthRatePercent: number;
  tariffPerKwh: number; // Currency per kWh for financial savings calculation
  currencySymbol: string; // e.g. "PKR" or "$"
  
  existingTransformerKva: number;
  proposedTransformerKva: number;
  
  nodes: FeederNode[];
  segments: FeederSegment[];
}
