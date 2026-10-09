import React, { createContext, useContext, useState, useEffect } from 'react';
import { MaterialItem } from '../types/costEstimation';
import { INITIAL_MATERIALS } from '../data/materialMaster';

interface MaterialContextType {
  materials: MaterialItem[];
  updateMaterialRate: (id: string, newRate: number) => void;
  setAllMaterials: (materials: MaterialItem[]) => void;
}

const MaterialContext = createContext<MaterialContextType | undefined>(undefined);

export const MaterialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);

  useEffect(() => {
    const savedMaterials = localStorage.getItem('material_overrides');
    if (savedMaterials) {
      setMaterials(JSON.parse(savedMaterials));
    }
  }, []);

  const updateMaterialRate = (id: string, newRate: number) => {
    const updated = materials.map(m => m.id === id ? { ...m, materialRate: newRate } : m);
    setMaterials(updated);
    localStorage.setItem('material_overrides', JSON.stringify(updated));
  };

  const setAllMaterials = (newMaterials: MaterialItem[]) => {
    setMaterials(newMaterials);
    localStorage.setItem('material_overrides', JSON.stringify(newMaterials));
  };

  return (
    <MaterialContext.Provider value={{ materials, updateMaterialRate, setAllMaterials }}>
      {children}
    </MaterialContext.Provider>
  );
};

export const useMaterials = () => {
  const context = useContext(MaterialContext);
  if (!context) {
    throw new Error('useMaterials must be used within a MaterialProvider');
  }
  return context;
};
