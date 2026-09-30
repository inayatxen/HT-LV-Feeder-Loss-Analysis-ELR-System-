/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  filename?: string;
  paperSize?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
  reportTitle?: string;
  docReference?: string;
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
    reportTitle = 'PESCO WAPDA Engineering Estimate & BOQ Dossier',
    docReference = ''
  } = options;

  let rawFilename = (options.filename || `Estimate_Report_${new Date().toISOString().slice(0, 10)}`).trim();
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

    // High quality canvas render
    const canvas = await html2canvas(element, {
      scale: 2, // 2x scale for sharp text and vector rendering
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
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
