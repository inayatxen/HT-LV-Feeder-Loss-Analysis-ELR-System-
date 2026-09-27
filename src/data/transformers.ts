/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TransformerSpec } from '../types/feeder';

export const STANDARD_TRANSFORMERS: Record<number, TransformerSpec> = {
  10: {
    capacityKva: 10,
    primaryVoltageKv: 11.0,
    secondaryVoltageKv: 0.4,
    ironLossKw: 0.065,
    copperLossKw: 0.220,
    impedancePercent: 4.0
  },
  25: {
    capacityKva: 25,
    primaryVoltageKv: 11.0,
    secondaryVoltageKv: 0.4,
    ironLossKw: 0.120,
    copperLossKw: 0.460,
    impedancePercent: 4.0
  },
  50: {
    capacityKva: 50,
    primaryVoltageKv: 11.0,
    secondaryVoltageKv: 0.4,
    ironLossKw: 0.210,
    copperLossKw: 0.890,
    impedancePercent: 4.0
  },
  100: {
    capacityKva: 100,
    primaryVoltageKv: 11.0,
    secondaryVoltageKv: 0.4,
    ironLossKw: 0.320,
    copperLossKw: 1.650,
    impedancePercent: 4.0
  },
  200: {
    capacityKva: 200,
    primaryVoltageKv: 11.0,
    secondaryVoltageKv: 0.4,
    ironLossKw: 0.540,
    copperLossKw: 2.700,
    impedancePercent: 4.5
  },
  400: {
    capacityKva: 400,
    primaryVoltageKv: 11.0,
    secondaryVoltageKv: 0.4,
    ironLossKw: 0.920,
    copperLossKw: 4.600,
    impedancePercent: 4.5
  },
  630: {
    capacityKva: 630,
    primaryVoltageKv: 11.0,
    secondaryVoltageKv: 0.4,
    ironLossKw: 1.300,
    copperLossKw: 6.800,
    impedancePercent: 4.5
  }
};

export const TRANSFORMER_CAPACITIES = [10, 25, 50, 100, 200, 400, 630];

export function getTransformerSpec(capacityKva: number): TransformerSpec {
  if (STANDARD_TRANSFORMERS[capacityKva]) {
    return STANDARD_TRANSFORMERS[capacityKva];
  }
  // Linear/quadratic estimation if non-standard
  const iron = 0.32 * Math.pow(capacityKva / 100, 0.7);
  const cu = 1.65 * Math.pow(capacityKva / 100, 0.9);
  return {
    capacityKva,
    primaryVoltageKv: 11.0,
    secondaryVoltageKv: 0.4,
    ironLossKw: Number(iron.toFixed(3)),
    copperLossKw: Number(cu.toFixed(3)),
    impedancePercent: 4.2
  };
}
