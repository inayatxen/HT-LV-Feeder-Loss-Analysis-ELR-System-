/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FeederData } from '../types/feeder';

export const GULBHAR_COLONY_LT_FEEDER: FeederData = {
  id: 'gulbhar-colony-peshawar',
  name: 'Gulbhar Colony Street LT Feeder (Peshawar)',
  description: 'Authentic 12-node Low Tension distribution feeder from WAPDA study by Mohsin Iqbal. Features 164 single-phase and 4 three-phase consumers supplied from a 100 kVA transformer.',
  type: 'LT',
  category: 'LV',
  substationName: 'Gulbhar 132/11 kV Grid Substation',
  gridVoltageKv: 11.0,
  nominalVoltage: 400,
  loadPerSinglePhaseCustomerKva: 2.0,
  operatingPowerFactor: 0.80,
  loadFactor: 0.60,
  annualGrowthRatePercent: 5.0,
  tariffPerKwh: 24.83, // Rupees per kWh (Official WAPDA/NEPRA rate)
  currencySymbol: 'Rupees',
  existingTransformerKva: 100,
  proposedTransformerKva: 200,

  // Unified Project & ELR Scheme Linking (11-Digit Work Order & Administrative Setup)
  workOrderNo: '26147126042',
  schemeCategory: 'ELR',
  elrCode: 'ELR-71-26-042',
  accountHead: '4-71 ELR Capital Loss Reduction',
  circle: 'Peshawar Circle-1',
  division: 'Peshawar Cantt Division',
  subDivision: 'Gulbhar Sub-Division',
  district: 'Peshawar',
  villageLocality: 'Gulbhar Peshawar',
  applicantDepartment: 'PESCO ELR & Operations Directorate',
  schemeProjectName: 'Gulbhar Colony LT Feeder Loss Reduction & Re-conductoring Scheme',
  purposeOfWork: 'Comprehensive Energy Loss Reduction (ELR), transformer augmentation, and LT line bifurcation in Gulbhar Colony.',
  preparedBy: 'Engr. M. Inayat',
  checkedBy: 'Engr. Tariq Khan (XEN Peshawar)',
  approvedBy: 'Engr. Abdul Rehman (SE Circle-1)',
  linkedEstimateId: 'est-elr-gulbhar-colony-peshawar',
  nodes: [
    { id: '0.0', label: 'Node 0 (100 kVA Transformer)', poleNumber: 'T-0', threePhaseCustomers: 0, singlePhaseCustomers: 0, isTransformerNode: true, x: 80, y: 160, lat: 34.00420, lng: 71.58120 },
    { id: '1.0', label: 'Pole 1 (Main Street Entrance)', poleNumber: 'P-1', threePhaseCustomers: 0, singlePhaseCustomers: 12, x: 190, y: 160, lat: 34.00445, lng: 71.58155 },
    { id: '2.0', label: 'Pole 2 (Gulbhar Central Lane)', poleNumber: 'P-2', threePhaseCustomers: 0, singlePhaseCustomers: 16, x: 310, y: 160, lat: 34.00470, lng: 71.58190 },
    { id: '3.0', label: 'Pole 3 (East/West Junction)', poleNumber: 'P-3', threePhaseCustomers: 0, singlePhaseCustomers: 12, x: 430, y: 160, lat: 34.00495, lng: 71.58225 },
    { id: '4.0', label: 'Pole 4 (Commercial Row North)', poleNumber: 'P-4', threePhaseCustomers: 0, singlePhaseCustomers: 12, x: 550, y: 90, lat: 34.00525, lng: 71.58245 },
    { id: '5.0', label: 'Pole 5 (Market Junction)', poleNumber: 'P-5', threePhaseCustomers: 1, singlePhaseCustomers: 9, x: 670, y: 90, lat: 34.00550, lng: 71.58265 },
    { id: '6.0', label: 'Pole 6 (Northern Terminal Hub)', poleNumber: 'P-6', threePhaseCustomers: 1, singlePhaseCustomers: 36, x: 790, y: 90, lat: 34.00575, lng: 71.58285 },
    { id: '7.0', label: 'Pole 7 (End of North Lane)', poleNumber: 'P-7', threePhaseCustomers: 0, singlePhaseCustomers: 19, x: 910, y: 50, lat: 34.00600, lng: 71.58305 },
    { id: '8.0', label: 'Pole 8 (South Branch Entry)', poleNumber: 'P-8', threePhaseCustomers: 0, singlePhaseCustomers: 6, x: 430, y: 260, lat: 34.00480, lng: 71.58260 },
    { id: '9.0', label: 'Pole 9 (South Residential Mid)', poleNumber: 'P-9', threePhaseCustomers: 0, singlePhaseCustomers: 6, x: 550, y: 260, lat: 34.00465, lng: 71.58295 },
    { id: '10.0', label: 'Pole 10 (South Dead End)', poleNumber: 'P-10', threePhaseCustomers: 0, singlePhaseCustomers: 18, x: 670, y: 260, lat: 34.00450, lng: 71.58330 },
    { id: '11.0', label: 'Pole 11 (North-East Spur)', poleNumber: 'P-11', threePhaseCustomers: 0, singlePhaseCustomers: 3, x: 860, y: 160, lat: 34.00585, lng: 71.58315 },
    { id: '12.0', label: 'Pole 12 (Tail-End Flour Mill)', poleNumber: 'P-12', threePhaseCustomers: 2, singlePhaseCustomers: 15, x: 970, y: 160, lat: 34.00595, lng: 71.58345 }
  ],
  segments: [
    { id: 's-0-1', fromNodeId: '0.0', toNodeId: '1.0', lengthKm: 0.005, conductorCode: 'A' },
    { id: 's-1-2', fromNodeId: '1.0', toNodeId: '2.0', lengthKm: 0.055, conductorCode: 'A' },
    { id: 's-2-3', fromNodeId: '2.0', toNodeId: '3.0', lengthKm: 0.040, conductorCode: 'A' },
    { id: 's-3-4', fromNodeId: '3.0', toNodeId: '4.0', lengthKm: 0.044, conductorCode: 'A' },
    { id: 's-4-5', fromNodeId: '4.0', toNodeId: '5.0', lengthKm: 0.056, conductorCode: 'A' },
    { id: 's-5-6', fromNodeId: '5.0', toNodeId: '6.0', lengthKm: 0.042, conductorCode: 'A' },
    { id: 's-6-7', fromNodeId: '6.0', toNodeId: '7.0', lengthKm: 0.048, conductorCode: 'A' },
    { id: 's-6-11', fromNodeId: '6.0', toNodeId: '11.0', lengthKm: 0.022, conductorCode: 'PU2' },
    { id: 's-11-12', fromNodeId: '11.0', toNodeId: '12.0', lengthKm: 0.023, conductorCode: 'PU2' },
    { id: 's-3-8', fromNodeId: '3.0', toNodeId: '8.0', lengthKm: 0.028, conductorCode: 'PU3' },
    { id: 's-8-9', fromNodeId: '8.0', toNodeId: '9.0', lengthKm: 0.033, conductorCode: 'PU3' },
    { id: 's-9-10', fromNodeId: '9.0', toNodeId: '10.0', lengthKm: 0.030, conductorCode: 'PU3' }
  ]
};

export const HAYATABAD_11KV_HT_FEEDER: FeederData = {
  id: 'hayatabad-11kv-feeder',
  name: 'Hayatabad Phase-4 Primary 11 kV HT Feeder',
  description: '11 kV High Tension distribution feeder from 132/11 kV Grid Substation supplying 8 Distribution Transformer (DTR) substations totaling 1,200 kVA connected capacity.',
  type: 'HT',
  category: 'HV',
  substationName: 'Hayatabad 132 kV Grid Substation',
  gridVoltageKv: 11.0,
  nominalVoltage: 11000,
  loadPerSinglePhaseCustomerKva: 2.5,
  operatingPowerFactor: 0.85,
  loadFactor: 0.65,
  annualGrowthRatePercent: 6.0,
  tariffPerKwh: 24.83,
  currencySymbol: 'Rupees',
  existingTransformerKva: 1200,
  proposedTransformerKva: 1600,

  // Unified Project & ELR Scheme Linking
  workOrderNo: '26147126043',
  schemeCategory: 'ELR',
  elrCode: 'ELR-71-26-043',
  accountHead: '4-71 ELR Capital Loss Reduction',
  circle: 'Peshawar Circle-1',
  division: 'Cantt Division Peshawar',
  subDivision: 'Hayatabad Sub-Division',
  district: 'Peshawar',
  villageLocality: 'Hayatabad Phase-4',
  applicantDepartment: 'PESCO Planning & Engineering Directorate',
  schemeProjectName: 'Hayatabad Phase-4 11kV Trunk Feeder Loss Reduction & Reconductoring Project',
  purposeOfWork: 'Primary 11kV HT Feeder rehabilitation, Osprey/Dog reconductoring and load bifurcation to decrease line losses.',
  preparedBy: 'Engr. M. Inayat',
  checkedBy: 'Engr. Tariq Khan (XEN)',
  approvedBy: 'Engr. Abdul Rehman (SE)',
  linkedEstimateId: 'est-elr-hayatabad-11kv-feeder',
  nodes: [
    { id: '0.0', label: 'Grid Substation 11kV Feeder Bay (Voltage & Current Source)', poleNumber: 'CB-01', threePhaseCustomers: 0, singlePhaseCustomers: 0, isTransformerNode: false, x: 80, y: 150, lat: 33.99220, lng: 71.43480 },
    { id: '1.0', label: 'Section 1 (Grid Exit Tower)', poleNumber: 'T-1', threePhaseCustomers: 0, singlePhaseCustomers: 0, spotLoadKva: 100, x: 190, y: 150, lat: 33.99350, lng: 71.43720 },
    { id: '2.0', label: 'Section 2 (Industrial Block DTR)', poleNumber: 'T-2', threePhaseCustomers: 2, singlePhaseCustomers: 10, spotLoadKva: 200, x: 320, y: 150, lat: 33.99480, lng: 71.43980 },
    { id: '3.0', label: 'Section 3 (T-Off Junction)', poleNumber: 'T-3', threePhaseCustomers: 0, singlePhaseCustomers: 0, spotLoadKva: 50, x: 450, y: 150, lat: 33.99590, lng: 71.44220 },
    { id: '4.0', label: 'Section 4 (Sector G Residential DTR)', poleNumber: 'T-4', threePhaseCustomers: 1, singlePhaseCustomers: 45, spotLoadKva: 200, x: 580, y: 90, lat: 33.99720, lng: 71.44350 },
    { id: '5.0', label: 'Section 5 (Commercial Center DTR)', poleNumber: 'T-5', threePhaseCustomers: 3, singlePhaseCustomers: 60, spotLoadKva: 250, x: 720, y: 90, lat: 33.99840, lng: 71.44490 },
    { id: '6.0', label: 'Section 6 (Hospital & Emergency DTR)', poleNumber: 'T-6', threePhaseCustomers: 2, singlePhaseCustomers: 20, spotLoadKva: 200, x: 860, y: 90, lat: 33.99960, lng: 71.44620 },
    { id: '7.0', label: 'Section 7 (Sector H Branch Mid)', poleNumber: 'T-7', threePhaseCustomers: 0, singlePhaseCustomers: 30, spotLoadKva: 100, x: 580, y: 230, lat: 33.99490, lng: 71.44420 },
    { id: '8.0', label: 'Section 8 (Tail End DTR Station)', poleNumber: 'T-8', threePhaseCustomers: 1, singlePhaseCustomers: 40, spotLoadKva: 100, x: 750, y: 230, lat: 33.99400, lng: 71.44600 }
  ],
  segments: [
    { id: 'ht-0-1', fromNodeId: '0.0', toNodeId: '1.0', lengthKm: 0.85, conductorCode: 'PANTHER' },
    { id: 'ht-1-2', fromNodeId: '1.0', toNodeId: '2.0', lengthKm: 0.90, conductorCode: 'DOG' },
    { id: 'ht-2-3', fromNodeId: '2.0', toNodeId: '3.0', lengthKm: 0.65, conductorCode: 'DOG' },
    { id: 'ht-3-4', fromNodeId: '3.0', toNodeId: '4.0', lengthKm: 0.70, conductorCode: 'RABBIT' },
    { id: 'ht-4-5', fromNodeId: '4.0', toNodeId: '5.0', lengthKm: 0.55, conductorCode: 'RABBIT' },
    { id: 'ht-5-6', fromNodeId: '5.0', toNodeId: '6.0', lengthKm: 0.40, conductorCode: 'RABBIT' },
    { id: 'ht-3-7', fromNodeId: '3.0', toNodeId: '7.0', lengthKm: 0.60, conductorCode: 'RABBIT' },
    { id: 'ht-7-8', fromNodeId: '7.0', toNodeId: '8.0', lengthKm: 0.50, conductorCode: 'RABBIT' }
  ]
};

export const WARSAK_11KV_HT_FEEDER: FeederData = {
  id: 'warsak-11kv-feeder',
  name: 'Warsak Road Commercial 11 kV HT Feeder',
  description: '11 kV High Tension commercial feeder from 132/11 kV Warsak Grid Substation supplying 7 commercial plazas and institutional DTR substations totaling 1,800 kVA load.',
  type: 'HT',
  category: 'HV',
  substationName: 'Warsak 132/11 kV Grid Substation',
  gridVoltageKv: 11.0,
  nominalVoltage: 11000,
  loadPerSinglePhaseCustomerKva: 3.0,
  operatingPowerFactor: 0.82,
  loadFactor: 0.68,
  annualGrowthRatePercent: 5.5,
  tariffPerKwh: 24.83,
  currencySymbol: 'Rupees',
  existingTransformerKva: 1800,
  proposedTransformerKva: 2500,

  // Unified Project & ELR Scheme Linking
  workOrderNo: '26147126044',
  schemeCategory: 'ELR',
  elrCode: 'ELR-71-26-044',
  accountHead: '4-71 ELR Capital Loss Reduction',
  circle: 'Peshawar Circle-1',
  division: 'Peshawar City Division',
  subDivision: 'Warsak Sub-Division',
  district: 'Peshawar',
  villageLocality: 'Warsak Road',
  applicantDepartment: 'PESCO Commercial & Operations Division',
  schemeProjectName: 'Warsak Road Commercial 11kV Feeder Bifurcation & Heavy Span Construction',
  purposeOfWork: 'Construction of 11kV express section and commercial load bifurcation.',
  preparedBy: 'Engr. M. Inayat',
  checkedBy: 'Engr. Tariq Khan (XEN)',
  approvedBy: 'Engr. Abdul Rehman (SE)',
  linkedEstimateId: 'est-elr-warsak-11kv-feeder',
  nodes: [
    { id: '0.0', label: 'Grid Substation 11kV Feeder Bay (Voltage & Current Source)', poleNumber: 'VCB-04', threePhaseCustomers: 0, singlePhaseCustomers: 0, isTransformerNode: false, x: 80, y: 150, lat: 34.04120, lng: 71.52820 },
    { id: '1.0', label: 'Section 1 (Warsak Canal Crossing)', poleNumber: 'P-1', threePhaseCustomers: 1, singlePhaseCustomers: 10, spotLoadKva: 150, x: 210, y: 150, lat: 34.04350, lng: 71.53120 },
    { id: '2.0', label: 'Section 2 (Babu Garhi Market DTR)', poleNumber: 'P-2', threePhaseCustomers: 4, singlePhaseCustomers: 50, spotLoadKva: 300, x: 360, y: 150, lat: 34.04580, lng: 71.53420 },
    { id: '3.0', label: 'Section 3 (Sardar Garhi T-Off)', poleNumber: 'P-3', threePhaseCustomers: 2, singlePhaseCustomers: 25, spotLoadKva: 200, x: 500, y: 150, lat: 34.04790, lng: 71.53680 },
    { id: '4.0', label: 'Section 4 (Peshawar Model DTR)', poleNumber: 'P-4', threePhaseCustomers: 3, singlePhaseCustomers: 80, spotLoadKva: 400, x: 650, y: 90, lat: 34.05010, lng: 71.53910 },
    { id: '5.0', label: 'Section 5 (Northern Bypass Hub)', poleNumber: 'P-5', threePhaseCustomers: 2, singlePhaseCustomers: 35, spotLoadKva: 350, x: 800, y: 90, lat: 34.05220, lng: 71.54150 },
    { id: '6.0', label: 'Section 6 (Charsadda Road Spur)', poleNumber: 'P-6', threePhaseCustomers: 1, singlePhaseCustomers: 40, spotLoadKva: 200, x: 650, y: 220, lat: 34.04650, lng: 71.53980 }
  ],
  segments: [
    { id: 'w-0-1', fromNodeId: '0.0', toNodeId: '1.0', lengthKm: 1.10, conductorCode: 'PANTHER' },
    { id: 'w-1-2', fromNodeId: '1.0', toNodeId: '2.0', lengthKm: 0.95, conductorCode: 'PANTHER' },
    { id: 'w-2-3', fromNodeId: '2.0', toNodeId: '3.0', lengthKm: 0.80, conductorCode: 'DOG' },
    { id: 'w-3-4', fromNodeId: '3.0', toNodeId: '4.0', lengthKm: 0.75, conductorCode: 'DOG' },
    { id: 'w-4-5', fromNodeId: '4.0', toNodeId: '5.0', lengthKm: 0.60, conductorCode: 'RABBIT' },
    { id: 'w-3-6', fromNodeId: '3.0', toNodeId: '6.0', lengthKm: 0.70, conductorCode: 'DOG' }
  ]
};

export const AGRI_TUBEWELL_LT_FEEDER: FeederData = {
  id: 'agri-tubewell-feeder',
  name: 'Sheikhupura Rural Agri & Tube-well LT Feeder',
  description: 'Extended rural agricultural feeder supplying induction motor tube-wells and village loads. Characterized by low power factor (0.72) and severe tail-end voltage drops.',
  type: 'LT',
  category: 'LV',
  substationName: 'Farooqabad 132/11 kV Grid',
  gridVoltageKv: 11.0,
  nominalVoltage: 400,
  loadPerSinglePhaseCustomerKva: 1.5,
  operatingPowerFactor: 0.72,
  loadFactor: 0.55,
  annualGrowthRatePercent: 4.5,
  tariffPerKwh: 24.83,
  currencySymbol: 'Rupees',
  existingTransformerKva: 100,
  proposedTransformerKva: 200,

  // Unified Project & ELR Scheme Linking
  workOrderNo: '26147126045',
  schemeCategory: 'ELR',
  elrCode: 'ELR-71-26-045',
  accountHead: '4-71 ELR Capital Loss Reduction',
  circle: 'Peshawar Circle-1',
  division: 'Rural Division',
  subDivision: 'Agri Sub-Division',
  district: 'Peshawar',
  villageLocality: 'Sheikhupura Rural Area',
  applicantDepartment: 'Agriculture & Rural Electrification',
  schemeProjectName: 'Sheikhupura Agri Feeder Power Factor & Voltage Improvement Project',
  purposeOfWork: 'Capacitor bank addition and tail-end LT line reconductoring.',
  preparedBy: 'Engr. M. Inayat',
  checkedBy: 'Engr. Tariq Khan (XEN)',
  approvedBy: 'Engr. Abdul Rehman (SE)',
  linkedEstimateId: 'est-elr-agri-tubewell-feeder',
  nodes: [
    { id: '0.0', label: 'DTR 100 kVA (Village Gate)', poleNumber: 'P-0', threePhaseCustomers: 0, singlePhaseCustomers: 0, isTransformerNode: true, x: 80, y: 160, lat: 31.71320, lng: 73.98520 },
    { id: '1.0', label: 'Pole 1 (Village Abadi Entry)', poleNumber: 'P-1', threePhaseCustomers: 0, singlePhaseCustomers: 18, x: 220, y: 160, lat: 31.71450, lng: 73.98680 },
    { id: '2.0', label: 'Pole 2 (Tube-well #1 Pump)', poleNumber: 'P-2', threePhaseCustomers: 1, singlePhaseCustomers: 8, spotLoadKva: 15, x: 380, y: 160, lat: 31.71580, lng: 73.98850 },
    { id: '3.0', label: 'Pole 3 (Canal Crossing)', poleNumber: 'P-3', threePhaseCustomers: 0, singlePhaseCustomers: 6, x: 540, y: 160, lat: 31.71710, lng: 73.99020 },
    { id: '4.0', label: 'Pole 4 (Tube-well #2 & Flour Mill)', poleNumber: 'P-4', threePhaseCustomers: 2, singlePhaseCustomers: 5, spotLoadKva: 22, x: 700, y: 120, lat: 31.71830, lng: 73.99180 },
    { id: '5.0', label: 'Pole 5 (Farmland Outpost Tube-well #3)', poleNumber: 'P-5', threePhaseCustomers: 1, singlePhaseCustomers: 2, spotLoadKva: 15, x: 860, y: 120, lat: 31.71960, lng: 73.99350 }
  ],
  segments: [
    { id: 'ag-0-1', fromNodeId: '0.0', toNodeId: '1.0', lengthKm: 0.12, conductorCode: 'A' },
    { id: 'ag-1-2', fromNodeId: '1.0', toNodeId: '2.0', lengthKm: 0.18, conductorCode: 'A' },
    { id: 'ag-2-3', fromNodeId: '2.0', toNodeId: '3.0', lengthKm: 0.15, conductorCode: 'A' },
    { id: 'ag-3-4', fromNodeId: '3.0', toNodeId: '4.0', lengthKm: 0.22, conductorCode: 'PU2' },
    { id: 'ag-4-5', fromNodeId: '4.0', toNodeId: '5.0', lengthKm: 0.20, conductorCode: 'PU2' }
  ]
};

export const PRESET_FEEDERS: FeederData[] = [
  GULBHAR_COLONY_LT_FEEDER,
  AGRI_TUBEWELL_LT_FEEDER,
  HAYATABAD_11KV_HT_FEEDER,
  WARSAK_11KV_HT_FEEDER
];
