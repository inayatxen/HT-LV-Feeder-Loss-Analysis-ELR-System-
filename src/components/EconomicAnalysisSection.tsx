/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FeederData, 
  FeederAnalysisSummary,
  BifurcationConfig 
} from '../types/feeder';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  HelpCircle,
  Zap, 
  Wrench, 
  Split, 
  BatteryCharging, 
  SlidersHorizontal, 
  Calculator, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  BarChart3,
  Calendar,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';

interface EconomicAnalysisSectionProps {
  feeder: FeederData;
  existingSummary: FeederAnalysisSummary;
  proposedSummary: FeederAnalysisSummary;
  activeTransformerKva: number;
  activeConductors: Record<string, string>;
  activeCapacitors: Record<string, number>;
  bifurcationConfig: BifurcationConfig;
  activeLoadFactor?: number;
  onOpenCostEstimation?: () => void;
}

export interface InterventionCostItem {
  id: string;
  name: string;
  category: 'bifurcation' | 'transformer' | 'reconductoring' | 'capacitors' | 'overhead';
  description: string;
  quantityStr: string;
  unitCost: number;
  totalCost: number;
  isActive: boolean;
}

export const EconomicAnalysisSection: React.FC<EconomicAnalysisSectionProps> = ({
  feeder,
  existingSummary,
  proposedSummary,
  activeTransformerKva,
  activeConductors,
  activeCapacitors,
  bifurcationConfig,
  activeLoadFactor,
  onOpenCostEstimation
}) => {
  const isHtLine = feeder.type === 'HT' || feeder.category === 'HV' || feeder.nominalVoltage >= 1000;
  const currency = feeder.currencySymbol || 'Rs.';

  // 1. Economic & Tariff Configuration States
  const defaultTariff = feeder.tariffPerKwh || 24.83;
  const [tariffPerKwh, setTariffPerKwh] = useState<number>(defaultTariff);
  const [includeDemandCharges, setIncludeDemandCharges] = useState<boolean>(false);
  const [demandChargeRatePerKwYear, setDemandChargeRatePerKwYear] = useState<number>(4837); // WAPDA standard
  const [includeCompoundedGrowth, setIncludeCompoundedGrowth] = useState<boolean>(true);
  const [annualGrowthRatePercent, setAnnualGrowthRatePercent] = useState<number>(
    feeder.annualGrowthRatePercent !== undefined ? feeder.annualGrowthRatePercent : 5.0
  );

  // Cost Override / Source States
  const [capexMode, setCapexMode] = useState<'dynamic' | 'custom'>('dynamic');
  const [customCapex, setCustomCapex] = useState<number>(1450000);
  const [activeTab, setActiveTab] = useState<'breakeven' | 'breakdown' | 'sensitivity' | 'cashflow'>('breakeven');

  // 2. Compute Itemized Project Cost for Chosen Interventions
  const itemizedInterventions = useMemo<InterventionCostItem[]>(() => {
    const items: InterventionCostItem[] = [];

    // Intervention 1: Line Bifurcation & T-2 Substation OR HT Feeder Bifurcation
    if (bifurcationConfig.enabled) {
      if (isHtLine) {
        // HT Feeder Bifurcation
        const extKm = bifurcationConfig.extensionLengthKm || 2.0;
        const condCode = bifurcationConfig.extensionConductorCode || 'DOG';
        const costPerKm = condCode === 'PANTHER' ? 1850000 : 1450000;
        const lineExtCost = Math.round(extKm * costPerKm);

        items.push({
          id: 'bifurcation-ht-line',
          name: `New 11kV Grid Feeder Extension (${extKm} km ${condCode})`,
          category: 'bifurcation',
          description: `Construct dedicated 11kV line extension from grid station to cut-off node ${bifurcationConfig.bifurcationNodeId}`,
          quantityStr: `${extKm.toFixed(1)} km`,
          unitCost: costPerKm,
          totalCost: lineExtCost,
          isActive: true
        });

        // Grid Substation Bay Equipment
        const bayCost = bifurcationConfig.gridSourceType === 'OTHER_GRID' ? 1150000 : 850000;
        items.push({
          id: 'bifurcation-grid-bay',
          name: `11kV Grid Substation Outgoing Bay (${bifurcationConfig.gridSourceType === 'OTHER_GRID' ? 'Nearby Grid' : 'Same Grid'})`,
          category: 'bifurcation',
          description: 'Vacuum Circuit Breaker (VCB), relay control panel, CT/PT set, and busbar isolator',
          quantityStr: '1 Job',
          unitCost: bayCost,
          totalCost: bayCost,
          isActive: true
        });
      } else {
        // LT Bifurcation & Additional Transformer (T-2)
        const cap = bifurcationConfig.transformerCapacityKva || 100;
        const trCosts: Record<number, number> = {
          25: 290000,
          50: 420000,
          100: 680000,
          200: 1150000,
          400: 1950000
        };
        const trCost = trCosts[cap] || (cap * 6800);

        items.push({
          id: 'bifurcation-t2-transformer',
          name: `Distribution Transformer T-2 (${cap} kVA Substation)`,
          category: 'bifurcation',
          description: `New ${cap} kVA 11/0.4kV pad/pole-mounted transformer unit at load center Node ${bifurcationConfig.transformerNodeId || bifurcationConfig.bifurcationNodeId}`,
          quantityStr: '1 No.',
          unitCost: trCost,
          totalCost: trCost,
          isActive: true
        });

        const structureCost = 245000;
        items.push({
          id: 'bifurcation-t2-structure',
          name: 'H-Frame Substation Mounting & Protection Hardware',
          category: 'bifurcation',
          description: 'PCC poles, channel iron platform, Drop-Out cutouts, lightning arresters, and copper earthing bore',
          quantityStr: '1 Set',
          unitCost: structureCost,
          totalCost: structureCost,
          isActive: true
        });

        // Proposed HT line extension to join T-2
        const htMeters = bifurcationConfig.htExtensionMeters || 0;
        if (htMeters > 0) {
          const htKm = htMeters / 1000;
          const htCond = bifurcationConfig.htExtensionConductorCode || 'DOG';
          const htCostPerKm = 1250000;
          const htCost = Math.round(htKm * htCostPerKm);

          items.push({
            id: 'bifurcation-ht-extension',
            name: `HT 11kV Spur Line Extension (${htMeters}m ${htCond})`,
            category: 'bifurcation',
            description: `Interconnect existing 11kV grid feeder with newly proposed T-2 transformer substation`,
            quantityStr: `${htMeters} m`,
            unitCost: htCostPerKm,
            totalCost: htCost,
            isActive: true
          });
        }
      }
    }

    // Intervention 2: Transformer T-1 Augmentation
    const existingCap = feeder.existingTransformerKva || 100;
    const isAugmented = !isHtLine && activeTransformerKva !== existingCap;
    if (isAugmented) {
      const upgradeDifferentials: Record<string, number> = {
        '50-100': 340000,
        '50-200': 780000,
        '100-200': 510000,
        '100-400': 1250000,
        '200-400': 850000
      };
      const key = `${existingCap}-${activeTransformerKva}`;
      const diffCost = upgradeDifferentials[key] || Math.max(180000, Math.round((activeTransformerKva - existingCap) * 5500));

      items.push({
        id: 'transformer-t1-augmentation',
        name: `Transformer T-1 Augmentation (${existingCap} kVA → ${activeTransformerKva} kVA)`,
        category: 'transformer',
        description: `Upgrading main source transformer unit, LV bushings, and uprated distribution fuse gear`,
        quantityStr: '1 Job',
        unitCost: diffCost,
        totalCost: diffCost,
        isActive: true
      });
    }

    // Intervention 3: Re-conductoring Priority Spans
    const upgradedSpans: { segId: string; lengthKm: number; fromCode: string; toCode: string }[] = [];
    feeder.segments.forEach(seg => {
      const chosen = activeConductors[seg.id];
      if (chosen && chosen !== seg.conductorCode) {
        upgradedSpans.push({
          segId: seg.id,
          lengthKm: seg.lengthKm,
          fromCode: seg.conductorCode,
          toCode: chosen
        });
      }
    });

    if (upgradedSpans.length > 0) {
      const totalUpgradedKm = upgradedSpans.reduce((acc, s) => acc + s.lengthKm, 0);
      const conductorRatesPerKm: Record<string, number> = {
        PANTHER: 650000,
        DOG: 480000,
        WASP: 420000,
        RABBIT: 340000,
        A: 260000,
        PU3: 290000
      };

      // Weighted average conductor rate
      let totalMaterialCost = 0;
      upgradedSpans.forEach(s => {
        const rate = conductorRatesPerKm[s.toCode] || 450000;
        totalMaterialCost += s.lengthKm * rate;
      });

      // Stringing labor & hardware ~ 15%
      const laborAndHardware = totalMaterialCost * 0.18;
      // Scrap credit for dismantled conductor ~ 12%
      const salvageCredit = totalMaterialCost * 0.12;
      const netReconCost = Math.round(totalMaterialCost + laborAndHardware - salvageCredit);

      items.push({
        id: 'reconductoring-spans',
        name: `Re-conductoring (${upgradedSpans.length} High-Loss Spans, ${totalUpgradedKm.toFixed(3)} km)`,
        category: 'reconductoring',
        description: `Replacement of undersized line conductors with heavier cross-section ACSR, inclusive of stringing and net scrap credit`,
        quantityStr: `${totalUpgradedKm.toFixed(3)} km`,
        unitCost: Math.round(netReconCost / Math.max(0.001, totalUpgradedKm)),
        totalCost: netReconCost,
        isActive: true
      });
    }

    // Intervention 4: Shunt Capacitor Placement
    let totalCapKvar = 0;
    Object.values(activeCapacitors).forEach(kvar => {
      totalCapKvar += kvar || 0;
    });

    if (totalCapKvar > 0) {
      const costPerKvar = 12500; // Rs. per kVAR installed with switchgear
      const capTotal = totalCapKvar * costPerKvar;

      items.push({
        id: 'shunt-capacitors',
        name: `Shunt Capacitors (${totalCapKvar} kVAR Bank)`,
        category: 'capacitors',
        description: `Tail-end power factor correction capacitor units, discharge resistors, and outdoor weatherproof metalclad enclosures`,
        quantityStr: `${totalCapKvar} kVAR`,
        unitCost: costPerKvar,
        totalCost: capTotal,
        isActive: true
      });
    }

    // Overhead, Supervision & Contingencies (if there are interventions)
    const baseSubtotal = items.reduce((acc, i) => acc + i.totalCost, 0);
    if (baseSubtotal > 0) {
      const contingencyCost = Math.round(baseSubtotal * 0.05); // 5% Contingencies
      const overheadCost = Math.round(baseSubtotal * 0.03);    // 3% Departmental Charges

      items.push({
        id: 'contingencies-overheads',
        name: 'Statutory Contingencies (5%) & Departmental Overheads (3%)',
        category: 'overhead',
        description: 'Provision for unpredicted route diversions, safety escorts, material testing, and departmental supervision',
        quantityStr: '8% Combined',
        unitCost: contingencyCost + overheadCost,
        totalCost: contingencyCost + overheadCost,
        isActive: true
      });
    }

    return items;
  }, [bifurcationConfig, isHtLine, activeTransformerKva, feeder, activeConductors, activeCapacitors]);

  // 3. Total Project Estimated Cost (CapEx)
  const calculatedDynamicCapex = useMemo(() => {
    return itemizedInterventions.reduce((acc, item) => acc + item.totalCost, 0);
  }, [itemizedInterventions]);

  // Effective Project Cost used for payback
  const effectiveProjectCost = useMemo(() => {
    if (capexMode === 'custom') {
      return Math.max(0, customCapex);
    }
    // If no interventions are chosen, give a friendly non-zero fallback or calculated
    return calculatedDynamicCapex > 0 ? calculatedDynamicCapex : 0;
  }, [capexMode, customCapex, calculatedDynamicCapex]);

  // 4. Energy Loss Savings Calculations
  const baselineAnnualLossKwh = existingSummary.annualEnergyLossKwh || 0;
  const proposedAnnualLossKwh = proposedSummary.annualEnergyLossKwh || 0;
  const annualEnergySavedKwh = Math.max(0, baselineAnnualLossKwh - proposedAnnualLossKwh);
  const percentEnergySaved = baselineAnnualLossKwh > 0 
    ? (annualEnergySavedKwh / baselineAnnualLossKwh) * 100 
    : 0;

  // Power Demand Loss Savings
  const baselinePeakLossKw = existingSummary.totalLineLossKw || existingSummary.totalPowerLossKw || 0;
  const proposedPeakLossKw = proposedSummary.totalLineLossKw || proposedSummary.totalPowerLossKw || 0;
  const peakKwSaved = Math.max(0, baselinePeakLossKw - proposedPeakLossKw);

  // Financial Savings
  const annualEnergyCostSavings = annualEnergySavedKwh * tariffPerKwh;
  const annualDemandCostSavings = includeDemandCharges ? peakKwSaved * demandChargeRatePerKwYear : 0;
  const totalAnnualSavings = annualEnergyCostSavings + annualDemandCostSavings;
  const monthlySavings = totalAnnualSavings / 12;

  // 5. Simple Payback Period (in Months & Years)
  const paybackResults = useMemo(() => {
    if (totalAnnualSavings <= 0) {
      return {
        months: Infinity,
        years: Infinity,
        formattedMonths: 'N/A',
        formattedYears: 'N/A',
        status: 'negative_savings',
        statusLabel: 'No Savings Achieved',
        statusColor: 'text-rose-700 bg-rose-50 border-rose-300',
        badgeBg: 'bg-rose-500'
      };
    }

    if (effectiveProjectCost <= 0) {
      return {
        months: 0,
        years: 0,
        formattedMonths: '0.0 Mos',
        formattedYears: 'Immediate',
        status: 'immediate',
        statusLabel: 'Immediate (Zero CapEx)',
        statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-300',
        badgeBg: 'bg-emerald-500'
      };
    }

    // Payback formula: (Cost / AnnualSavings) * 12
    const years = effectiveProjectCost / totalAnnualSavings;
    const months = years * 12;

    let status = 'moderate';
    let statusLabel = 'Moderate Viability (Standard)';
    let statusColor = 'text-amber-800 bg-amber-50 border-amber-300';
    let badgeBg = 'bg-amber-500';

    if (months <= 18) {
      status = 'exceptional';
      statusLabel = 'Exceptional Viability (< 1.5 Yrs)';
      statusColor = 'text-emerald-800 bg-emerald-50 border-emerald-300';
      badgeBg = 'bg-emerald-600';
    } else if (months <= 36) {
      status = 'strong';
      statusLabel = 'High Priority (< 3.0 Yrs)';
      statusColor = 'text-blue-800 bg-blue-50 border-blue-300';
      badgeBg = 'bg-blue-600';
    } else if (months <= 60) {
      status = 'acceptable';
      statusLabel = 'Acceptable Payback (3 – 5 Yrs)';
      statusColor = 'text-amber-800 bg-amber-50 border-amber-300';
      badgeBg = 'bg-amber-500';
    } else {
      status = 'long';
      statusLabel = 'Capital Intensive (> 5 Yrs)';
      statusColor = 'text-rose-800 bg-rose-50 border-rose-300';
      badgeBg = 'bg-rose-500';
    }

    return {
      months,
      years,
      formattedMonths: `${months.toFixed(1)} Months`,
      formattedYears: `${years.toFixed(2)} Years`,
      status,
      statusLabel,
      statusColor,
      badgeBg
    };
  }, [effectiveProjectCost, totalAnnualSavings]);

  // 6. Return on Investment & 5-Year Financial Metrics
  const economicMetrics = useMemo(() => {
    const annualRoiPercent = effectiveProjectCost > 0 
      ? (totalAnnualSavings / effectiveProjectCost) * 100 
      : 0;

    // 5-Year cumulative savings with optional load growth compounding
    const growth = includeCompoundedGrowth ? (annualGrowthRatePercent / 100) : 0;
    let fiveYearTotalSavings = 0;
    const yearlyCashFlow: { year: number; savings: number; cumulativeSavings: number; netCash: number; roi: number }[] = [];
    
    let runningCumulative = 0;
    for (let yr = 1; yr <= 5; yr++) {
      const growthFactor = Math.pow(1 + growth, yr - 1);
      const yrSavings = totalAnnualSavings * growthFactor;
      runningCumulative += yrSavings;
      const netCash = runningCumulative - effectiveProjectCost;
      const roi = effectiveProjectCost > 0 ? (runningCumulative / effectiveProjectCost) * 100 : 0;

      yearlyCashFlow.push({
        year: yr,
        savings: Math.round(yrSavings),
        cumulativeSavings: Math.round(runningCumulative),
        netCash: Math.round(netCash),
        roi: Number(roi.toFixed(1))
      });
    }

    fiveYearTotalSavings = runningCumulative;
    const fiveYearNetProfit = fiveYearTotalSavings - effectiveProjectCost;
    const fiveYearBcr = effectiveProjectCost > 0 ? fiveYearTotalSavings / effectiveProjectCost : 0;

    return {
      annualRoiPercent,
      fiveYearTotalSavings,
      fiveYearNetProfit,
      fiveYearBcr,
      yearlyCashFlow
    };
  }, [effectiveProjectCost, totalAnnualSavings, includeCompoundedGrowth, annualGrowthRatePercent]);

  // 7. Month-by-Month Breakeven Simulation Data for Recharts
  const breakevenChartData = useMemo(() => {
    if (effectiveProjectCost <= 0 || monthlySavings <= 0) {
      // Empty or fallback points
      return [
        { month: 0, label: 'M0', netCashFlow: 0, cumulativeSavings: 0, capexLine: 0 },
        { month: 12, label: 'M12', netCashFlow: 0, cumulativeSavings: 0, capexLine: 0 }
      ];
    }

    const maxMonths = Math.min(72, Math.max(36, Math.ceil(paybackResults.months * 1.5)));
    const points = [];
    const monthlyGrowth = includeCompoundedGrowth ? (annualGrowthRatePercent / 100) / 12 : 0;

    let cumulativeSavingsAcc = 0;
    for (let m = 0; m <= maxMonths; m++) {
      if (m > 0) {
        const factor = Math.pow(1 + monthlyGrowth, m - 1);
        cumulativeSavingsAcc += monthlySavings * factor;
      }
      const netCashFlow = cumulativeSavingsAcc - effectiveProjectCost;

      points.push({
        month: m,
        label: m === 0 ? 'Start' : `M${m}`,
        cumulativeSavings: Math.round(cumulativeSavingsAcc),
        capexLine: effectiveProjectCost,
        netCashFlow: Math.round(netCashFlow),
        isBreakeven: Math.abs(m - Math.round(paybackResults.months)) <= 0.5
      });
    }

    return points;
  }, [effectiveProjectCost, monthlySavings, paybackResults.months, includeCompoundedGrowth, annualGrowthRatePercent]);

  // 8. Tariff Sensitivity Sweep Data for Recharts
  const tariffSensitivityData = useMemo(() => {
    const tariffSteps = [15, 20, 24.83, 30, 35, 40, 45, 50, 55, 60];
    return tariffSteps.map(t => {
      const annSavings = (annualEnergySavedKwh * t) + annualDemandCostSavings;
      const mos = annSavings > 0 && effectiveProjectCost > 0 
        ? (effectiveProjectCost / annSavings) * 12 
        : 0;
      return {
        tariff: t,
        tariffLabel: `Rs. ${t}`,
        paybackMonths: Number(mos.toFixed(1)),
        annualSavings: Math.round(annSavings),
        isActive: Math.abs(t - tariffPerKwh) < 0.5
      };
    });
  }, [annualEnergySavedKwh, annualDemandCostSavings, effectiveProjectCost, tariffPerKwh]);

  return (
    <div className="card-3d-static overflow-hidden space-y-0">
      
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Calculator className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white drop-shadow-2xs">
                  Economic Analysis & Simple Payback Period
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold uppercase tracking-wider">
                  WAPDA ELR Standard
                </span>
                {paybackResults.months !== Infinity && paybackResults.months > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${paybackResults.statusColor}`}>
                    {paybackResults.statusLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Financial justification comparing Annual Energy Loss reduction benefits against Capital Expenditure (CapEx).
              </p>
            </div>
          </div>
        </div>

        {/* Quick tariff & source indicator */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs shadow-inner">
          <span className="text-slate-300 text-[11px]">Active Tariff:</span>
          <span className="font-mono font-bold text-emerald-400">
            Rs. {tariffPerKwh.toFixed(2)} / kWh
          </span>
        </div>
      </div>

      {/* 2. Executive KPI Cards (3D Tactile Deck) */}
      <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Simple Payback Period (In Months) - The Core Metric */}
          <div className="card-3d-dark text-white p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-indigo-500/15 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-300" />
                  Simple Payback Period
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase font-bold">
                  In Months
                </span>
              </div>
              
              <div className="mt-2.5 flex items-baseline gap-2">
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-xs">
                  {paybackResults.formattedMonths}
                </div>
              </div>
              
              <div className="text-xs text-indigo-200 font-mono mt-1">
                Equivalent: <span className="font-bold text-white">{paybackResults.formattedYears}</span>
              </div>
            </div>

            {/* Payback Visual Gauge / Status Bar */}
            <div className="mt-3 pt-2.5 border-t border-indigo-700/60">
              <div className="flex items-center justify-between text-[10px] text-indigo-200 mb-1">
                <span>3-Yr Utility Benchmark</span>
                <span className="font-mono">{paybackResults.months <= 36 ? 'Compliant' : 'Extended'}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-indigo-700/50 shadow-inner">
                <div 
                  className={`h-full transition-all duration-500 ${paybackResults.badgeBg}`}
                  style={{ 
                    width: `${Math.min(100, Math.max(5, (paybackResults.months / 36) * 100))}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Annual Energy Loss Saved */}
          <div className="card-3d p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                Annual Energy Loss Saved
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-2 tracking-tight">
                {annualEnergySavedKwh.toLocaleString()} <span className="text-xs font-sans font-bold text-slate-500">kWh/yr</span>
              </div>
              <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{percentEnergySaved.toFixed(1)}% reduction</span>
              </div>
            </div>

            <div className="panel-sunken-3d p-2 mt-3 text-[11px] font-mono text-slate-600 flex items-center justify-between">
              <span>Base: {baselineAnnualLossKwh.toLocaleString()}</span>
              <span>→ Prop: {proposedAnnualLossKwh.toLocaleString()}</span>
            </div>
          </div>

          {/* Card 3: Annual Financial Loss Reduction */}
          <div className="card-3d p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                Annual Financial Savings
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-2 tracking-tight">
                {currency} {Math.round(totalAnnualSavings).toLocaleString()}
              </div>
              <div className="text-xs text-blue-700 font-semibold mt-1 font-mono">
                {currency} {Math.round(monthlySavings).toLocaleString()} / month
              </div>
            </div>

            <div className="panel-sunken-3d p-2 mt-3 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Energy Tariff:</span>
              <span className="font-mono font-bold text-slate-800">Rs. {tariffPerKwh.toFixed(2)}/kWh</span>
            </div>
          </div>

          {/* Card 4: Estimated Project Cost (CapEx) */}
          <div className="card-3d p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  Estimated Project Cost
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                  capexMode === 'dynamic' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {capexMode === 'dynamic' ? 'Dynamic BOQ' : 'Custom'}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-2">
                {currency} {effectiveProjectCost.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {capexMode === 'dynamic' 
                  ? `${itemizedInterventions.filter(i => i.isActive).length} active intervention items`
                  : 'Manual operator override budget'}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] flex items-center justify-between">
              <span className="text-slate-500">Simple Annual ROI:</span>
              <span className="font-mono font-bold text-emerald-700">
                {economicMetrics.annualRoiPercent.toFixed(1)}% / yr
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Interactive Controls & Settings Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          {/* Tariff Controls & Presets */}
          <div className="space-y-1.5 w-full lg:w-auto">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Electricity Tariff (Rs. / kWh):</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  max="100"
                  value={tariffPerKwh}
                  onChange={(e) => setTariffPerKwh(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-0.5 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-500">Rs.</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: '20.00 (Off-Peak)', val: 20.00 },
                { label: '24.83 (Baseline)', val: 24.83 },
                { label: '32.50 (Commercial)', val: 32.50 },
                { label: '42.00 (General)', val: 42.00 },
                { label: '50.00 (Peak)', val: 50.00 }
              ].map(preset => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setTariffPerKwh(preset.val)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                    Math.abs(tariffPerKwh - preset.val) < 0.1
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cost Mode & Additional Options */}
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-start lg:justify-end">
            
            {/* CapEx Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCapexMode('dynamic')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  capexMode === 'dynamic'
                    ? 'bg-white text-indigo-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Auto Dynamic CapEx
              </button>
              <button
                type="button"
                onClick={() => setCapexMode('custom')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  capexMode === 'custom'
                    ? 'bg-white text-indigo-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Budget
              </button>
            </div>

            {capexMode === 'custom' && (
              <div className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                <span className="text-[11px] font-bold text-purple-900">Custom Budget:</span>
                <input
                  type="number"
                  step="50000"
                  min="0"
                  value={customCapex}
                  onChange={(e) => setCustomCapex(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2 py-0.5 text-xs font-mono font-bold text-purple-900 bg-white border border-purple-300 rounded text-center focus:outline-none"
                />
              </div>
            )}

            {/* Checkbox Options */}
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={includeDemandCharges}
                  onChange={(e) => setIncludeDemandCharges(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-[11px] font-medium">Add Peak Demand Savings (Rs. 4,837/kW)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={includeCompoundedGrowth}
                  onChange={(e) => setIncludeCompoundedGrowth(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-[11px] font-medium">Compound Load Growth ({annualGrowthRatePercent}%)</span>
              </label>
            </div>

          </div>

        </div>
      </div>

      {/* 4. Tab Navigation for Detailed Views */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-4 sm:px-5">
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {[
            { id: 'breakeven', label: 'Breakeven Payback Curve', icon: Clock },
            { id: 'breakdown', label: 'Itemized Intervention CapEx', icon: Wrench },
            { id: 'sensitivity', label: 'Tariff vs Payback Sensitivity', icon: SlidersHorizontal },
            { id: 'cashflow', label: '5-Year Cumulative Ledger', icon: Calendar }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Tab Content Views */}
      <div className="p-4 sm:p-5 bg-white">
        
        {/* Tab 1: Breakeven & Cumulative Cash Flow Chart */}
        {activeTab === 'breakeven' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Investment Breakeven Trajectory</span>
                  <span className="text-[11px] font-mono font-normal text-slate-500">
                    (Net Cumulative Cash Flow over Time)
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Visualizes monthly energy loss savings accumulating to offset the capital expenditure. The curve crosses zero at month <strong className="text-indigo-700">{paybackResults.months.toFixed(1)}</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Cumulative Savings
                </span>
                <span className="flex items-center gap-1 text-indigo-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                  Net Cash Flow
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-0.5 bg-rose-500 inline-block border-b border-rose-500 border-dashed" />
                  CapEx Threshold
                </span>
              </div>
            </div>

            {/* Recharts Chart Container */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={breakevenChartData}
                  margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Timeline (Months After Commissioning)', position: 'insideBottom', offset: -10, fontSize: 11 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => `Rs.${(val / 1000).toFixed(0)}k`}
                    label={{ value: 'Cash Flow (PKR)', angle: -90, position: 'insideLeft', offset: -5, fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: any) => {
                      const num = Number(value) || 0;
                      if (name === 'Cumulative Savings') return [`Rs. ${num.toLocaleString()}`, name];
                      if (name === 'Net Cash Flow') return [`Rs. ${num.toLocaleString()}`, name];
                      if (name === 'CapEx Investment') return [`Rs. ${num.toLocaleString()}`, name];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Month ${label}`}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />

                  {/* Reference line for zero break-even */}
                  <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                  
                  {/* Reference line for Payback Month */}
                  {paybackResults.months !== Infinity && paybackResults.months > 0 && (
                    <ReferenceLine 
                      x={Math.round(paybackResults.months)} 
                      stroke="#4f46e5" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ 
                        value: `Breakeven @ ${paybackResults.months.toFixed(1)} Mos`, 
                        position: 'top', 
                        fill: '#4338ca', 
                        fontSize: 10, 
                        fontWeight: 'bold' 
                      }} 
                    />
                  )}

                  <Area 
                    type="monotone" 
                    dataKey="cumulativeSavings" 
                    name="Cumulative Savings" 
                    fill="#10b981" 
                    fillOpacity={0.15} 
                    stroke="#10b981" 
                    strokeWidth={2} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="capexLine" 
                    name="CapEx Investment" 
                    stroke="#f43f5e" 
                    strokeWidth={1.5} 
                    strokeDasharray="5 5" 
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="netCashFlow" 
                    name="Net Cash Flow" 
                    stroke="#4f46e5" 
                    strokeWidth={2.5} 
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory Callout Box */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-start gap-3 text-xs">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-800">
                  Simple Payback Period Calculation Logic:
                </p>
                <div className="font-mono text-[11px] text-slate-600 space-y-0.5">
                  <div>• Project CapEx = <span className="font-bold text-slate-900">Rs. {effectiveProjectCost.toLocaleString()}</span></div>
                  <div>• Annual Energy Saved = <span className="font-bold text-emerald-700">{annualEnergySavedKwh.toLocaleString()} kWh</span> × Rs. {tariffPerKwh} = <span className="font-bold text-slate-900">Rs. {Math.round(annualEnergyCostSavings).toLocaleString()}/yr</span></div>
                  <div>• Monthly Financial Benefit = Rs. {Math.round(totalAnnualSavings).toLocaleString()} ÷ 12 = <span className="font-bold text-slate-900">Rs. {Math.round(monthlySavings).toLocaleString()}/month</span></div>
                  <div>• <strong>Simple Payback Period</strong> = Rs. {effectiveProjectCost.toLocaleString()} ÷ (Rs. {Math.round(monthlySavings).toLocaleString()} / month) = <strong className="text-indigo-800 text-xs">{paybackResults.months.toFixed(1)} Months</strong> ({paybackResults.years.toFixed(2)} Years)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Itemized Intervention CapEx */}
        {activeTab === 'breakdown' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Intervention-Driven Cost Breakdown (Schedule of Rates)
                </h4>
                <p className="text-xs text-slate-500">
                  Itemized capital expenditure automatically derived from the active What-If settings in Panels 1 through 4.
                </p>
              </div>

              {onOpenCostEstimation && (
                <button
                  type="button"
                  onClick={onOpenCostEstimation}
                  className="text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full Cost Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {itemizedInterventions.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-8 border border-dashed border-slate-300 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No Interventions Currently Active</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Select an intervention package above (Line Bifurcation, Transformer Augmentation, Re-conductoring, or Shunt Capacitors) to generate the live dynamic project estimate.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Intervention Item</th>
                      <th className="py-2.5 px-3">Scope / Quantity</th>
                      <th className="py-2.5 px-3">Unit Standard Rate</th>
                      <th className="py-2.5 px-3 text-right">Estimated CapEx (PKR)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {itemizedInterventions.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{item.description}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {item.quantityStr}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          Rs. {item.unitCost.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          Rs. {item.totalCost.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Subtotal & Grand Total Row */}
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                      <td colSpan={3} className="py-3 px-3 text-right font-sans text-xs uppercase text-slate-700">
                        Total Estimated Project Investment (CapEx):
                      </td>
                      <td className="py-3 px-3 text-right text-base text-indigo-900">
                        Rs. {calculatedDynamicCapex.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Tariff Sensitivity Sweep */}
        {activeTab === 'sensitivity' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Tariff Sensitivity: Impact of Energy Pricing on Payback Period
              </h4>
              <p className="text-xs text-slate-500">
                Observes how fluctuating bulk supply tariffs shorten the payback period in months. Higher statutory tariffs accelerate utility capital recovery.
              </p>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={tariffSensitivityData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="tariff" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `Rs.${v}`}
                    label={{ value: 'Energy Tariff (Rs. / kWh)', position: 'insideBottom', offset: -10, fontSize: 11 }}
                  />
                  <YAxis 
                    dataKey="paybackMonths"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Payback (Months)', angle: -90, position: 'insideLeft', offset: -5, fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(val: any, name: any) => [`${val} Months`, 'Payback Period']}
                    labelFormatter={(val) => `Tariff: Rs. ${val} / kWh`}
                  />
                  <ReferenceLine 
                    x={Number(tariffPerKwh.toFixed(1))} 
                    stroke="#10b981" 
                    strokeWidth={2}
                    label={{ value: 'Active Tariff', position: 'top', fill: '#059669', fontSize: 10, fontWeight: 'bold' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="paybackMonths" 
                    name="Payback (Months)" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#4f46e5' }}
                    activeDot={{ r: 6, fill: '#10b981' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Sensitivity Table */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-center text-xs">
              {tariffSensitivityData.slice(0, 5).map(item => (
                <div 
                  key={item.tariff}
                  onClick={() => setTariffPerKwh(item.tariff)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    Math.abs(item.tariff - tariffPerKwh) < 0.1
                      ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 block">Rs. {item.tariff}/kWh</span>
                  <span className="text-sm font-black text-slate-900 block mt-0.5">{item.paybackMonths} Mos</span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">Rs. {(item.annualSavings / 1000).toFixed(0)}k/yr</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: 5-Year Cumulative Ledger */}
        {activeTab === 'cashflow' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                5-Year Cumulative Cash Flow Ledger & Benefit-Cost Ratio
              </h4>
              <p className="text-xs text-slate-500">
                Multi-year projection incorporating energy loss reduction, compound demand growth, and net cumulative capital returns.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px] font-sans">
                  <tr>
                    <th className="py-2.5 px-3">Operating Year</th>
                    <th className="py-2.5 px-3 text-right">Annual Savings (PKR)</th>
                    <th className="py-2.5 px-3 text-right">Cumulative Savings</th>
                    <th className="py-2.5 px-3 text-right">Net Position (Cash - CapEx)</th>
                    <th className="py-2.5 px-3 text-right">Cumulative ROI (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {economicMetrics.yearlyCashFlow.map(row => (
                    <tr key={row.year} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                        Year {row.year} {row.year === Math.ceil(paybackResults.years) && (
                          <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                            ★ Payback Year
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                        Rs. {row.savings.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-800">
                        Rs. {row.cumulativeSavings.toLocaleString()}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${
                        row.netCash >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {row.netCash >= 0 ? '+' : ''}Rs. {row.netCash.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                        {row.roi}%
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200 font-sans">
                    <td className="py-3 px-3 uppercase text-xs text-slate-700">
                      5-Year Financial Summary:
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-right text-xs text-emerald-900">
                      Total 5-Yr Benefit: <strong>Rs. {economicMetrics.fiveYearTotalSavings.toLocaleString()}</strong>
                    </td>
                    <td className="py-3 px-3 text-right text-xs text-emerald-900 font-mono">
                      Net Profit: <strong>Rs. {economicMetrics.fiveYearNetProfit.toLocaleString()}</strong>
                    </td>
                    <td className="py-3 px-3 text-right text-xs text-indigo-900 font-mono">
                      BCR: <strong>{economicMetrics.fiveYearBcr.toFixed(2)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-900 block">5-Year Net Profit</span>
                <span className="text-base font-black text-emerald-950 font-mono mt-0.5 block">
                  Rs. {economicMetrics.fiveYearNetProfit.toLocaleString()}
                </span>
                <span className="text-[11px] text-emerald-700 mt-0.5 block">After 100% CapEx recovery</span>
              </div>
              <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-900 block">Benefit-Cost Ratio (BCR)</span>
                <span className="text-base font-black text-indigo-950 font-mono mt-0.5 block">
                  {economicMetrics.fiveYearBcr.toFixed(2)} : 1.0
                </span>
                <span className="text-[11px] text-indigo-700 mt-0.5 block">
                  {economicMetrics.fiveYearBcr >= 1.0 ? 'Highly Viable (BCR ≥ 1.0)' : 'Below Breakeven'}
                </span>
              </div>
              <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200">
                <span className="text-[10px] uppercase font-bold text-blue-900 block">Simple Annual Return</span>
                <span className="text-base font-black text-blue-950 font-mono mt-0.5 block">
                  {economicMetrics.annualRoiPercent.toFixed(1)}% / Year
                </span>
                <span className="text-[11px] text-blue-700 mt-0.5 block">Annual cash return on CapEx</span>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
