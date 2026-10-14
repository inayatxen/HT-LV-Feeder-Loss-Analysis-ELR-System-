/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { FeederData, FeederNode, FeederSegment } from '../types/feeder';

export interface ParsedKmlPlacemark {
  id: string;
  name: string;
  description: string;
  type: 'Point' | 'LineString' | 'Unknown';
  coordinates: { lat: number; lng: number; alt?: number }[];
  spotLoadKva?: number;
  poleNumber?: string;
}

export interface KmlParseResult {
  feeder: FeederData;
  summary: {
    totalNodes: number;
    totalSegments: number;
    totalLengthKm: number;
    detectedType: 'HT' | 'LT';
    substationName: string;
  };
}

/**
 * Calculates geodesic distance between two coordinates using the Haversine formula (km)
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(4));
}

/**
 * Extracts raw KML XML string from either a .kmz (ZIP archive) or .kml (text) file.
 */
export async function extractKmlTextFromFile(file: File): Promise<{ kmlText: string; fileName: string }> {
  const isKmz = file.name.toLowerCase().endsWith('.kmz');

  if (isKmz) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    // Look for doc.kml or the first .kml file inside the zip archive
    let kmlFile = contents.file('doc.kml');
    if (!kmlFile) {
      const kmlFiles = Object.keys(contents.files).filter(f => f.toLowerCase().endsWith('.kml'));
      if (kmlFiles.length > 0) {
        kmlFile = contents.file(kmlFiles[0]);
      }
    }

    if (!kmlFile) {
      throw new Error(`The KMZ file "${file.name}" does not contain a valid .kml document.`);
    }

    const kmlText = await kmlFile.async('text');
    return { kmlText, fileName: file.name };
  } else {
    // Standard KML text file
    const kmlText = await file.text();
    return { kmlText, fileName: file.name };
  }
}

/**
 * Parses KML XML content into FeederData structure with nodes, segments, and coordinates.
 */
export function parseKmlToFeederData(kmlText: string, originalFileName: string): KmlParseResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');

  // Check for XML parsing error
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('Invalid XML in KML file: ' + parseError[0].textContent);
  }

  // Derive feeder title from Document/Folder name or filename
  const docNameEl = xmlDoc.querySelector('Document > name, Folder > name, kml > name');
  const cleanBaseName = originalFileName
    .replace(/\.(kmz|kml)$/i, '')
    .replace(/_MapToKML/i, '')
    .replace(/ - Copy/i, '')
    .replace(/_/g, ' ')
    .trim();
  const feederName = docNameEl?.textContent?.trim() || `${cleanBaseName} Feeder`;

  // Detect whether it's HT (11kV) or LT (400V)
  const fullText = (kmlText + ' ' + feederName).toLowerCase();
  const isHt = fullText.includes('11kv') || fullText.includes('11 kv') || fullText.includes('ht') || fullText.includes('grid') || fullText.includes('vcb');
  const nominalVoltage = isHt ? 11000 : 400;
  const feederType: 'HT' | 'LT' = isHt ? 'HT' : 'LT';

  const placemarks = xmlDoc.getElementsByTagName('Placemark');
  const parsedPlacemarks: ParsedKmlPlacemark[] = [];

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const name = pm.getElementsByTagName('name')[0]?.textContent?.trim() || `Node ${i}`;
    const desc = pm.getElementsByTagName('description')[0]?.textContent?.trim() || '';

    // Check for Point
    const pointEl = pm.getElementsByTagName('Point')[0];
    if (pointEl) {
      const coordStr = pointEl.getElementsByTagName('coordinates')[0]?.textContent?.trim() || '';
      const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        // KML coordinates are: longitude, latitude, altitude
        const lng = parts[0];
        const lat = parts[1];
        const alt = parts[2] || 0;

        // Extract spot load if mentioned in desc or name
        let spotLoadKva: number | undefined;
        const loadMatch = (desc + ' ' + name).match(/(\d+(?:\.\d+)?)\s*(?:kva|kw)/i);
        if (loadMatch) {
          spotLoadKva = parseFloat(loadMatch[1]);
        }

        parsedPlacemarks.push({
          id: `node-${i}`,
          name,
          description: desc,
          type: 'Point',
          coordinates: [{ lat, lng, alt }],
          spotLoadKva,
          poleNumber: name.match(/(?:p|pole|tower|t)[ -]?(\d+)/i)?.[0] || name
        });
      }
      continue;
    }

    // Check for LineString
    const lineEl = pm.getElementsByTagName('LineString')[0];
    if (lineEl) {
      const coordStr = lineEl.getElementsByTagName('coordinates')[0]?.textContent?.trim() || '';
      const pointStrings = coordStr.split(/\s+/).filter(Boolean);
      const coords = pointStrings.map(ps => {
        const parts = ps.split(',').map(s => parseFloat(s.trim()));
        return { lng: parts[0], lat: parts[1], alt: parts[2] || 0 };
      }).filter(c => !isNaN(c.lat) && !isNaN(c.lng));

      if (coords.length >= 2) {
        parsedPlacemarks.push({
          id: `line-${i}`,
          name,
          description: desc,
          type: 'LineString',
          coordinates: coords
        });
      }
    }
  }

  // Points represent nodes/poles
  const pointPlacemarks = parsedPlacemarks.filter(p => p.type === 'Point');
  const linePlacemarks = parsedPlacemarks.filter(p => p.type === 'LineString');

  if (pointPlacemarks.length === 0 && linePlacemarks.length === 0) {
    throw new Error('No geographic Points or LineStrings found in the provided KML/KMZ file.');
  }

  const nodes: FeederNode[] = [];
  const segments: FeederSegment[] = [];

  if (pointPlacemarks.length > 0) {
    // We have discrete point nodes
    pointPlacemarks.forEach((pm, idx) => {
      const isSource = idx === 0;
      const coord = pm.coordinates[0];

      // Assign realistic load depending on feeder type
      const defaultSpotLoad = isHt 
        ? (isSource ? 0 : (idx % 2 === 0 ? 200 : 100))
        : undefined;

      nodes.push({
        id: `${idx}.0`,
        label: isSource ? `${pm.name} (Source Substation)` : pm.name,
        poleNumber: pm.poleNumber || (isSource ? 'T-0' : `P-${idx}`),
        isTransformerNode: !isHt && isSource,
        threePhaseCustomers: isHt ? (isSource ? 0 : 2) : (isSource ? 0 : (idx % 3 === 0 ? 2 : 0)),
        singlePhaseCustomers: isHt ? (isSource ? 0 : 25) : (isSource ? 0 : 12),
        spotLoadKva: pm.spotLoadKva || defaultSpotLoad,
        x: 80 + idx * 110,
        y: 160 + (idx % 2 === 0 ? 0 : (idx % 4 === 1 ? -60 : 60)),
        lat: coord.lat,
        lng: coord.lng
      });
    });

    // Generate segments connecting nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      const fromNode = nodes[i];
      const toNode = nodes[i + 1];
      const dist = (fromNode.lat && fromNode.lng && toNode.lat && toNode.lng)
        ? haversineDistanceKm(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng)
        : 0.15;

      const safeDist = Math.max(0.015, Math.min(dist, 10.0));
      const conductor = isHt
        ? (i < 3 ? 'PANTHER' : (i < 6 ? 'DOG' : 'RABBIT'))
        : (i < 4 ? 'A' : (i < 7 ? 'PU2' : 'PU3'));

      segments.push({
        id: `s-${fromNode.id.replace('.0', '')}-${toNode.id.replace('.0', '')}`,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        lengthKm: Number(safeDist.toFixed(3)),
        conductorCode: conductor
      });
    }
  } else if (linePlacemarks.length > 0) {
    // Generate nodes from line coordinates
    const allCoords: { lat: number; lng: number }[] = [];
    linePlacemarks.forEach(lp => {
      lp.coordinates.forEach(c => allCoords.push({ lat: c.lat, lng: c.lng }));
    });

    // Deduplicate close points (< 5 meters)
    const uniqueCoords: { lat: number; lng: number }[] = [];
    allCoords.forEach(c => {
      const exists = uniqueCoords.some(uc => haversineDistanceKm(uc.lat, uc.lng, c.lat, c.lng) < 0.005);
      if (!exists) uniqueCoords.push(c);
    });

    uniqueCoords.forEach((c, idx) => {
      const isSource = idx === 0;
      nodes.push({
        id: `${idx}.0`,
        label: isSource ? `${cleanBaseName} 11kV Feeder Bay` : `Pole ${idx}`,
        poleNumber: isSource ? 'CB-01' : `P-${idx}`,
        isTransformerNode: !isHt && isSource,
        threePhaseCustomers: isHt ? (isSource ? 0 : 2) : 0,
        singlePhaseCustomers: isHt ? (isSource ? 0 : 20) : 10,
        spotLoadKva: isHt ? (isSource ? 0 : 150) : undefined,
        x: 80 + idx * 110,
        y: 160,
        lat: c.lat,
        lng: c.lng
      });
    });

    for (let i = 0; i < nodes.length - 1; i++) {
      const fromNode = nodes[i];
      const toNode = nodes[i + 1];
      const dist = haversineDistanceKm(fromNode.lat!, fromNode.lng!, toNode.lat!, toNode.lng!);
      segments.push({
        id: `s-${i}-${i + 1}`,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        lengthKm: Number(Math.max(0.02, dist).toFixed(3)),
        conductorCode: isHt ? (i < 3 ? 'PANTHER' : 'DOG') : 'A'
      });
    }
  }

  // Calculate total transformer / connected capacity
  const totalSpotKva = nodes.reduce((sum, n) => sum + (n.spotLoadKva || 0), 0);
  const existingTransformerKva = isHt ? Math.max(1000, totalSpotKva || 1800) : 100;
  const proposedTransformerKva = isHt ? Math.round(existingTransformerKva * 1.35 / 100) * 100 : 200;

  const feeder: FeederData = {
    id: cleanBaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now().toString(36)}`,
    name: feederName,
    description: `Geographically grounded ${feederType} feeder imported from ${originalFileName}. Contains ${nodes.length} nodes and ${segments.length} spans.`,
    type: feederType,
    category: isHt ? 'HV' : 'LV',
    substationName: `${cleanBaseName} 132/11 kV Grid Substation`,
    gridVoltageKv: isHt ? 11.0 : 11.0,
    nominalVoltage,
    loadPerSinglePhaseCustomerKva: isHt ? 2.5 : 2.0,
    operatingPowerFactor: 0.85,
    loadFactor: 0.65,
    annualGrowthRatePercent: 5.0,
    tariffPerKwh: 24.83,
    currencySymbol: 'Rupees',
    existingTransformerKva,
    proposedTransformerKva,
    workOrderNo: `261471${Math.floor(10000 + Math.random() * 90000)}`,
    schemeCategory: 'ELR',
    elrCode: `ELR-71-26-${Math.floor(100 + Math.random() * 900)}`,
    accountHead: '4-71 ELR Capital Loss Reduction',
    circle: cleanBaseName.toLowerCase().includes('mardan') || cleanBaseName.toLowerCase().includes('gujar') ? 'Mardan Circle' : 'Peshawar Circle-1',
    division: cleanBaseName.toLowerCase().includes('mardan') || cleanBaseName.toLowerCase().includes('gujar') ? 'Mardan Division' : 'Peshawar Cantt Division',
    subDivision: `${cleanBaseName} Sub-Division`,
    district: cleanBaseName.toLowerCase().includes('mardan') || cleanBaseName.toLowerCase().includes('gujar') ? 'Mardan' : 'Peshawar',
    villageLocality: cleanBaseName,
    applicantDepartment: 'PESCO Planning & Engineering Directorate',
    schemeProjectName: `${feederName} Energy Loss Reduction & Network Re-conductoring Scheme`,
    purposeOfWork: 'Comprehensive ELR Loss Reduction, bifurcation, and GIS route rehabilitation.',
    preparedBy: 'Engr. M. Inayat (SDO)',
    checkedBy: 'Engr. Tariq Khan (XEN)',
    approvedBy: 'Engr. Abdul Rehman (SE)',
    nodes,
    segments
  };

  const totalLengthKm = Number(segments.reduce((acc, s) => acc + s.lengthKm, 0).toFixed(3));

  return {
    feeder,
    summary: {
      totalNodes: nodes.length,
      totalSegments: segments.length,
      totalLengthKm,
      detectedType: feederType,
      substationName: feeder.substationName
    }
  };
}
