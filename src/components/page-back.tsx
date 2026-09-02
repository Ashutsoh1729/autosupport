import Link from "next/link";
import { LucideArrowLeft } from "lucide-react";

export type PageBackProps = {
  href: string;
  label?: string;
};

export function PageBack({ href, label = "Back" }: PageBackProps) {
  return (
    <Link
      href={href}
      className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
    >
      <div className="flex items-center gap-1">
        <LucideArrowLeft size={"18"} />
        {label}
      </div>
    </Link>
  );
}