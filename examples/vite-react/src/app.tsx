import { useState } from "react";
import { Badge } from "tailcloak-example-ui";

const tones = {
  light: "bg-white text-zinc-500",
  dark: "bg-zinc-900 text-white",
};

export function App() {
  const [tone, setTone] = useState<keyof typeof tones>("light");
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8 text-zinc-900 antialiased md:p-16">
      <h1 className="text-2xl font-semibold tracking-tight">tailcloak + Vite</h1>
      <Badge>From a shared package</Badge>
      <div className={`card group border border-zinc-200 ${tones[tone]}`}>
        <p className="text-sm group-hover:underline">
          Inspect this page: each class string is one short hash.
        </p>
      </div>
      <button
        className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        onClick={() => setTone(tone === "light" ? "dark" : "light")}
      >
        Toggle tone
      </button>
    </main>
  );
}
