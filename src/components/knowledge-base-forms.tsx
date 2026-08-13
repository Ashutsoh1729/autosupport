"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import type { KnowledgeBase } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});
type NameValues = z.infer<typeof nameSchema>;

export function NewKnowledgeBaseDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await fetch(`/api/projects/${projectId}/knowledge-bases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Failed to create knowledge base");
      return;
    }
    toast.success("Knowledge base created");
    setOpen(false);
    form.reset();
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New KB</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Knowledge Base</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="kb-name">Name</FieldLabel>
                <Input
                  {...field}
                  id="kb-name"
                  aria-invalid={fieldState.invalid}
                  placeholder="e.g. Product FAQ"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function KnowledgeBaseRowActions({ kb }: { kb: KnowledgeBase }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(kb.name);
  const [busy, setBusy] = useState(false);

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === kb.name) {
      setRenaming(false);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${kb.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Rename failed");
        return;
      }
      toast.success("Knowledge base renamed");
      setRenaming(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${kb.name}"? This removes its sources and chunks.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${kb.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Delete failed");
        return;
      }
      toast.success("Knowledge base deleted");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (renaming) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="h-7 w-40 text-sm"
        />
        <Button
          size="sm"
          onClick={handleRename}
          disabled={busy || !name.trim()}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setRenaming(false);
            setName(kb.name);
          }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setRenaming(true)}>
        Rename
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDelete}
        disabled={busy}
        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        Delete
      </Button>
    </div>
  );
}