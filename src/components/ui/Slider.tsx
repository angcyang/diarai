'use client'

import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  labels?: { [key: number]: string }
  colors?: { [key: number]: string }
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  labels,
  colors,
}: SliderProps) {
  return (
    <div className="w-full px-2">
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-surface0">
          <SliderPrimitive.Range
            className="absolute h-full"
            style={{
              backgroundColor: colors ? colors[value] || colors[5] : undefined
            }}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow transition-transform focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-110">
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">
            {value}
          </span>
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
      {labels && (
        <div className="flex justify-between mt-2 text-xs text-subtext0">
          {Object.entries(labels).map(([key, label]) => (
            <span key={key}>{label}</span>
          ))}
        </div>
      )}
    </div>
  )
}
