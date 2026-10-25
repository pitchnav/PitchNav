'use client'

import { useId, useState } from 'react'
import type { SessionVelocityPoint } from '@/lib/pitch-data'
import { sourceLabel } from '@/lib/pitch-data'

/**
 * Velocity across sessions.
 *
 * Colour choice is not taste. The two hues were validated against this card
 * surface (#1a2235) for the lightness band, chroma floor, colour-vision
 * separation and contrast. Blue/green separate well for deuteranopia but less
 * so for tritanopia, so identity never rests on hue alone: peak is dashed,
 * both series are labelled directly at their last point, a legend is always
 * present, and the same numbers appear in a table beneath the chart.
 *
 * Single y-axis on purpose. Both series are mph, so one scale is honest; a
 * second axis would let two different scales imply a relationship that is not
 * in the data.
 */

const AVG_COLOR = '#3b82f6'
const PEAK_COLOR = '#00a86f'

// Chart geometry in viewBox units. Rendered responsively, so these are ratios
// rather than pixels.
const WIDTH = 760
const HEIGHT = 300
const PAD = { top: 24, right: 68, bottom: 44, left: 48 }

const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

type Props = { points: SessionVelocityPoint[] }

export function VelocityTrendChart({ points }: Props) {
  const clipId = useId()
  const [active, setActive] = useState<number | null>(null)

  // One session cannot show a trend. Saying so is more useful than drawing a
  // single dot and calling it a line chart.
  if (points.length < 2) {
    return (
      <div className="rounded-xl border border-surface-border bg-navy-950 p-6 text-center">
        <p className="text-sm text-slate-400">
          {points.length === 0
            ? 'No velocity readings yet. Upload a session or enter a pitch to start the trend.'
            : 'One session so far. The trend line appears once a second session has velocity in it.'}
        </p>
      </div>
    )
  }

  const avgValues = points.map((p) => p.avgRelSpeedMph ?? 0)
  const peakValues = points.map((p) => p.maxRelSpeedMph ?? p.avgRelSpeedMph ?? 0)

  // Pad the domain so the lines never sit on the frame, and never start the
  // axis at zero — on a velocity chart a zero baseline compresses every real
  // difference into a flat line. The axis is labelled so the non-zero base is
  // explicit rather than hidden.
  const rawMin = Math.min(...avgValues, ...peakValues)
  const rawMax = Math.max(...avgValues, ...peakValues)
  const span = Math.max(rawMax - rawMin, 4)
  const yMin = Math.floor((rawMin - span * 0.25) * 2) / 2
  const yMax = Math.ceil((rawMax + span * 0.25) * 2) / 2

  const x = (i: number) => PAD.left + (points.length === 1 ? PLOT_W / 2 : (i / (points.length - 1)) * PLOT_W)
  const y = (v: number) => PAD.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H

  const line = (values: number[]) => values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

  // Four gridlines is enough to read a value without the grid competing with
  // the data.
  const ticks = [0, 1, 2, 3, 4].map((step) => yMin + ((yMax - yMin) * step) / 4)

  // Label every session when there is room, otherwise thin them out so the
  // axis never overlaps itself.
  const labelEvery = points.length > 8 ? Math.ceil(points.length / 6) : 1

  const activePoint = active !== null ? points[active] : null

  return (
    <div>
      {/* Legend — always present for two series */}
      <div className="mb-4 flex flex-wrap items-center gap-5">
        <span className="flex items-center gap-2 text-xs text-slate-300">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="1" y1="4" x2="21" y2="4" stroke={AVG_COLOR} strokeWidth="2" strokeLinecap="round" />
          </svg>
          Average velocity
        </span>
        <span className="flex items-center gap-2 text-xs text-slate-300">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="1" y1="4" x2="21" y2="4" stroke={PEAK_COLOR} strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" />
          </svg>
          Peak velocity
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`Velocity across ${points.length} sessions, from ${points[0].label} to ${points[points.length - 1].label}. Full values are listed in the table below.`}
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} />
            </clipPath>
          </defs>

          {/* Recessive grid + y labels */}
          {ticks.map((value) => (
            <g key={value}>
              <line
                x1={PAD.left}
                y1={y(value)}
                x2={PAD.left + PLOT_W}
                y2={y(value)}
                stroke="#1e2d45"
                strokeWidth="1"
              />
              <text x={PAD.left - 10} y={y(value) + 4} textAnchor="end" fontSize="11" fill="#64748b">
                {value.toFixed(0)}
              </text>
            </g>
          ))}

          <text
            x={12}
            y={PAD.top + PLOT_H / 2}
            fontSize="11"
            fill="#64748b"
            textAnchor="middle"
            transform={`rotate(-90 12 ${PAD.top + PLOT_H / 2})`}
          >
            mph
          </text>

          {/* x labels */}
          {points.map((point, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <text key={point.sessionId} x={x(i)} y={HEIGHT - 22} textAnchor="middle" fontSize="11" fill="#64748b">
                {point.label}
              </text>
            ) : null,
          )}

          {/* Crosshair for the hovered session */}
          {active !== null && (
            <line
              x1={x(active)}
              y1={PAD.top}
              x2={x(active)}
              y2={PAD.top + PLOT_H}
              stroke="#3b82f6"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          )}

          <g clipPath={`url(#${clipId})`}>
            {/* Peak is dashed: shape carries identity as well as colour */}
            <path d={line(peakValues)} fill="none" stroke={PEAK_COLOR} strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
            <path d={line(avgValues)} fill="none" stroke={AVG_COLOR} strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Markers, with a surface ring so overlapping points stay readable */}
          {points.map((point, i) => (
            <g key={`m-${point.sessionId}`}>
              <circle cx={x(i)} cy={y(peakValues[i])} r="4.5" fill={PEAK_COLOR} stroke="#1a2235" strokeWidth="2" />
              <circle cx={x(i)} cy={y(avgValues[i])} r="4.5" fill={AVG_COLOR} stroke="#1a2235" strokeWidth="2" />
            </g>
          ))}

          {/* Direct labels on the final point — the secondary encoding that
              makes the two series distinguishable without relying on hue */}
          <text x={x(points.length - 1) + 10} y={y(avgValues[points.length - 1]) + 4} fontSize="11" fill="#94a3b8">
            Avg
          </text>
          <text x={x(points.length - 1) + 10} y={y(peakValues[points.length - 1]) + 4} fontSize="11" fill="#94a3b8">
            Peak
          </text>

          {/* Hit targets, deliberately wider than the markers */}
          {points.map((point, i) => (
            <rect
              key={`hit-${point.sessionId}`}
              x={x(i) - PLOT_W / (points.length * 2) - 2}
              y={PAD.top}
              width={PLOT_W / points.length + 4}
              height={PLOT_H}
              fill="transparent"
              onMouseEnter={() => setActive(i)}
            />
          ))}
        </svg>

        {activePoint && (
          <div className="pointer-events-none absolute left-0 top-0 w-full">
            <div
              className="absolute -translate-x-1/2 rounded-lg border border-surface-border bg-navy-900 px-3 py-2 shadow-card"
              style={{ left: `${(x(active!) / WIDTH) * 100}%`, top: 4 }}
            >
              <p className="text-xs font-semibold text-white">{activePoint.label}</p>
              <p className="mt-1 text-xs text-slate-300">
                Avg {activePoint.avgRelSpeedMph?.toFixed(1)} · Peak {activePoint.maxRelSpeedMph?.toFixed(1)} mph
              </p>
              <p className="text-[11px] text-slate-500">
                {activePoint.pitchCount} pitch{activePoint.pitchCount === 1 ? '' : 'es'} · {sourceLabel(activePoint.source)}
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-[11px] text-slate-600">
        Vertical axis starts at {yMin.toFixed(0)} mph, not zero, so real differences stay visible.
      </p>

      {/* Table view — the same numbers, for anyone who cannot read the chart */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold text-electric-blue-light">
          View as a table
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead className="bg-navy-800 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Average</th>
                <th className="px-3 py-2">Peak</th>
                <th className="px-3 py-2">Pitches</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={`row-${point.sessionId}`} className="border-t border-surface-border">
                  <td className="px-3 py-2 text-slate-300">{point.label}</td>
                  <td className="px-3 py-2 font-semibold text-white">{point.avgRelSpeedMph?.toFixed(1)} mph</td>
                  <td className="px-3 py-2 text-slate-300">{point.maxRelSpeedMph?.toFixed(1)} mph</td>
                  <td className="px-3 py-2 text-slate-300">{point.pitchCount}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{sourceLabel(point.source)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
