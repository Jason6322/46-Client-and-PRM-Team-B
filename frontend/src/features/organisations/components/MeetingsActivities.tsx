'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AutoGrowTextarea } from '@/components/shared/AutoGrowTextarea'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { inputClass, labelClass } from '@/components/shared/formClasses'
import {
  logActivity,
  setActivityArchived,
} from '@/features/organisations/actions/organisations.actions'
import { ACTIVITY_TYPE_CLASSES, LOGGED_ACTIVITY_TYPES } from '@/features/organisations/constants'
import {
  logActivityFormSchema,
  toLogActivityInput,
  type LogActivityFormValues,
} from '@/lib/validations/organisation'
import { cn, formatDate, formatDatetime } from '@/lib/utils'
import { isLoggedActivity, type OrganisationActivity } from '@/features/organisations/types'

/**
 * Meetings & Activities — the interaction timeline and the form that adds to
 * it, from the meetings wireframe.
 *
 * Only hand-logged interactions are listed here. Automatic stage changes live
 * in the same subcollection but belong to the Pipeline tab, so the timeline
 * filters them out rather than mixing two kinds of entry.
 */

/**
 * A short label for a link: the file or page name where there is one, the host
 * otherwise. A raw URL is unreadable in a narrow card.
 */
function linkLabel(link: string) {
  try {
    const url = new URL(link)
    const last = url.pathname.split('/').filter(Boolean).pop()
    return last ? decodeURIComponent(last) : url.hostname
  } catch {
    return link
  }
}

/** A datetime-local value for now, in the viewer's own timezone. */
function nowForInput() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

export function MeetingsActivities({
  organisationId,
  activities,
}: {
  organisationId: string
  activities: OrganisationActivity[]
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const loggedAll = activities.filter(isLoggedActivity)
  const logged = loggedAll.filter((activity) => activity.deletedAt === null)
  const archived = loggedAll.filter((activity) => activity.deletedAt !== null)

  const setArchived = async (activity: OrganisationActivity, archive: boolean) => {
    setBusyId(activity.id)
    const result = await setActivityArchived(organisationId, activity.id, archive)
    setBusyId(null)

    if (!result.success) {
      toast.error(result.error ?? 'Failed to update activity')
      return
    }

    toast.success(archive ? `${activity.type} archived` : `${activity.type} restored`)
    router.refresh()
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogActivityFormValues>({
    resolver: zodResolver(logActivityFormSchema),
    defaultValues: {
      type: 'Meeting',
      occurredAt: nowForInput(),
      attendees: '',
      agenda: '',
      notes: '',
      outcome: '',
      actionItems: '',
      nextFollowUp: '',
      meetingLink: '',
      documentLinks: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await logActivity(organisationId, toLogActivityInput(values))

    if (!result.success) {
      toast.error(result.error ?? 'Failed to log activity')
      return
    }

    toast.success(`${values.type} logged`)
    reset({
      ...values,
      occurredAt: nowForInput(),
      agenda: '',
      notes: '',
      outcome: '',
      actionItems: '',
      nextFollowUp: '',
      meetingLink: '',
      documentLinks: '',
    })
    router.refresh()
  })

  const field = (
    name: keyof LogActivityFormValues,
    label: string,
    options?: { long?: boolean; type?: string }
  ) => (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      {options?.long ? (
        <AutoGrowTextarea
          id={name}
          className={cn(inputClass, errors[name] && 'border-red-400')}
          registration={register(name)}
        />
      ) : (
        <input
          id={name}
          type={options?.type ?? 'text'}
          aria-invalid={errors[name] ? true : undefined}
          className={cn(inputClass, errors[name] && 'border-red-400')}
          {...register(name)}
        />
      )}
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]?.message}</p>}
    </div>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Interaction Timeline" className="self-start">
        {logged.length === 0 ? (
          <EmptyState
            title="No interactions logged yet"
            description="Meetings, calls, emails and notes appear here once logged."
          />
        ) : (
          <ol className="space-y-3">
            {logged.map((activity) => (
              <li key={activity.id} className="rounded-lg bg-zinc-50 p-4">
                <span
                  className={cn(
                    'inline-block rounded-full px-2.5 py-1 text-xs font-semibold',
                    ACTIVITY_TYPE_CLASSES[activity.type]
                  )}
                >
                  {activity.type}
                </span>
                <p className="mt-2 text-xs text-zinc-500">
                  {formatDate(new Date(activity.occurredAt ?? activity.createdAt))}
                </p>
                <p className="mt-1 text-sm text-zinc-900">
                  {activity.notes ?? activity.agenda ?? 'No details recorded'}
                </p>

                {(activity.attendees ||
                  activity.outcome ||
                  activity.actionItems ||
                  activity.nextFollowUp) && (
                  <dl className="mt-2 space-y-1 text-xs text-zinc-600">
                    {activity.attendees && (
                      <div>
                        <dt className="inline text-zinc-500">Attendees: </dt>
                        <dd className="inline">{activity.attendees}</dd>
                      </div>
                    )}
                    {activity.outcome && (
                      <div>
                        <dt className="inline text-zinc-500">Outcome: </dt>
                        <dd className="inline">{activity.outcome}</dd>
                      </div>
                    )}
                    {activity.actionItems && (
                      <div>
                        <dt className="inline text-zinc-500">Action items: </dt>
                        <dd className="inline">{activity.actionItems}</dd>
                      </div>
                    )}
                    {activity.nextFollowUp && (
                      <div>
                        <dt className="inline text-zinc-500">Next follow-up: </dt>
                        <dd className="inline">{activity.nextFollowUp}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {(activity.meetingLink || activity.documentLinks.length > 0) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {activity.meetingLink && (
                      <a
                        href={activity.meetingLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-brand-600 hover:text-brand-700 rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold transition-colors"
                      >
                        Join meeting
                      </a>
                    )}
                    {activity.documentLinks.map((link) => (
                      <a
                        key={link}
                        href={link}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={link}
                        className="hover:text-brand-600 max-w-48 truncate rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 transition-colors"
                      >
                        {linkLabel(link)}
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-zinc-400">
                    By {activity.actorLabel ?? 'Unknown'} · logged{' '}
                    {formatDatetime(new Date(activity.createdAt))}
                  </p>
                  <button
                    type="button"
                    onClick={() => void setArchived(activity, true)}
                    disabled={busyId === activity.id}
                    className="shrink-0 text-xs font-medium text-zinc-500 transition-colors hover:text-red-600 disabled:opacity-60"
                  >
                    {busyId === activity.id ? 'Archiving...' : 'Archive'}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        {archived.length > 0 && (
          <details className="mt-4 border-t border-zinc-100 pt-4">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-500 hover:text-zinc-800">
              Archived ({archived.length})
            </summary>
            <ul className="mt-3 space-y-2">
              {archived.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2"
                >
                  <span className="min-w-0 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-600">{activity.type}</span> ·{' '}
                    {formatDate(new Date(activity.occurredAt ?? activity.createdAt))}
                    {activity.notes && <span className="block truncate">{activity.notes}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => void setArchived(activity, false)}
                    disabled={busyId === activity.id}
                    className="text-brand-600 hover:text-brand-700 shrink-0 text-xs font-semibold transition-colors disabled:opacity-60"
                  >
                    {busyId === activity.id ? 'Restoring...' : 'Restore'}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <Card title="Log New Meeting / Activity" className="self-start">
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="type" className={labelClass}>
              Activity type
            </label>
            <select id="type" className={inputClass} {...register('type')}>
              {LOGGED_ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {field('occurredAt', 'Date & time', { type: 'datetime-local' })}
          {field('attendees', 'Attendees / contact')}
          {field('agenda', 'Agenda', { long: true })}
          {field('notes', 'Notes / minutes', { long: true })}
          {field('outcome', 'Outcome', { long: true })}
          {field('actionItems', 'Action items + responsible', { long: true })}
          {field('meetingLink', 'Meeting link', { type: 'url' })}
          {field('documentLinks', 'Document links', { long: true })}
          <p className="-mt-2 text-xs text-zinc-500">One link per line, up to 10.</p>
          {field('nextFollowUp', 'Next follow-up')}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save Activity'}
          </button>
        </form>
      </Card>
    </div>
  )
}
