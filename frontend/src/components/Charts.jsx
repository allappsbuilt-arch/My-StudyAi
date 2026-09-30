/**
 * Lightweight charts (no chart library needed).
 *  - BarChart: one series of values per day, with hover tooltips.
 *  - LineChart: one series over time (e.g. quiz scores), with hover points.
 *  - HBarList: horizontal bars for comparing categories.
 * Single-series charts use one hue; labels use text colours, never the series colour.
 */
import { useEffect, useRef, useState } from 'react';

function niceMax(max) {
  if (max <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export function BarChart({ data, valueKey, labelKey, formatValue = (v) => v, todayIndex, ariaLabel }) {
  const max = niceMax(Math.max(...data.map((d) => d[valueKey] || 0)));
  return (
    <div className="bar-chart" role="img" aria-label={ariaLabel}>
      <div className="plot">
        <div className="gridline" style={{ bottom: '50%' }}><span>{formatValue(max / 2)}</span></div>
        <div className="gridline" style={{ bottom: '100%' }}><span>{formatValue(max)}</span></div>
        {data.map((d, i) => {
          const v = d[valueKey] || 0;
          return (
            <div key={i} className={`bar-col ${v ? '' : 'zero'}`} tabIndex={0} aria-label={`${d[labelKey]}: ${formatValue(v)}`}>
              <div className={`bar ${i === todayIndex ? 'today' : ''}`} style={{ height: `${(v / max) * 100}%` }} />
              <div className="tip">
                {d.tooltipLabel || d[labelKey]}: <strong>{formatValue(v)}</strong>
              </div>
            </div>
          );
        })}
      </div>
      <div className="x-labels">
        {data.map((d, i) => (
          <span key={i} className={i === todayIndex ? 'today' : ''}>
            {d[labelKey]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ points, height = 170, max = 100, formatValue = (v) => `${v}%`, ariaLabel }) {
  const [hover, setHover] = useState(null);
  // Draw at the container's real pixel width so text stays readable on phones
  const boxRef = useRef(null);
  const [width, setWidth] = useState(360);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pad = { top: 16, right: 16, bottom: 26, left: 34 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const x = (i) => pad.left + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v) => pad.top + h - (v / max) * h;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `${path} L${x(points.length - 1)},${pad.top + h} L${x(0)},${pad.top + h} Z` : '';

  return (
    <div className="line-chart" role="img" aria-label={ariaLabel} ref={boxRef}>
      <svg viewBox={`0 0 ${width} ${height}`} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={pad.left} x2={width - pad.right} y1={y((g / 100) * max)} y2={y((g / 100) * max)} stroke="var(--border)" strokeDasharray="4 4" />
            <text x={pad.left - 8} y={y((g / 100) * max) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {formatValue((g / 100) * max)}
            </text>
          </g>
        ))}
        {area && <path d={area} fill="url(#lc-fill)" />}
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4.5} fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" />
            {/* larger invisible hit area */}
            <rect x={x(i) - w / Math.max(points.length, 2) / 2} y={pad.top} width={w / Math.max(points.length, 2)} height={h} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
          </g>
        ))}
        {hover !== null && points[hover] && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + h} stroke="var(--muted)" strokeDasharray="3 3" />
            <rect x={Math.min(Math.max(x(hover) - 80, 0), width - 160)} y={Math.max(y(points[hover].value) - 50, 0)} width="160" height="38" rx="9" fill="#0f172a" />
            <text x={Math.min(Math.max(x(hover), 80), width - 80)} y={Math.max(y(points[hover].value) - 50, 0) + 16} textAnchor="middle" fontSize="11" fill="#cbd5e1">
              {points[hover].label}
            </text>
            <text x={Math.min(Math.max(x(hover), 80), width - 80)} y={Math.max(y(points[hover].value) - 50, 0) + 31} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#fff">
              {formatValue(points[hover].value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function HBarList({ items, formatValue = (v) => `${v}%`, max = 100 }) {
  return (
    <div className="hbar">
      {items.map((it) => (
        <div key={it.label} className="hbar-row">
          <div className="row-between">
            <span className="truncate">{it.label}</span>
            <span className="bold">{formatValue(it.value)}</span>
          </div>
          <div className="progress thin" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={it.value} aria-label={it.label}>
            <span style={{ width: `${Math.min(100, (it.value / max) * 100)}%` }} />
          </div>
          {it.sub && <div className="tiny muted" style={{ marginTop: 4 }}>{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}
