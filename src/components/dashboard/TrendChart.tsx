import * as React from "react"

export interface DataPoint {
  date: string | Date
  rom: number
  status?: string
}

interface TrendChartProps {
  data: DataPoint[]
  targetROM: number
}

export function TrendChart({ data, targetROM }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-line bg-paper/50">
        <p className="font-sans text-sm text-ink/50">Not enough data to display trend.</p>
      </div>
    )
  }

  // Padding inside the SVG
  const paddingX = 40
  const paddingY = 40
  const width = 600
  const height = 240

  const minROM = 0 // Or dynamically calculate: Math.max(0, Math.min(...data.map(d => d.rom)) - 20)
  const maxROM = Math.max(targetROM, ...data.map(d => d.rom)) + 10

  const scaleX = (index: number) => {
    if (data.length === 1) return width / 2
    return paddingX + (index / (data.length - 1)) * (width - paddingX * 2)
  }

  const scaleY = (rom: number) => {
    return height - paddingY - ((rom - minROM) / (maxROM - minROM)) * (height - paddingY * 2)
  }

  // Generate SVG path for the line
  const validData = data.filter(d => d.status !== "blocked")
  const linePath = validData
    .map((point, index) => {
      const originalIndex = data.indexOf(point)
      const x = scaleX(originalIndex)
      const y = scaleY(point.rom)
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible font-sans"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Gridlines & Y-Axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingY + ratio * (height - paddingY * 2)
          const value = Math.round(maxROM - ratio * (maxROM - minROM))
          return (
            <g key={ratio}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                className="stroke-line"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text x={paddingX - 10} y={y + 4} className="fill-ink/50 text-[10px]" textAnchor="end">
                {value}&deg;
              </text>
            </g>
          )
        })}

        {/* Target Line (optional, but helpful to see) */}
        <line
          x1={paddingX}
          y1={scaleY(targetROM)}
          x2={width - paddingX}
          y2={scaleY(targetROM)}
          className="stroke-ink/20"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <text
          x={width - paddingX + 10}
          y={scaleY(targetROM) + 4}
          className="fill-ink/50 text-[10px]"
          textAnchor="start"
        >
          Target
        </text>

        {/* The Trend Line */}
        {data.length > 1 && (
          <path
            d={linePath}
            fill="none"
            className="stroke-recovery"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data Points */}
        {data.map((point, index) => {
          const x = scaleX(index)
          const isBlocked = point.status === "blocked"
          const y = isBlocked ? height - paddingY : scaleY(point.rom)
          const dateLabel = new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          
          return (
            <g key={index}>
              {isBlocked ? (
                <g>
                  <circle cx={x} cy={y} r="6" className="fill-signal" />
                  <path d={`M ${x-3} ${y-3} L ${x+3} ${y+3} M ${x+3} ${y-3} L ${x-3} ${y+3}`} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              ) : (
                <circle cx={x} cy={y} r="4" className="fill-paper stroke-recovery" strokeWidth="2" />
              )}
              {/* X-Axis Date Labels for first and last, or all if few */}
              {(index === 0 || index === data.length - 1 || data.length <= 5) && (
                <text x={x} y={height - paddingY + 20} className="fill-ink/50 text-[10px]" textAnchor="middle">
                  {dateLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
