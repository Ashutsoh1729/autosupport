"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-sm hover:cursor-pointer hover:scale-105 transition-all hover:text-red-500 text-zinc-600  dark:text-zinc-400 dark:hover:text-zinc-100">
          Sign out
        </button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Sign out?</DialogTitle>
          <DialogDescription>
            You will need to sign in again to access your workspace.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign out
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
