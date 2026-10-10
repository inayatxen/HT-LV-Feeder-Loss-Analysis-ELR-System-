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
  className = 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
  size,
  alt = 'Peshawar Electric Supply Company (PESCO / WAPDA) - FLADIX'
}) => {
  return (
    <div className="bg-white rounded-2xl p-1.5 shadow-lg border-2 border-amber-400 dark:border-slate-800 flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105">
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

