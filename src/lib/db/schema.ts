import { pgTable, uuid, text, timestamp, integer, real, uniqueIndex, vector, index, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "@/lib/db/auth-schema";

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: text("role").notNull().default("owner"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
  },
  (table) => [uniqueIndex("memberships_user_workspace_unique").on(table.userId, table.workspaceId)],
);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeBases = pgTable("knowledge_bases", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Support Agent"),
    channel: text("channel", { enum: ["text", "voice"] })
      .notNull()
      .default("voice"),
    systemPrompt: text("system_prompt").notNull().default(""),
    guardrails: text("guardrails").notNull().default(""),
    examplePhrases: text("example_phrases").array().notNull().default(sql`'{}'::text[]`),
    kbIds: uuid("kb_ids").array().notNull().default(sql`'{}'::uuid[]`),
    topK: integer("top_k").notNull().default(4),
    similarityThreshold: real("similarity_threshold").notNull().default(0.3),
    escalationMessage: text("escalation_message").notNull().default(""),
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    voiceConfig: jsonb("voice_config"),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("agents_project_id_idx").on(table.projectId)],
);

export const knowledgeSources = pgTable("knowledge_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  kbId: uuid("kb_id")
    .notNull()
    .references(() => knowledgeBases.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["text", "file", "url"] }).notNull(),
  status: text("status", {
    enum: ["queued", "processing", "ready", "failed"],
  })
    .notNull()
    .default("queued"),
  contentRef: text("content_ref").notNull(),
  name: text("name").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kbId: uuid("kb_id")
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  () => [
    index("chunks_embedding_hnsw").using("hnsw", sql`embedding vector_cosine_ops`),
  ],
);

export type Workspace = typeof workspaces.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type AgentChannel = "text" | "voice";
export type AgentConfig = {
  greeting: string;
  tone: string;
  suggestedPrompts: string[];
  maxTurns: number;
};
export type VoiceConfig = {
  voiceId: string;
  language: string;
  interruptionSensitivity: "low" | "medium" | "high";
  endCallKeyword: string;
};
export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
