#!/usr/bin/env node
/**
 * Seed Firestore with demo CRM data, or remove it again.
 *
 *   pnpm --filter frontend seed               dry run — prints what it would write
 *   pnpm --filter frontend seed -- --write    writes the demo data
 *   pnpm --filter frontend seed -- --clean    deletes everything this script wrote
 *   pnpm --filter frontend seed -- --write --count 60
 *
 * Every document carries `_seed: true` and every organisation the tag "demo",
 * so the data is easy to spot in the app and --clean removes exactly what was
 * seeded. --clean hard-deletes: these are fixtures, not user records, so the
 * app's soft-delete rule does not apply. It also deletes activity anyone logged
 * against a demo organisation.
 *
 * There is one Firebase project and the live site uses it, so seeded data is
 * visible to everyone — clean it up before handing the CRM over.
 *
 * Documents mirror what the Server Actions write (organisations.actions.ts,
 * opportunities.actions.ts), so the app cannot tell them apart. The data is
 * generated from a fixed random seed: every run produces the same records.
 *
 * Reads credentials from frontend/.env.local (run `pnpm run env:sync` first).
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// ── Options ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const CLEAN = args.includes('--clean')
const countArg = args.indexOf('--count')
const COUNT = countArg >= 0 ? Number(args[countArg + 1]) : 40

if (WRITE && CLEAN) exit('Pass --write or --clean, not both.')
if (!Number.isInteger(COUNT) || COUNT < 1 || COUNT > 200) exit('--count must be 1–200.')

function exit(message) {
  console.error(message)
  process.exit(1)
}

// ── Firebase ────────────────────────────────────────────────────────────────

const envFile = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
if (!existsSync(envFile)) exit('frontend/.env.local not found — run `pnpm run env:sync` first.')
process.loadEnvFile(envFile)

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
if (!key) exit('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 is not set in frontend/.env.local.')

const db = getFirestore(
  initializeApp({
    credential: cert(JSON.parse(Buffer.from(key, 'base64').toString('utf8'))),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
)

// ── Deterministic randomness ────────────────────────────────────────────────

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(46)
const pick = (list) => list[Math.floor(random() * list.length)]
const chance = (p) => random() < p
const between = (min, max) => min + Math.floor(random() * (max - min + 1))
const sample = (list, n) => [...list].sort(() => random() - 0.5).slice(0, n)

// ── Reference data (mirrors features/*/constants.ts) ───────────────────────

const PIPELINE_STAGES = [
  'Prospect',
  'Research',
  'Qualified',
  'Outreach',
  'Follow-up',
  'Meeting',
  'Proposal',
  'Negotiation',
  'Partnership',
  'Active Relationship',
  'Completed',
  'Archived',
]
const ORGANISATION_TYPES = ['Industry Partner', 'Client', 'Collaborator']
const RELATIONSHIP_STATUSES = ['Active', 'Prospect']
const LOGGED_TYPES = ['Meeting', 'Call', 'Email', 'Note']
const OPPORTUNITY_TYPES = ['Partnership', 'Project', 'Collaboration']

const OWNERS = ['Jason', 'Saneli', 'Piotr', 'Tommy', 'David']

const NAME_FIRST = [
  'GreenLeaf',
  'Riverbend',
  'Urban Harvest',
  'Fair Trade',
  'Local Roots',
  'Harvest Moon',
  'Southern Cross',
  'Golden Wattle',
  'Coastal',
  'Blue Gum',
  'Red Earth',
  'Tasman',
  'Murray Valley',
  'Gippsland',
  'Hunter',
  'Barossa',
  'Yarra',
  'Wimmera',
  'Otway',
  'Darling Downs',
  'Canterbury',
  'Waikato',
  "Hawke's Bay",
  'Kiwi Fields',
  'Silver Fern',
  'Sunrise',
  'Paddock',
  'Orchard Lane',
  'Seedling',
  'Common Ground',
]
const NAME_LAST = [
  'Foods',
  'Co-op',
  'Partners',
  'Alliance',
  'Market',
  'Co.',
  'Growers',
  'Produce',
  'Collective',
  'Farms',
  'Distributors',
  'Food Hub',
  'Grocers',
  'Kitchens',
  'Network',
]
const INDUSTRIES = [
  'Food Distribution',
  'Agriculture',
  'Non-profit',
  'Retail',
  'Hospitality',
  'Food Manufacturing',
  'Logistics',
  'Education',
  'Local Government',
  'Food Rescue',
]
const COUNTRIES = [
  ['Australia', 8],
  ['New Zealand', 2],
]
const TAGS = [
  'sustainability',
  'regional',
  'food-rescue',
  'organic',
  'wholesale',
  'grants',
  'education',
  'indigenous-led',
  'urban-farming',
  'supply-chain',
  'community',
  'export',
]
const FIRST_NAMES = [
  'Olivia',
  'Liam',
  'Charlotte',
  'Noah',
  'Amelia',
  'Jack',
  'Isla',
  'William',
  'Mia',
  'Henry',
  'Ava',
  'Leo',
  'Grace',
  'Oscar',
  'Chloe',
  'Lucas',
  'Ruby',
  'Thomas',
  'Zoe',
  'Aria',
  'Priya',
  'Wei',
  'Aroha',
  'Tane',
  'Mei',
  'Arjun',
  'Sofia',
  'Kai',
]
const LAST_NAMES = [
  'Smith',
  'Nguyen',
  'Williams',
  'Brown',
  'Wilson',
  'Taylor',
  'Chen',
  'Patel',
  'Martin',
  'Anderson',
  'Thompson',
  'Walker',
  'Kaur',
  'Ngata',
  'Parata',
  'Kelly',
  'Murphy',
  'Singh',
]
const ROLES = [
  'Operations Manager',
  'Procurement Lead',
  'Sustainability Officer',
  'General Manager',
  'Partnerships Coordinator',
  'CEO',
  'Program Manager',
  'Supply Chain Manager',
]
const NEXT_ACTIONS = [
  'Send revised partnership proposal',
  'Book site visit',
  'Follow up on pricing',
  'Share impact report',
  'Confirm pilot start date',
  'Introduce to logistics partner',
  'Schedule quarterly review',
  'Send MOU draft for review',
]
const AGENDAS = [
  'Introductory call',
  'Quarterly review',
  'Pilot planning',
  'Pricing discussion',
  'Site visit debrief',
  'Grant application check-in',
  'Supply agreement terms',
]
const OUTCOMES = [
  'Agreed to a pilot next quarter',
  'Needs board approval first',
  'Keen to expand volumes',
  'Asked for case studies',
  'Waiting on their budget cycle',
]
const OPPORTUNITY_NAMES = [
  'Community Fridge Partnership',
  'Produce Donation Pilot',
  'Volunteer Program Expansion',
  'Regional Cold Chain Project',
  'School Garden Collaboration',
  'Surplus Redistribution Trial',
  'Farmers Market Sponsorship',
  'Food Literacy Workshops',
]

// ── Builders ────────────────────────────────────────────────────────────────

const DAY = 86_400_000
const now = Date.now()
const ts = (millis) => Timestamp.fromMillis(millis)
/** Due dates are stored at 12:00 UTC on the day, as followUp.ts expects. */
const dueDate = (dayOffset) => {
  const day = new Date(now + dayOffset * DAY).toISOString().slice(0, 10)
  return Timestamp.fromDate(new Date(`${day}T12:00:00Z`))
}
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '')

function contact(domain, country) {
  const first = pick(FIRST_NAMES)
  const last = pick(LAST_NAMES)
  return {
    name: `${first} ${last}`,
    role: pick(ROLES),
    email: chance(0.85) ? `${first}.${last}@${domain}`.toLowerCase() : null,
    phone: chance(0.6)
      ? `${country === 'New Zealand' ? '+64 21' : '+61 4'}${between(10, 99)} ${between(100, 999)} ${between(100, 999)}`
      : null,
  }
}

function uniqueNames(count) {
  const names = new Set()
  while (names.size < count) names.add(`${pick(NAME_FIRST)} ${pick(NAME_LAST)}`)
  return [...names]
}

function buildOrganisation(name) {
  const domain = `${slug(name)}.example.org`
  const country = random() < COUNTRIES[0][1] / 10 ? COUNTRIES[0][0] : COUNTRIES[1][0]
  // Weight towards the early and middle stages, like a real pipeline.
  const stageIndex = Math.min(
    PIPELINE_STAGES.length - 1,
    Math.floor(Math.pow(random(), 1.4) * PIPELINE_STAGES.length)
  )
  const pipelineStage = PIPELINE_STAGES[stageIndex]
  const createdAt = now - between(20, 120) * DAY

  // Stage history: a path from Prospect to the current stage, oldest first.
  const path = [
    'Prospect',
    ...PIPELINE_STAGES.slice(1, stageIndex + 1).filter(
      (_, i, list) => i === list.length - 1 || chance(0.6)
    ),
  ]
  let at = createdAt
  const stageChanges = path.map((toStage, i) => {
    at += i === 0 ? 0 : between(2, 12) * DAY
    return {
      type: 'stage_change',
      fromStage: i === 0 ? null : path[i - 1],
      toStage,
      actorUid: 'seed-script',
      actorLabel: pick(OWNERS),
      createdAt: ts(Math.min(at, now - DAY)),
      _seed: true,
    }
  })

  // Hand-logged interactions; some meetings land in the next seven days so
  // the dashboard's Upcoming Meetings panel has something to show.
  const logged = Array.from({ length: between(0, 4) }, () => {
    const type = pick(LOGGED_TYPES)
    const upcoming = type === 'Meeting' && chance(0.3)
    const occurredAt = upcoming ? now + between(1, 6) * DAY : now - between(1, 40) * DAY
    const recordedAt = upcoming ? now - between(1, 3) * DAY : occurredAt + between(0, 2) * DAY
    return {
      type,
      occurredAt: ts(occurredAt),
      attendees:
        type === 'Note' ? null : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}, ${pick(OWNERS)}`,
      agenda: type === 'Meeting' ? pick(AGENDAS) : null,
      notes: `${pick(AGENDAS)} with ${name}.`,
      outcome: upcoming ? null : pick(OUTCOMES),
      actionItems: chance(0.5) ? `${pick(NEXT_ACTIONS)} — ${pick(OWNERS)}` : null,
      nextFollowUp: chance(0.4) ? pick(NEXT_ACTIONS) : null,
      meetingLink: type === 'Meeting' && chance(0.5) ? 'https://meet.example.org/fsc' : null,
      documentLinks: chance(0.3) ? [`https://docs.example.org/${slug(name)}`] : [],
      actorUid: 'seed-script',
      actorLabel: pick(OWNERS),
      createdAt: ts(Math.min(recordedAt, now)),
      deletedAt: null,
      _seed: true,
    }
  })

  const activities = [...stageChanges, ...logged]
  const lastActivityAt = Math.max(createdAt, ...activities.map((a) => a.createdAt.toMillis()))

  // Follow-ups: a mix of overdue, due today, upcoming and none.
  const followUp = pick(['overdue', 'today', 'soon', 'later', 'none', 'none'])
  const dueOffset = {
    overdue: -between(1, 10),
    today: 0,
    soon: between(1, 7),
    later: between(8, 30),
  }

  const researched = stageIndex >= 1
  const reachedOut = stageIndex >= 3

  const organisation = {
    name,
    type: pick(ORGANISATION_TYPES),
    industry: pick(INDUSTRIES),
    country,
    website: chance(0.8) ? `https://www.${domain}` : null,
    relationshipOwner: pick(OWNERS),
    tags: ['demo', ...sample(TAGS, between(1, 3))],
    pipelineStage,
    relationshipStatus:
      stageIndex >= 8 ? 'Active' : chance(0.7) ? pick(RELATIONSHIP_STATUSES) : null,
    primaryContact: contact(domain, country),
    secondaryContact: chance(0.4) ? contact(domain, country) : null,
    notes: chance(0.5) ? `Prefers email. Main contact is based in ${country}.` : null,
    businessResearchNotes: researched
      ? `${name} works across ${pick(INDUSTRIES).toLowerCase()}.`
      : null,
    qualificationInfo: stageIndex >= 2 ? 'Budget confirmed; aligned with FSC goals.' : null,
    leadScore: researched ? between(20, 95) : null,
    researchStatus: researched ? pick(['In progress', 'Complete']) : null,
    businessBrief:
      researched && chance(0.6)
        ? `Potential ${pick(OPPORTUNITY_TYPES).toLowerCase()} partner.`
        : null,
    outreachStatus: reachedOut ? pick(['Contacted', 'Responded', 'Meeting booked']) : null,
    communicationRecord: reachedOut ? 'Intro email sent; follow-up call held.' : null,
    followUpStatus: reachedOut ? pick(['On track', 'Awaiting reply', 'Overdue']) : null,
    relationshipNotes: chance(0.3) ? 'Strong alignment on food-rescue goals.' : null,
    nextAction: followUp === 'none' ? null : pick(NEXT_ACTIONS),
    nextActionDueAt: followUp === 'none' ? null : dueDate(dueOffset[followUp]),
    createdBy: 'seed-script',
    createdAt: ts(createdAt),
    updatedAt: ts(lastActivityAt),
    lastActivityAt: ts(lastActivityAt),
    deletedAt: null,
    _schemaVersion: 1,
    _seed: true,
  }

  return { organisation, activities }
}

function buildOpportunity(organisationId, organisation) {
  const stage = pick(PIPELINE_STAGES.slice(1, 11))
  const createdAt = organisation.createdAt.toMillis() + between(1, 10) * DAY
  const completed = stage === 'Completed'
  return {
    name: `${organisation.name.split(' ')[0]} ${pick(OPPORTUNITY_NAMES)}`,
    organisationId,
    organisationName: organisation.name,
    type: pick(OPPORTUNITY_TYPES),
    stage,
    owner: organisation.relationshipOwner,
    nextStep: completed ? null : pick(NEXT_ACTIONS),
    proposalDocument: chance(0.4) ? `https://docs.example.org/proposals/${organisationId}` : null,
    description: `Joint work with ${organisation.name} on local food access.`,
    expectedOutcome: chance(0.7) ? pick(OUTCOMES) : null,
    completedAt: completed ? ts(Math.min(createdAt + 20 * DAY, now)) : null,
    createdBy: 'seed-script',
    createdAt: ts(Math.min(createdAt, now)),
    updatedAt: ts(Math.min(createdAt + 5 * DAY, now)),
    deletedAt: null,
    _schemaVersion: 1,
    _seed: true,
  }
}

// ── Commands ────────────────────────────────────────────────────────────────

async function seed() {
  const records = uniqueNames(COUNT).map(buildOrganisation)
  // A couple of archived organisations so the Archived screen has content.
  records.slice(0, 2).forEach(({ organisation }) => {
    organisation.deletedAt = ts(now - between(1, 20) * DAY)
  })

  const activityCount = records.reduce((sum, r) => sum + r.activities.length, 0)
  const withOpportunities = records.filter((_, i) => i >= 2 && chance(0.5))

  console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)
  console.log(`Organisations: ${records.length} (2 archived)`)
  console.log(`Activities:    ${activityCount}`)
  console.log(`Opportunities: ${withOpportunities.length}`)

  if (!WRITE) {
    console.log('\nSample:')
    for (const { organisation: o, activities } of records.slice(2, 8)) {
      const due = o.nextActionDueAt ? o.nextActionDueAt.toDate().toISOString().slice(0, 10) : '—'
      console.log(
        `  ${o.name.padEnd(28)} ${o.type.padEnd(17)} ${o.pipelineStage.padEnd(20)} ` +
          `owner ${o.relationshipOwner.padEnd(7)} due ${due}  ${activities.length} activities`
      )
    }
    const byStage = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, 0]))
    records.forEach(({ organisation }) => byStage[organisation.pipelineStage]++)
    console.log('\nBy stage:', byStage)
    console.log('\nDry run — nothing written. Re-run with --write to seed.')
    return
  }

  const existing = await db.collection('organisations').where('_seed', '==', true).limit(1).get()
  if (!existing.empty) exit('Demo data is already seeded. Run with --clean first.')

  let batch = db.batch()
  let pending = 0
  const commitIfFull = async () => {
    if (++pending < 450) return
    await batch.commit()
    batch = db.batch()
    pending = 0
  }

  for (const record of records) {
    const orgRef = db.collection('organisations').doc()
    record.id = orgRef.id
    batch.set(orgRef, record.organisation)
    await commitIfFull()
    for (const activity of record.activities) {
      batch.set(orgRef.collection('activities').doc(), activity)
      await commitIfFull()
    }
  }
  for (const record of withOpportunities) {
    batch.set(
      db.collection('opportunities').doc(),
      buildOpportunity(record.id, record.organisation)
    )
    await commitIfFull()
  }
  if (pending > 0) await batch.commit()

  console.log('\nSeeded. Remove it again with: pnpm --filter frontend seed -- --clean')
}

async function clean() {
  const organisations = await db.collection('organisations').where('_seed', '==', true).get()
  const opportunities = await db.collection('opportunities').where('_seed', '==', true).get()

  let deleted = 0
  const writer = db.bulkWriter()
  for (const doc of organisations.docs) {
    // recursiveDelete takes the activities subcollection with it, including
    // anything logged by hand against a demo organisation.
    await db.recursiveDelete(doc.ref, writer)
    deleted++
  }
  for (const doc of opportunities.docs) {
    writer.delete(doc.ref)
    deleted++
  }
  await writer.close()

  console.log(
    `Removed ${organisations.size} demo organisations (with their activity) and ${opportunities.size} demo opportunities.`
  )
  if (deleted === 0) console.log('Nothing to remove.')
}

await (CLEAN ? clean() : seed())
