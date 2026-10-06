import React from 'react';
import { EstimateLineDetails } from '../../types/costEstimation';
import { HT_POLE_FOUNDATION_RATE, LT_POLE_FOUNDATION_RATE, calculateFoundationCharges } from '../../utils/foundationCharges';
import { Layers } from 'lucide-react';

interface FoundationChargesSectionProps {
  details: EstimateLineDetails;
  onUpdateDetails: (details: EstimateLineDetails) => void;
}

export const FoundationChargesSection: React.FC<FoundationChargesSectionProps> = ({ details, onUpdateDetails }) => {
  const foundationCost = calculateFoundationCharges(details);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Foundation Charges
        </h3>
        <label className="flex items-center gap-2 cursor-pointer">
            <input
            type="checkbox"
            checked={details.foundationEnabled || false}
            onChange={(e) => onUpdateDetails({ ...details, foundationEnabled: e.target.checked })}
            className="rounded text-emerald-600"
            />
            <span className="text-xs font-semibold">Enabled</span>
        </label>
      </div>
      
      {details.foundationEnabled && (
        <div className="space-y-2 text-xs">
            <div className="flex justify-between">
                <span>HT Poles ({details.htPoles} × Rs. {HT_POLE_FOUNDATION_RATE.toLocaleString()}):</span>
                <span className="font-mono">Rs. {((details.htPoles || 0) * HT_POLE_FOUNDATION_RATE).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
                <span>LT Poles ({details.ltPoles} × Rs. {LT_POLE_FOUNDATION_RATE.toLocaleString()}):</span>
                <span className="font-mono">Rs. {((details.ltPoles || 0) * LT_POLE_FOUNDATION_RATE).toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-emerald-700">
                <span>Total Foundation Charges:</span>
                <span className="font-mono">Rs. {foundationCost.toLocaleString()}</span>
            </div>
        </div>
      )}
    </div>
  );
};
