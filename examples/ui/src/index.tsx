import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="w-fit rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-500">
      {children}
    </span>
  );
}
