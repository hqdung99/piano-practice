import { FINGER_NAMES, HAND_NAMES, thumbNote } from '../../utils/fingering';
import type { Hand, HandFingering } from '../../utils/fingering';
import styles from './FingeringPanel.module.css';

const WIDTH = 120;

// Right hand seen from above, palm down: thumb on the left, pinky on the right
const FINGERS = [
  { finger: 2, x: 40, top: 16, width: 15 },
  { finger: 3, x: 57, top: 6, width: 15 },
  { finger: 4, x: 74, top: 13, width: 15 },
  { finger: 5, x: 91, top: 30, width: 13 },
];
// The thumb leans out from the side of the palm
const THUMB = { x: 22, y: 52, width: 16, height: 46, angle: 28 };

function HandDiagram({ hand, fingers }: { hand: Hand; fingers: number[] }) {
  // The left hand is a mirror image of the right
  const mx = (x: number, w = 0) => (hand === 'right' ? x : WIDTH - x - w);
  const lit = (f: number) => fingers.includes(f);
  const angle = hand === 'right' ? -THUMB.angle : THUMB.angle;
  const pivotX = mx(THUMB.x + THUMB.width / 2);
  const pivotY = THUMB.y + THUMB.height;
  // The thumb's number stays upright, so place it where the tilted tip ends up
  const reach = THUMB.height - 12;
  const rad = (angle * Math.PI) / 180;
  const thumbTextX = pivotX + reach * Math.sin(rad);
  const thumbTextY = pivotY - reach * Math.cos(rad) + 4;
  return (
    <svg className={styles.hand} viewBox={`0 0 ${WIDTH} 120`} aria-hidden="true">
      <rect x={mx(36, 70)} y={58} width={70} height={56} rx={22} className={styles.palm} />
      {FINGERS.map((f) => (
        <g key={f.finger}>
          <rect
            x={mx(f.x, f.width)}
            y={f.top}
            width={f.width}
            height={74 - f.top}
            rx={f.width / 2}
            className={lit(f.finger) ? styles.fingerLit : styles.finger}
          />
          <text x={mx(f.x + f.width / 2)} y={f.top + 14} className={lit(f.finger) ? styles.numLit : styles.num}>
            {f.finger}
          </text>
        </g>
      ))}
      <rect
        x={mx(THUMB.x, THUMB.width)}
        y={THUMB.y}
        width={THUMB.width}
        height={THUMB.height}
        rx={THUMB.width / 2}
        transform={`rotate(${angle} ${pivotX} ${pivotY})`}
        className={lit(1) ? styles.fingerLit : styles.finger}
      />
      <text x={thumbTextX} y={thumbTextY} className={lit(1) ? styles.numLit : styles.num}>
        1
      </text>
    </svg>
  );
}

function describe(h: HandFingering) {
  const thumb = thumbNote(h.hand, h.anchor);
  const fingerText = h.fingers.length
    ? `Finger ${h.fingers.join(' + ')} · ${h.fingers.map((f) => FINGER_NAMES[f]).join(', ')}`
    : 'Resting';
  const outer = h.fingers.includes(1) ? 'thumb' : 'pinky';
  return { thumb, fingerText, outer };
}

/** Which finger to use now, with a drawing of the hand */
export function FingeringPanel({ hands }: { hands: HandFingering[] }) {
  return (
    <div className={styles.panel}>
      {hands.map((h) => {
        const { thumb, fingerText, outer } = describe(h);
        return (
          <div key={h.hand} className={styles.handBlock}>
            <HandDiagram hand={h.hand} fingers={h.fingers} />
            <div className={styles.text}>
              <span className={styles.handName}>{HAND_NAMES[h.hand]}</span>
              <strong className={styles.fingerText}>{fingerText}</strong>
              {h.moved ? (
                <span className={styles.move}>Move your hand: thumb on {thumb}</span>
              ) : (
                <span className={styles.position}>Thumb on {thumb}</span>
              )}
              {h.stretch && <span className={styles.move}>Stretch your {outer} one key</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
