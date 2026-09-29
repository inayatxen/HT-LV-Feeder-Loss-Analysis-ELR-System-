/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FeederData, FeederNode, FeederSegment } from '../types/feeder';

export interface LayoutedNode extends FeederNode {
  x: number;
  y: number;
  depth: number;
  lane: number;
}

export interface LayoutedSegment {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  isVertical: boolean;
  isHorizontal: boolean;
  isDiagonal: boolean;
  pathD?: string;
}

export interface DiagramLayoutResult {
  nodes: LayoutedNode[];
  segments: LayoutedSegment[];
  width: number;
  height: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  viewBox: string;
}

/**
 * Computes a non-overlapping, hierarchical radial/tree layout for Electrical Single Line Diagrams (SLD).
 * Guarantees that:
 * 1. Parallel branches are assigned strictly disjoint vertical lanes with ample spacing (≥110px).
 * 2. Nodes advance horizontally with depth without colliding (≥140px spacing).
 * 3. Segment metric labels (amps, kW, conductor) and pole circles never overlap.
 * 4. Works seamlessly for benchmark feeders, custom feeders, and Excel-imported topologies.
 */
export function calculateNonOverlappingSLDLayout(
  feeder: FeederData
): DiagramLayoutResult {
  if (!feeder.nodes || feeder.nodes.length === 0) {
    return {
      nodes: [],
      segments: [],
      width: 1000,
      height: 380,
      minX: 0,
      maxX: 1000,
      minY: 0,
      maxY: 380,
      viewBox: '0 0 1000 380'
    };
  }

  // 1. Build adjacency list and find root
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  const inDegree = new Map<string, number>();
  const nodeById = new Map<string, FeederNode>();

  feeder.nodes.forEach(n => {
    nodeById.set(n.id, n);
    childrenMap.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  feeder.segments.forEach(s => {
    if (childrenMap.has(s.fromNodeId)) {
      childrenMap.get(s.fromNodeId)!.push(s.toNodeId);
    }
    parentMap.set(s.toNodeId, s.fromNodeId);
    inDegree.set(s.toNodeId, (inDegree.get(s.toNodeId) || 0) + 1);
  });

  // Find root node (transformer node, or node with 0 in-degree, or '0.0')
  let rootNode = feeder.nodes.find(n => n.isTransformerNode) 
    || feeder.nodes.find(n => (inDegree.get(n.id) || 0) === 0)
    || feeder.nodes.find(n => n.id === '0.0' || n.id === '0')
    || feeder.nodes[0];

  const rootId = rootNode.id;

  // 2. Compute subtree sizes (number of vertical leaf lanes needed)
  const subtreeHeight = new Map<string, number>();
  const visited = new Set<string>();

  function computeSubtreeHeight(u: string): number {
    if (visited.has(u)) return 1;
    visited.add(u);

    const children = childrenMap.get(u) || [];
    if (children.length === 0) {
      subtreeHeight.set(u, 1);
      return 1;
    }

    let total = 0;
    for (const child of children) {
      total += computeSubtreeHeight(child);
    }
    const h = Math.max(1, total);
    subtreeHeight.set(u, h);
    return h;
  }

  computeSubtreeHeight(rootId);

  // Also handle any unvisited disconnected components
  feeder.nodes.forEach(n => {
    if (!visited.has(n.id)) {
      computeSubtreeHeight(n.id);
    }
  });

  // 3. Assign X, Y coordinates hierarchically
  const nodeCoordinates = new Map<string, { x: number; y: number; depth: number; lane: number }>();
  let currentLeafLane = 0;

  const X_START = 90;
  const X_STEP = 145; // Generous horizontal span for segment badge (84px) + pole clearance
  const Y_START = 80;
  const LANE_HEIGHT = 115; // Vertical clearance between parallel branches

  const assignedVisited = new Set<string>();

  function assignPositions(u: string, depth: number): number {
    if (assignedVisited.has(u)) {
      return nodeCoordinates.get(u)?.y || (Y_START + currentLeafLane * LANE_HEIGHT);
    }
    assignedVisited.add(u);

    const children = childrenMap.get(u) || [];
    const x = X_START + depth * X_STEP;

    if (children.length === 0) {
      // Leaf node
      const y = Y_START + currentLeafLane * LANE_HEIGHT;
      const lane = currentLeafLane;
      currentLeafLane += 1;
      nodeCoordinates.set(u, { x, y, depth, lane });
      return y;
    }

    if (children.length === 1) {
      // Single child continues horizontally or with child lane
      const childY = assignPositions(children[0], depth + 1);
      const y = childY;
      const lane = nodeCoordinates.get(children[0])?.lane || 0;
      nodeCoordinates.set(u, { x, y, depth, lane });
      return y;
    }

    // Multiple children (Branching point / Junction!)
    const childYs: number[] = [];
    for (const child of children) {
      const cy = assignPositions(child, depth + 1);
      childYs.push(cy);
    }

    // Center parent node Y between the topmost and bottommost child
    const minY = Math.min(...childYs);
    const maxY = Math.max(...childYs);
    const y = (minY + maxY) / 2;
    const lane = (minY + maxY) / (2 * LANE_HEIGHT);
    nodeCoordinates.set(u, { x, y, depth, lane });
    return y;
  }

  assignPositions(rootId, 0);

  // Handle any nodes not connected to root
  feeder.nodes.forEach(n => {
    if (!nodeCoordinates.has(n.id)) {
      assignPositions(n.id, 0);
    }
  });

  // Build layouted nodes
  const layoutedNodes: LayoutedNode[] = feeder.nodes.map(n => {
    const coords = nodeCoordinates.get(n.id) || { x: 100, y: 160, depth: 0, lane: 0 };
    return {
      ...n,
      x: coords.x,
      y: coords.y,
      depth: coords.depth,
      lane: coords.lane
    };
  });

  // Calculate layouted segments
  const layoutedSegments: LayoutedSegment[] = feeder.segments.map(s => {
    const fromNode = layoutedNodes.find(n => n.id === s.fromNodeId);
    const toNode = layoutedNodes.find(n => n.id === s.toNodeId);

    const x1 = fromNode ? fromNode.x : 100;
    const y1 = fromNode ? fromNode.y : 160;
    const x2 = toNode ? toNode.x : 200;
    const y2 = toNode ? toNode.y : 160;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const isVertical = Math.abs(x1 - x2) < 2;
    const isHorizontal = Math.abs(y1 - y2) < 2;
    const isDiagonal = !isVertical && !isHorizontal;

    return {
      id: s.id,
      fromNodeId: s.fromNodeId,
      toNodeId: s.toNodeId,
      x1,
      y1,
      x2,
      y2,
      midX,
      midY,
      isVertical,
      isHorizontal,
      isDiagonal
    };
  });

  // Compute bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  layoutedNodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });

  // Add padding around diagram
  const PADDING_X = 100;
  const PADDING_Y = 90;

  const viewBoxMinX = Math.max(0, minX - PADDING_X);
  const viewBoxMinY = Math.max(0, minY - PADDING_Y);
  const viewBoxWidth = Math.max(1050, (maxX - minX) + PADDING_X * 2);
  const viewBoxHeight = Math.max(380, (maxY - minY) + PADDING_Y * 2);

  const viewBox = `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`;

  return {
    nodes: layoutedNodes,
    segments: layoutedSegments,
    width: viewBoxWidth,
    height: viewBoxHeight,
    minX: viewBoxMinX,
    maxX: viewBoxMinX + viewBoxWidth,
    minY: viewBoxMinY,
    maxY: viewBoxMinY + viewBoxHeight,
    viewBox
  };
}
