import { Badge } from "tailcloak-example-ui";

import { Button } from "../components/button";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8 md:p-16">
      <h1 className="text-2xl font-semibold tracking-tight">tailcloak</h1>
      <Badge>From a shared package</Badge>
      <div className="card group border border-zinc-200">
        <p className="text-sm text-zinc-500 group-hover:text-zinc-900">
          Inspect this page: every Tailwind class is a short hash.
        </p>
      </div>
      <div className="flex gap-2">
        <Button>Primary</Button>
        <Button variant="ghost" className="ring-1 ring-zinc-200">
          Ghost
        </Button>
      </div>
    </main>
  );
}
