import { packetProgress, type PacketItem } from "@/lib/packet";
import { Card } from "./ui";

const chip = {
  ready: { text: "Ready", cls: "bg-emerald-100 text-emerald-800", icon: "✓" },
  prefilled: { text: "Pre-filled", cls: "bg-blue-100 text-blue-800", icon: "✎" },
  todo: { text: "To do", cls: "bg-slate-100 text-slate-700", icon: "○" },
};

export default function PacketTracker({ items }: { items: PacketItem[] }) {
  const { done, total } = packetProgress(items);
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Your packet</h2>
        <span className="text-sm text-slate-600">{done} of {total} ready</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-slate-100">
        {items.map((it) => {
          const c = chip[it.status];
          const thumbs = it.attachments?.filter((a) => a.image) ?? [];
          return (
            <li key={it.id} className="flex items-center gap-3 py-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${c.cls}`} aria-hidden>{c.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{it.title}</p>
                <p className="truncate text-xs text-slate-500">{it.detail}</p>
              </div>
              {thumbs.map((t) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={t.image} src={t.image} alt={t.label} className="h-9 w-9 rounded border border-slate-200 object-cover" />
              ))}
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${c.cls}`}>{c.text}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
