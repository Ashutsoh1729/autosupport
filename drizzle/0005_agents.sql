CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text DEFAULT 'Support Agent' NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
	"guardrails" text DEFAULT '' NOT NULL,
	"example_phrases" text[] DEFAULT '{}'::text[] NOT NULL,
	"voice_id" text DEFAULT 'aura-asteria-en' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"kb_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"top_k" integer DEFAULT 4 NOT NULL,
	"similarity_threshold" real DEFAULT 0.3 NOT NULL,
	"interruption_sensitivity" text DEFAULT 'medium' NOT NULL,
	"end_call_keyword" text DEFAULT 'end call' NOT NULL,
	"escalation_message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_project_id_idx" ON "agents" USING btree ("project_id");