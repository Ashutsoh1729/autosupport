import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/db/auth-schema";
import { workspaces, memberships, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  baseURL: process.env.BETTER_AUTH_URL,
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          // Create default workspace and membership for new user
          await db.transaction(async (tx) => {
            // Check if user already has a workspace (idempotent)
            const existingMembership = await tx
              .select()
              .from(memberships)
              .where(eq(memberships.userId, createdUser.id))
              .limit(1);

            if (existingMembership.length > 0) {
              return; // User already has a workspace, skip creation
            }

            // Create default workspace
            const workspaceName = createdUser.name
              ? `${createdUser.name}'s Workspace`
              : "My Workspace";

            const [workspace] = await tx
              .insert(workspaces)
              .values({
                name: workspaceName,
              })
              .returning();

            // Create owner membership
            await tx.insert(memberships).values({
              userId: createdUser.id,
              workspaceId: workspace.id,
              role: "owner",
            });

            // Create default project
            await tx.insert(projects).values({
              workspaceId: workspace.id,
              name: "Default Project",
            });
          });
        },
      },
    },
  },
});
