'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
  type Edge,
} from 'reactflow';

interface AnimatedEdgeData {
  animated?: boolean;
}

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  label,
  data,
}: EdgeProps<AnimatedEdgeData>) {
  const isAnimating = data?.animated !== false;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: selected ? 2.5 : 1.5,
          stroke: selected
            ? 'rgba(99, 102, 241, 0.9)'
            : 'rgba(99, 102, 241, 0.35)',
          strokeDasharray: isAnimating ? '6 4' : 'none',
          animation: isAnimating ? 'edgeDashFlow 0.8s linear infinite' : 'none',
        }}
      />

      {isAnimating && (
        <circle r={3} fill="#818cf8" opacity={0.8}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {isAnimating && (
        <circle r={2} fill="#a78bfa" opacity={0.6}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="0.5s" />
        </circle>
      )}

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 600,
              color: '#93c5fd',
              letterSpacing: '0.5px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
