/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';

interface PescoLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
  clickable?: boolean;
}

export const useCustomLogo = () => {
  const [logoSrc, setLogoSrc] = useState<string>(() => {
    return localStorage.getItem('custom_pesco_logo') || '/pesco-logo.svg';
  });

  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem('custom_pesco_logo');
      if (stored) {
        setLogoSrc(stored);
      } else {
        setLogoSrc('/pesco-logo.svg');
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('custom-logo-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('custom-logo-updated', handleStorage);
    };
  }, []);

  const updateLogo = (newSrc: string) => {
    localStorage.setItem('custom_pesco_logo', newSrc);
    setLogoSrc(newSrc);
    window.dispatchEvent(new Event('custom-logo-updated'));
  };

  const removeLogo = () => {
    localStorage.removeItem('custom_pesco_logo');
    setLogoSrc('/pesco-logo.svg');
    window.dispatchEvent(new Event('custom-logo-updated'));
  };

  return { logoSrc, updateLogo, removeLogo };
};

export const PescoLogo: React.FC<PescoLogoProps> = ({
  className = '',
  size = 70,
  alt = 'Peshawar Electric Supply Company (PESCO / WAPDA) - FLADIX',
  clickable = true
}) => {
  const { logoSrc, updateLogo } = useCustomLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (clickable && fileInputRef.current) {
      e.stopPropagation();
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          updateLogo(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      onClick={handleClick}
      title={clickable ? "Click to upload custom logo from PC" : alt}
      style={{ width: '70px', height: '70px', minWidth: '70px', minHeight: '70px' }}
      className={`bg-white rounded-2xl p-1.5 shadow-lg border-2 border-amber-400 dark:border-slate-800 flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 relative group ${clickable ? 'cursor-pointer' : ''}`}
    >
      <img
        src={logoSrc}
        alt={alt}
        width={size}
        height={size}
        className={`w-full h-full object-contain rounded-xl ${className}`}
        loading="eager"
      />
      {clickable && (
        <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold pointer-events-none text-center px-0.5 shadow-md">
          Upload
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};
