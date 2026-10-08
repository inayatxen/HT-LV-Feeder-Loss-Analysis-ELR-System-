/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Conductor } from '../types/feeder';

export const STANDARD_CONDUCTORS: Record<string, Conductor> = {
  'A': {
    code: 'A',
    name: '7/0.122" (Code A)',
    resistancePerKm: 0.6646,
    reactancePerKm: 0.315,
    ampacity: 212,
    type: 'ACSR',
    description: '7-strand 0.122 inch conductor standard for WAPDA LT distribution lines.'
  },
  'WASP': {
    code: 'WASP',
    name: '7/0.170" ACSR Wasp (Code WASP)',
    resistancePerKm: 0.3410,
    reactancePerKm: 0.325,
    ampacity: 235,
    type: 'ACSR',
    description: '7-strand 0.170 inch (80 mm²) ACSR Wasp conductor for 11kV distribution lines and reconductoring.'
  },
  '2130': {
    code: '2130',
    name: '7/0.170" ACSR Wasp (Code 2130)',
    resistancePerKm: 0.3410,
    reactancePerKm: 0.325,
    ampacity: 235,
    type: 'ACSR',
    description: '7-strand 0.170 inch (80 mm²) ACSR Wasp conductor (WAPDA Store Code 2130).'
  },
  'PU3': {
    code: 'PU3',
    name: 'PVC 37/0.083" (Code PU3)',
    resistancePerKm: 0.2592,
    reactancePerKm: 0.285,
    ampacity: 172,
    type: 'PVC_ALUM',
    description: '37-strand 0.083 inch PVC insulated aluminum conductor for heavy load spurs.'
  },
  'PU2': {
    code: 'PU2',
    name: 'PVC 19/0.083" (Code PU2)',
    resistancePerKm: 0.500,
    reactancePerKm: 0.320,
    ampacity: 135,
    type: 'PVC_ALUM',
    description: '19-strand 0.083 inch PVC insulated cable for terminal branches and consumer connections.'
  },
  'RABBIT': {
    code: 'RABBIT',
    name: 'ACSR "Rabbit" (50 mm²)',
    resistancePerKm: 0.5426,
    reactancePerKm: 0.340,
    ampacity: 184,
    type: 'ACSR',
    description: 'Standard 6/1/3.35mm ACSR conductor widely used for reconductoring LT and 11kV lines.'
  },
  'DOG': {
    code: 'DOG',
    name: 'ACSR "Dog" (100 mm²)',
    resistancePerKm: 0.2733,
    reactancePerKm: 0.315,
    ampacity: 278,
    type: 'ACSR',
    description: 'Heavy duty 100mm² ACSR conductor for trunk distribution feeders and HT mains.'
  },
  'PANTHER': {
    code: 'PANTHER',
    name: 'ACSR "Panther" (200 mm²)',
    resistancePerKm: 0.1363,
    reactancePerKm: 0.298,
    ampacity: 400,
    type: 'ACSR',
    description: 'Ultra heavy capacity ACSR feeder conductor for primary 11kV distribution corridors.'
  },
  'ABC-70': {
    code: 'ABC-70',
    name: 'ABC Cable 3×70 + 54.6 mm²',
    resistancePerKm: 0.443,
    reactancePerKm: 0.100,
    ampacity: 195,
    type: 'ABC',
    description: 'Aerial Bundled Cable, tamper-proof, minimal reactance and zero tree-touch faults.'
  },
  'ABC-120': {
    code: 'ABC-120',
    name: 'ABC Cable 3×120 + 70 mm²',
    resistancePerKm: 0.253,
    reactancePerKm: 0.095,
    ampacity: 270,
    type: 'ABC',
    description: 'High capacity Aerial Bundled Cable for modern urban loss reduction schemes.'
  },
  'BEAR': {
    code: 'BEAR',
    name: 'ACSR Bear (250 mm²)',
    resistancePerKm: 0.110,
    reactancePerKm: 0.290,
    ampacity: 480,
    type: 'ACSR',
    description: 'Large capacity conductor for major 11kV distribution trunk feeders.'
  },
  'GOAT': {
    code: 'GOAT',
    name: 'ACSR Goat (300 mm²)',
    resistancePerKm: 0.095,
    reactancePerKm: 0.280,
    ampacity: 550,
    type: 'ACSR',
    description: 'Very large capacity conductor for HT mains.'
  }
};

export const CONDUCTOR_LIST: Conductor[] = Object.values(STANDARD_CONDUCTORS);

export function getConductor(code: string): Conductor {
  const normalized = code.trim().toUpperCase();
  if (STANDARD_CONDUCTORS[normalized]) {
    return STANDARD_CONDUCTORS[normalized];
  }
  // Fallback match
  const found = CONDUCTOR_LIST.find(c => c.code.toUpperCase() === normalized || c.name.toUpperCase().includes(normalized));
  return found || STANDARD_CONDUCTORS['A'];
}
