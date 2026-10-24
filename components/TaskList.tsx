import { TASKS, taskStatus, type SectionId } from "@/lib/flow";
import type { AppState } from "@/lib/application";

const tag = {
  completed: { text: "Completed", cls: "bg-emerald-100 text-emerald-900" },
  "not-started": { text: "Not started", cls: "bg-blue-100 text-blue-900" },
  "cannot-start": { text: "Cannot start yet", cls: "bg-slate-100 text-slate-600" },
};

export default function TaskList({ s, onOpen }: { s: AppState; onOpen: (section: SectionId) => void }) {
  const done = TASKS.filter((t) => taskStatus(s, t.id) === "completed").length;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Your HOPE application</h1>
        <p className="mt-1 text-slate-700">You have completed {done} of {TASKS.length} sections.</p>
      </div>
      <ol className="divide-y divide-slate-200 border-y border-slate-200">
        {TASKS.map((t, i) => {
          const st = taskStatus(s, t.id);
          const c = tag[st];
          return (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                {st === "cannot-start" ? (
                  <span className="font-medium text-slate-500">{i + 1}. {t.title}</span>
                ) : (
                  <button type="button" className="text-left font-medium text-blue-800 underline underline-offset-2" onClick={() => onOpen(t.id)}>
                    {i + 1}. {t.title}
                  </button>
                )}
                <p className="text-sm text-slate-600">{t.summary}</p>
              </div>
              <span className={`shrink-0 rounded px-2 py-1 text-xs font-bold uppercase ${c.cls}`}>{c.text}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
