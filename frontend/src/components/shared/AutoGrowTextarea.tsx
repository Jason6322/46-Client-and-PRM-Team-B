'use client'

import { useRef, type TextareaHTMLAttributes } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

/**
 * A textarea that grows with its content instead of scrolling inside a fixed
 * box, for free-text fields whose length varies a lot (notes, research,
 * communication records).
 *
 * The height is set from scrollHeight on mount as well as on input, so a field
 * that loads with saved text opens at the right size rather than jumping on
 * the first keystroke.
 *
 * The drag handle stays enabled. Once the height has been dragged, this stops
 * auto-sizing that field — otherwise the next keystroke would immediately undo
 * the height the person just chose.
 */

interface AutoGrowTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  registration: UseFormRegisterReturn
}

export function AutoGrowTextarea({ registration, rows = 2, ...props }: AutoGrowTextareaProps) {
  const { ref, onChange, ...rest } = registration
  const manuallyResized = useRef(false)
  const heightBeforeDrag = useRef<number | null>(null)

  const resize = (element: HTMLTextAreaElement | null) => {
    if (!element || manuallyResized.current) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }

  return (
    <textarea
      rows={rows}
      {...props}
      {...rest}
      ref={(element) => {
        ref(element)
        resize(element)
      }}
      onChange={(event) => {
        void onChange(event)
        resize(event.currentTarget)
      }}
      // The drag handle fires no event of its own, so compare the height
      // across a pointer press to tell a resize from an ordinary click.
      onPointerDown={(event) => {
        heightBeforeDrag.current = event.currentTarget.offsetHeight
      }}
      onPointerUp={(event) => {
        if (
          heightBeforeDrag.current !== null &&
          event.currentTarget.offsetHeight !== heightBeforeDrag.current
        ) {
          manuallyResized.current = true
        }
        heightBeforeDrag.current = null
      }}
      className={`${props.className ?? ''} resize-y`}
    />
  )
}
