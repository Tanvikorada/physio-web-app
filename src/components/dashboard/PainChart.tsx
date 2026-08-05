import * as React from "react"

export interface PainDataPoint {
  date: string | Date
  pain: number
  status?: string
}

interface PainChartProps {
  data: PainDataPoint[]
}

export function PainChart({ data }: PainChartProps) {
  const validData = data.filter(d => d.status !== "blocked" && typeof d.pain === "number")
  
  if (!validData || validData.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-line bg-paper/50">
        <p className="font-sans text-sm text-ink/50">Not enough data to display pain trend.</p>
      </div>
    )
  }

  // Padding inside the SVG
  const paddingX = 40
  const paddingY = 40
  const width = 600
  const height = 240

  const minPain = 0
  const maxPain = 10 // Clinical pain scale is always 0-10

  const scaleX = (index: number) => {
    if (data.length === 1) return width / 2
    return paddingX + (index / (data.length - 1)) * (width - paddingX * 2)
  }

  const scaleY = (pain: number) => {
    return height - paddingY - ((pain - minPain) / (maxPain - minPain)) * (height - paddingY * 2)
  }

  // Generate SVG path for the line
  const linePath = validData
    .map((point, index) => {
      const originalIndex = data.indexOf(point)
      const x = scaleX(originalIndex)
      const y = scaleY(point.pain)
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
          const value = Math.round(maxPain - ratio * (maxPain - minPain))
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
                {value}
              </text>
            </g>
          )
        })}

        {/* The Trend Line */}
        {validData.length > 1 && (
          <path
            d={linePath}
            fill="none"
            className="stroke-signal"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data Points */}
        {data.map((point, index) => {
          const x = scaleX(index)
          const isBlocked = point.status === "blocked" || typeof point.pain !== "number"
          const y = isBlocked ? height - paddingY : scaleY(point.pain)
          const dateLabel = new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          
          return (
            <g key={index}>
              {isBlocked ? (
                <g>
                  <circle cx={x} cy={y} r="6" className="fill-line" />
                  <path d={`M ${x-3} ${y-3} L ${x+3} ${y+3} M ${x+3} ${y-3} L ${x-3} ${y+3}`} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              ) : (
                <circle cx={x} cy={y} r="4" className="fill-paper stroke-signal" strokeWidth="2" />
              )}
              {/* X-Axis Date Labels */}
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
