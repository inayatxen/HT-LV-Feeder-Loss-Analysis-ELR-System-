/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface FladixOfficialHeaderProps {
  subtitle?: string;
  badgeLabel?: string; // Default: 'INDEX'
  badgeStd?: string;   // Default: 'STD'
  refCode?: string;
  dateStr?: string;
  category?: string;
  nominalVoltage?: string | number;
  division?: string;
  preparedBy?: string;
  pageNumberText?: string;
  showMetaBar?: boolean;
  className?: string;
}

/**
 * Official FLADIX Engineering Dossier Header
 * Matches exact WAPDA / PESCO design specification with PESCO insignia,
 * standardized title hierarchy, and FLADIX INDEX STD validation badge.
 */
export const FladixOfficialHeader: React.FC<FladixOfficialHeaderProps> = ({
  subtitle = 'Feeder Loading, Transformer Overloading, Line Losses & Upgradation Study',
  badgeLabel = 'INDEX',
  badgeStd = 'STD',
  refCode,
  dateStr,
  category,
  nominalVoltage,
  division = 'Peshawar City',
  preparedBy,
  pageNumberText,
  showMetaBar = true,
  className = ''
}) => {
  const hasMeta = showMetaBar && (refCode || dateStr || category || nominalVoltage || division || preparedBy || pageNumberText);

  return (
    <header className={`border-b-2 border-slate-900 pb-2.5 mb-3 print-avoid-break w-full select-none ${className}`}>
      {/* Top Main Header Row (Matches User Reference Image) */}
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Official PESCO Insignia */}
        <div className="shrink-0">
          <img
            src="/pesco-logo.svg"
            alt="PESCO Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain"
          />
        </div>

        {/* Center: Standardized Official Hierarchy */}
        <div className="text-center flex-1 px-1 sm:px-2">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest font-extrabold text-slate-800 mb-0.5">
            PESHAWAR ELECTRIC SUPPLY COMPANY (PESCO) · WAPDA
          </div>
          <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-950 tracking-tight leading-tight">
            FLADIX, Feeder Loss Analysis and Data Indexing
          </h1>
          <div className="text-[10px] sm:text-xs font-semibold text-slate-600 mt-0.5">
            {subtitle}
          </div>
        </div>

        {/* Right: Official FLADIX INDEX STD Insignia Box */}
        <div className="flex flex-col items-center justify-center w-12 sm:w-16 shrink-0 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-slate-900 flex flex-col items-center justify-center bg-white p-1 shadow-2xs">
            <span className="text-[7.5px] sm:text-[9px] font-black uppercase text-slate-900 leading-none">
              FLADIX
            </span>
            <span className="text-[9.5px] sm:text-[11px] font-black text-amber-600 leading-tight">
              {badgeLabel}
            </span>
            <span className="text-[6.5px] sm:text-[8px] font-bold text-slate-600 leading-none">
              {badgeStd}
            </span>
          </div>
        </div>
      </div>

      {/* Subtle Metadata Sub-Bar (When Available) */}
      {hasMeta && (
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] font-mono text-slate-600 mt-2 pt-1.5 border-t border-slate-200">
          {refCode && (
            <span>Ref: <strong>{refCode}</strong></span>
          )}
          {refCode && dateStr && <span aria-hidden="true" className="hidden sm:inline">·</span>}
          {dateStr && (
            <span>Date: <strong>{dateStr}</strong></span>
          )}
          {(refCode || dateStr) && category && <span aria-hidden="true" className="hidden sm:inline">·</span>}
          {category && (
            <span>Category: <strong>{category}</strong></span>
          )}
          {category && nominalVoltage && <span aria-hidden="true" className="hidden sm:inline">·</span>}
          {nominalVoltage && (
            <span>Voltage: <strong>{nominalVoltage} V</strong></span>
          )}
          {division && (
            <>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span>Division: <strong>{division}</strong></span>
            </>
          )}
          {preparedBy && (
            <>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="text-amber-900 bg-amber-50 px-2 py-0.2 rounded border border-amber-300">
                Prepared by: <strong>{preparedBy}</strong>
              </span>
            </>
          )}
          {pageNumberText && (
            <>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.2 rounded border border-slate-300 text-[10px]">
                {pageNumberText}
              </span>
            </>
          )}
        </div>
      )}
    </header>
  );
};
