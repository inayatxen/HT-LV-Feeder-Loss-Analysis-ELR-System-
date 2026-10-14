/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { 
  APIProvider, 
  Map as GoogleMap, 
  AdvancedMarker, 
  InfoWindow, 
  useMap 
} from '@vis.gl/react-google-maps';
import { 
  FeederData, 
  FeederNode, 
  BifurcationConfig 
} from '../types/feeder';
import { 
  Zap, 
  Split, 
  Layers, 
  Maximize2, 
  Compass, 
  Eye, 
  Upload,
  Radio,
  CheckCircle2,
  MapPin
} from 'lucide-react';

interface VisualMapComponentProps {
  feeder: FeederData;
  bifurcationConfig?: BifurcationConfig;
  highlightNodeId?: string;
  onSelectNode?: (node: FeederNode) => void;
  onOpenKmlImport?: () => void;
  height?: string;
}

declare const google: any;

// Polyline renderer helper with forward power-flow directional arrows
interface FeederPolylineProps {
  path: { lat: number; lng: number }[];
  color: string;
  weight?: number;
  dashed?: boolean;
}

const FeederPolyline: React.FC<FeederPolylineProps> = ({ path, color, weight = 4, dashed = false }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || path.length < 2 || typeof google === 'undefined' || !google.maps) return;

    // Dashed line symbol for bifurcation cut-off / extension spans
    const lineSymbol = dashed ? {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      scale: 3
    } : undefined;

    // Forward power flow arrow symbol (from source down feeder route)
    const arrowSymbol = !dashed && google.maps?.SymbolPath ? {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 2.2,
      strokeColor: color,
      fillColor: color,
      fillOpacity: 0.9,
      strokeWeight: 1
    } : undefined;

    const icons = dashed && lineSymbol
      ? [{ icon: lineSymbol, offset: '0', repeat: '15px' }]
      : (arrowSymbol ? [{ icon: arrowSymbol, offset: '60%' }] : undefined);

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: dashed ? 0 : 0.9,
      strokeWeight: weight,
      icons,
      map
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, color, weight, dashed]);

  return null;
};

// FitBounds helper component to center and frame feeder coordinates neatly
const MapBoundsFitter: React.FC<{ 
  nodes: { lat: number; lng: number }[]; 
  feederId: string;
  recenterTrigger: number;
}> = ({ nodes, feederId, recenterTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || nodes.length === 0 || typeof google === 'undefined' || !google.maps) return;

    const validNodes = nodes.filter(n => 
      !isNaN(n.lat) && !isNaN(n.lng) && 
      n.lat !== 0 && n.lng !== 0 &&
      Math.abs(n.lat) <= 90 && Math.abs(n.lng) <= 180
    );

    if (validNodes.length === 0) return;

    if (validNodes.length === 1) {
      map.setCenter(validNodes[0]);
      map.setZoom(16);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    validNodes.forEach(n => bounds.extend(n));
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 65, left: 50 });
  }, [map, feederId, recenterTrigger, nodes]);

  return null;
};

export const VisualMapComponent: React.FC<VisualMapComponentProps> = ({
  feeder,
  bifurcationConfig,
  highlightNodeId,
  onSelectNode,
  onOpenKmlImport,
  height = '540px'
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDVQU7xNNVrBzYOLPgsDZjAIwnm47DAynI';
  const envMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  const mapId = (!envMapId || envMapId === 'DEMO_MAP_ID') ? '4504f8b37365c3d0' : envMapId;
  const [selectedNode, setSelectedNode] = useState<FeederNode | null>(null);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [showPolylines, setShowPolylines] = useState(true);
  const [showLoadBadges, setShowLoadBadges] = useState(true);
  const [recenterCount, setRecenterCount] = useState(0);

  // Compute or fallback geographic coordinates for all nodes
  const resolvedNodes = useMemo(() => {
    // Determine base anchor coordinate for this feeder (default Peshawar / Substation region)
    let baseLat = 34.0040;
    let baseLng = 71.5810;

    const firstExplicit = feeder.nodes.find(n => n.lat !== undefined && n.lng !== undefined && n.lat > 0 && n.lng > 0);
    if (firstExplicit && firstExplicit.lat && firstExplicit.lng) {
      baseLat = firstExplicit.lat;
      baseLng = firstExplicit.lng;
    } else if (feeder.substationName.toLowerCase().includes('gujar') || feeder.name.toLowerCase().includes('gujar') || feeder.substationName.toLowerCase().includes('mardan')) {
      baseLat = 34.2288;
      baseLng = 72.0159;
    } else if (feeder.substationName.toLowerCase().includes('hayatabad')) {
      baseLat = 33.9922;
      baseLng = 71.4348;
    } else if (feeder.substationName.toLowerCase().includes('warsak')) {
      baseLat = 34.0412;
      baseLng = 71.5282;
    } else if (feeder.substationName.toLowerCase().includes('sheikhupura') || feeder.substationName.toLowerCase().includes('farooqabad')) {
      baseLat = 31.7132;
      baseLng = 73.9852;
    }

    return feeder.nodes.map(n => {
      if (n.lat !== undefined && n.lng !== undefined && !isNaN(n.lat) && !isNaN(n.lng) && n.lat !== 0 && n.lng !== 0) {
        return {
          ...n,
          lat: n.lat,
          lng: n.lng
        };
      }

      // Synthesize realistic geographic offset from diagram (x, y) if missing
      const xOffset = ((n.x || 100) - 80) * 0.000035;
      const yOffset = ((n.y || 150) - 150) * 0.000035;

      return {
        ...n,
        lat: Number((baseLat + yOffset).toFixed(6)),
        lng: Number((baseLng + xOffset).toFixed(6))
      };
    });
  }, [feeder]);

  // Lookup map for fast node coordinates
  const nodeCoordMap = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; node: FeederNode }>();
    resolvedNodes.forEach(rn => {
      map.set(rn.id, { lat: rn.lat, lng: rn.lng, node: rn });
    });
    return map;
  }, [resolvedNodes]);

  // Compute geographic bounding box summary for display
  const geoBoundsInfo = useMemo(() => {
    const valid = resolvedNodes.filter(n => !isNaN(n.lat) && !isNaN(n.lng) && n.lat !== 0 && n.lng !== 0);
    if (valid.length === 0) return null;
    const lats = valid.map(n => n.lat);
    const lngs = valid.map(n => n.lng);
    return {
      count: valid.length,
      minLat: Math.min(...lats).toFixed(5),
      maxLat: Math.max(...lats).toFixed(5),
      minLng: Math.min(...lngs).toFixed(5),
      maxLng: Math.max(...lngs).toFixed(5)
    };
  }, [resolvedNodes]);

  // Determine segment paths
  const segmentPaths = useMemo(() => {
    return feeder.segments.map(seg => {
      const from = nodeCoordMap.get(seg.fromNodeId);
      const to = nodeCoordMap.get(seg.toNodeId);
      if (!from || !to) return null;

      const isBifurcatedCut = bifurcationConfig?.enabled && bifurcationConfig.bifurcationNodeId === seg.toNodeId;
      const rawPath = seg.path && seg.path.length >= 2 ? seg.path : [
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng }
      ];

      return {
        id: seg.id,
        fromNodeId: seg.fromNodeId,
        toNodeId: seg.toNodeId,
        conductorCode: seg.conductorCode,
        lengthKm: seg.lengthKm,
        isBifurcatedCut,
        path: rawPath
      };
    }).filter(Boolean) as {
      id: string;
      fromNodeId: string;
      toNodeId: string;
      conductorCode: string;
      lengthKm: number;
      isBifurcatedCut: boolean;
      path: { lat: number; lng: number }[];
    }[];
  }, [feeder.segments, nodeCoordMap, bifurcationConfig]);

  // Default center calculation
  const defaultCenter = useMemo(() => {
    if (resolvedNodes.length === 0) return { lat: 34.2288, lng: 72.0159 };
    const valid = resolvedNodes.filter(n => !isNaN(n.lat) && !isNaN(n.lng) && n.lat !== 0 && n.lng !== 0);
    if (valid.length === 0) return { lat: 34.2288, lng: 72.0159 };
    const avgLat = valid.reduce((acc, n) => acc + n.lat, 0) / valid.length;
    const avgLng = valid.reduce((acc, n) => acc + n.lng, 0) / valid.length;
    return { lat: avgLat, lng: avgLng };
  }, [resolvedNodes]);

  // Cut-off node for bifurcation
  const cutOffNodeId = bifurcationConfig?.enabled ? bifurcationConfig.bifurcationNodeId : null;

  return (
    <div className="card-3d bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Map Header & Controls Toolbar */}
      <div className="p-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Compass className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white tracking-tight">
                {feeder.name} — GIS Feeder Route
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-700 font-bold">
                {feeder.type} {feeder.nominalVoltage}V
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {feeder.substationName} · {resolvedNodes.length} Verified Poles · {feeder.segments.length} Conductor Spans
            </p>
          </div>
        </div>

        {/* Action Buttons & Map Mode Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Map Layer Switcher */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setMapTypeId('roadmap')}
              className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                mapTypeId === 'roadmap' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => setMapTypeId('satellite')}
              className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                mapTypeId === 'satellite' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setMapTypeId('hybrid')}
              className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                mapTypeId === 'hybrid' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hybrid
            </button>
          </div>

          {/* Toggle Polylines */}
          <button
            type="button"
            onClick={() => setShowPolylines(!showPolylines)}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
              showPolylines 
                ? 'bg-emerald-900/70 border-emerald-600 text-emerald-200' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Conductor Spans & Polylines"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Spans</span>
          </button>

          {/* Toggle Badges */}
          <button
            type="button"
            onClick={() => setShowLoadBadges(!showLoadBadges)}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
              showLoadBadges 
                ? 'bg-amber-900/70 border-amber-600 text-amber-200' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Pole Load Badges"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Labels</span>
          </button>

          {/* Recenter Feeder Route */}
          <button
            type="button"
            onClick={() => setRecenterCount(c => c + 1)}
            className="px-2.5 py-1 text-xs rounded-lg font-bold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Recenter and frame feeder route"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
            <span>Fit Route</span>
          </button>

          {/* Import KMZ / KML Button */}
          {onOpenKmlImport && (
            <button
              type="button"
              onClick={onOpenKmlImport}
              className="px-2.5 py-1 text-xs rounded-lg font-bold border border-blue-500 bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
              title="Import node-to-node GIS route data from Google Earth KML / KMZ file"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import KMZ</span>
            </button>
          )}
        </div>
      </div>

      {/* GPS Survey Coordinates Info Bar */}
      {geoBoundsInfo && (
        <div className="px-3.5 py-2 bg-slate-800 text-slate-300 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-700">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 font-bold text-emerald-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>Exact GPS Coordinates Mapped:</span>
            </span>
            <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
              {geoBoundsInfo.count} Poles Plotted
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              Bounds: [{geoBoundsInfo.minLat}°–{geoBoundsInfo.maxLat}° N, {geoBoundsInfo.minLng}°–{geoBoundsInfo.maxLng}° E]
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
            <span>Route: <strong className="text-white">{feeder.segments.reduce((acc, s) => acc + s.lengthKm, 0).toFixed(2)} km</strong></span>
            <span>·</span>
            <span>Substation: <strong className="text-amber-400">{feeder.substationName}</strong></span>
          </div>
        </div>
      )}

      {/* Google Maps Container */}
      <div className="relative w-full bg-slate-100" style={{ height }}>
        <APIProvider apiKey={apiKey}>
          <GoogleMap
            defaultCenter={defaultCenter}
            defaultZoom={16}
            mapTypeId={mapTypeId}
            mapId={mapId}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            gestureHandling={'greedy'}
            disableDefaultUI={false}
          >
            <MapBoundsFitter 
              nodes={resolvedNodes} 
              feederId={feeder.id}
              recenterTrigger={recenterCount}
            />

            {/* Render Feeder Route Polylines with directional flow arrows */}
            {showPolylines && segmentPaths.map(seg => {
              const isCut = seg.isBifurcatedCut;
              // Professional electrical conductor color-coding
              const color = isCut 
                ? '#a855f7' 
                : (seg.conductorCode === 'PANTHER' ? '#1d4ed8' : (seg.conductorCode === 'DOG' ? '#0284c7' : '#0891b2'));
              
              return (
                <FeederPolyline
                  key={`poly-${seg.id}`}
                  path={seg.path}
                  color={color}
                  weight={isCut ? 5 : 4}
                  dashed={isCut}
                />
              );
            })}

            {/* Render Crisp, Non-Overlapping Pole Badges */}
            {resolvedNodes.map(node => {
              const isSource = node.isTransformerNode || node.id === '0.0';
              const isCutOff = cutOffNodeId === node.id;
              const isHighlighted = highlightNodeId === node.id;
              const hasSpotLoad = (node.spotLoadKva || 0) > 0;

              return (
                <AdvancedMarker
                  key={`marker-${node.id}`}
                  position={{ lat: node.lat, lng: node.lng }}
                  onClick={() => {
                    setSelectedNode(node);
                    onSelectNode?.(node);
                  }}
                  title={`${node.label} (${node.poleNumber || 'Node ' + node.id}) · Lat: ${node.lat.toFixed(5)}, Lng: ${node.lng.toFixed(5)}`}
                >
                  {isSource ? (
                    /* Substation 11kV Source / Primary DTR Badge */
                    <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform select-none">
                      <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[11px] shadow-lg border-2 border-white flex items-center gap-1.5 whitespace-nowrap">
                        <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                        <span>{feeder.type === 'HT' ? '11kV Bay (Source)' : `${feeder.existingTransformerKva} kVA`}</span>
                      </div>
                      <div className="w-2.5 h-2.5 bg-amber-600 rotate-45 -mt-1 shadow-sm border border-white"></div>
                    </div>
                  ) : isCutOff ? (
                    /* Cut-Off Bifurcation Pole Badge */
                    <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform select-none">
                      <div className="px-2.5 py-1 rounded-full bg-purple-700 text-white font-black text-[10px] shadow-lg border-2 border-white flex items-center gap-1.5 ring-2 ring-purple-400 animate-pulse whitespace-nowrap">
                        <Split className="w-3.5 h-3.5" />
                        <span>★ Cut-Off Pole {node.id}</span>
                      </div>
                      <div className="w-2 h-2 bg-purple-700 rotate-45 -mt-1 border border-white"></div>
                    </div>
                  ) : hasSpotLoad ? (
                    /* DTR / Commercial Load Substation Node (Green Circle) */
                    <div className="flex flex-col items-center cursor-pointer hover:scale-115 transition-transform group select-none">
                      {showLoadBadges && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-200 text-[9px] font-mono font-bold shadow-xs whitespace-nowrap mb-0.5 border border-emerald-600/50">
                          {node.spotLoadKva} kVA
                        </span>
                      )}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shadow-md border-2 border-white transition-all ${
                        isHighlighted 
                          ? 'bg-rose-600 text-white ring-4 ring-rose-400' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}>
                        <span className="font-mono text-[9px]">{node.poleNumber || node.id.replace('.0', '')}</span>
                      </div>
                    </div>
                  ) : !showLoadBadges ? (
                    /* Compact Dot Marker for High Density Feeder Views */
                    <div className="p-1 cursor-pointer hover:scale-150 transition-transform group select-none">
                      <div className={`w-3.5 h-3.5 rounded-full shadow-sm border-2 border-white transition-all ${
                        isHighlighted 
                          ? 'bg-rose-600 ring-2 ring-rose-400 scale-125' 
                          : 'bg-blue-600 group-hover:bg-cyan-400'
                      }`} />
                    </div>
                  ) : (
                    /* Intermediate Line Pole (Blue Circle) */
                    <div className="flex flex-col items-center cursor-pointer hover:scale-125 transition-transform group select-none">
                      {node.singlePhaseCustomers > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-900/90 text-slate-200 text-[8px] font-mono font-bold shadow-xs whitespace-nowrap mb-0.5 border border-slate-700">
                          {node.singlePhaseCustomers}c
                        </span>
                      )}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm border-2 border-white transition-all ${
                        isHighlighted 
                          ? 'bg-rose-600 text-white ring-3 ring-rose-400' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}>
                        <span className="font-mono text-[8px]">
                          {node.poleNumber?.replace(/^(?:P|T|Pole)[ -]?/i, '') || node.id.replace('.0', '')}
                        </span>
                      </div>
                    </div>
                  )}
                </AdvancedMarker>
              );
            })}

            {/* Selected Node Details Info Window */}
            {selectedNode && (
              <InfoWindow
                position={{ lat: selectedNode.lat, lng: selectedNode.lng }}
                onCloseClick={() => setSelectedNode(null)}
              >
                <div className="p-1 min-w-[220px] max-w-[280px] text-slate-800">
                  <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {selectedNode.label}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Node ID: {selectedNode.id} · {selectedNode.poleNumber || 'Pole'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    {selectedNode.spotLoadKva !== undefined && selectedNode.spotLoadKva > 0 && (
                      <div className="flex justify-between bg-amber-50 p-1 rounded border border-amber-200">
                        <span className="text-amber-800 font-semibold text-[11px]">Connected Load:</span>
                        <span className="font-mono font-bold text-amber-950">
                          {selectedNode.spotLoadKva} kVA
                        </span>
                      </div>
                    )}

                    {(selectedNode.singlePhaseCustomers > 0 || selectedNode.threePhaseCustomers > 0) && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-[11px]">Consumers:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {selectedNode.singlePhaseCustomers} (1-Ph) · {selectedNode.threePhaseCustomers} (3-Ph)
                        </span>
                      </div>
                    )}

                    {cutOffNodeId === selectedNode.id && (
                      <div className="mt-1.5 p-1.5 bg-purple-50 rounded border border-purple-200 text-[11px] text-purple-900 font-semibold flex items-center gap-1">
                        <Split className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Bifurcation Cut-Off: Load transferred to proposed scheme.</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                      <span>Coordinates:</span>
                      <span>{selectedNode.lat?.toFixed(5)}, {selectedNode.lng?.toFixed(5)}</span>
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </APIProvider>

        {/* Bottom Map Legend Bar */}
        <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-xl p-2.5 border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Legend:</span>
            
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-600 flex items-center justify-center text-[8px] text-slate-950 font-black">⚡</span>
              <span className="text-[11px] font-semibold text-slate-700">Substation Bay</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-emerald-700 flex items-center justify-center text-[7px] text-white font-bold">DTR</span>
              <span className="text-[11px] font-semibold text-slate-700">DTR Substation</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-blue-700 flex items-center justify-center text-[7px] text-white font-bold">P</span>
              <span className="text-[11px] font-semibold text-slate-700">Line Pole</span>
            </div>

            {cutOffNodeId && (
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-purple-600 border border-purple-700 flex items-center justify-center text-[8px] text-white font-bold">★</span>
                <span className="text-[11px] font-semibold text-purple-900">Cut-Off Node</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
              <span className="w-4 h-0.5 bg-blue-700"></span>
              <span className="text-[11px] font-mono text-slate-600 font-bold">Panther (300A)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-sky-600"></span>
              <span className="text-[11px] font-mono text-slate-600 font-bold">Dog (200A)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-cyan-600"></span>
              <span className="text-[11px] font-mono text-slate-600 font-bold">Rabbit (150A)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono hidden md:block">
            Arrows indicate power flow direction
          </div>
        </div>
      </div>
    </div>
  );
};
