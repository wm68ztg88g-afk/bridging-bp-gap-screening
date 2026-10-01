import { classifyBp, BP_THRESHOLDS, EMERGENCY_ADVICE, type BpBand } from "@shared/bp-protocol";

export const BP_BAND_STYLES: Record<BpBand, string> = {
  Green: "border-green-600 bg-green-100 text-green-950 dark:border-green-500 dark:bg-green-950 dark:text-green-100",
  Yellow: "border-yellow-600 bg-yellow-200 text-yellow-950 dark:border-yellow-400 dark:bg-yellow-950 dark:text-yellow-100",
  Amber: "border-orange-600 bg-orange-200 text-orange-950 dark:border-orange-400 dark:bg-orange-950 dark:text-orange-100",
  Red: "border-red-600 bg-red-100 text-red-950 dark:border-red-500 dark:bg-red-950 dark:text-red-100",
};

const BP_BADGE_STYLES: Record<BpBand, string> = {
  Green: "bg-green-700 text-white",
  Yellow: "bg-yellow-300 text-yellow-950",
  Amber: "bg-orange-400 text-orange-950",
  Red: "bg-red-700 text-white",
};

export function BpBandBadge({ band, testId }: { band: BpBand; testId?: string }) {
  return (
    <span data-testid={testId} className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-sm font-semibold ${BP_BADGE_STYLES[band]}`}>
      {band}
    </span>
  );
}

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
    <section className={`rounded-md border border-l-[6px] p-3 space-y-2 text-left ${BP_BAND_STYLES[result.category]}`}
      data-testid="panel-bp-result" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Average (readings 2 &amp; 3)</span>
        <span className="text-lg font-semibold tabular-nums" data-testid="text-avg-bp">{systolic}/{diastolic} mmHg</span>
      </div>
      <BpBandBadge band={result.category} testId="badge-bp-category" />
      <p className="text-xs">{BP_THRESHOLDS[result.category]} • Use the higher band.</p>
      <p className="text-sm leading-relaxed" data-testid="bp-action">{result.advice}</p>
      <p className="text-xs">SGH = St George’s Hospital. A screening check is not a diagnosis.</p>
    </section>
  );
}
