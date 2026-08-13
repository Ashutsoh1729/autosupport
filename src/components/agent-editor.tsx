"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { XIcon } from "lucide-react";

import type { Agent } from "@/lib/db/schema";
import { VOICES, LANGUAGES } from "@/lib/voices";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type KnowledgeBaseRow = { id: string; name: string; createdAt: Date };

const agentSchema = z.object({
  name: z.string().trim().min(1, "Agent name is required"),
  systemPrompt: z.string(),
  guardrails: z.string(),
  examplePhrases: z.string(),
  voiceId: z.string().min(1, "Voice is required"),
  language: z.string().min(1, "Language is required"),
  kbIds: z.array(z.string()),
  topK: z
    .string()
    .refine((v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n >= 1 && n <= 10;
    }, "Enter a number between 1 and 10"),
  similarityThreshold: z.string().refine(
    (v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n >= 0 && n <= 1;
    },
    "Enter a number between 0 and 1",
  ),
  interruptionSensitivity: z.enum(["low", "medium", "high"]),
  endCallKeyword: z.string(),
  escalationMessage: z.string(),
});

type FormValues = z.infer<typeof agentSchema>;

const VOICE_LIST = VOICES;
const LANGUAGE_LIST = LANGUAGES;

function parsePhrases(input: string): string[] {
  return input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function toExamplePhrases(agent: Agent | null): string {
  return (agent?.examplePhrases ?? []).join(", ");
}

export function AgentEditor({
  projectId,
  agent,
  kbs,
  onSaved,
}: {
  projectId: string;
  agent: Agent | null;
  kbs: KnowledgeBaseRow[];
  onSaved: (agent: Agent) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  function defaultValues(): FormValues {
    return {
      name: agent?.name ?? "",
      systemPrompt: agent?.systemPrompt ?? "",
      guardrails: agent?.guardrails ?? "",
      examplePhrases: toExamplePhrases(agent),
      voiceId: agent?.voiceId || VOICE_LIST[0].id,
      language: agent?.language || LANGUAGE_LIST[0].code,
      kbIds: agent?.kbIds ?? [],
      topK: String(agent?.topK ?? 4),
      similarityThreshold: String(agent?.similarityThreshold ?? 0.3),
      interruptionSensitivity:
        (agent?.interruptionSensitivity as FormValues["interruptionSensitivity"]) ||
        "medium",
      endCallKeyword: agent?.endCallKeyword || "end call",
      escalationMessage: agent?.escalationMessage ?? "",
    };
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: defaultValues(),
  });

  const editingId = useRef(agent?.id ?? null);
  useEffect(() => {
    const id = agent?.id ?? null;
    if (id !== editingId.current) {
      editingId.current = id;
      form.reset(defaultValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id, form]);

  const systemPrompt = useWatch({ control: form.control, name: "systemPrompt" });
  const kbIds = useWatch({ control: form.control, name: "kbIds" });
  const publishDisabled = !systemPrompt.trim() || kbIds.length === 0 || saving;

  function buildPayload(values: FormValues): Record<string, unknown> {
    return {
      name: values.name,
      systemPrompt: values.systemPrompt,
      guardrails: values.guardrails,
      examplePhrases: parsePhrases(values.examplePhrases),
      voiceId: values.voiceId,
      language: values.language,
      kbIds: values.kbIds,
      topK: Number(values.topK),
      similarityThreshold: Number(values.similarityThreshold),
      interruptionSensitivity: values.interruptionSensitivity,
      endCallKeyword: values.endCallKeyword,
      escalationMessage: values.escalationMessage,
    };
  }

  async function persist(values: FormValues): Promise<Agent | null> {
    const res = agent
      ? await fetch(`/api/agents/${agent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(values)),
        })
      : await fetch(`/api/projects/${projectId}/agents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(values)),
        });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Failed to save agent");
      return null;
    }
    return data as Agent;
  }

  const handleSave = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      const saved = await persist(values);
      if (!saved) return;
      toast.success(agent ? "Agent updated" : "Agent created");
      router.refresh();
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  });

  const handlePublish = form.handleSubmit(async (values) => {
    if (!values.systemPrompt.trim()) {
      toast.error("Agent needs a system prompt before publishing");
      return;
    }
    if (values.kbIds.length === 0) {
      toast.error("Attach at least one knowledge base before publishing");
      return;
    }
    setSaving(true);
    try {
      let target = agent;
      if (!target) {
        target = await persist(values);
        if (!target) return;
      }
      const res = await fetch(`/api/agents/${target.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to publish agent");
        return;
      }
      toast.success("Agent published");
      router.refresh();
      onSaved(data);
    } finally {
      setSaving(false);
    }
  });

  return (
    <form
      onSubmit={handleSave}
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="agent-name">Name</FieldLabel>
              <Input
                {...field}
                id="agent-name"
                aria-invalid={fieldState.invalid}
                placeholder="Refunds Agent"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="systemPrompt"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="agent-system-prompt">
                System prompt
              </FieldLabel>
              <Textarea
                {...field}
                id="agent-system-prompt"
                aria-invalid={fieldState.invalid}
                rows={5}
                placeholder="You are a helpful support agent for..."
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="examplePhrases"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="agent-example-phrases">
                Example phrases (comma separated)
              </FieldLabel>
              <Input
                {...field}
                id="agent-example-phrases"
                aria-invalid={fieldState.invalid}
                placeholder="How can I refund this?, Shipping times"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="guardrails"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="agent-guardrails">Guardrails</FieldLabel>
              <Textarea
                {...field}
                id="agent-guardrails"
                aria-invalid={fieldState.invalid}
                rows={3}
                placeholder="Never promise discounts, always confirm order numbers..."
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="voiceId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="agent-voice">Voice</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id="agent-voice"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="item-aligned">
                  {VOICE_LIST.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="language"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="agent-language">Language</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id="agent-language"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="item-aligned">
                  {LANGUAGE_LIST.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <FieldGroup>
        <Controller
          name="kbIds"
          control={form.control}
          render={({ field }) => {
            const selected = field.value
              .map((id) => kbs.find((kb) => kb.id === id))
              .filter((kb): kb is KnowledgeBaseRow => Boolean(kb));
            return (
              <Field>
                <FieldLabel htmlFor="agent-kbs">Knowledge</FieldLabel>
                {kbs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No knowledge bases yet — create one above to attach it
                  </p>
                ) : (
                  <>
                    {selected.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.map((kb) => (
                          <span
                            key={kb.id}
                            className="flex h-5 items-center gap-1 rounded-sm bg-muted pl-1.5 pr-1 text-xs font-medium text-foreground"
                          >
                            {kb.name}
                            <button
                              type="button"
                              onClick={() =>
                                field.onChange(
                                  field.value.filter((id) => id !== kb.id),
                                )
                              }
                              className="-ml-1 flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-zinc-200 hover:text-foreground dark:hover:bg-zinc-700"
                              aria-label={`Remove ${kb.name}`}
                            >
                              <XIcon className="size-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <Combobox
                      items={kbs}
                      multiple
                      itemToStringValue={(kb) => kb.name}
                      value={selected}
                      onValueChange={(items: KnowledgeBaseRow[]) =>
                        field.onChange(items.map((kb) => kb.id))
                      }
                    >
                      <ComboboxInput placeholder="Select knowledge bases..." />
                      <ComboboxContent>
                        <ComboboxEmpty>No items found.</ComboboxEmpty>
                        <ComboboxList>
                          {(kb: KnowledgeBaseRow) => (
                            <ComboboxItem key={kb.id} value={kb}>
                              {kb.name}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </>
                )}
              </Field>
            );
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="topK"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="agent-topk">
                  Chunks to retrieve (topK)
                </FieldLabel>
                <Input
                  {...field}
                  id="agent-topk"
                  type="number"
                  min={1}
                  max={10}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="similarityThreshold"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="agent-similarity">
                  Similarity threshold
                </FieldLabel>
                <Input
                  {...field}
                  id="agent-similarity"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="interruptionSensitivity"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="agent-interruption">
                  Interruption sensitivity
                </FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="agent-interruption"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="endCallKeyword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="agent-end-call">
                  End-call keyword
                </FieldLabel>
                <Input
                  {...field}
                  id="agent-end-call"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <Controller
          name="escalationMessage"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="agent-escalation">
                Escalation fallback message
              </FieldLabel>
              <Textarea
                {...field}
                id="agent-escalation"
                aria-invalid={fieldState.invalid}
                rows={3}
                placeholder="I couldn't answer that — let me connect you with a human agent."
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          onClick={handlePublish}
          disabled={publishDisabled}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {saving ? "Publishing..." : "Publish"}
        </Button>
        {publishDisabled && !saving ? (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {!systemPrompt.trim()
              ? "Needs a system prompt"
              : kbIds.length === 0
                ? "Needs at least one attached knowledge base"
                : ""}
          </span>
        ) : null}
      </div>
    </form>
  );
}