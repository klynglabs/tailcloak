import { useState } from "react";
import { Badge } from "tailcloak-example-ui";

const tones = {
  calm: "bg-sky-100 text-sky-900",
  loud: "bg-rose-600 text-white",
};

export function App() {
  const [tone, setTone] = useState<keyof typeof tones>("calm");
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8 md:p-16">
      <h1 className="text-4xl font-bold tracking-tight">tailcloak + Vite</h1>
      <Badge>From a shared package</Badge>
      <div className={`card group shadow-sm ${tones[tone]}`}>
        <p className="opacity-80 group-hover:opacity-100">
          Inspect this page: each class string is one short, prefixed hash.
        </p>
      </div>
      <button
        className="w-fit rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        onClick={() => setTone(tone === "calm" ? "loud" : "calm")}
      >
        Toggle tone
      </button>
    </main>
  );
}
