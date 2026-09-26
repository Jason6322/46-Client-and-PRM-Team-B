'use client'

import { Card } from '@/components/shared/Card'
import { labelClass } from '@/components/shared/formClasses'
import { EmptyState } from '@/components/shared/EmptyState'
import { PIPELINE_STAGES } from '@/features/organisations/constants'
import { PipelineStageSelect } from './PipelineStageSelect'
import { cn, formatDatetime, formatRelativeTime } from '@/lib/utils'
import type { OrganisationActivity, OrganisationListItem } from '@/features/organisations/types'

/**
 * Pipeline tab — where this organisation sits in the twelve stages, and how it
 * got there.
 *
 * There is no wireframe for this tab; the pipeline wireframe is the global
 * board. Progress and history are what the board cannot show for a single
 * organisation.
 */

export function PipelineTab({
  organisation,
  activities,
}: {
  organisation: OrganisationListItem
  activities: OrganisationActivity[]
}) {
  const currentIndex = PIPELINE_STAGES.indexOf(organisation.pipelineStage)
  // Logged meetings, calls and notes share the activities feed; only stage
  // changes belong in this tab.
  const stageChanges = activities.filter((activity) => activity.type === 'stage_change')
  const lastChange = stageChanges[0]
  // Before any stage change is recorded, the organisation has been at its
  // current stage since it was created.
  const inStageSince = lastChange?.createdAt ?? organisation.createdAt

  return (
    <div className="space-y-6">
      <Card title="Progress">
        <ol className="flex flex-wrap gap-2">
          {PIPELINE_STAGES.map((stage, index) => {
            const passed = index < currentIndex
            const current = index === currentIndex

            return (
              <li
                key={stage}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  current && 'bg-brand-600 text-white',
                  passed && 'bg-brand-50 text-brand-700',
                  !current && !passed && 'bg-zinc-100 text-zinc-400'
                )}
              >
                {passed && <span aria-hidden="true">✓ </span>}
                {stage}
              </li>
            )
          })}
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-zinc-100 pt-5">
          <div>
            <p className={labelClass}>Current stage</p>
            <div className="mt-1.5">
              <PipelineStageSelect id={organisation.id} stage={organisation.pipelineStage} />
            </div>
          </div>
          <div>
            <p className={labelClass}>In this stage</p>
            <p className="mt-1.5 text-sm text-zinc-900">{formatRelativeTime(inStageSince)}</p>
          </div>
          <div>
            <p className={labelClass}>Relationship status</p>
            <p
              className={cn(
                'mt-1.5 text-sm',
                organisation.relationshipStatus ? 'text-zinc-900' : 'text-zinc-400'
              )}
            >
              {organisation.relationshipStatus ?? 'Not set'}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Stage history">
        {stageChanges.length === 0 ? (
          <EmptyState
            title="No stage changes yet"
            description="Moving this organisation between stages will be recorded here."
          />
        ) : (
          <ol className="space-y-4">
            {stageChanges.map((activity) => (
              <li key={activity.id} className="border-l-2 border-zinc-100 pl-4">
                <p className="text-sm text-zinc-900">
                  {activity.fromStage ? (
                    <>
                      <span className="text-zinc-500">{activity.fromStage}</span>
                      <span className="text-zinc-400"> → </span>
                    </>
                  ) : (
                    <span className="text-zinc-500">Started at </span>
                  )}
                  <span className="font-medium">{activity.toStage}</span>
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatDatetime(new Date(activity.createdAt))}
                  {activity.actorLabel && ` · ${activity.actorLabel}`}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}
