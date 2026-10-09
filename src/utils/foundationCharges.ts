/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EstimateLineDetails } from '../types/costEstimation';

export const HT_POLE_FOUNDATION_RATE = 11450.75;
export const LT_POLE_FOUNDATION_RATE = 7324.00;
export const STEEL_LATTICE_POLE_FOUNDATION_RATE = 15000.00; // Assuming a rate for now

export function calculateFoundationCharges(details: EstimateLineDetails): number {
  if (!details.foundationEnabled) return 0;
  
  const isSteelLattice = details.poleType === 'STEEL_STRUCTURE';
  const htRate = isSteelLattice ? STEEL_LATTICE_POLE_FOUNDATION_RATE : HT_POLE_FOUNDATION_RATE;
  
  const htFoundationCost = (details.htPoles || 0) * htRate;
  const ltFoundationCost = (details.ltPoles || 0) * LT_POLE_FOUNDATION_RATE;
  
  return Number((htFoundationCost + ltFoundationCost).toFixed(2));
}
