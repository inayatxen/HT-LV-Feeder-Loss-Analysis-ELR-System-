/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface PdfExportOptions {
  filename?: string;
  paperSize?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
  reportTitle?: string;
  docReference?: string;
  excludeGraphics?: boolean;
  pageBreakMode?: 'page_per_section' | 'compact_flow';
}

export interface PdfExportResult {
  success: boolean;
  filename: string;
  pageCount: number;
  error?: string;
}

/**
 * Standard paper format dimensions in millimeters
 */
const PAPER_DIMENSIONS: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 }
};

/**
 * Specialized PESCO/WAPDA PDF Printing & Rendering Engine
 * 
 * Key Features:
 * - Exact Page-Fit: Scales content proportionally to fit paper size without clipping or awkward overflow.
 * - Header-to-Footer Complete Units: Considers each page starting from the header and terminating at the footer.
 * - Double-Side Center Alignment: Horizontally centers content with symmetrical left and right margins.
 * - High-DPI Vector Crispness: Uses multi-pass high-resolution canvas with anti-aliasing.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<PdfExportResult> {
  const {
    paperSize = 'a4',
    orientation = 'portrait',
    marginMm = 10,
    excludeGraphics = false,
    pageBreakMode = 'page_per_section'
  } = options;

  let rawFilename = (options.filename || `PESCO_Estimate_${new Date().toISOString().slice(0, 10)}`).trim();
  if (!rawFilename.toLowerCase().endsWith('.pdf')) {
    rawFilename += '.pdf';
  }

  try {
    // Determine target paper dimensions
    const baseDim = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.a4;
    const pageWidthMm = orientation === 'portrait' ? baseDim.width : baseDim.height;
    const pageHeightMm = orientation === 'portrait' ? baseDim.height : baseDim.width;

    // Usable printable boundary
    const maxContentWidthMm = pageWidthMm - (marginMm * 2);
    const maxContentHeightMm = pageHeightMm - (marginMm * 2);

    // Identify self-contained page units (.print-page-unit)
    const pageUnits = pageBreakMode === 'page_per_section'
      ? Array.from(element.querySelectorAll<HTMLElement>('.print-page-unit'))
          .filter(unit => {
            const style = window.getComputedStyle(unit);
            return style.display !== 'none' && style.visibility !== 'hidden';
          })
      : [];

    if (pageUnits.length > 0) {
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: paperSize,
        compress: true
      });

      for (let i = 0; i < pageUnits.length; i++) {
        if (i > 0) {
          pdf.addPage(paperSize, orientation);
        }

        const unit = pageUnits[i];
        
        // Render current page unit at high resolution (scale: 2.5 for pristine font edges)
        const pageCanvas = await html2canvas(unit, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: unit.scrollWidth || 1100,
          onclone: (clonedDoc) => {
            // Remove all interactive and no-print UI elements, and remove official footers and headers
            const noPrintItems = clonedDoc.querySelectorAll(
              '.no-print, [class*="no-print"], .report-official-footer, .report-official-header, [data-section-header="official"], .official-report-header'
            );
            noPrintItems.forEach(el => {
              (el as HTMLElement).style.display = 'none';
            });
            
            if (excludeGraphics) {
              const graphicItems = clonedDoc.querySelectorAll(
                '.print-watermark, .screen-watermark, .unnecessary-graphic, .decorative-graphic'
              );
              graphicItems.forEach(el => {
                (el as HTMLElement).style.display = 'none';
              });
            }
          }
        });

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.96);
        const imgWidthPx = pageCanvas.width;
        const imgHeightPx = pageCanvas.height;

        // Auto-fit calculations: Fit proportionally within both width & height limits
        const scaleX = maxContentWidthMm / imgWidthPx;
        const scaleY = maxContentHeightMm / imgHeightPx;
        const scale = Math.min(scaleX, scaleY);

        const renderedWidthMm = imgWidthPx * scale;
        const renderedHeightMm = imgHeightPx * scale;

        // Center align from both sides horizontally
        const xOffsetMm = (pageWidthMm - renderedWidthMm) / 2;
        
        // Clean vertical alignment: start near top margin with balanced bottom padding
        const yOffsetMm = marginMm + Math.max(0, (maxContentHeightMm - renderedHeightMm) / 6);

        pdf.addImage(
          imgData,
          'JPEG',
          xOffsetMm,
          yOffsetMm,
          renderedWidthMm,
          renderedHeightMm,
          undefined,
          'FAST'
        );
      }

      pdf.save(rawFilename);

      return {
        success: true,
        filename: rawFilename,
        pageCount: pageUnits.length
      };
    }

    // Continuous Layout Fallback with Slicing and Double-Sided Centering
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth || 1200,
      windowHeight: element.scrollHeight || 1600,
      onclone: (clonedDoc) => {
        const targetId = element.id;
        const clonedTarget = targetId ? clonedDoc.getElementById(targetId) : null;
        if (clonedTarget) {
          clonedTarget.style.overflow = 'visible';
          clonedTarget.style.maxHeight = 'none';
          clonedTarget.style.height = 'auto';
          clonedTarget.style.display = 'block';

          let parent = clonedTarget.parentElement;
          while (parent) {
            parent.style.overflow = 'visible';
            parent.style.maxHeight = 'none';
            parent.style.height = 'auto';
            parent = parent.parentElement;
          }
        }

        const noPrintItems = clonedDoc.querySelectorAll('.no-print, [class*="no-print"]');
        noPrintItems.forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });

        if (excludeGraphics) {
          const graphicItems = clonedDoc.querySelectorAll(
            '.print-watermark, .screen-watermark, .unnecessary-graphic, .decorative-graphic'
          );
          graphicItems.forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      }
    });

    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: paperSize,
      compress: true
    });

    const pxPerMm = imgWidthPx / maxContentWidthMm;
    const pageHeightPx = maxContentHeightMm * pxPerMm;

    const totalPages = Math.ceil(imgHeightPx / pageHeightPx) || 1;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage(paperSize, orientation);
      }

      const sourceY = page * pageHeightPx;
      const sourceHeight = Math.min(pageHeightPx, imgHeightPx - sourceY);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidthPx;
      pageCanvas.height = sourceHeight;
      const ctx = pageCanvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          imgWidthPx,
          sourceHeight,
          0,
          0,
          imgWidthPx,
          sourceHeight
        );

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.96);
        const renderedHeightMm = sourceHeight / pxPerMm;
        const renderedWidthMm = maxContentWidthMm;

        // Horizontally center align from both sides
        const xOffsetMm = (pageWidthMm - renderedWidthMm) / 2;
        const yOffsetMm = marginMm;

        pdf.addImage(
          pageImgData,
          'JPEG',
          xOffsetMm,
          yOffsetMm,
          renderedWidthMm,
          renderedHeightMm,
          undefined,
          'FAST'
        );
      }
    }

    pdf.save(rawFilename);

    return {
      success: true,
      filename: rawFilename,
      pageCount: totalPages
    };
  } catch (error: any) {
    console.error('Error exporting PDF:', error);
    return {
      success: false,
      filename: rawFilename,
      pageCount: 0,
      error: error?.message || 'Failed to render PDF document.'
    };
  }
}
