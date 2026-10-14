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
  conductorCode?: string;
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
 * Validates and normalizes latitude and longitude coordinates.
 * Detects whether coordinates were inverted (lat in place of lng or vice versa).
 */
export function cleanCoordinate(rawLng: number, rawLat: number, rawAlt?: number): { lat: number; lng: number; alt: number } {
  let lat = rawLat;
  let lng = rawLng;

  // Inverted check: Latitude cannot exceed 90. If lat > 90 and lng <= 90, definitely swapped.
  // In Pakistan & surrounding regions (Latitude ~24° to 37° N, Longitude ~60° to 78° E):
  // If lat > 50 and lng < 45 and lng > 15, the input KML inverted lat/lng order:
  if ((Math.abs(lat) > 90 && Math.abs(lng) <= 90) || (lat > 50 && lng < 45 && lng > 15)) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }

  // Bound check
  lat = Math.max(-89.9, Math.min(89.9, lat));
  lng = Math.max(-179.9, Math.min(179.9, lng));

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    alt: rawAlt || 0
  };
}

/**
 * Parses raw coordinate string block (separated by whitespace, newlines, commas)
 * Handles "lng,lat,alt", "lng,lat", with arbitrary spaces or tabs.
 */
export function parseCoordinatesBlock(coordStr: string): { lat: number; lng: number; alt: number }[] {
  const result: { lat: number; lng: number; alt: number }[] = [];
  if (!coordStr) return result;

  // Regex pattern matching lon,lat or lon,lat,alt with optional signs and scientific notation
  const coordRegex = /([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*,\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)(?:\s*,\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?))?/g;
  let match: RegExpExecArray | null;

  while ((match = coordRegex.exec(coordStr)) !== null) {
    const rawLon = parseFloat(match[1]);
    const rawLat = parseFloat(match[2]);
    const rawAlt = match[3] ? parseFloat(match[3]) : 0;

    if (!isNaN(rawLon) && !isNaN(rawLat)) {
      result.push(cleanCoordinate(rawLon, rawLat, rawAlt));
    }
  }

  return result;
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
 * Detects conductor code from text or attributes (e.g. Panther, Dog, Rabbit, Osprey, A, PU2)
 */
function extractConductorCode(text: string, isHt: boolean): string {
  const upper = text.toUpperCase();
  if (upper.includes('OSPREY')) return 'OSPREY';
  if (upper.includes('PANTHER')) return 'PANTHER';
  if (upper.includes('DOG')) return 'DOG';
  if (upper.includes('RABBIT')) return 'RABBIT';
  if (upper.includes('RAVEN')) return 'RAVEN';
  if (upper.includes('ANT')) return 'ANT';
  if (upper.includes('GOPHER')) return 'GOPHER';
  if (upper.includes('PU3') || upper.includes('PU-3')) return 'PU3';
  if (upper.includes('PU2') || upper.includes('PU-2')) return 'PU2';
  if (upper.includes('PU1') || upper.includes('PU-1')) return 'PU1';
  if (upper.includes('WASPB') || upper.includes('WASP')) return 'WASP';
  if (upper.includes('DIRT')) return 'DIRT';
  if (upper.includes('CODE A') || upper.includes('CONDUCTOR A')) return 'A';
  return isHt ? 'DOG' : 'A';
}

/**
 * Helper to determine if two line segments cross/intersect in 2D space.
 * Used to avoid haphazard criss-crossing lines when reconstructing topology.
 */
function orientation(p: { lat: number; lng: number }, q: { lat: number; lng: number }, r: { lat: number; lng: number }): number {
  const val = (q.lat - p.lat) * (r.lng - q.lng) - (q.lng - p.lng) * (r.lat - q.lat);
  if (Math.abs(val) < 1e-12) return 0; // Collinear
  return val > 0 ? 1 : 2; // Clockwise or Counterclockwise
}

function doSegmentsIntersect(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
  p3: { lat: number; lng: number },
  p4: { lat: number; lng: number }
): boolean {
  // If sharing an endpoint, they don't cross each other
  if ((p1.lat === p3.lat && p1.lng === p3.lng) ||
      (p1.lat === p4.lat && p1.lng === p4.lng) ||
      (p2.lat === p3.lat && p2.lng === p3.lng) ||
      (p2.lat === p4.lat && p2.lng === p4.lng)) {
    return false;
  }

  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);

  return (o1 !== o2 && o3 !== o4);
}

/**
 * Parses KML XML content into clean, structured FeederData.
 * Reads longitude and latitude of each point and establishes radial network topology.
 */
export function parseKmlToFeederData(kmlText: string, originalFileName: string): KmlParseResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');

  // Check for XML parsing error
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('Invalid XML in KML file: ' + parseError[0].textContent);
  }

  // Derive clean feeder title
  const docNameEl = xmlDoc.querySelector('Document > name, Folder > name, kml > name');
  const cleanBaseName = originalFileName
    .replace(/\.(kmz|kml)$/i, '')
    .replace(/_MapToKML/i, '')
    .replace(/ - Copy/i, '')
    .replace(/_/g, ' ')
    .trim();
  const feederName = docNameEl?.textContent?.trim() || `${cleanBaseName} Feeder`;

  // Detect HT (11kV) vs LT (400V)
  const fullText = (kmlText + ' ' + feederName).toLowerCase();
  const isHt = fullText.includes('11kv') || fullText.includes('11 kv') || fullText.includes('ht') || fullText.includes('grid') || fullText.includes('vcb') || fullText.includes('panther') || fullText.includes('dog');
  const nominalVoltage = isHt ? 11000 : 400;
  const feederType: 'HT' | 'LT' = isHt ? 'HT' : 'LT';

  const placemarks = xmlDoc.getElementsByTagName('Placemark');
  const parsedPlacemarks: ParsedKmlPlacemark[] = [];

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const name = pm.getElementsByTagName('name')[0]?.textContent?.trim() || `Node ${i}`;
    const desc = pm.getElementsByTagName('description')[0]?.textContent?.trim() || '';

    // Extract spot load if mentioned in desc or name
    let spotLoadKva: number | undefined;
    const loadMatch = (desc + ' ' + name).match(/(\d+(?:\.\d+)?)\s*(?:kva|kw)/i);
    if (loadMatch) {
      spotLoadKva = parseFloat(loadMatch[1]);
    }
    const poleNumber = name.match(/(?:p|pole|tower|t)[ -]?(\d+)/i)?.[0] || name;

    let hasGeometry = false;

    // Check ALL Point elements (including inside MultiGeometry)
    const pointEls = pm.getElementsByTagName('Point');
    for (let pIdx = 0; pIdx < pointEls.length; pIdx++) {
      const coordStr = pointEls[pIdx].getElementsByTagName('coordinates')[0]?.textContent?.trim() || '';
      const coords = parseCoordinatesBlock(coordStr);
      if (coords.length > 0) {
        hasGeometry = true;
        parsedPlacemarks.push({
          id: `node-${i}-${pIdx}`,
          name: pointEls.length > 1 ? `${name} (Pt ${pIdx + 1})` : name,
          description: desc,
          type: 'Point',
          coordinates: coords,
          spotLoadKva,
          poleNumber
        });
      }
    }

    // Check ALL LineString elements (including inside MultiGeometry)
    const lineEls = pm.getElementsByTagName('LineString');
    for (let lIdx = 0; lIdx < lineEls.length; lIdx++) {
      const coordStr = lineEls[lIdx].getElementsByTagName('coordinates')[0]?.textContent?.trim() || '';
      const coords = parseCoordinatesBlock(coordStr);
      if (coords.length >= 2) {
        hasGeometry = true;
        parsedPlacemarks.push({
          id: `line-${i}-${lIdx}`,
          name: lineEls.length > 1 ? `${name} (Span ${lIdx + 1})` : name,
          description: desc,
          type: 'LineString',
          coordinates: coords,
          conductorCode: extractConductorCode(desc + ' ' + name, isHt)
        });
      }
    }

    // Check ExtendedData if no Point or LineString was found directly
    if (!hasGeometry) {
      let extLat: number | undefined;
      let extLng: number | undefined;

      const simpleDataEls = pm.getElementsByTagName('SimpleData');
      for (let s = 0; s < simpleDataEls.length; s++) {
        const attrName = (simpleDataEls[s].getAttribute('name') || '').toLowerCase();
        const val = parseFloat(simpleDataEls[s].textContent?.trim() || '');
        if (!isNaN(val)) {
          if (attrName.includes('lat') || attrName === 'y') extLat = val;
          if (attrName.includes('lon') || attrName.includes('lng') || attrName === 'x') extLng = val;
        }
      }

      const dataEls = pm.getElementsByTagName('Data');
      for (let d = 0; d < dataEls.length; d++) {
        const attrName = (dataEls[d].getAttribute('name') || '').toLowerCase();
        const val = parseFloat(dataEls[d].getElementsByTagName('value')[0]?.textContent?.trim() || '');
        if (!isNaN(val)) {
          if (attrName.includes('lat') || attrName === 'y') extLat = val;
          if (attrName.includes('lon') || attrName.includes('lng') || attrName === 'x') extLng = val;
        }
      }

      if (extLat !== undefined && extLng !== undefined) {
        const clean = cleanCoordinate(extLng, extLat, 0);
        parsedPlacemarks.push({
          id: `node-${i}`,
          name,
          description: desc,
          type: 'Point',
          coordinates: [clean],
          spotLoadKva,
          poleNumber
        });
      }
    }
  }

  const pointPlacemarks = parsedPlacemarks.filter(p => p.type === 'Point');
  const linePlacemarks = parsedPlacemarks.filter(p => p.type === 'LineString');

  if (pointPlacemarks.length === 0 && linePlacemarks.length === 0) {
    throw new Error('No valid geographic Points, LineStrings, or coordinate pairs found in the provided KML/KMZ file.');
  }

  const nodes: FeederNode[] = [];
  const segments: FeederSegment[] = [];

  // Helper to find nearest node to a coordinate (within threshold in km)
  // Default to 5 meters (0.005 km) so distinct poles 25-50 meters apart are NEVER collapsed together!
  const findNearestNode = (lat: number, lng: number, candidateNodes: FeederNode[], thresholdKm = 0.005): FeederNode | null => {
    let bestNode: FeederNode | null = null;
    let minDistance = Infinity;

    for (const node of candidateNodes) {
      if (node.lat === undefined || node.lng === undefined) continue;
      const d = haversineDistanceKm(lat, lng, node.lat, node.lng);
      if (d < minDistance) {
        minDistance = d;
        bestNode = node;
      }
    }

    return minDistance <= thresholdKm ? bestNode : null;
  };

  // -------------------------------------------------------------
  // STRATEGY 1: KML contains explicit LineStrings (Physical Spans)
  // -------------------------------------------------------------
  if (linePlacemarks.length > 0) {
    // 1. Build initial node pool from Point placemarks with exact coordinates
    pointPlacemarks.forEach((pm, idx) => {
      const c = pm.coordinates[0];
      const isSource = idx === 0 || pm.name.toLowerCase().includes('grid') || pm.name.toLowerCase().includes('substation') || pm.name.toLowerCase().includes('source');
      nodes.push({
        id: `${idx}.0`,
        label: pm.name,
        poleNumber: pm.poleNumber || (isSource ? 'T-0' : `P-${idx}`),
        isTransformerNode: !isHt && isSource,
        threePhaseCustomers: isHt ? (isSource ? 0 : 2) : (isSource ? 0 : 2),
        singlePhaseCustomers: isHt ? (isSource ? 0 : 25) : 15,
        spotLoadKva: pm.spotLoadKva || (isHt ? (isSource ? 0 : 150) : undefined),
        lat: c.lat,
        lng: c.lng
      });
    });

    // 2. Iterate each LineString and create spans between adjacent vertices
    const existingEdges = new Set<string>();

    linePlacemarks.forEach(lp => {
      const pts = lp.coordinates;
      for (let k = 0; k < pts.length - 1; k++) {
        const fromCoord = pts[k];
        const toCoord = pts[k + 1];

        // Find or create From node with exact coordinates (5m tolerance)
        let fromNode = findNearestNode(fromCoord.lat, fromCoord.lng, nodes, 0.005);
        if (!fromNode) {
          const newId = `${nodes.length}.0`;
          fromNode = {
            id: newId,
            label: `Pole ${newId}`,
            poleNumber: `P-${newId.replace('.0', '')}`,
            threePhaseCustomers: isHt ? 1 : 0,
            singlePhaseCustomers: isHt ? 15 : 10,
            spotLoadKva: isHt ? 100 : undefined,
            lat: fromCoord.lat,
            lng: fromCoord.lng
          };
          nodes.push(fromNode);
        }

        // Find or create To node with exact coordinates (5m tolerance)
        let toNode = findNearestNode(toCoord.lat, toCoord.lng, nodes, 0.005);
        if (!toNode) {
          const newId = `${nodes.length}.0`;
          toNode = {
            id: newId,
            label: `Pole ${newId}`,
            poleNumber: `P-${newId.replace('.0', '')}`,
            threePhaseCustomers: isHt ? 1 : 0,
            singlePhaseCustomers: isHt ? 20 : 10,
            spotLoadKva: isHt ? 100 : undefined,
            lat: toCoord.lat,
            lng: toCoord.lng
          };
          nodes.push(toNode);
        }

        // Avoid self-loops
        if (fromNode.id === toNode.id) continue;

        const edgeKey = `${fromNode.id}->${toNode.id}`;
        const reverseKey = `${toNode.id}->${fromNode.id}`;
        if (existingEdges.has(edgeKey) || existingEdges.has(reverseKey)) continue;

        const distKm = Math.max(0.015, haversineDistanceKm(fromCoord.lat, fromCoord.lng, toCoord.lat, toCoord.lng));
        const conductor = lp.conductorCode || (isHt ? (segments.length < 3 ? 'PANTHER' : 'DOG') : 'A');

        segments.push({
          id: `s-${fromNode.id.replace('.0', '')}-${toNode.id.replace('.0', '')}`,
          fromNodeId: fromNode.id,
          toNodeId: toNode.id,
          lengthKm: Number(distKm.toFixed(3)),
          conductorCode: conductor,
          path: [
            { lat: fromCoord.lat, lng: fromCoord.lng },
            { lat: toCoord.lat, lng: toCoord.lng }
          ]
        });

        existingEdges.add(edgeKey);
      }
    });

    // 3. Connect any remaining point placemarks cleanly without crossing existing spans
    const connectedIds = new Set<string>();
    segments.forEach(s => {
      connectedIds.add(s.fromNodeId);
      connectedIds.add(s.toNodeId);
    });

    nodes.forEach(node => {
      if (!connectedIds.has(node.id) && node.lat && node.lng) {
        // Connect to nearest connected node that DOES NOT intersect existing spans
        let bestTarget: FeederNode | null = null;
        let minD = Infinity;

        for (const connId of connectedIds) {
          const connNode = nodes.find(n => n.id === connId);
          if (!connNode || !connNode.lat || !connNode.lng) continue;
          const d = haversineDistanceKm(node.lat, node.lng, connNode.lat, connNode.lng);

          if (d < minD) {
            // Check if proposed segment intersects existing segments
            const intersects = segments.some(seg => {
              const segFrom = nodes.find(n => n.id === seg.fromNodeId);
              const segTo = nodes.find(n => n.id === seg.toNodeId);
              if (!segFrom?.lat || !segFrom?.lng || !segTo?.lat || !segTo?.lng) return false;
              return doSegmentsIntersect(
                { lat: node.lat!, lng: node.lng! },
                { lat: connNode.lat!, lng: connNode.lng! },
                { lat: segFrom.lat, lng: segFrom.lng },
                { lat: segTo.lat, lng: segTo.lng }
              );
            });

            if (!intersects) {
              minD = d;
              bestTarget = connNode;
            }
          }
        }

        if (bestTarget) {
          segments.push({
            id: `s-${bestTarget.id.replace('.0', '')}-${node.id.replace('.0', '')}`,
            fromNodeId: bestTarget.id,
            toNodeId: node.id,
            lengthKm: Number(Math.max(0.02, minD).toFixed(3)),
            conductorCode: isHt ? 'DOG' : 'A',
            path: [
              { lat: bestTarget.lat!, lng: bestTarget.lng! },
              { lat: node.lat, lng: node.lng }
            ]
          });
          connectedIds.add(node.id);
        }
      }
    });

    // Designate first node or grid node as Source
    if (nodes.length > 0) {
      const sourceNode = nodes.find(n => n.label.toLowerCase().includes('grid') || n.label.toLowerCase().includes('substation') || n.id === '0.0') || nodes[0];
      sourceNode.isTransformerNode = !isHt;
      if (isHt) sourceNode.spotLoadKva = 0;
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 2: KML contains ONLY Points (No LineStrings)
  // Build clean, orderly sequential feeder route without haphazard criss-crossing
  // -------------------------------------------------------------
  if (linePlacemarks.length === 0 && pointPlacemarks.length > 0) {
    // 1. Sort points by pole number if present, or natural survey document order
    const sortedPlacemarks = [...pointPlacemarks].sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '9999', 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '9999', 10);
      if (numA !== 9999 && numB !== 9999 && numA !== numB) {
        return numA - numB;
      }
      return 0; // maintain document order
    });

    sortedPlacemarks.forEach((pm, idx) => {
      const c = pm.coordinates[0];
      const isSource = idx === 0;
      nodes.push({
        id: `${idx}.0`,
        label: isSource ? `${pm.name} (Source Substation)` : pm.name,
        poleNumber: pm.poleNumber || (isSource ? 'T-0' : `P-${idx}`),
        isTransformerNode: !isHt && isSource,
        threePhaseCustomers: isHt ? (isSource ? 0 : 2) : (isSource ? 0 : 2),
        singlePhaseCustomers: isHt ? (isSource ? 0 : 25) : (isSource ? 0 : 12),
        spotLoadKva: pm.spotLoadKva || (isHt ? (isSource ? 0 : (idx % 2 === 0 ? 200 : 100)) : undefined),
        lat: c.lat,
        lng: c.lng
      });
    });

    // 2. Connect nodes sequentially or via minimum non-crossing distance from tree
    const connectedNodeIds = new Set<string>(['0.0']);
    const remainingNodeIds = new Set<string>(nodes.slice(1).map(n => n.id));

    while (remainingNodeIds.size > 0) {
      let bestFromId: string | null = null;
      let bestToId: string | null = null;
      let minDistance = Infinity;

      for (const connectedId of connectedNodeIds) {
        const fromNode = nodes.find(n => n.id === connectedId)!;
        if (!fromNode.lat || !fromNode.lng) continue;

        for (const remId of remainingNodeIds) {
          const toNode = nodes.find(n => n.id === remId)!;
          if (!toNode.lat || !toNode.lng) continue;

          const dist = haversineDistanceKm(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);

          // Check if candidate span would intersect any already created segment
          const intersects = segments.some(seg => {
            const segFrom = nodes.find(n => n.id === seg.fromNodeId);
            const segTo = nodes.find(n => n.id === seg.toNodeId);
            if (!segFrom?.lat || !segFrom?.lng || !segTo?.lat || !segTo?.lng) return false;
            return doSegmentsIntersect(
              { lat: fromNode.lat!, lng: fromNode.lng! },
              { lat: toNode.lat!, lng: toNode.lng! },
              { lat: segFrom.lat, lng: segFrom.lng },
              { lat: segTo.lat, lng: segTo.lng }
            );
          });

          if (!intersects && dist < minDistance) {
            minDistance = dist;
            bestFromId = connectedId;
            bestToId = remId;
          }
        }
      }

      // If strict non-intersection couldn't find a path (unlikely), fallback to closest node
      if (!bestFromId || !bestToId) {
        for (const connectedId of connectedNodeIds) {
          const fromNode = nodes.find(n => n.id === connectedId)!;
          if (!fromNode.lat || !fromNode.lng) continue;
          for (const remId of remainingNodeIds) {
            const toNode = nodes.find(n => n.id === remId)!;
            if (!toNode.lat || !toNode.lng) continue;
            const dist = haversineDistanceKm(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
            if (dist < minDistance) {
              minDistance = dist;
              bestFromId = connectedId;
              bestToId = remId;
            }
          }
        }
      }

      if (bestFromId && bestToId) {
        const fromNode = nodes.find(n => n.id === bestFromId)!;
        const toNode = nodes.find(n => n.id === bestToId)!;
        const safeDist = Math.max(0.02, Math.min(minDistance, 5.0));
        const segIdx = segments.length;
        const conductor = isHt
          ? (segIdx < 3 ? 'PANTHER' : (segIdx < 6 ? 'DOG' : 'RABBIT'))
          : (segIdx < 4 ? 'A' : (segIdx < 7 ? 'PU2' : 'PU3'));

        segments.push({
          id: `s-${bestFromId.replace('.0', '')}-${bestToId.replace('.0', '')}`,
          fromNodeId: bestFromId,
          toNodeId: bestToId,
          lengthKm: Number(safeDist.toFixed(3)),
          conductorCode: conductor,
          path: [
            { lat: fromNode.lat!, lng: fromNode.lng! },
            { lat: toNode.lat!, lng: toNode.lng! }
          ]
        });

        connectedNodeIds.add(bestToId);
        remainingNodeIds.delete(bestToId);
      } else {
        break;
      }
    }
  }

  // -------------------------------------------------------------
  // Clean SLD Visual Coordinates Layout (x, y)
  // -------------------------------------------------------------
  const outgoingMap = new Map<string, string[]>();
  segments.forEach(s => {
    const list = outgoingMap.get(s.fromNodeId) || [];
    list.push(s.toNodeId);
    outgoingMap.set(s.fromNodeId, list);
  });

  const nodeLevels = new Map<string, number>();
  const queue: { id: string; level: number }[] = [{ id: '0.0', level: 0 }];
  nodeLevels.set('0.0', 0);

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    const children = outgoingMap.get(id) || [];
    children.forEach(childId => {
      if (!nodeLevels.has(childId)) {
        nodeLevels.set(childId, level + 1);
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  const levelCounts = new Map<number, number>();
  nodes.forEach(n => {
    const lvl = nodeLevels.get(n.id) || 0;
    const count = levelCounts.get(lvl) || 0;
    levelCounts.set(lvl, count + 1);

    n.x = 80 + lvl * 130;
    n.y = 160 + (count === 0 ? 0 : (count % 2 === 1 ? -70 * Math.ceil(count / 2) : 70 * (count / 2)));
  });

  // Calculate total transformer capacity
  const totalSpotKva = nodes.reduce((sum, n) => sum + (n.spotLoadKva || 0), 0);
  const existingTransformerKva = isHt ? Math.max(1000, totalSpotKva || 1850) : 100;
  const proposedTransformerKva = isHt ? Math.round(existingTransformerKva * 1.35 / 100) * 100 : 200;

  const feeder: FeederData = {
    id: cleanBaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now().toString(36)}`,
    name: feederName,
    description: `Geographically structured ${feederType} feeder imported from ${originalFileName}. Contains ${nodes.length} nodes with exact latitude/longitude coordinates and ${segments.length} spans.`,
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
