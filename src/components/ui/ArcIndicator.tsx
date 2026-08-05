"use client"

import * as React from "react"
import { motion } from "framer-motion"

export interface ArcIndicatorProps {
  currentValue: number
  targetValue: number
  maxDegrees?: number
  color?: "recovery" | "signal"
  animated?: boolean
}

export function ArcIndicator({
  currentValue,
  targetValue,
  maxDegrees = targetValue,
  color = "recovery",
  animated = true,
}: ArcIndicatorProps) {
  // SVG geometry
  const size = 200
  const strokeWidth = 16
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // We want the arc to sweep exactly maxDegrees out of 360.
  // The fraction of the circle that represents the full track.
  const trackFraction = maxDegrees / 360
  const trackDasharray = circumference
  const trackDashoffset = circumference - circumference * trackFraction

  // The fraction of the circle that represents the current progress.
  // Cap it at maxDegrees just in case.
  const clampedValue = Math.min(Math.max(currentValue, 0), maxDegrees)
  const progressFraction = clampedValue / 360
  const progressDashoffset = circumference - circumference * progressFraction

  // Calculate rotation to center the arc at the top (12 o'clock).
  // Standard SVG circle starts at 3 o'clock (0deg).
  // 12 o'clock is -90deg.
  // To center the sweep of `maxDegrees` at the top, we start half of `maxDegrees` before 12 o'clock.
  const svgRotation = -90 - (maxDegrees / 2)

  // Colors
  const strokeColorClass = color === "signal" ? "stroke-signal" : "stroke-recovery"

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        style={{ transform: `rotate(${svgRotation}deg)` }}
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-line"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={trackDasharray}
          strokeDashoffset={trackDashoffset}
        />

        {/* Progress Track */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={strokeColorClass}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={trackDasharray}
          initial={{ strokeDashoffset: trackDasharray }}
          animate={{ strokeDashoffset: progressDashoffset }}
          transition={
            animated
              ? { duration: 0.6, ease: "easeOut" }
              : { duration: 0 }
          }
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="font-serif text-xl font-medium text-ink">
          {Math.round(currentValue)}&deg;
        </span>
        <span className="font-sans text-xs text-ink/70">
          / {targetValue}&deg;
        </span>
      </div>
    </div>
  )
}
