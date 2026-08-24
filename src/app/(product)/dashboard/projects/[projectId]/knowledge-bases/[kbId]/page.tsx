import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { knowledgeBases, knowledgeSources } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { SourceSheet, SourceRowActions } from "@/components/source-forms";
import { PageBack } from "@/components/page-back";
import { FileTextIcon, LinkIcon, FileIcon } from "lucide-react";

export default async function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; kbId: string }>;
}) {
  const { projectId, kbId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const [kb] = await db
    .select()
    .from(knowledgeBases)
    .where(eq(knowledgeBases.id, kbId))
    .limit(1);

  if (!kb) {
    redirect(`/dashboard/projects/${projectId}`);
  }

  const sourceRows = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.kbId, kbId))
    .orderBy(asc(knowledgeSources.createdAt));

  const statusStyles: Record<string, string> = {
    queued: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    ready: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  };

  const sourceIcons: Record<
    string,
    { Icon: React.ComponentType<{ className?: string }>; className: string }
  > = {
    text: { Icon: FileTextIcon, className: "text-blue-600 dark:text-blue-400" },
    url: { Icon: LinkIcon, className: "text-emerald-600 dark:text-emerald-400" },
    file: { Icon: FileIcon, className: "text-amber-600 dark:text-amber-400" },
  };

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-8 bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <PageBack
            href={`/dashboard/projects/${projectId}`}
            label="Back to project"
          />
        </div>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {kb.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sources are ingested into the knowledge base in the background.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Sources ({sourceRows.length})
            </h2>
            <SourceSheet kbId={kb.id} />
          </div>

          {sourceRows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No sources yet — add text, a URL, or upload a file
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sourceRows.map((source) => (
                <li
                  key={source.id}
                  className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {(() => {
                        const { Icon, className } =
                          sourceIcons[source.type] ?? {
                            Icon: FileTextIcon,
                            className:
                              "text-zinc-400 dark:text-zinc-500",
                          };
                        return (
                          <Icon className={`h-4 w-4 shrink-0 ${className}`} />
                        );
                      })()}
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                        {source.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[source.status] ?? ""}`}
                      >
                        {source.status}
                      </span>
                      <SourceRowActions source={source} />
                    </div>
                  </div>
                  {source.status === "failed" && source.error && (
                    <p className="break-words text-xs text-red-600 dark:text-red-400">
                      {source.error}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
