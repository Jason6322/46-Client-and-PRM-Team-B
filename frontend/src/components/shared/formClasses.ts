/**
 * Shared form styling.
 *
 * These strings were copy-pasted into every form component, so a change to the
 * input border or label size meant editing several files and missing one.
 * Import them instead of redefining them.
 */

/** Small uppercase field label, as used across the CRM screens. */
export const labelClass = 'block text-xs font-semibold tracking-wide text-zinc-500 uppercase'

/** Text input, select and textarea. */
export const inputClass =
  'mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'

/** Applied alongside `inputClass` when a field has failed validation. */
export const inputErrorClass = 'border-red-400 focus:border-red-500'

/** Validation message shown beneath a field. */
export const fieldErrorClass = 'mt-1 text-xs text-red-600'
