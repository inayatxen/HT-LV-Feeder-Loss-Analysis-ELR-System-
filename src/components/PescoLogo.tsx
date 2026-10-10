/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface PescoLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

export const PescoLogo: React.FC<PescoLogoProps> = ({
  className = 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16',
  size,
  alt = 'Peshawar Electric Supply Company (PESCO / WAPDA) - FLADIX'
}) => {
  return (
    <div className="bg-white rounded-2xl p-1.5 shadow-md border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105">
      <img
        src="/pesco-logo.svg"
        alt={alt}
        width={size}
        height={size}
        className={`object-contain rounded-xl ${className}`}
        loading="eager"
      />
    </div>
  );
};

