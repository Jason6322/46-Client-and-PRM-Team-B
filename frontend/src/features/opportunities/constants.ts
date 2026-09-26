/**
 * Opportunity enums.
 *
 * The types come from the Type column in the approved opportunities wireframe.
 * Stage deliberately reuses the organisation's PIPELINE_STAGES: the wireframe
 * shows Negotiation, Proposal, Outreach and Qualified, which are those same
 * stages, and a second parallel list would drift.
 */

export const OPPORTUNITY_TYPES = ['Partnership', 'Project', 'Collaboration'] as const

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number]
