import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

const ETHNICITY_OPTIONS = [
  "White - English/Welsh/Scottish/N.Irish/British",
  "White - Irish",
  "White - Gypsy or Irish Traveller",
  "White - Roma",
  "White - Any other White background",
  "Mixed - White and Black Caribbean",
  "Mixed - White and Black African",
  "Mixed - White and Asian",
  "Mixed - Any other Mixed background",
  "Asian/Asian British - Indian",
  "Asian/Asian British - Pakistani",
  "Asian/Asian British - Bangladeshi",
  "Asian/Asian British - Chinese",
  "Asian/Asian British - Any other Asian background",
  "Black/African/Caribbean/Black British - African",
  "Black/African/Caribbean/Black British - Caribbean",
  "Black/African/Caribbean/Black British - Any other Black background",
  "Other - Arab",
  "Other - Any other ethnic group",
  "Prefer not to say",
];

const CONDITION_OPTIONS = [
  "Diabetes",
  "Chronic kidney disease",
  "Previous stroke or TIA",
  "Heart disease (angina, heart attack, heart failure)",
  "Atrial fibrillation / irregular pulse",
  "High cholesterol",
  "Currently pregnant",
];

interface FormState {
  hubLocation: string;
  patientName: string;
  dob: string;
  sex: string;
  ethnicity: string;
  postcode: string;
  phone: string;
  preferredLanguage: string;
  interpreterNeeded: boolean;
  registeredWithGp: "yes" | "no" | "";
  gpPractice: string;
  bp1Systolic: string;
  bp1Diastolic: string;
  bp2Systolic: string;
  bp2Diastolic: string;
  bp3Systolic: string;
  bp3Diastolic: string;
  heartRate: string;
  heightCm: string;
  weightKg: string;
  waistCm: string;
  knownHypertension: "yes" | "no" | "";
  currentMedications: string;
  otherConditions: string[];
  otherConditionsText: string;
  smokingStatus: string;
  familyHistoryHtn: boolean;
  notes: string;
  consentToContact: boolean;
}

const EMPTY: FormState = {
  hubLocation: "",
  patientName: "",
  dob: "",
  sex: "",
  ethnicity: "",
  postcode: "",
  phone: "",
  preferredLanguage: "",
  interpreterNeeded: false,
  registeredWithGp: "",
  gpPractice: "",
  bp1Systolic: "",
  bp1Diastolic: "",
  bp2Systolic: "",
  bp2Diastolic: "",
  bp3Systolic: "",
  bp3Diastolic: "",
  heartRate: "",
  heightCm: "",
  weightKg: "",
  waistCm: "",
  knownHypertension: "",
  currentMedications: "",
  otherConditions: [],
  otherConditionsText: "",
  smokingStatus: "",
  familyHistoryHtn: false,
  notes: "",
  consentToContact: false,
};

const STEPS = ["Patient details", "BP & measurements", "Medical history", "Review & submit"];

function classifyBp(sys: number, dia: number) {
  if (sys >= 180 || dia >= 120) return { category: "Severe / possible crisis", urgent: true };
  if (sys >= 160 || dia >= 100) return { category: "Stage 2 hypertension", urgent: false };
  if (sys >= 140 || dia >= 90) return { category: "Stage 1 hypertension", urgent: false };
  if (sys >= 120 || dia >= 80) return { category: "High-normal", urgent: false };
  return { category: "Normal", urgent: false };
}

export default function NewScreening() {
  const { volunteer } = useStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!volunteer) navigate("/");
  }, [volunteer, navigate]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const avg = useMemo(() => {
    const s2 = parseInt(form.bp2Systolic);
    const s3 = parseInt(form.bp3Systolic);
    const d2 = parseInt(form.bp2Diastolic);
    const d3 = parseInt(form.bp3Diastolic);
    if ([s2, s3, d2, d3].some((n) => Number.isNaN(n))) return null;
    const avgSys = Math.round((s2 + s3) / 2);
    const avgDia = Math.round((d2 + d3) / 2);
    return { avgSys, avgDia, ...classifyBp(avgSys, avgDia) };
  }, [form.bp2Systolic, form.bp3Systolic, form.bp2Diastolic, form.bp3Diastolic]);

  const bmi = useMemo(() => {
    const h = parseFloat(form.heightCm);
    const w = parseFloat(form.weightKg);
    if (!h || !w) return null;
    const m = h / 100;
    return Math.round((w / (m * m)) * 10) / 10;
  }, [form.heightCm, form.weightKg]);

  function validateStep(i: number): string | null {
    if (i === 0) {
      if (!form.patientName.trim()) return "Enter the patient's name.";
      if (!form.dob) return "Enter the date of birth.";
      if (!form.sex) return "Select a sex.";
      if (!form.ethnicity) return "Select an ethnicity.";
      if (!form.postcode.trim()) return "Enter a postcode.";
      if (!form.registeredWithGp) return "Say whether the patient is registered with a GP.";
      if (form.registeredWithGp === "yes" && !form.gpPractice.trim())
        return "Enter the GP practice name.";
    }
    if (i === 1) {
      const nums = [
        form.bp1Systolic, form.bp1Diastolic,
        form.bp2Systolic, form.bp2Diastolic,
        form.bp3Systolic, form.bp3Diastolic,
      ];
      if (nums.some((n) => !n.trim())) return "Enter all three blood pressure readings.";
      if (!form.heightCm.trim() || !form.weightKg.trim()) return "Enter height and weight.";
    }
    if (i === 2) {
      if (!form.knownHypertension) return "Say whether the patient has known hypertension.";
      if (!form.smokingStatus) return "Select a smoking status.";
    }
    if (i === 3) {
      if (!form.consentToContact) return "Patient consent to be contacted is required before submitting.";
    }
    return null;
  }

  async function goNext() {
    const err = validateStep(step);
    if (err) {
      toast({ title: "Missing information", description: err, variant: "destructive" });
      return;
    }
    if (!volunteer) return;
    if (step === 0) {
      try {
        const res = await apiRequest(
          "GET",
          `/api/screenings/check-duplicate?name=${encodeURIComponent(form.patientName)}&dob=${encodeURIComponent(form.dob)}`,
          undefined,
          { "x-volunteer-code": volunteer.code },
        );
        const data = await res.json();
        setDuplicateWarning(
          data.duplicate
            ? `A screening for this patient already exists (recorded ${new Date(data.existingDate).toLocaleDateString("en-GB")}). You can still continue if this is a genuine repeat visit.`
            : null
        );
      } catch {
        // non-blocking
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    const err = validateStep(3);
    if (err) {
      toast({ title: "Missing information", description: err, variant: "destructive" });
      return;
    }
    if (!volunteer) return;
    setSubmitting(true);
    try {
      const otherConditions = [...form.otherConditions];
      if (form.otherConditionsText.trim()) otherConditions.push(form.otherConditionsText.trim());

      await apiRequest("POST", "/api/screenings", {
        volunteerCode: volunteer.code,
        hubLocation: form.hubLocation || null,
        screeningDate: new Date().toISOString(),
        patientName: form.patientName.trim(),
        dob: form.dob,
        sex: form.sex,
        ethnicity: form.ethnicity,
        postcode: form.postcode.trim().toUpperCase(),
        phone: form.phone.trim() || null,
        preferredLanguage: form.preferredLanguage.trim() || null,
        interpreterNeeded: form.interpreterNeeded,
        registeredWithGp: form.registeredWithGp === "yes",
        gpPractice: form.registeredWithGp === "yes" ? form.gpPractice.trim() : null,
        bp1Systolic: parseInt(form.bp1Systolic),
        bp1Diastolic: parseInt(form.bp1Diastolic),
        bp2Systolic: parseInt(form.bp2Systolic),
        bp2Diastolic: parseInt(form.bp2Diastolic),
        bp3Systolic: parseInt(form.bp3Systolic),
        bp3Diastolic: parseInt(form.bp3Diastolic),
        heartRate: form.heartRate ? parseInt(form.heartRate) : null,
        heightCm: parseFloat(form.heightCm),
        weightKg: parseFloat(form.weightKg),
        waistCm: form.waistCm.trim() ? parseFloat(form.waistCm) : null,
        knownHypertension: form.knownHypertension === "yes",
        currentMedications: form.knownHypertension === "yes" ? form.currentMedications.trim() || null : null,
        otherConditions: JSON.stringify(otherConditions),
        smokingStatus: form.smokingStatus,
        familyHistoryHtn: form.familyHistoryHtn,
        notes: form.notes.trim() || null,
        consentToContact: form.consentToContact,
      });
      setSuccess(true);
    } catch (e: any) {
      toast({
        title: "Couldn't save this record",
        description: "Please check the form and try again, or tell your coordinator if this keeps happening.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!volunteer) return null;

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 bg-background">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" data-testid="text-success">Screening saved</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {form.patientName}'s record has been added.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => {
                  setForm(EMPTY);
                  setStep(0);
                  setDuplicateWarning(null);
                  setSuccess(false);
                }}
                data-testid="button-add-another"
              >
                Record another patient
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} data-testid="button-done">
                Done for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? navigate("/") : goBack())}
            className="text-muted-foreground hover:text-foreground p-1 -ml-1"
            data-testid="button-back"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-sm font-medium" data-testid="text-step-title">{STEPS[step]}</div>
            <div className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</div>
          </div>
          <div className="w-7" />
        </div>
        <div className="max-w-xl mx-auto mt-2 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        {duplicateWarning && (
          <div className="flex gap-2 items-start rounded-md border border-orange-300 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40 p-3 text-sm text-orange-800 dark:text-orange-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span data-testid="text-duplicate-warning" className="flex-1">{duplicateWarning}</span>
            <button
              type="button"
              onClick={() => setDuplicateWarning(null)}
              className="text-orange-800 dark:text-orange-300 shrink-0 font-medium"
              data-testid="button-dismiss-duplicate"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        )}
        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="hub">Screening location (optional)</Label>
              <Input id="hub" data-testid="input-hub" placeholder="e.g. WCEN Community Hub"
                value={form.hubLocation} onChange={(e) => set("hubLocation", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patientName">Full name *</Label>
              <Input id="patientName" data-testid="input-patient-name" value={form.patientName}
                onChange={(e) => set("patientName", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of birth *</Label>
                <Input id="dob" data-testid="input-dob" type="date" value={form.dob}
                  onChange={(e) => set("dob", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sex *</Label>
                <Select value={form.sex} onValueChange={(v) => set("sex", v)}>
                  <SelectTrigger data-testid="select-sex"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ethnicity *</Label>
              <Select value={form.ethnicity} onValueChange={(v) => set("ethnicity", v)}>
                <SelectTrigger data-testid="select-ethnicity"><SelectValue placeholder="Select ethnicity" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ETHNICITY_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input id="postcode" data-testid="input-postcode" value={form.postcode}
                  onChange={(e) => set("postcode", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" data-testid="input-phone" type="tel" value={form.phone}
                  onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="language">Preferred language</Label>
                <Input id="language" data-testid="input-language" placeholder="e.g. Punjabi" value={form.preferredLanguage}
                  onChange={(e) => set("preferredLanguage", e.target.value)} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox id="interpreter" checked={form.interpreterNeeded}
                  onCheckedChange={(c) => set("interpreterNeeded", !!c)} data-testid="checkbox-interpreter" />
                <Label htmlFor="interpreter" className="text-sm font-normal">Interpreter needed</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Registered with a GP? *</Label>
              <RadioGroup value={form.registeredWithGp} onValueChange={(v) => set("registeredWithGp", v as any)} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="gp-yes" data-testid="radio-gp-yes" />
                  <Label htmlFor="gp-yes" className="font-normal">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="gp-no" data-testid="radio-gp-no" />
                  <Label htmlFor="gp-no" className="font-normal">No</Label>
                </div>
              </RadioGroup>
            </div>
            {form.registeredWithGp === "yes" && (
              <div className="space-y-2">
                <Label htmlFor="gpPractice">GP practice name *</Label>
                <Input id="gpPractice" data-testid="input-gp-practice" value={form.gpPractice}
                  onChange={(e) => set("gpPractice", e.target.value)} />
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Blood pressure — 3 readings</CardTitle>
                <CardDescription>The average of readings 2 and 3 is used for triage, per protocol.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">#{n}</span>
                    <Input
                      data-testid={`input-bp${n}-systolic`}
                      inputMode="numeric"
                      placeholder="Systolic"
                      value={(form as any)[`bp${n}Systolic`]}
                      onChange={(e) => set(`bp${n}Systolic` as keyof FormState, e.target.value as any)}
                    />
                    <Input
                      data-testid={`input-bp${n}-diastolic`}
                      inputMode="numeric"
                      placeholder="Diastolic"
                      value={(form as any)[`bp${n}Diastolic`]}
                      onChange={(e) => set(`bp${n}Diastolic` as keyof FormState, e.target.value as any)}
                    />
                  </div>
                ))}
                <div className="space-y-2 pt-1">
                  <Label htmlFor="hr">Heart rate (bpm, optional)</Label>
                  <Input id="hr" data-testid="input-heart-rate" inputMode="numeric" value={form.heartRate}
                    onChange={(e) => set("heartRate", e.target.value)} className="max-w-32" />
                </div>
              </CardContent>
            </Card>

            {avg && (
              <div
                className={`rounded-md border p-3 space-y-1 ${
                  avg.urgent
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-border bg-muted/50"
                }`}
                data-testid="panel-bp-result"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average (readings 2 &amp; 3)</span>
                  <span className="text-lg font-semibold tabular-nums" data-testid="text-avg-bp">
                    {avg.avgSys}/{avg.avgDia} mmHg
                  </span>
                </div>
                <Badge variant={avg.urgent ? "destructive" : "secondary"} data-testid="badge-bp-category">
                  {avg.category}
                </Badge>
                {avg.urgent && (
                  <p className="text-sm text-destructive flex items-start gap-1.5 pt-1">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    This reading needs urgent same-day medical attention. Please follow the escalation
                    protocol from your training and contact your clinical lead now.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm) *</Label>
                <Input id="height" data-testid="input-height" inputMode="decimal" value={form.heightCm}
                  onChange={(e) => set("heightCm", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg) *</Label>
                <Input id="weight" data-testid="input-weight" inputMode="decimal" value={form.weightKg}
                  onChange={(e) => set("weightKg", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waist">Waist circumference (cm)</Label>
              <Input id="waist" data-testid="input-waist" inputMode="decimal" value={form.waistCm}
                onChange={(e) => set("waistCm", e.target.value)} />
            </div>
            {bmi !== null && (
              <div className="flex items-center justify-between rounded-md bg-muted/50 border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground">Calculated BMI</span>
                <span className="text-base font-semibold tabular-nums" data-testid="text-bmi">{bmi}</span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Known hypertension? *</Label>
              <RadioGroup value={form.knownHypertension} onValueChange={(v) => set("knownHypertension", v as any)} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="htn-yes" data-testid="radio-htn-yes" />
                  <Label htmlFor="htn-yes" className="font-normal">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="htn-no" data-testid="radio-htn-no" />
                  <Label htmlFor="htn-no" className="font-normal">No</Label>
                </div>
              </RadioGroup>
            </div>
            {form.knownHypertension === "yes" && (
              <div className="space-y-2">
                <Label htmlFor="meds">Current medications</Label>
                <Textarea id="meds" data-testid="input-medications" rows={2}
                  placeholder="e.g. Amlodipine 5mg, Ramipril 5mg"
                  value={form.currentMedications} onChange={(e) => set("currentMedications", e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Other medical conditions</Label>
              <div className="grid gap-2 rounded-md border border-border p-3">
                {CONDITION_OPTIONS.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <Checkbox
                      id={`cond-${c}`}
                      data-testid={`checkbox-condition-${c.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      checked={form.otherConditions.includes(c)}
                      onCheckedChange={(checked) =>
                        set(
                          "otherConditions",
                          checked ? [...form.otherConditions, c] : form.otherConditions.filter((x) => x !== c)
                        )
                      }
                    />
                    <Label htmlFor={`cond-${c}`} className="font-normal text-sm">{c}</Label>
                  </div>
                ))}
              </div>
              <Input
                data-testid="input-other-condition"
                placeholder="Other condition (optional)"
                value={form.otherConditionsText}
                onChange={(e) => set("otherConditionsText", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Smoking status *</Label>
              <Select value={form.smokingStatus} onValueChange={(v) => set("smokingStatus", v)}>
                <SelectTrigger data-testid="select-smoking"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Never smoked">Never smoked</SelectItem>
                  <SelectItem value="Ex-smoker">Ex-smoker</SelectItem>
                  <SelectItem value="Current smoker">Current smoker</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="famhx" checked={form.familyHistoryHtn}
                onCheckedChange={(c) => set("familyHistoryHtn", !!c)} data-testid="checkbox-family-history" />
              <Label htmlFor="famhx" className="font-normal text-sm">Family history of hypertension or heart disease</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes for the clinical team (optional)</Label>
              <Textarea id="notes" data-testid="input-notes" rows={3} value={form.notes}
                onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Review</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ReviewRow label="Patient" value={`${form.patientName} · DOB ${form.dob}`} />
                <ReviewRow label="Sex / Ethnicity" value={`${form.sex} · ${form.ethnicity}`} />
                <ReviewRow label="Postcode" value={form.postcode} />
                <ReviewRow label="GP" value={form.registeredWithGp === "yes" ? form.gpPractice : "Not registered"} />
                <ReviewRow label="BP average" value={avg ? `${avg.avgSys}/${avg.avgDia} mmHg (${avg.category})` : "—"} />
                <ReviewRow label="BMI" value={bmi !== null ? String(bmi) : "—"} />
                <ReviewRow label="Waist" value={form.waistCm.trim() ? `${form.waistCm} cm` : "—"} />
                <ReviewRow label="Known hypertension" value={form.knownHypertension === "yes" ? "Yes" : "No"} />
                <ReviewRow
                  label="Other conditions"
                  value={[...form.otherConditions, form.otherConditionsText].filter(Boolean).join(", ") || "None reported"}
                />
              </CardContent>
            </Card>
            <div className="flex items-start gap-2 rounded-md border border-border p-3">
              <Checkbox id="consent" checked={form.consentToContact}
                onCheckedChange={(c) => set("consentToContact", !!c)} data-testid="checkbox-consent" />
              <Label htmlFor="consent" className="font-normal text-sm leading-relaxed">
                The patient has agreed that their details and readings can be recorded and that a member of
                the clinical team may contact them about their blood pressure. *
              </Label>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background p-4">
        <div className="max-w-xl mx-auto flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={goBack} data-testid="button-step-back">
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1 gap-1" onClick={goNext} data-testid="button-step-next">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting} data-testid="button-submit">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit screening"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-border last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium flex-1 min-w-0 break-words">{value}</span>
    </div>
  );
}
