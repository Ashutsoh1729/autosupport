import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, knowledgeBases } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { SignOutButton } from "@/components/sign-out-button";
import {
  NewKnowledgeBaseForm,
  KnowledgeBaseRowActions,
} from "@/components/knowledge-base-forms";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    redirect("/dashboard");
  }

  const kbRows = await db
    .select()
    .from(knowledgeBases)
    .where(eq(knowledgeBases.projectId, projectId))
    .orderBy(asc(knowledgeBases.createdAt));

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Projects
          </Link>
          <Link
            href="/"
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
              {project.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Knowledge bases for this project
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Knowledge Bases
              </h2>
              <NewKnowledgeBaseForm projectId={project.id} />
            </div>

            {kbRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No knowledge bases yet — create one
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {kbRows.map((kb) => (
                  <li
                    key={kb.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/dashboard/projects/${project.id}/knowledge-bases/${kb.id}`}
                        className="min-w-0 truncate font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {kb.name}
                      </Link>
                      <KnowledgeBaseRowActions kb={kb} />
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