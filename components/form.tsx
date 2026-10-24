"use client";
// GOV.UK-style form building blocks: one question per page, large tap targets, hint text under labels.
import { useId, type ReactNode } from "react";
import { Button } from "./ui";

export function Radios<T extends string | number | boolean>({
  value,
  onChange,
  options,
  legend,
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; hint?: ReactNode }[];
  legend: string;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="space-y-2">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <label
              key={String(o.value)}
              className={`flex cursor-pointer gap-3 rounded-lg border-2 p-3 ${on ? "border-blue-700 bg-blue-50" : "border-slate-300 bg-white"}`}
            >
              <input type="radio" name={name} checked={on} onChange={() => onChange(o.value)} className="mt-0.5 h-5 w-5 shrink-0 accent-blue-700" />
              <span>
                <span className="block font-medium">{o.label}</span>
                {o.hint && <span className="block text-sm text-slate-600">{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function YesNo({ value, onChange, legend, yesHint, noHint }: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  legend: string;
  yesHint?: ReactNode;
  noHint?: ReactNode;
}) {
  return (
    <Radios
      legend={legend}
      value={value}
      onChange={onChange}
      options={[{ value: true, label: "Yes", hint: yesHint }, { value: false, label: "No", hint: noHint }]}
    />
  );
}

export function Input({
  label,
  hint,
  value,
  onChange,
  money,
  width = "full",
  ...rest
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  money?: boolean;
  width?: "full" | "half" | "short";
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
  const w = { full: "w-full", half: "w-full max-w-[14rem]", short: "w-28" }[width];
  return (
    <div>
      <label htmlFor={id} className="block font-medium text-slate-800">{label}</label>
      {hint && <p className="text-sm text-slate-600">{hint}</p>}
      <div className={`mt-1 flex items-center rounded-lg border-2 border-slate-400 bg-white focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-200 ${w}`}>
        {money && <span className="pl-3 text-slate-500">$</span>}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={money ? "decimal" : rest.inputMode}
          className="w-full min-w-0 bg-transparent px-3 py-2.5 text-base focus:outline-none"
          {...rest}
        />
      </div>
    </div>
  );
}

/** "Add another" list: one card per item, with remove links. */
export function AddAnother<T extends { id: string }>({
  items,
  onChange,
  make,
  noun,
  max,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  make: () => T;
  noun: string;
  max?: number;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
}) {
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="rounded-lg border-l-4 border-slate-400 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold capitalize">{noun} {i + 1}</h3>
            <button type="button" className="text-sm text-blue-700 underline" onClick={() => onChange(items.filter((x) => x.id !== item.id))}>
              Remove
            </button>
          </div>
          <div className="space-y-3">{render(item, (patch) => onChange(items.map((x) => (x.id === item.id ? { ...x, ...patch } : x))), i)}</div>
        </div>
      ))}
      {(max === undefined || items.length < max) && (
        <Button variant="secondary" onClick={() => onChange([...items, make()])}>+ Add {items.length ? "another" : "a"} {noun}</Button>
      )}
      {max !== undefined && items.length >= max && <p className="text-sm text-slate-600">The form has room for {max}. List any others on a separate page.</p>}
    </div>
  );
}

/** The page shell: back link, section caption, the question as the page heading, errors, Continue. */
export function QuestionPage({
  caption,
  title,
  hint,
  error,
  children,
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
}: {
  caption?: string;
  title: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children?: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}) {
  return (
    <div className="space-y-5">
      {onBack && (
        <button type="button" onClick={onBack} className="text-sm text-blue-800 underline underline-offset-2">‹ Back</button>
      )}
      {error && (
        <div role="alert" className="rounded-lg border-4 border-red-600 bg-white p-3">
          <p className="font-bold text-red-700">There is a problem</p>
          <p className="text-red-700">{error}</p>
        </div>
      )}
      <div>
        {caption && <p className="text-sm font-medium text-slate-500">{caption}</p>}
        <h1 className="text-2xl font-bold leading-tight text-slate-900">{title}</h1>
        {hint && <div className="mt-2 text-slate-600">{hint}</div>}
      </div>
      {children}
      {onContinue && (
        <Button className="w-full py-3 text-base sm:w-auto" onClick={onContinue} disabled={continueDisabled}>
          {continueLabel}
        </Button>
      )}
    </div>
  );
}
