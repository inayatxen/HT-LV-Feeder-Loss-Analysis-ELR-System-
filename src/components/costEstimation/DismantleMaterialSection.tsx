
import React, { useState, useMemo } from 'react';
import { MaterialItem, EstimateItem } from '../../types/costEstimation';
import { Plus, Trash2, Search, X, Printer } from 'lucide-react';

interface DismantleMaterialSectionProps {
  materials: MaterialItem[];
  items: EstimateItem[];
  onUpdateItems: (items: EstimateItem[]) => void;
}

export const DismantleMaterialSection: React.FC<DismantleMaterialSectionProps> = ({
  materials,
  items,
  onUpdateItems
}) => {
  const [searchText, setSearchText] = useState('');

  const dismantleItems = items.filter(i => i.remarks?.includes('Dismantle'));
  
  const filteredMaterials = useMemo(() => {
    if (!searchText.trim()) return [];
    return materials.filter(m => 
      m.code.toLowerCase().includes(searchText.toLowerCase()) || 
      m.name.toLowerCase().includes(searchText.toLowerCase())
    ).slice(0, 5);
  }, [materials, searchText]);
  
  const totalDismantleMaterialCost = dismantleItems.reduce((sum, item) => sum + item.materialAmount, 0);
  const totalDismantleLabourCost = totalDismantleMaterialCost * 0.10;
  const totalDismantleCost = totalDismantleMaterialCost + totalDismantleLabourCost;

  const handleAddItem = (matCode: string) => {
    const mat = materials.find(m => m.code === matCode);
    if (!mat) return;

    const newItem: EstimateItem = {
      id: `dismantle-${Date.now()}`,
      materialId: mat.id,
      materialCode: mat.code,
      description: `Dismantle: ${mat.name}`,
      specification: mat.specification,
      unit: mat.unit,
      quantity: 1,
      unitRate: mat.materialRate / 3,
      materialAmount: mat.materialRate / 3,
      labourRate: 0,
      labourAmount: 0,
      totalAmount: mat.materialRate / 3,
      remarks: 'Dismantle Material',
      isAutoCalculated: false,
      manualOverride: true
    };
    onUpdateItems([...items, newItem]);
    setSearchText('');
  };

  const handleUpdateItem = (itemId: string, qty: number) => {
    onUpdateItems(items.map(item => {
      if (item.id !== itemId) return item;
      const rate = item.unitRate;
      return {
        ...item,
        quantity: qty,
        materialAmount: rate * qty,
        totalAmount: rate * qty
      };
    }));
  };

  const handleDeleteItem = (itemId: string) => {
    onUpdateItems(items.filter(i => i.id !== itemId));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Dismantle Material Estimate</h3>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
          title="Print Dismantle Estimate"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        <span className="text-[10px] font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
          Materials to be returned to store
        </span>
      </div>
      
      <div className="relative">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search material code or name..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>
        {filteredMaterials.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 z-10 max-h-40 overflow-y-auto">
            {filteredMaterials.map(m => (
              <button
                key={m.id}
                onClick={() => handleAddItem(m.code)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex justify-between"
              >
                <span>{m.code} - {m.name}</span>
                <Plus className="w-3 h-3 text-blue-600" />
              </button>
            ))}
          </div>
        )}
      </div>

      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-2">Code</th>
            <th className="p-2">Description</th>
            <th className="p-2 text-center">Unit</th>
            <th className="p-2 text-right">Qty</th>
            <th className="p-2 text-right">Rate (1/3)</th>
            <th className="p-2 text-right">Amount</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {dismantleItems.map(item => (
            <tr key={item.id} className="border-t">
              <td className="p-2">{item.materialCode}</td>
              <td className="p-2">{item.description}</td>
              <td className="p-2 text-center">{item.unit}</td>
              <td className="p-2 text-right">
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(e) => handleUpdateItem(item.id, Number(e.target.value))}
                  className="w-16 px-1 py-0.5 border border-slate-300 rounded text-right"
                />
              </td>
              <td className="p-2 text-right">{item.unitRate.toLocaleString()}</td>
              <td className="p-2 text-right">{item.totalAmount.toLocaleString()}</td>
              <td className="p-2">
                <button onClick={() => handleDeleteItem(item.id)} className="text-rose-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t pt-4 text-xs font-bold space-y-1">
        <p>Total Material Cost: {totalDismantleMaterialCost.toLocaleString()}</p>
        <p>Labour Charges (10%): {totalDismantleLabourCost.toLocaleString()}</p>
        <p className="text-blue-700">Total Dismantle Estimate: {totalDismantleCost.toLocaleString()}</p>
      </div>
    </div>
  );
};
