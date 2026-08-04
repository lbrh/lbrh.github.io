import { memo } from 'react';
import type { Prim } from '@/lib/courseMaker/types';

const FONT_STACK = 'Helvetica, Arial, sans-serif';

/** Pure renderer: primitives in, SVG out. Holds no state and no interaction. */
function Prims({ prims }: { prims: Prim[] }) {
  return (
    <>
      {prims.map((p, i) => {
        switch (p.k) {
          case 'line':
            return (
              <line
                key={i}
                x1={p.x1}
                y1={p.y1}
                x2={p.x2}
                y2={p.y2}
                stroke={p.stroke}
                strokeWidth={p.w}
                strokeDasharray={p.dash?.join(' ')}
                strokeLinecap={p.cap}
              />
            );
          case 'circle':
            return (
              <circle
                key={i}
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill={p.fill ?? 'none'}
                stroke={p.stroke}
                strokeWidth={p.w}
              />
            );
          case 'poly': {
            const pts = p.pts.map(([x, y]) => `${x},${y}`).join(' ');
            return p.close === false ? (
              <polyline key={i} points={pts} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.w} strokeLinejoin="round" />
            ) : (
              <polygon key={i} points={pts} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.w} strokeLinejoin="round" />
            );
          }
          case 'rect':
            return (
              <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.sw} />
            );
          case 'text':
            return (
              <text
                key={i}
                x={p.x}
                y={p.y}
                fontFamily={FONT_STACK}
                fontSize={p.size}
                fill={p.fill}
                textAnchor={p.anchor}
                fontWeight={p.bold ? 700 : 400}
                style={{ userSelect: 'none' }}
              >
                {p.text}
              </text>
            );
        }
      })}
    </>
  );
}

export default memo(Prims);
