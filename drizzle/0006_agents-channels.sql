ALTER TABLE "agents"
  ADD COLUMN "channel" text DEFAULT 'voice' NOT NULL,
  ADD COLUMN "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN "voice_config" jsonb;

UPDATE "agents"
SET "voice_config" = jsonb_build_object(
  'voiceId', "voice_id",
  'language', "language",
  'interruptionSensitivity', "interruption_sensitivity",
  'endCallKeyword', "end_call_keyword"
);

ALTER TABLE "agents"
  DROP COLUMN "voice_id",
  DROP COLUMN "language",
  DROP COLUMN "interruption_sensitivity",
  DROP COLUMN "end_call_keyword";
