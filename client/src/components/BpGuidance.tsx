import { classifyBp, BP_THRESHOLDS, EMERGENCY_ADVICE, type BpBand } from "@shared/bp-protocol";

export const BP_BAND_STYLES: Record<BpBand, string> = {
  Green: "border-green-600/40 bg-green-50 text-green-950 dark:bg-green-950 dark:text-green-100",
  Yellow: "border-yellow-600/50 bg-yellow-50 text-yellow-950 dark:bg-yellow-950 dark:text-yellow-100",
  Amber: "border-amber-600/50 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  Red: "border-red-600/50 bg-red-50 text-red-950 dark:bg-red-950 dark:text-red-100",
};

export function EmergencyAdvice() {
  return (
    <aside className="rounded-md border border-red-600/40 bg-red-50 p-3 text-sm text-red-950 dark:bg-red-950 dark:text-red-100"
      data-testid="emergency-advice">
      <p className="font-semibold mb-1">999: symptoms override the BP band</p>
      <p>{EMERGENCY_ADVICE}</p>
    </aside>
  );
}

export function BpGuidance({ systolic, diastolic }: { systolic: number; diastolic: number }) {
  const result = classifyBp(systolic, diastolic);
  return (
    <section className={`rounded-md border p-3 space-y-2 text-left ${BP_BAND_STYLES[result.category]}`}
      data-testid="panel-bp-result" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Average (readings 2 &amp; 3)</span>
        <span className="text-lg font-semibold tabular-nums" data-testid="text-avg-bp">{systolic}/{diastolic} mmHg</span>
      </div>
      <p className="font-semibold text-sm" data-testid="badge-bp-category">{result.category}</p>
      <p className="text-xs">{BP_THRESHOLDS[result.category]} • Use the higher band.</p>
      <p className="text-sm leading-relaxed" data-testid="bp-action">{result.advice}</p>
      <p className="text-xs">SGH = St George’s Hospital. A screening check is not a diagnosis.</p>
    </section>
  );
}
