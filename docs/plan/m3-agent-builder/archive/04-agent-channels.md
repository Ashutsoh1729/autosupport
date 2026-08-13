# M3 Agent Builder — Plan 5: Channel Types (text / voice)

Status: Completed
Branch: plan/m3/03-agent-editor-ui

## Description
Make the agent model channel-aware: each agent runs on either **voice** (a phone-call agent) or **text** (a chatbot, e.g. a sales agent). The builder form selects the agent type first, then shows the relevant fields — voice-only technical settings (voice, language, interruption sensitivity, end-call keyword) appear only for voice agents, while a shared **behavior config** (greeting, tone, suggested prompts, max turns, escalation message) applies to both channels.

## Goals
- `agents.channel` enum (`text` | `voice`, default `voice` for back-compat)
- Move voice-only columns into a nullable `voice_config` JSONB blob (data migration preserves existing rows)
- New shared `config` JSONB blob (greeting/tone/suggestedPrompts/maxTurns), validated server-side
- Form: agent-type selector first; Voice section renders only for voice agents
- `parseAgentBody` validates `channel`, `config`, `voiceConfig`; text agents store `voiceConfig = null`

## Workflow
Update schema → rewrite validation → refactor form → custom migration (add cols → data move → drop cols) → apply → curl-test each flow → build/lint.

## Implementation Steps

### Step 1: Schema
- [x] `src/lib/db/schema.ts`: add `channel` (text enum default `voice`), `config` (jsonb default `{}`), `voiceConfig` (jsonb nullable); remove `voiceId`, `language`, `interruptionSensitivity`, `endCallKeyword` columns
- [x] Add `AgentChannel`, `AgentConfig`, `VoiceConfig` TS types

### Step 2: Validation
- [x] `src/lib/agent-validation.ts`: parse `channel`, nested `config` + `voiceConfig` objects (voiceConfig level enum enforced); `voiceConfig: null` clears the blob

### Step 3: Form
- [x] `src/components/agent-editor.tsx`: "Agent type" select first; Voice section (`voiceConfig.*`) only when `channel === "voice"`; shared Behavior section (`config.*` greeting/tone/suggestedPrompts/maxTurns) + escalationMessage always shown; payload nests config + voiceConfig

### Step 4: Migration
- [x] `drizzle/0006_agents-channels.sql` (custom): add columns → copy old voice columns into `voice_config` jsonb → drop voice columns
- [x] Applied to the DB; existing rows keep `channel='voice'` and migrated voice settings

### Step 5: Verify
- [x] `npm run build` + `npm run lint` pass
- [x] curl round-trips: create text agent (voiceConfig null), create voice agent, switch voice→text clears voiceConfig, invalid `channel` and invalid `interruptionSensitivity` rejected (400), publish gating unchanged

### Files
- `src/lib/db/schema.ts`
- `src/lib/agent-validation.ts`
- `src/components/agent-editor.tsx`
- `drizzle/0006_agents-channels.sql`
- `docs/spec.md` (§6.3 + data model)
