import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { knowledgeBases, knowledgeSources } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { SignOutButton } from "@/components/sign-out-button";
import { SourceForms, SourceRowActions } from "@/components/source-forms";

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

  const testPanelEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_TEST_PANEL === "true";

  const statusStyles: Record<string, string> = {
    queued: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    processing:
      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    ready: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Project
          </Link>
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            AutoSupport
          </Link>
        </div>
        <SignOutButton />
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-8">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {kb.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Sources are ingested into the knowledge base in the background.
            </p>
            {testPanelEnabled && (
              <Link
                href={`/dashboard/projects/${projectId}/knowledge-bases/${kbId}/test`}
                className="mt-3 inline-block rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Test chat
              </Link>
            )}
          </div>

          <SourceForms kbId={kb.id} />

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Sources ({sourceRows.length})
            </h2>

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
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {source.name}
                        </p>
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {source.type}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusStyles[source.status] ?? ""}`}
                      >
                        {source.status}
                      </span>
                    </div>
                    {source.status === "failed" && source.error && (
                      <p className="break-words text-xs text-red-600 dark:text-red-400">
                        {source.error}
                      </p>
                    )}
                    <div className="flex items-center justify-end">
                      <SourceRowActions source={source} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}