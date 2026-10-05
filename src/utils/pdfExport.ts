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
}

export interface PdfExportResult {
  success: boolean;
  filename: string;
  pageCount: number;
  error?: string;
}

/**
 * Dimensions in millimeters for standard paper formats
 */
const PAPER_DIMENSIONS: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 }
};

/**
 * Generates and downloads a multi-page PDF directly from a DOM element
 * while preserving exact fonts, layout, tables, and colors.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<PdfExportResult> {
  const {
    paperSize = 'a4',
    orientation = 'portrait',
    marginMm = 10,
    reportTitle = 'PESCO WAPDA Engineering Report',
    docReference = '',
    excludeGraphics = false
  } = options;

  let rawFilename = (options.filename || `Report_${new Date().toISOString().slice(0, 10)}`).trim();
  if (!rawFilename.toLowerCase().endsWith('.pdf')) {
    rawFilename += '.pdf';
  }

  try {
    // Determine target paper dimensions
    const baseDim = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.a4;
    const pageWidthMm = orientation === 'portrait' ? baseDim.width : baseDim.height;
    const pageHeightMm = orientation === 'portrait' ? baseDim.height : baseDim.width;

    // Usable print area width and height
    const contentWidthMm = pageWidthMm - (marginMm * 2);
    const contentHeightMm = pageHeightMm - (marginMm * 2) - 8; // Leave 8mm for running footer

    // Check if element contains dedicated per-page units (.print-page-unit)
    const pageUnits = Array.from(element.querySelectorAll<HTMLElement>('.print-page-unit'))
      .filter(unit => unit.offsetParent !== null || window.getComputedStyle(unit).display !== 'none');

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
        const pageCanvas = await html2canvas(unit, {
          scale: 2, // 2x scale for crisp vectors and fonts
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: unit.scrollWidth || 1100,
          onclone: (clonedDoc) => {
            const noPrintItems = clonedDoc.querySelectorAll('.no-print');
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

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        const imgWidthPx = pageCanvas.width;
        const imgHeightPx = pageCanvas.height;

        // Render page unit proportionally inside PDF page with perfect aspect ratio
        const maxPageHeightMm = pageHeightMm - (marginMm * 2);
        const naturalHeightMm = (imgHeightPx * contentWidthMm) / imgWidthPx;
        
        let renderedWidthMm = contentWidthMm;
        let renderedHeightMm = naturalHeightMm;

        if (naturalHeightMm > maxPageHeightMm) {
          renderedHeightMm = maxPageHeightMm;
          renderedWidthMm = (imgWidthPx * maxPageHeightMm) / imgHeightPx;
        }

        const xOffsetMm = marginMm + (contentWidthMm - renderedWidthMm) / 2;
        const yOffsetMm = marginMm;

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

    // High quality canvas render fallback for continuous layouts
    const canvas = await html2canvas(element, {
      scale: 2, // 2x scale for sharp text and vector rendering
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth || 1200,
      windowHeight: element.scrollHeight || 1600,
      onclone: (clonedDoc) => {
        // Expand the cloned element fully
        const targetId = element.id;
        const clonedTarget = targetId ? clonedDoc.getElementById(targetId) : null;
        if (clonedTarget) {
          clonedTarget.style.overflow = 'visible';
          clonedTarget.style.maxHeight = 'none';
          clonedTarget.style.height = 'auto';
        }

        // Hide all no-print elements in the cloned document
        const noPrintItems = clonedDoc.querySelectorAll('.no-print');
        noPrintItems.forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });

        // If excludeGraphics is requested, remove watermarks and decorative badges (keep necessary engineering schematics)
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

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    // Initialize jsPDF instance
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: paperSize,
      compress: true
    });

    // Ratio of pixels per mm on the canvas
    const pxPerMm = imgWidthPx / contentWidthMm;
    const pageHeightPx = contentHeightMm * pxPerMm;

    // Calculate total pages
    const totalPages = Math.ceil(imgHeightPx / pageHeightPx) || 1;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage(paperSize, orientation);
      }

      // Calculate slice coordinates
      const sourceY = page * pageHeightPx;
      const sourceHeight = Math.min(pageHeightPx, imgHeightPx - sourceY);

      // Create a temporary canvas for this specific page slice
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

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        const renderedHeightMm = sourceHeight / pxPerMm;

        // Render page slice onto PDF
        pdf.addImage(
          pageImgData,
          'JPEG',
          marginMm,
          marginMm,
          contentWidthMm,
          renderedHeightMm,
          undefined,
          'FAST'
        );
      }

      // -------------------------------------------------------------
      // Running Footer on every page
      // -------------------------------------------------------------
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // slate-500

      const footerY = pageHeightMm - 5;
      const timestamp = new Date().toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Left: System & Doc Reference
      pdf.text(
        `PESCO / WAPDA Official Estimate Dossier ${docReference ? `· Ref: ${docReference}` : ''}`,
        marginMm,
        footerY
      );

      // Center: Timestamp
      pdf.text(
        `Generated: ${timestamp}`,
        pageWidthMm / 2,
        footerY,
        { align: 'center' }
      );

      // Right: Page X of Y
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.text(
        `Page ${page + 1} of ${totalPages}`,
        pageWidthMm - marginMm,
        footerY,
        { align: 'right' }
      );
    }

    // Save PDF file to trigger download dialog
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
