import { Badge } from "tailcloak-example-ui";

import { Button } from "../components/button";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8 md:p-16">
      <h1 className="text-4xl font-bold tracking-tight">tailcloak</h1>
      <Badge>From a shared package</Badge>
      <div className="card group bg-white shadow-sm">
        <p className="text-zinc-600 group-hover:text-zinc-900">
          Inspect this page: every Tailwind class is a short, prefixed hash.
        </p>
      </div>
      <div className="flex gap-3">
        <Button>Primary</Button>
        <Button variant="ghost" className="ring-1 ring-indigo-200">
          Ghost
        </Button>
      </div>
    </main>
  );
}
