/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialItem, DesignFactorsConfig, ConstructionTemplate } from '../types/costEstimation';

export const DEFAULT_DESIGN_FACTORS: DesignFactorsConfig = {
  htPoleSpacingMeters: 100,       // 10 poles per km
  ltPoleSpacingMeters: 45,        // ~22 poles per km
  conductorSagWastagePercent: 3.5,// 3.5% sag, jumper and handling wastage
  terminalPolesPerLine: 2,        // 2 terminal dead-end poles
  pinInsulatorsPerHtPole: 3,      // 3 phases
  discInsulatorsPerTerminalPole: 3, // 3 tension disc strings
  staySetsPerKm: 3,
  terminalStaySets: 4,
  earthingIntervalPoles: 5,       // earthing every 5th pole
  dangerPlatesPerPole: 1,
  crossArmsPerHtPole: 1,
  transportRatePerKmDefault: 180  // PKR 180 per km
};

export const INITIAL_MATERIALS: MaterialItem[] = [
  // ==========================================
  // POLES
  // ==========================================
  {
    id: 'mat-pole-pcc-11m',
    code: 'POL-11-PCC',
    name: 'PCC Pole 11 Meter (HT/11kV)',
    category: 'POLES',
    unit: 'Nos',
    specification: 'Pre-Stressed Concrete Pole 11m, 350kg Working Load, WAPDA DDS-23:89',
    voltageApplicability: 'HT',
    defaultQtyFactor: 10, // 10 per km
    materialRate: 26500,
    labourRate: 3500,
    installationRate: 2200,
    transportationRate: 1500,
    effectiveFrom: '2026-01-01',
    isActive: true,
    rateHistory: [
      { id: 'rh-1', rate: 24500, labourRate: 3200, effectiveFrom: '2025-01-01', effectiveTo: '2025-12-31', approvedBy: 'Chief Engineer (P&D) PESCO', remarks: 'Previous CSR-2025' },
      { id: 'rh-2', rate: 26500, labourRate: 3500, effectiveFrom: '2026-01-01', approvedBy: 'Chief Engineer (P&D) PESCO', remarks: 'Current CSR-2026 Approved Schedule' }
    ]
  },
  {
    id: 'mat-pole-pcc-9m',
    code: 'POL-09-PCC',
    name: 'PCC Pole 9 Meter (LT/400V)',
    category: 'POLES',
    unit: 'Nos',
    specification: 'Pre-Stressed Concrete Pole 9m, 200kg Working Load, WAPDA DDS-23:89',
    voltageApplicability: 'LT',
    defaultQtyFactor: 22, // ~22 per km
    materialRate: 18500,
    labourRate: 2800,
    installationRate: 1800,
    transportationRate: 1200,
    effectiveFrom: '2026-01-01',
    isActive: true,
    rateHistory: [
      { id: 'rh-3', rate: 17200, labourRate: 2500, effectiveFrom: '2025-01-01', effectiveTo: '2025-12-31', approvedBy: 'Chief Engineer (P&D) PESCO' },
      { id: 'rh-4', rate: 18500, labourRate: 2800, effectiveFrom: '2026-01-01', approvedBy: 'Chief Engineer (P&D) PESCO' }
    ]
  },
  {
    id: 'mat-pole-pcc-12m',
    code: 'POL-12-PCC',
    name: 'PCC Pole 12 Meter (Heavy Terminal / Angle)',
    category: 'POLES',
    unit: 'Nos',
    specification: 'High Strength Pre-Stressed Concrete Pole 12m, 500kg Working Load',
    voltageApplicability: 'HT',
    defaultQtyFactor: 2,
    materialRate: 34000,
    labourRate: 4200,
    installationRate: 2600,
    transportationRate: 1800,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-pole-steel-tubular',
    code: 'POL-ST-TUB',
    name: 'Steel Tubular Pole (Swaged)',
    category: 'POLES',
    unit: 'Nos',
    specification: 'Seamless Steel Tubular Swaged Pole 11m, 410-SP-55 Grade',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 0,
    materialRate: 48000,
    labourRate: 4500,
    installationRate: 3000,
    transportationRate: 1600,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-pole-rail',
    code: 'POL-RAIL-90',
    name: 'Rail Pole (90 lbs / Yard)',
    category: 'POLES',
    unit: 'Nos',
    specification: 'Steel Rail 90 lbs/yard Cut to 11m Length with Base Plate & Holes',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 0,
    materialRate: 52000,
    labourRate: 4800,
    installationRate: 3200,
    transportationRate: 2000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },

  // ==========================================
  // CONDUCTORS & CABLES
  // ==========================================
  {
    id: 'mat-cond-dog',
    code: 'CND-DOG-ACSR',
    name: 'ACSR Dog Conductor (100 mm²)',
    category: 'CONDUCTORS',
    unit: 'Km',
    specification: '6/4.72mm Al + 7/1.57mm Steel, 100mm² Equivalent, WAPDA DDS-10:84',
    voltageApplicability: 'HT',
    defaultQtyFactor: 3.1, // 3 phases + 3.5% sag
    materialRate: 345000,
    labourRate: 28000,
    installationRate: 12000,
    transportationRate: 5000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-cond-rabbit',
    code: 'CND-RABBIT-ACSR',
    name: 'ACSR Rabbit Conductor (50 mm²)',
    category: 'CONDUCTORS',
    unit: 'Km',
    specification: '6/3.35mm Al + 1/3.35mm Steel, 50mm² Equivalent, WAPDA DDS-10:84',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 3.1,
    materialRate: 195000,
    labourRate: 22000,
    installationRate: 9000,
    transportationRate: 3500,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-cond-weasel',
    code: 'CND-WEASEL-ACSR',
    name: 'ACSR Weasel Conductor (30 mm²)',
    category: 'CONDUCTORS',
    unit: 'Km',
    specification: '6/2.59mm Al + 1/2.59mm Steel, 30mm² Equivalent, WAPDA DDS-10:84',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 3.1,
    materialRate: 138000,
    labourRate: 18000,
    installationRate: 7500,
    transportationRate: 2800,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-cond-panther',
    code: 'CND-PANTHER-ACSR',
    name: 'ACSR Panther Conductor (200 mm²)',
    category: 'CONDUCTORS',
    unit: 'Km',
    specification: '30/3.00mm Al + 7/3.00mm Steel, 200mm² Trunk Feeder Conductor',
    voltageApplicability: 'HT',
    defaultQtyFactor: 3.1,
    materialRate: 680000,
    labourRate: 42000,
    installationRate: 16000,
    transportationRate: 8000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-cond-abc-70',
    code: 'CBL-ABC-70',
    name: 'LT Aerial Bundled Cable (ABC) 3×70 + 1×54.6 + 1×16 mm²',
    category: 'CONDUCTORS',
    unit: 'Km',
    specification: 'Self-Supporting XLPE Insulated 4-Core + Streetlight Conductor',
    voltageApplicability: 'LT',
    defaultQtyFactor: 1.03, // 1 run per km with 3% sag
    materialRate: 780000,
    labourRate: 38000,
    installationRate: 15000,
    transportationRate: 6500,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-cond-abc-50',
    code: 'CBL-ABC-50',
    name: 'LT Aerial Bundled Cable (ABC) 3×50 + 1×35 + 1×16 mm²',
    category: 'CONDUCTORS',
    unit: 'Km',
    specification: 'Self-Supporting XLPE Insulated Aerial Bundle Cable, 600/1000V',
    voltageApplicability: 'LT',
    defaultQtyFactor: 1.03,
    materialRate: 590000,
    labourRate: 32000,
    installationRate: 12000,
    transportationRate: 5500,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-cond-pvc-4core',
    code: 'CBL-PVC-4C-25',
    name: 'LT 4-Core PVC Insulated Cable 25mm²',
    category: 'CONDUCTORS',
    unit: 'Meter',
    specification: 'Copper Conductor 4-Core 25mm² Cu/PVC/PVC 600/1000V',
    voltageApplicability: 'LT',
    defaultQtyFactor: 0,
    materialRate: 1650,
    labourRate: 120,
    installationRate: 60,
    transportationRate: 20,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-cond-service-10',
    code: 'CBL-SRV-10',
    name: 'Service Drop Cable 2-Core 10mm² Cu/PVC',
    category: 'CONDUCTORS',
    unit: 'Meter',
    specification: 'Twin Core Concentric Service Connection Cable',
    voltageApplicability: 'LT',
    defaultQtyFactor: 0,
    materialRate: 480,
    labourRate: 40,
    installationRate: 25,
    transportationRate: 8,
    effectiveFrom: '2026-01-01',
    isActive: true
  },

  // ==========================================
  // INSULATORS
  // ==========================================
  {
    id: 'mat-ins-pin-11kv',
    code: 'INS-PIN-11',
    name: '11kV Pin Insulator with Galvanized Steel Pin',
    category: 'INSULATORS',
    unit: 'Nos',
    specification: 'Glazed Porcelain Pin Insulator 11kV Class, Creepage 320mm with Lead Thread Pin',
    voltageApplicability: 'HT',
    defaultQtyFactor: 30, // 3 per pole × 10 poles/km
    materialRate: 2450,
    labourRate: 250,
    installationRate: 150,
    transportationRate: 60,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-ins-disc-11kv',
    code: 'INS-DISC-11',
    name: '11kV Disc Insulator 45kN (Ball & Socket / Tongue & Clevis)',
    category: 'INSULATORS',
    unit: 'Nos',
    specification: 'Tension Disc Insulator 70kN/45kN Standard Porcelain with Hardware, WAPDA DDS-12',
    voltageApplicability: 'HT',
    defaultQtyFactor: 6,
    materialRate: 3600,
    labourRate: 450,
    installationRate: 250,
    transportationRate: 80,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-ins-shackle-lt',
    code: 'INS-SHK-LT',
    name: 'LT Shackle / Spool Insulator with D-Iron Clamp',
    category: 'INSULATORS',
    unit: 'Nos',
    specification: 'Glazed Porcelain Shackle Insulator with Hot-Dip Galvanized D-Iron',
    voltageApplicability: 'LT',
    defaultQtyFactor: 88, // 4 conductors × 22 poles
    materialRate: 650,
    labourRate: 120,
    installationRate: 80,
    transportationRate: 25,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-ins-stay-egg',
    code: 'INS-STY-EGG',
    name: 'Stay Insulator (Egg Type Porcelain)',
    category: 'INSULATORS',
    unit: 'Nos',
    specification: 'High Strength Glazed Porcelain Guy Strain Insulator 11kV/LT',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 4,
    materialRate: 450,
    labourRate: 80,
    installationRate: 50,
    transportationRate: 15,
    effectiveFrom: '2026-01-01',
    isActive: true
  },

  // ==========================================
  // HARDWARE & FITTINGS
  // ==========================================
  {
    id: 'mat-hw-crossarm-v',
    code: 'HW-CA-V5',
    name: '11kV V-Shape Cross Arm (5 ft) with Clamp',
    category: 'HARDWARE',
    unit: 'Nos',
    specification: 'Hot-Dip Galvanized Angle Iron 65×65×6mm V-Cross Arm with Pole Clamp & Bolts',
    voltageApplicability: 'HT',
    defaultQtyFactor: 10,
    materialRate: 6800,
    labourRate: 650,
    installationRate: 400,
    transportationRate: 200,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-hw-toppin-brk',
    code: 'HW-TOP-PIN',
    name: '11kV Top Pin Bracket with Hardware',
    category: 'HARDWARE',
    unit: 'Nos',
    specification: 'Hot-Dip Galvanized Steel Top Pin Adapter with 5/8" Threaded Stud',
    voltageApplicability: 'HT',
    defaultQtyFactor: 10,
    materialRate: 1450,
    labourRate: 180,
    installationRate: 100,
    transportationRate: 40,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-hw-channel-ca',
    code: 'HW-CA-CHN8',
    name: 'HT Double Pole Channel Cross Arm (8 ft) 100×50mm',
    category: 'HARDWARE',
    unit: 'Nos',
    specification: 'Hot-Dip Galvanized Heavy MS Channel 8 ft with Diagonal Bracings for H-Frame/Terminal',
    voltageApplicability: 'HT',
    defaultQtyFactor: 2,
    materialRate: 14500,
    labourRate: 1400,
    installationRate: 900,
    transportationRate: 450,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-hw-stay-set',
    code: 'HW-STAY-SET',
    name: 'Stay Set Complete (Bow, Rod, Base Plate & Guy Wire 7/8 SWG)',
    category: 'HARDWARE',
    unit: 'Set',
    specification: '20mm Galvanized Stay Rod 6ft, Cast Iron Base Plate 300×300mm, Turnbuckle & 15m Wire',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 4,
    materialRate: 7500,
    labourRate: 1800,
    installationRate: 1200,
    transportationRate: 250,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-hw-pg-clamp',
    code: 'HW-PG-DOG',
    name: 'Parallel Groove (PG) Clamp for Dog/Rabbit',
    category: 'HARDWARE',
    unit: 'Nos',
    specification: 'High Conductivity Aluminium Alloy 2-Bolt PG Clamp with Stainless Hardware',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 12,
    materialRate: 420,
    labourRate: 60,
    installationRate: 40,
    transportationRate: 10,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-hw-earthing-set',
    code: 'HW-EARTH-SET',
    name: 'Pole Earthing Set (Copper/Galv Coil & Lead Wire)',
    category: 'HARDWARE',
    unit: 'Set',
    specification: '8 SWG Galvanized Earthing Wire with Ground Coil & Pole Clamps',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 2,
    materialRate: 2800,
    labourRate: 850,
    installationRate: 500,
    transportationRate: 80,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-hw-danger-plate',
    code: 'HW-DANGER-PLT',
    name: 'Danger Notice Plate 11,000 Volts (Enamelled)',
    category: 'HARDWARE',
    unit: 'Nos',
    specification: 'Vitreous Enamelled 200×250mm Red Skull & Bones Warning Plate with Pole Clamps',
    voltageApplicability: 'HT',
    defaultQtyFactor: 10,
    materialRate: 750,
    labourRate: 80,
    installationRate: 50,
    transportationRate: 20,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-hw-number-plate',
    code: 'HW-NUM-PLT',
    name: 'Pole Number Plate with PESCO Code Bracket',
    category: 'HARDWARE',
    unit: 'Nos',
    specification: 'Aluminum Stamped Feeder & Pole Identification Plate',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 10,
    materialRate: 350,
    labourRate: 50,
    installationRate: 30,
    transportationRate: 10,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-hw-nuts-bolts',
    code: 'HW-NB-ASSORTED',
    name: 'Hot-Dip Galvanized Nuts, Bolts & Washers (Assorted 5/8")',
    category: 'HARDWARE',
    unit: 'Kg',
    specification: 'High Tensile Grade 8.8 Galvanized Fasteners (Various Lengths 6" to 14")',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 25,
    materialRate: 550,
    labourRate: 40,
    installationRate: 20,
    transportationRate: 15,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-hw-binding-wire',
    code: 'HW-BIND-WIRE',
    name: 'Aluminum / Galvanized Binding Wire & Tape',
    category: 'HARDWARE',
    unit: 'Kg',
    specification: 'Soft Annealed Aluminum Conductor Binding Wire 2.5mm² with Armor Tape',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 5,
    materialRate: 850,
    labourRate: 50,
    installationRate: 30,
    transportationRate: 15,
    effectiveFrom: '2026-01-01',
    isActive: true
  },

  // ==========================================
  // DISTRIBUTION TRANSFORMERS
  // ==========================================
  {
    id: 'mat-trf-25kva',
    code: 'TRF-25-11KV',
    name: 'Distribution Transformer 25 kVA, 11/0.415 kV',
    category: 'TRANSFORMERS',
    unit: 'Nos',
    specification: 'Oil Immersed, ONAN, Dyn11, Copper Winding, Off-Circuit Tap Changer, WAPDA P-10:2000',
    voltageApplicability: 'HT',
    defaultQtyFactor: 1,
    materialRate: 640000,
    labourRate: 28000,
    installationRate: 18000,
    transportationRate: 15000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-trf-50kva',
    code: 'TRF-50-11KV',
    name: 'Distribution Transformer 50 kVA, 11/0.415 kV',
    category: 'TRANSFORMERS',
    unit: 'Nos',
    specification: 'Oil Immersed, ONAN, Dyn11, Copper Winding, Off-Circuit Tap Changer, WAPDA P-10:2000',
    voltageApplicability: 'HT',
    defaultQtyFactor: 1,
    materialRate: 890000,
    labourRate: 35000,
    installationRate: 22000,
    transportationRate: 18000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-trf-100kva',
    code: 'TRF-100-11KV',
    name: 'Distribution Transformer 100 kVA, 11/0.415 kV',
    category: 'TRANSFORMERS',
    unit: 'Nos',
    specification: 'Oil Immersed, ONAN, Dyn11, Copper Winding, 11000/415V, Standard PESCO/WAPDA',
    voltageApplicability: 'HT',
    defaultQtyFactor: 1,
    materialRate: 1350000,
    labourRate: 48000,
    installationRate: 30000,
    transportationRate: 22000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-trf-200kva',
    code: 'TRF-200-11KV',
    name: 'Distribution Transformer 200 kVA, 11/0.415 kV',
    category: 'TRANSFORMERS',
    unit: 'Nos',
    specification: 'Oil Immersed, ONAN, Dyn11, Copper Winding, 11000/415V, Standard PESCO/WAPDA',
    voltageApplicability: 'HT',
    defaultQtyFactor: 1,
    materialRate: 2150000,
    labourRate: 65000,
    installationRate: 42000,
    transportationRate: 28000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-trf-400kva',
    code: 'TRF-400-11KV',
    name: 'Distribution Transformer 400 kVA, 11/0.415 kV',
    category: 'TRANSFORMERS',
    unit: 'Nos',
    specification: 'Plinth/Pad Mounted Oil Immersed, ONAN, Dyn11, Copper Winding, High Efficiency',
    voltageApplicability: 'HT',
    defaultQtyFactor: 1,
    materialRate: 3450000,
    labourRate: 85000,
    installationRate: 55000,
    transportationRate: 35000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-trf-630kva',
    code: 'TRF-630-11KV',
    name: 'Distribution Transformer 630 kVA, 11/0.415 kV',
    category: 'TRANSFORMERS',
    unit: 'Nos',
    specification: 'Plinth Mounted Sub-station Type ONAN Copper Transformer 11/0.415kV',
    voltageApplicability: 'HT',
    defaultQtyFactor: 1,
    materialRate: 4850000,
    labourRate: 110000,
    installationRate: 75000,
    transportationRate: 45000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },

  // ==========================================
  // PROTECTION, SWITCHGEAR & SPECIAL
  // ==========================================
  {
    id: 'mat-sw-lightning-arrester',
    code: 'SW-LA-11KV',
    name: '11kV Lightning Arrester (Set of 3)',
    category: 'OTHER',
    unit: 'Set',
    specification: 'Polymeric Metal Oxide Gapless Surge Arrester 9kV/10kA Class 1, WAPDA P-44',
    voltageApplicability: 'HT',
    defaultQtyFactor: 1,
    materialRate: 24500,
    labourRate: 3200,
    installationRate: 1800,
    transportationRate: 500,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-sw-dropout-fuses',
    code: 'SW-DOF-11KV',
    name: '11kV Drop-Out Fuse Unit (Set of 3) with Elements',
    category: 'OTHER',
    unit: 'Set',
    specification: 'Porcelain/Polymer Dropout Cutout 11kV/100A-200A with Fast/Slow Fuse Links',
    voltageApplicability: 'HT',
    defaultQtyFactor: 1,
    materialRate: 28500,
    labourRate: 3800,
    installationRate: 2200,
    transportationRate: 600,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-sw-ab-switch',
    code: 'SW-AB-400A',
    name: '11kV Air Break (AB) Gang Operated Switch 400A (3-Pole)',
    category: 'OTHER',
    unit: 'Set',
    specification: 'Triple Pole Outdoor Gang-Operated Isolator Switch 11kV 400A with Operating Handle & Padlock',
    voltageApplicability: 'HT',
    defaultQtyFactor: 1,
    materialRate: 85000,
    labourRate: 9500,
    installationRate: 6000,
    transportationRate: 2500,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-trf-structure-plat',
    code: 'STR-TRF-PLAT',
    name: 'Transformer Mounting Platform Steel Structure (H-Frame)',
    category: 'HARDWARE',
    unit: 'Set',
    specification: 'Complete Heavy Galvanized Steel Platform Channels, Tie Angles, Safety Railing & Clamps',
    voltageApplicability: 'HT',
    defaultQtyFactor: 1,
    materialRate: 48000,
    labourRate: 6800,
    installationRate: 4200,
    transportationRate: 2000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-trf-civil-pad',
    code: 'STR-CIVIL-PAD',
    name: 'Civil Works: Transformer Concrete Foundation / Pole Muffling',
    category: 'OTHER',
    unit: 'Job',
    specification: '1:2:4 RCC Foundation Pad or Pole Base Muffling with Gravel Pit & Soakaway',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 1,
    materialRate: 35000,
    labourRate: 18000,
    installationRate: 8000,
    transportationRate: 3000,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-lt-dist-box',
    code: 'PNL-LT-DIST',
    name: 'LT Distribution Feeder Box with Molded Case Circuit Breakers (MCCB)',
    category: 'OTHER',
    unit: 'Nos',
    specification: 'Outdoor Weatherproof Galvanized Sheet Box with 400A Main MCCB & 4 Outgoing Feeders',
    voltageApplicability: 'LT',
    defaultQtyFactor: 1,
    materialRate: 68000,
    labourRate: 7500,
    installationRate: 4500,
    transportationRate: 1500,
    effectiveFrom: '2026-01-01',
    isActive: true
  },
  {
    id: 'mat-cu-earth-rod',
    code: 'HW-CU-ROD',
    name: 'Pure Copper Earth Electrode Rod (10 ft × 5/8")',
    category: 'HARDWARE',
    unit: 'Nos',
    specification: 'High Grade Copper Clad Steel Grounding Rod with Brass Clamps & Bentonite Chemical Pit',
    voltageApplicability: 'BOTH',
    defaultQtyFactor: 2,
    materialRate: 8500,
    labourRate: 2500,
    installationRate: 1500,
    transportationRate: 200,
    effectiveFrom: '2026-01-01',
    isActive: true
  }
];

export const STANDARD_TEMPLATES: ConstructionTemplate[] = [
  {
    id: 'tmpl-ht-11kv-line',
    name: 'Template 1: 11kV HT Overhead Line Construction',
    type: 'HT_LINE_EXTENSION',
    description: 'Standard 11kV 3-Phase HT Line on 11m PCC Poles using ACSR Dog conductor, Pin insulators, and V-cross arms.',
    standardConductorCode: 'CND-DOG-ACSR',
    standardPoleCode: 'POL-11-PCC',
    defaultAdditionalPercentages: {
      engineeringPercent: 2.0,
      contingencyPercent: 3.0,
      departmentalPercent: 5.0,
      contractorPercent: 10.0,
      taxPercent: 0.0
    }
  },
  {
    id: 'tmpl-lt-abc-line',
    name: 'Template 2: LT Aerial Bundled Cable (ABC) Line',
    type: 'LT_LINE_EXTENSION',
    description: 'Modern Anti-Theft LT Line on 9m PCC Poles using 70mm² XLPE Aerial Bundled Cable (ABC) with suspension hardware.',
    standardConductorCode: 'CBL-ABC-70',
    standardPoleCode: 'POL-09-PCC',
    defaultAdditionalPercentages: {
      engineeringPercent: 2.0,
      contingencyPercent: 3.0,
      departmentalPercent: 5.0,
      contractorPercent: 10.0,
      taxPercent: 0.0
    }
  },
  {
    id: 'tmpl-dt-install',
    name: 'Template 3: 100 kVA Distribution Transformer Sub-station Installation',
    type: 'NEW_DISTRIBUTION_TRANSFORMER',
    description: 'Standard 100 kVA 11/0.415 kV Pole-Mounted Transformer Sub-station with H-Frame, Drop-Out Fuses, Lightning Arresters, and LT Box.',
    standardConductorCode: 'CND-DOG-ACSR',
    standardPoleCode: 'POL-11-PCC',
    defaultTransformerKva: 100,
    defaultAdditionalPercentages: {
      engineeringPercent: 2.0,
      contingencyPercent: 3.0,
      departmentalPercent: 5.0,
      contractorPercent: 10.0,
      taxPercent: 0.0
    }
  },
  {
    id: 'tmpl-complete-feeder',
    name: 'Template 4: Complete 11kV HT Feeder Construction',
    type: 'COMPLETE_HT_FEEDER',
    description: 'Turnkey Feeder construction including mainline 11kV trunk lines, branch spurs, sectionalizing AB switches, multiple DT stations, and earthing.',
    standardConductorCode: 'CND-PANTHER-ACSR',
    standardPoleCode: 'POL-11-PCC',
    defaultAdditionalPercentages: {
      engineeringPercent: 2.5,
      contingencyPercent: 4.0,
      departmentalPercent: 5.0,
      contractorPercent: 10.0,
      taxPercent: 0.0
    }
  },
  {
    id: 'tmpl-ht-lt-combined',
    name: 'Template 5: Combined HT + LT Line Extension to Village',
    type: 'COMBINED_HT_LT',
    description: 'Integrated rural electrification project: 11kV line extension, new 50/100 kVA transformer, and downstream LT ABC village distribution network.',
    standardConductorCode: 'CND-DOG-ACSR',
    standardPoleCode: 'POL-11-PCC',
    defaultTransformerKva: 50,
    defaultAdditionalPercentages: {
      engineeringPercent: 2.0,
      contingencyPercent: 3.0,
      departmentalPercent: 5.0,
      contractorPercent: 10.0,
      taxPercent: 0.0
    }
  }
];
