import { useEffect, useRef, useState } from 'react';
import type { Dispatch, KeyboardEvent, PointerEvent, SetStateAction } from 'react';
import { dayKey } from '../../../utils/earTraining/progress';
import type { DayLog } from '../../../utils/earTraining/progress';
import s from './Stats.module.css';

const DAYS = 30;
/** Drawing width until the card has been measured */
const FALLBACK_W = 300;
const PAD_L = 36;
const PAD_R = 4;
const BAR_TOP = 22;
const BAR_H = 88;
const ACC_TOP = 136;
const ACC_H = 34;
const AXIS_Y = 188;
const H = 194;

interface Day {
  key: string;
  date: Date;
  log?: DayLog;
}

/** The last 30 days, oldest first, ending today */
function lastDays(days: Record<string, DayLog>): Day[] {
  const today = new Date();
  return Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (DAYS - 1 - i));
    const key = dayKey(date);
    return { key, date, log: days[key]?.answered ? days[key] : undefined };
  });
}

/** Smallest round number at or above n */
function niceCeil(n: number): number {
  if (n <= 5) return 5;
  const pow = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((v) => v >= n) ?? n;
}

/** A column with rounded top corners and a square base */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const longDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const pct = (log: DayLog) => Math.round((log.correct / log.answered) * 100);

/** Answers per day for the last 30 days, with that day's accuracy beneath on its own scale */
export function ActivityChart({ days }: { days: Record<string, DayLog> }) {
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Draw at the card's real width so text stays the same size on phones and desktops
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const list = lastDays(days);
  const answered = list.reduce((n, d) => n + (d.log?.answered ?? 0), 0);
  const correct = list.reduce((n, d) => n + (d.log?.correct ?? 0), 0);

  return (
    <div className={s.card} ref={ref}>
      {answered === 0 ? (
        <p className={s.empty}>
          <span aria-hidden="true">🌱</span>
          No practice in the last 30 days yet. Answer a few questions and your activity will grow here.
        </p>
      ) : (
        <Plot list={list} answered={answered} correct={correct} width={width || FALLBACK_W} active={active} onActive={setActive} />
      )}
    </div>
  );
}

interface PlotProps {
  list: Day[];
  answered: number;
  correct: number;
  width: number;
  active: number | null;
  onActive: Dispatch<SetStateAction<number | null>>;
}

function Plot({ list, answered, correct, width, active, onActive: setActive }: PlotProps) {
  const slot = (width - PAD_L - PAD_R) / DAYS;
  const barW = Math.min(16, slot * 0.66);
  const max = niceCeil(Math.max(...list.map((d) => d.log?.answered ?? 0)));
  const ticks = [0, max / 2, max].filter(Number.isInteger);
  const barY = (v: number) => BAR_TOP + BAR_H * (1 - v / max);
  const accY = (v: number) => ACC_TOP + ACC_H * (1 - v / 100);
  const slotX = (i: number) => PAD_L + i * slot;
  const cx = (i: number) => slotX(i) + slot / 2;
  const points = list.map((d, i) => (d.log ? { i, x: cx(i), y: accY(pct(d.log)) } : null));
  const segments = points.flatMap((p, i) => {
    const prev = points[i - 1];
    return p && prev ? [`M${prev.x},${prev.y}L${p.x},${p.y}`] : [];
  });
  const shown = active === null ? null : list[active];

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * width;
    const i = Math.floor((x - PAD_L) / slot);
    setActive(i >= 0 && i < DAYS ? i : null);
  };
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    setActive((a) => Math.min(DAYS - 1, Math.max(0, (a ?? DAYS) + step)));
  };

  return (
    <>
      <p className={s.readout} aria-live="polite">
        {shown ? (
          shown.log ? (
            <>
              <strong>{shown.log.answered}</strong> answered · <strong>{pct(shown.log)}%</strong> right
              <span> · {longDate(shown.date)}</span>
            </>
          ) : (
            <span>No practice · {longDate(shown.date)}</span>
          )
        ) : (
          <>
            <strong>{answered}</strong> answered · <strong>{Math.round((correct / answered) * 100)}%</strong> right
            <span> · last 30 days</span>
          </>
        )}
      </p>
      <svg
        className={s.chart}
        viewBox={`0 0 ${width} ${H}`}
        role="img"
        aria-label={`Activity for the last 30 days: ${answered} answered, ${Math.round((correct / answered) * 100)}% right. Use the arrow keys to read each day.`}
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        {active !== null && <rect className={s.hoverBand} x={slotX(active)} y={BAR_TOP - 4} width={slot} height={ACC_TOP + ACC_H - BAR_TOP + 8} rx={3} />}

        <g className={s.legendKey}>
          <rect x={PAD_L} y={4} width={9} height={9} rx={2} className={s.barFill} />
          <text x={PAD_L + 14} y={13}>Answered</text>
          <circle cx={PAD_L + 4.5} cy={ACC_TOP - 15} r={4} className={s.dotFill} />
          <text x={PAD_L + 14} y={ACC_TOP - 11}>Accuracy</text>
        </g>

        {ticks.map((t) => (
          <g key={t}>
            <line className={s.grid} x1={PAD_L} x2={width - PAD_R} y1={barY(t)} y2={barY(t)} />
            <text className={s.tick} x={PAD_L - 6} y={barY(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {[0, 50, 100].map((t) => (
          <g key={t}>
            <line className={s.grid} x1={PAD_L} x2={width - PAD_R} y1={accY(t)} y2={accY(t)} />
            <text className={s.tick} x={PAD_L - 6} y={accY(t) + 4} textAnchor="end">
              {t}%
            </text>
          </g>
        ))}

        {list.map((d, i) => {
          const x = cx(i) - barW / 2;
          if (!d.log) return <rect key={d.key} className={s.emptyStub} x={x} y={barY(0) - 1.5} width={barW} height={1.5} rx={0.75} />;
          const top = Math.min(barY(d.log.answered), barY(0) - 2);
          return <path key={d.key} className={s.barFill} d={columnPath(x, top, barW, barY(0) - top)} />;
        })}

        <path className={s.accLine} d={segments.join('')} />
        {points.map((p) => p && <circle key={p.i} className={s.dot} cx={p.x} cy={p.y} r={3.5} />)}

        {[0, 15, DAYS - 1].map((i) => (
          <text key={i} className={s.tick} x={i === 0 ? slotX(0) : i === DAYS - 1 ? width - PAD_R : cx(i)} y={AXIS_Y} textAnchor={i === 0 ? 'start' : i === DAYS - 1 ? 'end' : 'middle'}>
            {i === DAYS - 1 ? 'Today' : shortDate(list[i].date)}
          </text>
        ))}

        {list.map((d, i) => (
          <rect key={d.key} className={s.hit} x={slotX(i)} y={0} width={slot} height={ACC_TOP + ACC_H + 4}>
            <title>{d.log ? `${longDate(d.date)}: ${d.log.answered} answered, ${pct(d.log)}% right` : `${longDate(d.date)}: no practice`}</title>
          </rect>
        ))}
      </svg>

      <details className={s.tableView}>
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Answered</th>
              <th scope="col">Right</th>
              <th scope="col">XP</th>
            </tr>
          </thead>
          <tbody>
            {list
              .filter((d) => d.log)
              .reverse()
              .map((d) => (
                <tr key={d.key}>
                  <th scope="row">{longDate(d.date)}</th>
                  <td>{d.log!.answered}</td>
                  <td>{pct(d.log!)}%</td>
                  <td>{d.log!.xp}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
