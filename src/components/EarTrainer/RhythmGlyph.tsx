import { rhythmDef } from '../../utils/earTraining/theory';

const HEAD_Y = 30;
const STEM_TOP = 8;
const PAD = 10;

interface Placed {
  x: number;
  len: number;
  rest: boolean;
  start: number;
}

/** Where each note or rest sits, spaced by when it starts in the bar */
function place(steps: number[], usable: number): Placed[] {
  const placed: Placed[] = [];
  let t = 0;
  for (const s of steps) {
    placed.push({ x: PAD + (t / 16) * usable + 4, len: Math.abs(s), rest: s < 0, start: t });
    t += Math.abs(s);
  }
  return placed;
}

/** One bar of rhythm in simple notation: heads, stems, beams, flags, dots and rests */
export function RhythmGlyph({ id, width = 132 }: { id: string; width?: number }) {
  const steps = rhythmDef(id).steps;
  const placed = place(steps, width - PAD * 2);

  // Notes shorter than a beat are beamed with their neighbours in the same beat
  const beamGroups: Placed[][] = [];
  for (const p of placed) {
    if (p.rest || p.len >= 4) continue;
    const beat = Math.floor(p.start / 4);
    const group = beamGroups[beamGroups.length - 1];
    if (group && Math.floor(group[0].start / 4) === beat) group.push(p);
    else beamGroups.push([p]);
  }
  const beamed = new Set(beamGroups.filter((g) => g.length > 1).flat());

  return (
    <svg width={width} height={40} viewBox={`0 0 ${width} 40`} aria-label={rhythmDef(id).name} role="img">
      <line x1={4} x2={width - 4} y1={HEAD_Y} y2={HEAD_Y} stroke="currentColor" strokeOpacity={0.25} />
      {placed.map((p, i) => {
        const stemX = p.x + 4.2;
        if (p.rest) {
          return (
            <path
              key={i}
              d={`M${p.x + 1} ${HEAD_Y - 14} l4 5 l-4 4 l4 5 q-5 -2 -3 4`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          );
        }
        const hollow = p.len >= 8;
        const dotted = p.len === 12 || p.len === 6 || p.len === 3;
        const flags = !beamed.has(p) && p.len < 4 ? (p.len === 1 ? 2 : 1) : 0;
        return (
          <g key={i}>
            <ellipse
              cx={p.x}
              cy={HEAD_Y}
              rx={4.6}
              ry={3.4}
              transform={`rotate(-20 ${p.x} ${HEAD_Y})`}
              fill={hollow ? 'none' : 'currentColor'}
              stroke="currentColor"
              strokeWidth={1.5}
            />
            {p.len < 16 && <line x1={stemX} x2={stemX} y1={HEAD_Y - 1} y2={STEM_TOP} stroke="currentColor" strokeWidth={1.4} />}
            {dotted && <circle cx={p.x + 8} cy={HEAD_Y - 1} r={1.4} fill="currentColor" />}
            {Array.from({ length: flags }, (_, f) => (
              <path
                key={f}
                d={`M${stemX} ${STEM_TOP + f * 5} q6 4 4 11`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.4}
              />
            ))}
          </g>
        );
      })}
      {beamGroups
        .filter((g) => g.length > 1)
        .map((g, i) => {
          const x1 = g[0].x + 4.2;
          const x2 = g[g.length - 1].x + 4.2;
          return (
            <g key={i}>
              <rect x={x1} y={STEM_TOP} width={x2 - x1} height={3} fill="currentColor" />
              {/* A second beam over the sixteenths */}
              {g.map((p, j) => {
                if (p.len !== 1) return null;
                const next = g[j + 1];
                const prev = g[j - 1];
                const from = p.x + 4.2;
                const to = next && next.len === 1 ? next.x + 4.2 : prev && prev.len === 1 ? from : from + 6;
                return to > from ? <rect key={j} x={from} y={STEM_TOP + 5} width={to - from} height={3} fill="currentColor" /> : null;
              })}
            </g>
          );
        })}
    </svg>
  );
}
