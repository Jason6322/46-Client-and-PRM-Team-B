'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { inputClass, inputErrorClass } from '@/components/shared/formClasses'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  id: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  onBlur?: () => void
  placeholder?: string
  invalid?: boolean
}

/**
 * A dropdown of checkboxes for picking several options, styled like a select.
 * Chosen options show as chips beneath it, each removable on its own.
 *
 * Controlled — wire it to react-hook-form with a Controller.
 */
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  onBlur,
  placeholder = 'Select…',
  invalid,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const listId = useId()

  const labelFor = (optionValue: string) =>
    options.find((option) => option.value === optionValue)?.label ?? optionValue
  const toggle = (optionValue: string) =>
    onChange(
      value.includes(optionValue)
        ? value.filter((selected) => selected !== optionValue)
        : [...value, optionValue]
    )

  // Close on a click outside or Escape, and count it as leaving the field so
  // validation runs the way it does when a native select loses focus.
  useEffect(() => {
    if (!open) return
    const close = () => {
      setOpen(false)
      onBlur?.()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onBlur])

  return (
    <div ref={container} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          inputClass,
          'flex items-center justify-between text-left',
          invalid && inputErrorClass
        )}
      >
        <span className={cn('truncate', value.length === 0 && 'text-zinc-400')}>
          {value.length === 0 ? placeholder : `${value.length} selected`}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
      </button>

      {open && (
        <ul
          id={listId}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {options.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">No options</li>}
          {options.map((option) => (
            <li key={option.value}>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  className="accent-brand-600 h-4 w-4"
                  checked={value.includes(option.value)}
                  onChange={() => toggle(option.value)}
                />
                {option.label}
              </label>
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected">
          {value.map((selected) => (
            <li
              key={selected}
              className="bg-brand-50 text-brand-700 flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs font-medium"
            >
              {labelFor(selected)}
              <button
                type="button"
                onClick={() => toggle(selected)}
                aria-label={`Remove ${labelFor(selected)}`}
                className="hover:bg-brand-100 rounded-full p-0.5"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
