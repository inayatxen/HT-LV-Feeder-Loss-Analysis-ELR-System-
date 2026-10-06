import React from 'react';
import { EstimateItem } from '../../types/costEstimation';
import { Trash2, Copy } from 'lucide-react';

interface Props {
  items: EstimateItem[];
  onUpdateItem: (itemId: string, field: 'quantity' | 'unitRate' | 'labourRate' | 'remarks', value: any) => void;
  onDeleteItem: (itemId: string) => void;
  onDuplicateItem: (item: EstimateItem) => void;
}

export const DismantledItemsTable: React.FC<Props> = ({ items, onUpdateItem, onDeleteItem, onDuplicateItem }) => {
  const totalMaterial = items.reduce((sum, item) => sum + (item.materialAmount / 3), 0);
  const totalLabour = (totalMaterial) * 0.1;
  const grandTotal = totalMaterial + totalLabour;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <h3 className="text-sm font-bold text-slate-900">Dismantle Material Estimate</h3>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
            <th className="py-2.5 px-3">Description</th>
            <th className="py-2.5 px-3 text-right">Quantity</th>
            <th className="py-2.5 px-3 text-right">Material Rate (Actual)</th>
            <th className="py-2.5 px-3 text-right">Material Rate (1/3)</th>
            <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
            <th className="py-2.5 px-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
          {items.map((item, idx) => (
            <tr key={item.id}>
              <td className="py-2 px-3 font-bold">{item.description}</td>
              <td className="py-2 px-3 text-right">{item.quantity}</td>
              <td className="py-2 px-3 text-right">{item.unitRate.toLocaleString()}</td>
              <td className="py-2 px-3 text-right">{(item.unitRate / 3).toLocaleString()}</td>
              <td className="py-2 px-3 text-right">{((item.materialAmount) / 3).toLocaleString()}</td>
              <td className="py-2 px-2 text-center">
                  <button onClick={() => onDeleteItem(item.id)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5"/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right pt-4 border-t">
        <p>Total Material Cost (1/3): <strong>PKR {totalMaterial.toLocaleString()}</strong></p>
        <p>10% Labour Charges: <strong>PKR {totalLabour.toLocaleString()}</strong></p>
        <p className="text-lg font-bold">Grand Total: <strong>PKR {grandTotal.toLocaleString()}</strong></p>
      </div>
    </div>
  );
};
