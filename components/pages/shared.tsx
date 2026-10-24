"use client";

import { useState, type ReactNode } from "react";
import type { AppState } from "@/lib/application";
import type { Extraction, ExtractResult } from "@/lib/schema";
import { extractFile } from "@/lib/extractClient";
import { UploadButton } from "../DocList";

export type Ctx = {
  s: AppState;
  set: (patch: Partial<AppState>) => void;
  update: (fn: (s: AppState) => AppState) => void;
  go: (page: string) => void;
};

export type PageSpec = {
  title: ReactNode;
  hint?: ReactNode;
  body?: ReactNode;
  /** Returns an error message to show, or null when the page can continue. */
  validate?: () => string | null;
  continueLabel?: string;
  noContinue?: boolean;
};

export const answered = (v: unknown, msg: string) => () => (v === null || v === "" ? msg : null);

/** "Scan a document" card: one photo fills several answers at once. */
export function ScanCard({
  label,
  done,
  image,
  onRead,
}: {
  label: string;
  done?: boolean;
  image?: string;
  onRead: (data: Partial<Extraction>, ok: boolean, imageUrl: string) => void;
}) {
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "ok" | "error"; msg?: string }>({ kind: done ? "ok" : "idle" });
  async function read(file: File) {
    setStatus({ kind: "loading" });
    const r: ExtractResult = await extractFile(file);
    const url = URL.createObjectURL(file);
    onRead(r.ok ? r.data : r.partial, r.ok, url);
    setStatus(
      r.ok
        ? { kind: "ok", msg: r.data.issues.length ? `Read it. Note: ${r.data.issues.join("; ")}` : "Read it. Check the details below." }
        : { kind: "error", msg: `${r.reason}. You can type the details instead.` },
    );
  }
  return (
    <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-4">
      <div className="flex items-center gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-14 w-14 rounded border border-slate-300 object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded bg-white text-2xl" aria-hidden>📷</span>
        )}
        <div className="flex-1">
          <UploadButton variant={done ? "secondary" : "primary"} onFile={read} disabled={status.kind === "loading"}>
            {status.kind === "loading" ? "Reading…" : done ? "Scan again" : label}
          </UploadButton>
        </div>
      </div>
      {status.msg && <p className={`mt-2 text-sm ${status.kind === "error" ? "text-red-700" : "text-emerald-800"}`}>{status.msg}</p>}
    </div>
  );
}

export function Inset({ children }: { children: ReactNode }) {
  return <div className="border-l-4 border-slate-300 pl-3 text-slate-700">{children}</div>;
}
