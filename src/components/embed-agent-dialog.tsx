"use client";

import { useMemo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type EmbedVariant = "html" | "next" | "react";

const VARIANT_LABELS: Record<EmbedVariant, string> = {
  html: "Plain HTML",
  next: "Next.js (App Router)",
  react: "React (Vite/CRA)",
};

export function EmbedAgentDialog({
  agentId,
  agentName,
  open,
  onOpenChange,
}: {
  agentId: string;
  agentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [variant, setVariant] = useState<EmbedVariant>("html");
  const [copied, setCopied] = useState(false);

  const scriptSrc = `${window.location.origin}/chat-widget.js`;

  const snippets = useMemo(
    () => ({
      html: `<script src="${scriptSrc}" data-agent="${agentId}"></script>`,
      next: `import Script from "next/script";

<Script src="${scriptSrc}" data-agent="${agentId}" strategy="afterInteractive" />`,
      react: `<script src="${scriptSrc}" data-agent="${agentId}"></script>`,
    }),
    [scriptSrc, agentId],
  );

  async function copy() {
    await navigator.clipboard.writeText(snippets[variant]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Embed “{agentName}”</DialogTitle>
          <DialogDescription>
            Drop this snippet into any HTML, Next.js, or React page to add the
            chat widget. Your agent must be published for the widget to load.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(VARIANT_LABELS) as EmbedVariant[]).map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={variant === v ? "default" : "outline"}
              onClick={() => {
                setVariant(v);
                setCopied(false);
              }}
            >
              {VARIANT_LABELS[v]}
            </Button>
          ))}
        </div>

        <div className="rounded-lg border bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100">
          {snippets[variant]}
        </div>

        <Button type="button" variant="outline" onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy snippet"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
