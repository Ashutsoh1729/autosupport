"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVerticalIcon, FileTextIcon, LinkIcon, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SourceKind = "text" | "url" | "file";

const KIND_META: Record<
  SourceKind,
  { label: string; Icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  text: {
    label: "Text",
    Icon: FileTextIcon,
    className: "text-blue-600 dark:text-blue-400",
  },
  url: {
    label: "URL",
    Icon: LinkIcon,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  file: {
    label: "File",
    Icon: FileIcon,
    className: "text-amber-600 dark:text-amber-400",
  },
};

export function SourceSheet({ kbId }: { kbId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SourceKind>("text");

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>Add Knowledge</Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Knowledge</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as SourceKind)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(KIND_META) as SourceKind[]).map((k) => {
                const { label, Icon, className } = KIND_META[k];
                return (
                  <SelectItem key={k} value={k}>
                    <span className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${className}`} />
                      {label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {kind === "text" && <TextSourceForm kbId={kbId} onSuccess={close} />}
          {kind === "url" && <UrlSourceForm kbId={kbId} onSuccess={close} />}
          {kind === "file" && <FileSourceForm kbId={kbId} onSuccess={close} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TextSourceForm({
  kbId,
  onSuccess,
}: {
  kbId: string;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${kbId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "text", name, content }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to add text source");
        return;
      }
      toast.success("Text source added");
      onSuccess();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Source name (optional)"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste text content…"
        rows={6}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <Button type="submit" disabled={busy || !content.trim()}>
        {busy ? "Adding…" : "Add text"}
      </Button>
    </form>
  );
}

function UrlSourceForm({
  kbId,
  onSuccess,
}: {
  kbId: string;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${kbId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "url", name, url }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to add URL source");
        return;
      }
      toast.success("URL source added");
      onSuccess();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Source name (optional)"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/page"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <Button type="submit" disabled={busy || !url.trim()}>
        {busy ? "Adding…" : "Add URL"}
      </Button>
    </form>
  );
}

function FileSourceForm({
  kbId,
  onSuccess,
}: {
  kbId: string;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (name.trim()) form.append("name", name.trim());

      const res = await fetch(`/api/knowledge-bases/${kbId}/sources/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to upload file");
        return;
      }
      toast.success("File source added");
      onSuccess();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Source name (optional)"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <label className="cursor-pointer rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
        {file ? file.name : "Choose file"}
        <input
          type="file"
          accept=".pdf,.txt,.md,.markdown"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </label>
      <Button type="submit" disabled={busy || !file}>
        {busy ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}

export function SourceRowActions({
  source,
}: {
  source: { id: string; name: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Delete "${source.name}" and its chunks?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sources/${source.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Delete failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <MoreVerticalIcon />
          <span className="sr-only">Source actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {error && (
          <>
            <DropdownMenuItem className="text-red-600" disabled>
              {error}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          className="text-red-600"
          onSelect={handleDelete}
          disabled={busy}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
