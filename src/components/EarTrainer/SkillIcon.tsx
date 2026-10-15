import type { SkillId } from '../../utils/earTraining/skills';

/** A note head with a stem rising from its right side */
function Note({ x, y, r = 3.2, stem = 11 }: { x: number; y: number; r?: number; stem?: number }) {
  return (
    <>
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.78} transform={`rotate(-20 ${x} ${y})`} />
      <rect x={x + r - 1.4} y={y - stem} width={1.6} height={stem} rx={0.6} />
    </>
  );
}

/** A stem with stacked note heads, like a chord */
function Stack({ x, ys }: { x: number; ys: number[] }) {
  return (
    <>
      <rect x={x + 1.6} y={ys[0] - 9} width={1.4} height={ys[ys.length - 1] - ys[0] + 9} rx={0.6} />
      {ys.map((y) => (
        <ellipse key={y} cx={x} cy={y} rx={2.4} ry={1.8} />
      ))}
    </>
  );
}

export function SkillIcon({ skill, size = 28 }: { skill: SkillId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {skill === 'pitch' && <Note x={10} y={18} r={3.6} stem={15} />}
      {skill === 'intervals' && (
        <>
          <Note x={6.5} y={18.5} stem={12} />
          <Note x={16.5} y={16.5} stem={12} />
          <path d="M8.3 6.5 L19.9 4.5 L19.9 7.3 L8.3 9.3 Z" />
        </>
      )}
      {skill === 'chords' && <Stack x={11} ys={[9, 13.5, 18]} />}
      {skill === 'scales' && (
        <>
          <Note x={4} y={19} r={2.4} stem={9} />
          <Note x={9.2} y={17} r={2.4} stem={9} />
          <Note x={14.4} y={15} r={2.4} stem={9} />
          <Note x={19.6} y={13} r={2.4} stem={9} />
        </>
      )}
      {skill === 'progressions' && (
        <>
          <Stack x={5} ys={[12, 16, 20]} />
          <Stack x={11.5} ys={[8, 12, 16]} />
          <Stack x={18} ys={[10, 14, 18]} />
        </>
      )}
      {skill === 'compare' && (
        <>
          <path d="M7 15V5M3.5 8.5 7 5l3.5 3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 9v10M13.5 15.5 17 19l3.5-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {skill === 'contour' && (
        <path d="M3 17l5-7 4 4 5-8 4 5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {skill === 'degrees' && (
        <>
          <rect x={3} y={17} width={4} height={4} rx={1} />
          <rect x={8.5} y={13} width={4} height={8} rx={1} />
          <rect x={14} y={9} width={4} height={12} rx={1} />
          <path d="M18 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {skill === 'tonic' && (
        <path d="M12 3 3 10.5h2.5V20h5v-5h3v5h5v-9.5H21z" />
      )}
      {skill === 'keys' && (
        <>
          <circle cx={12} cy={12} r={9} fill="none" stroke="currentColor" strokeWidth={2} />
          <path d="M12 3a9 9 0 0 1 0 18z" />
        </>
      )}
      {skill === 'inversions' && (
        <>
          <Stack x={6} ys={[9, 13.5, 18]} />
          <Stack x={16} ys={[6, 10.5, 15]} />
          <rect x={14} y={19} width={5} height={2} rx={1} />
        </>
      )}
      {skill === 'functions' && (
        <text x={12} y={17} textAnchor="middle" fontSize={12} fontWeight={800} fontFamily="Georgia, serif">IV</text>
      )}
      {skill === 'bass' && (
        <>
          <path d="M6 7a5 5 0 1 1 5 6c-2 0-4 2-6 6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
          <circle cx={18} cy={7} r={1.5} />
          <circle cx={18} cy={12} r={1.5} />
        </>
      )}
      {skill === 'cadences' && (
        <>
          <Stack x={6} ys={[10, 14, 18]} />
          <path d="M12 14h6M15.5 11l3 3-3 3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={21} cy={14} r={1.6} />
        </>
      )}
      {skill === 'rhythm' && (
        <>
          <Note x={5} y={18} stem={12} />
          <Note x={13} y={18} stem={12} />
          <Note x={19} y={18} stem={12} />
          <rect x={14.6} y={6} width={6.6} height={2.6} />
        </>
      )}
      {skill === 'dynamics' && <path d="M3 15 21 7v10z" />}
      {skill === 'articulation' && (
        <>
          <Note x={6} y={18} stem={12} />
          <Note x={16} y={18} stem={12} />
          <path d="M3 4q6-3 14 0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
          <circle cx={16} cy={23} r={1.3} />
        </>
      )}
    </svg>
  );
}
