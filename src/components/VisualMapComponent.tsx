/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { 
  APIProvider, 
  Map as GoogleMap, 
  AdvancedMarker, 
  Pin, 
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
  MapPin, 
  Split, 
  Navigation, 
  Layers, 
  Maximize2, 
  Activity, 
  Info,
  CheckCircle2,
  Compass,
  Eye,
  Upload
} from 'lucide-react';

interface VisualMapComponentProps {
  feeder: FeederData;
  bifurcationConfig?: BifurcationConfig;
  highlightNodeId?: string;
  onSelectNode?: (node: FeederNode) => void;
  onOpenKmlImport?: () => void;
}

declare const google: any;

// Polyline renderer helper using google.maps.Polyline via useMap hook
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

    const lineSymbol = dashed ? {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      scale: 3
    } : undefined;

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: dashed ? 0 : 0.85,
      strokeWeight: weight,
      icons: dashed && lineSymbol ? [{
        icon: lineSymbol,
        offset: '0',
        repeat: '15px'
      }] : undefined,
      map
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, color, weight, dashed]);

  return null;
};

// FitBounds helper component to center and frame all feeder coordinates
const MapBoundsFitter: React.FC<{ nodes: { lat: number; lng: number }[] }> = ({ nodes }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || nodes.length === 0 || typeof google === 'undefined' || !google.maps) return;

    if (nodes.length === 1) {
      map.setCenter(nodes[0]);
      map.setZoom(16);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    nodes.forEach(n => bounds.extend(n));
    map.fitBounds(bounds, 50);
  }, [map, nodes]);

  return null;
};

export const VisualMapComponent: React.FC<VisualMapComponentProps> = ({
  feeder,
  bifurcationConfig,
  highlightNodeId,
  onSelectNode,
  onOpenKmlImport
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDVQU7xNNVrBzYOLPgsDZjAIwnm47DAynI';
  const [selectedNode, setSelectedNode] = useState<FeederNode | null>(null);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [showPolylines, setShowPolylines] = useState(true);
  const [showLoadBadges, setShowLoadBadges] = useState(true);

  // Compute or fallback geographic coordinates for all nodes
  const resolvedNodes = useMemo(() => {
    // Determine base anchor coordinate for this feeder (default Peshawar / Substation region)
    let baseLat = 34.0040;
    let baseLng = 71.5810;

    const firstExplicit = feeder.nodes.find(n => n.lat !== undefined && n.lng !== undefined);
    if (firstExplicit && firstExplicit.lat && firstExplicit.lng) {
      baseLat = firstExplicit.lat;
      baseLng = firstExplicit.lng;
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
      if (n.lat !== undefined && n.lng !== undefined) {
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

  // Determine segment paths
  const segmentPaths = useMemo(() => {
    return feeder.segments.map(seg => {
      const from = nodeCoordMap.get(seg.fromNodeId);
      const to = nodeCoordMap.get(seg.toNodeId);
      if (!from || !to) return null;

      const isBifurcatedCut = bifurcationConfig?.enabled && bifurcationConfig.bifurcationNodeId === seg.toNodeId;

      return {
        id: seg.id,
        fromNodeId: seg.fromNodeId,
        toNodeId: seg.toNodeId,
        conductorCode: seg.conductorCode,
        lengthKm: seg.lengthKm,
        isBifurcatedCut,
        path: [
          { lat: from.lat, lng: from.lng },
          { lat: to.lat, lng: to.lng }
        ]
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
    if (resolvedNodes.length === 0) return { lat: 34.0040, lng: 71.5810 };
    const avgLat = resolvedNodes.reduce((acc, n) => acc + n.lat, 0) / resolvedNodes.length;
    const avgLng = resolvedNodes.reduce((acc, n) => acc + n.lng, 0) / resolvedNodes.length;
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
                {feeder.name} — Geographic Feeder Route & GIS Layout
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-700 font-bold">
                {feeder.type} {feeder.nominalVoltage}V
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {feeder.substationName} · {resolvedNodes.length} Network Poles · {feeder.segments.length} Line Spans
            </p>
          </div>
        </div>

        {/* Action Buttons & Map Mode Toggles */}
        <div className="flex items-center gap-2">
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
            <span>Loads</span>
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

      {/* Google Maps Container */}
      <div className="relative w-full h-[520px] bg-slate-100">
        <APIProvider apiKey={apiKey}>
          <GoogleMap
            defaultCenter={defaultCenter}
            defaultZoom={16}
            mapTypeId={mapTypeId}
            mapId="DEMO_MAP_ID"
            style={{ width: '100%', height: '100%' }}
            gestureHandling={'greedy'}
            disableDefaultUI={false}
          >
            <MapBoundsFitter nodes={resolvedNodes} />

            {/* Render Feeder Route Polylines */}
            {showPolylines && segmentPaths.map(seg => {
              // Color code spans: normal blue/cyan, cut-off purple dashed, heavy amber
              const isCut = seg.isBifurcatedCut;
              const color = isCut ? '#a855f7' : (seg.conductorCode === 'DOG' || seg.conductorCode === 'PANTHER' ? '#2563eb' : '#0284c7');
              
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

            {/* Render Advanced Markers for All Poles / Substation */}
            {resolvedNodes.map(node => {
              const isSource = node.isTransformerNode || node.id === '0.0';
              const isCutOff = cutOffNodeId === node.id;
              const isHighlighted = highlightNodeId === node.id;

              return (
                <AdvancedMarker
                  key={`marker-${node.id}`}
                  position={{ lat: node.lat, lng: node.lng }}
                  onClick={() => {
                    setSelectedNode(node);
                    onSelectNode?.(node);
                  }}
                  title={`${node.label} (${node.poleNumber || 'Node ' + node.id})`}
                >
                  {isSource ? (
                    <div className="flex flex-col items-center">
                      <div className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] shadow-md border-2 border-white flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-slate-950" />
                        <span>{feeder.type === 'HT' ? '11kV Bay' : `${feeder.existingTransformerKva} kVA`}</span>
                      </div>
                      <div className="w-3 h-3 bg-amber-500 rotate-45 -mt-1 shadow-xs border border-white"></div>
                    </div>
                  ) : isCutOff ? (
                    <div className="flex flex-col items-center animate-bounce">
                      <div className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold text-[10px] shadow-lg border-2 border-white flex items-center gap-1">
                        <Split className="w-3 h-3" />
                        <span>Cut-Off Pole {node.id}</span>
                      </div>
                      <div className="w-2.5 h-2.5 bg-purple-600 rotate-45 -mt-1 border border-white"></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center cursor-pointer group">
                      {showLoadBadges && (node.spotLoadKva || node.singlePhaseCustomers > 0) && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-900/90 text-white text-[9px] font-mono font-bold shadow-xs whitespace-nowrap mb-0.5 group-hover:scale-110 transition-transform">
                          {node.spotLoadKva ? `${node.spotLoadKva} kVA` : `${node.singlePhaseCustomers} cust`}
                        </span>
                      )}
                      <Pin
                        background={isHighlighted ? '#ef4444' : '#2563eb'}
                        borderColor={'#ffffff'}
                        glyphColor={'#ffffff'}
                        scale={0.85}
                      />
                    </div>
                  )}
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow on Selected Node Click */}
            {selectedNode && (
              <InfoWindow
                position={{ lat: selectedNode.lat || defaultCenter.lat, lng: selectedNode.lng || defaultCenter.lng }}
                onCloseClick={() => setSelectedNode(null)}
              >
                <div className="p-2 min-w-[220px] text-slate-900 font-sans">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                    <span className="font-bold text-xs text-blue-900 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      {selectedNode.label}
                    </span>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                      {selectedNode.poleNumber || `Node ${selectedNode.id}`}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-[11px]">Type:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedNode.isTransformerNode ? 'Transformer Substation' : (selectedNode.id === '0.0' ? 'Grid Bay Feeder Source' : 'Distribution Pole')}
                      </span>
                    </div>

                    {selectedNode.spotLoadKva !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-[11px]">Connected Load:</span>
                        <span className="font-mono font-bold text-blue-700">{selectedNode.spotLoadKva} kVA</span>
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
                        <span>Bifurcation Point: Load connected to {bifurcationConfig?.cutOffTransformerConnection || 'EXISTING'} transformer.</span>
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

        {/* In-Map Bottom Legend Banner */}
        <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-xl p-2.5 border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Legend:</span>
            
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600 flex items-center justify-center text-[7px] text-slate-950 font-black">⚡</span>
              <span className="text-[11px] font-semibold text-slate-700">Substation / DTR</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 border border-white"></span>
              <span className="text-[11px] font-semibold text-slate-700">Distribution Poles</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1 bg-blue-600 rounded-full"></span>
              <span className="text-[11px] font-semibold text-slate-700">Feeder Span</span>
            </div>

            {bifurcationConfig?.enabled && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-600 border border-white flex items-center justify-center text-[7px] text-white font-bold">✂</span>
                <span className="text-[11px] font-semibold text-purple-800">Cut-Off Node {bifurcationConfig.bifurcationNodeId}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>{feeder.villageLocality || feeder.subDivision || 'Peshawar'}</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">Google Maps Live GIS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
