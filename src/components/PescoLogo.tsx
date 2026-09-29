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
  className = 'w-10 h-10',
  size,
  alt = 'Peshawar Electric Supply Company (PESCO / WAPDA)'
}) => {
  return (
    <img
      src="/pesco-logo.svg"
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 object-contain rounded-full shadow-xs ${className}`}
      loading="eager"
    />
  );
};
