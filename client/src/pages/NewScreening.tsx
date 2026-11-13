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
import { BpGuidance, EmergencyAdvice } from "@/components/BpGuidance";
import {
  ageOn, MIN_AGE, ftInToCm, stLbToKg, HEIGHT_RANGE_CM, WEIGHT_RANGE_KG, needsContactRoute,
  LAST_BP_CHECK_OPTIONS, CHECKED_BEFORE_OPTIONS, SITE_OPTIONS, EMHIP_SITE, participantAdvice, contactMandatory,
} from "@shared/participant-advice";
import { classifyBp } from "@shared/bp-protocol";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, Phone } from "lucide-react";

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
];
const OTHER_SITE = "Other";

interface FormState {
  symptomsNow: "yes" | "no" | "";
  symptomsAcknowledged: boolean;
  hubLocation: string;
  hubOther: string;
  lastBpCheck: string;
  checkedBefore: string;
  pregnant: "yes" | "no" | "";
  altContact: string;
  noContactRoute: boolean;
  heightMethod: string;
  heightUnit: "cm" | "ftin";
  heightFt: string;
  heightIn: string;
  weightMethod: string;
  weightUnit: "kg" | "stlb";
  weightSt: string;
  weightLb: string;
  waistDeclined: boolean;
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
  enrolledWithEmhip: "yes" | "no" | "";
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
  consentGpContact: boolean;
}

const EMPTY: FormState = {
  symptomsNow: "",
  symptomsAcknowledged: false,
  hubLocation: "",
  hubOther: "",
  lastBpCheck: "",
  checkedBefore: "",
  pregnant: "",
  altContact: "",
  noContactRoute: false,
  heightMethod: "",
  heightUnit: "cm",
  heightFt: "",
  heightIn: "",
  weightMethod: "",
  weightUnit: "kg",
  weightSt: "",
  weightLb: "",
  waistDeclined: false,
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
  enrolledWithEmhip: "",
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
  consentGpContact: false,
};

const STEPS = ["Consent", "Participant details", "BP & measurements", "Medical history", "Review & submit"];

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
    if ([s2, s3, d2, d3].some((n) => !Number.isFinite(n) || n <= 0)) return null;
    const avgSys = Math.round((s2 + s3) / 2);
    const avgDia = Math.round((d2 + d3) / 2);
    return { avgSys, avgDia, ...classifyBp(avgSys, avgDia) };
  }, [form.bp2Systolic, form.bp3Systolic, form.bp2Diastolic, form.bp3Diastolic]);

  const showPregnancy = form.sex !== "" && form.sex !== "Male";
  const isPregnant = showPregnancy && form.pregnant === "yes";
  const site = form.hubLocation === OTHER_SITE ? form.hubOther.trim() : form.hubLocation;
  const atEmhip = site === EMHIP_SITE;

  // Height/weight in cm/kg whatever unit was entered; null if declined or blank.
  const heightCm = useMemo(() => {
    if (form.heightMethod === "" || form.heightMethod === "Declined") return null;
    if (form.heightUnit === "cm") { const n = parseFloat(form.heightCm); return Number.isFinite(n) ? n : null; }
    const ft = parseFloat(form.heightFt), inch = form.heightIn.trim() ? parseFloat(form.heightIn) : 0;
    return Number.isFinite(ft) && Number.isFinite(inch) ? ftInToCm(ft, inch) : null;
  }, [form.heightMethod, form.heightUnit, form.heightCm, form.heightFt, form.heightIn]);

  const weightKg = useMemo(() => {
    if (form.weightMethod === "" || form.weightMethod === "Declined") return null;
    if (form.weightUnit === "kg") { const n = parseFloat(form.weightKg); return Number.isFinite(n) ? n : null; }
    const st = parseFloat(form.weightSt), lb = form.weightLb.trim() ? parseFloat(form.weightLb) : 0;
    return Number.isFinite(st) && Number.isFinite(lb) ? stLbToKg(st, lb) : null;
  }, [form.weightMethod, form.weightUnit, form.weightKg, form.weightSt, form.weightLb]);

  const bmi = useMemo(() => {
    if (!heightCm || !weightKg) return null;
    const m = heightCm / 100;
    return Math.round((weightKg / (m * m)) * 10) / 10;
  }, [heightCm, weightKg]);
  const bmiEstimated = bmi !== null && (form.heightMethod !== "Measured" || form.weightMethod !== "Measured");

  const contactNeeded = avg !== null && needsContactRoute(avg.category, isPregnant);
  const hasContact = !!form.phone.trim() || !!form.altContact.trim();
  const contactRequired = avg !== null && contactMandatory(avg.category, isPregnant);

  function validateStep(i: number): string | null {
    if (i === 0) {
      if (!form.consentToContact)
        return "The participant must agree to their details being recorded before you continue.";
      if (!form.symptomsNow) return "Ask about symptoms before you continue.";
      if (form.symptomsNow === "yes" && !form.symptomsAcknowledged)
        return "Call 999 first. Tick the box once 999 has been called if you need to continue recording.";
    }
    if (i === 1) {
      if (!form.hubLocation) return "Select the screening location.";
      if (form.hubLocation === OTHER_SITE && !form.hubOther.trim()) return "Type the name of the screening location.";
      if (!form.patientName.trim()) return "Enter the participant's name.";
      if (!form.dob) return "Enter the date of birth.";
      const age = ageOn(form.dob);
      if (!Number.isFinite(age) || age > 120 || age < 0) return "Check the date of birth.";
      if (age < MIN_AGE) return "Checks are for adults aged 18 and over only. Please do not record this person.";
      if (!form.sex) return "Select a sex.";
      if (!form.ethnicity) return "Select an ethnicity.";
      if (!form.postcode.trim()) return "Enter a postcode.";
      if (!form.registeredWithGp) return "Say whether the participant is registered with a GP.";
      if (form.registeredWithGp === "yes" && !form.gpPractice.trim())
        return "Enter the GP practice name.";
      if (atEmhip && !form.enrolledWithEmhip) return "Select Yes or No for Enrolled with EMHIP.";
      if (!form.checkedBefore) return "Say whether they have been checked by this programme before.";
      if (!form.lastBpCheck) return "Ask when their blood pressure was last checked.";
    }
    if (i === 2) {
      if (showPregnancy && !form.pregnant) return "Ask whether the participant is currently pregnant.";
      const nums = [
        form.bp1Systolic, form.bp1Diastolic,
        form.bp2Systolic, form.bp2Diastolic,
        form.bp3Systolic, form.bp3Diastolic,
      ];
      if (nums.some((n) => !n.trim())) return "Enter all three blood pressure readings.";
      if (nums.some((n) => !Number.isInteger(Number(n)) || Number(n) <= 0))
        return "Blood pressure readings must be positive whole numbers.";
      if (contactRequired && !hasContact)
        return "Red result: the SGH team must be able to contact them. Add a phone number or another way to reach them (e.g. via their GP or the venue).";
      if (contactNeeded && !hasContact && !form.noContactRoute)
        return "Add a phone number or other way to contact them, or tick that they gave none.";
      if (!form.heightMethod) return "Choose how height was obtained (or Declined).";
      if (form.heightMethod !== "Declined") {
        if (heightCm === null) return "Enter the height.";
        if (heightCm < HEIGHT_RANGE_CM.min || heightCm > HEIGHT_RANGE_CM.max) return "Check the height — it looks out of range.";
      }
      if (!form.weightMethod) return "Choose how weight was obtained (or Declined).";
      if (form.weightMethod !== "Declined") {
        if (weightKg === null) return "Enter the weight.";
        if (weightKg < WEIGHT_RANGE_KG.min || weightKg > WEIGHT_RANGE_KG.max) return "Check the weight — it looks out of range.";
      }
      if (!form.waistDeclined && form.waistCm.trim()) {
        const w = Number(form.waistCm);
        if (!Number.isFinite(w) || w < 40 || w > 250) return "Check the waist measurement — it looks out of range.";
      }
    }
    if (i === 3) {
      if (!form.knownHypertension) return "Say whether the participant has known hypertension.";
      if (!form.smokingStatus) return "Select a smoking status.";
    }
    if (i === 4) {
      if (!form.consentToContact) return "Participant consent is required before submitting.";
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
    if (step === 1) {
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
            ? `A screening for someone with this name and date of birth already exists (recorded ${new Date(data.existingDate).toLocaleDateString("en-GB")}). You can still continue if this is a genuine repeat visit.`
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
    const err = STEPS.map((_, i) => validateStep(i)).find(Boolean);
    if (err) {
      toast({ title: "Missing information", description: err, variant: "destructive" });
      return;
    }
    if (!volunteer) return;
    setSubmitting(true);
    try {
      const otherConditions = [...form.otherConditions];
      if (isPregnant) otherConditions.push("Currently pregnant");
      if (form.otherConditionsText.trim()) otherConditions.push(form.otherConditionsText.trim());

      await apiRequest("POST", "/api/screenings", {
        volunteerCode: volunteer.code,
        hubLocation: site,
        screeningDate: new Date().toISOString(),
        patientName: form.patientName.trim(),
        dob: form.dob,
        sex: form.sex,
        ethnicity: form.ethnicity,
        postcode: form.postcode.trim().toUpperCase(),
        phone: form.phone.trim() || null,
        altContact: form.altContact.trim() || null,
        noContactRoute: contactNeeded && !contactRequired && !hasContact ? form.noContactRoute : false,
        symptomsReported: form.symptomsNow === "yes",
        pregnant: isPregnant,
        lastBpCheck: form.lastBpCheck,
        checkedBefore: form.checkedBefore,
        preferredLanguage: form.preferredLanguage.trim() || null,
        interpreterNeeded: form.interpreterNeeded,
        registeredWithGp: form.registeredWithGp === "yes",
        gpPractice: form.registeredWithGp === "yes" ? form.gpPractice.trim() : null,
        enrolledWithEmhip: atEmhip ? form.enrolledWithEmhip === "yes" : null,
        bp1Systolic: parseInt(form.bp1Systolic),
        bp1Diastolic: parseInt(form.bp1Diastolic),
        bp2Systolic: parseInt(form.bp2Systolic),
        bp2Diastolic: parseInt(form.bp2Diastolic),
        bp3Systolic: parseInt(form.bp3Systolic),
        bp3Diastolic: parseInt(form.bp3Diastolic),
        heartRate: form.heartRate ? parseInt(form.heartRate) : null,
        heightMethod: form.heightMethod,
        weightMethod: form.weightMethod,
        heightCm,
        weightKg,
        waistCm: !form.waistDeclined && form.waistCm.trim() ? parseFloat(form.waistCm) : null,
        waistDeclined: form.waistDeclined,
        knownHypertension: form.knownHypertension === "yes",
        currentMedications: form.knownHypertension === "yes" ? form.currentMedications.trim() || null : null,
        otherConditions: JSON.stringify(otherConditions),
        smokingStatus: form.smokingStatus,
        familyHistoryHtn: form.familyHistoryHtn,
        notes: form.notes.trim() || null,
        consentToContact: form.consentToContact,
        consentGpContact: form.registeredWithGp === "yes" ? form.consentGpContact : null,
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
            {avg && <BpGuidance systolic={avg.avgSys} diastolic={avg.avgDia} pregnant={isPregnant} noContactRoute={contactNeeded && !contactRequired && !hasContact && form.noContactRoute} />}
            <EmergencyAdvice />
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
                Record another participant
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
        <EmergencyAdvice />
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
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Before you start</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Please read this to the participant (or explain in your own words) before recording any of their
                  details. The information collected here is used only to support this participant's care and to
                  evaluate the Bridging the BP Gap programme. It is stored securely and can only be accessed by
                  the programme's clinical lead and directly-involved St George's Hospital project team members
                  — it will not be shared with anyone else without the participant's permission, except where the law
                  requires it (for example, a safeguarding concern). Records are kept for the duration of the
                  programme and for up to two years afterwards to allow for evaluation and audit, after which
                  they are securely deleted. Taking part is voluntary, and they can ask you to stop at any time
                  before you submit the form.
                </p>
                <div className="flex items-start gap-2 rounded-md border border-border p-3">
                  <Checkbox id="consent" checked={form.consentToContact}
                    onCheckedChange={(c) => set("consentToContact", !!c)} data-testid="checkbox-consent" />
                  <Label htmlFor="consent" className="font-normal text-sm leading-relaxed">
                    The participant has agreed that their details and readings can be recorded and that a member of
                    the clinical team may contact them about their blood pressure. *
                  </Label>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Symptoms check *</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">
                  Ask: <strong>“Do you have chest pain, sudden weakness or numbness, blurred or lost vision,
                  confusion or difficulty breathing right now?”</strong>
                </p>
                <RadioGroup value={form.symptomsNow} onValueChange={(v) => set("symptomsNow", v as any)} className="grid grid-cols-2 gap-3" data-testid="radio-group-symptoms">
                  <Label htmlFor="sym-no" className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 font-normal">
                    <RadioGroupItem value="no" id="sym-no" data-testid="radio-symptoms-no" /> No
                  </Label>
                  <Label htmlFor="sym-yes" className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 font-normal">
                    <RadioGroupItem value="yes" id="sym-yes" data-testid="radio-symptoms-yes" /> Yes
                  </Label>
                </RadioGroup>
                {form.symptomsNow === "yes" && (
                  <div className="rounded-md border-2 border-red-700 bg-red-50 p-4 text-red-950 dark:bg-red-950 dark:text-red-100 space-y-3" data-testid="panel-call-999">
                    <p className="flex items-center gap-2 text-lg font-bold"><Phone className="w-5 h-5" /> Call 999 now.</p>
                    <p className="text-sm">Do not take their blood pressure first. Stay with them until help arrives.</p>
                    <div className="flex items-start gap-2 rounded-md border border-red-700/40 bg-white/60 dark:bg-black/20 p-3">
                      <Checkbox id="sym-ack" checked={form.symptomsAcknowledged}
                        onCheckedChange={(c) => set("symptomsAcknowledged", !!c)} data-testid="checkbox-999-called" />
                      <Label htmlFor="sym-ack" className="font-normal text-sm leading-relaxed">
                        999 has been called. Continue only if it is safe and appropriate to record their details.
                      </Label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Screening location *</Label>
              <Select value={form.hubLocation} onValueChange={(v) => set("hubLocation", v)}>
                <SelectTrigger data-testid="select-hub"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {SITE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  <SelectItem value={OTHER_SITE}>Other (type below)</SelectItem>
                </SelectContent>
              </Select>
              {form.hubLocation === OTHER_SITE && (
                <Input data-testid="input-hub-other" placeholder="Name of venue" value={form.hubOther}
                  onChange={(e) => set("hubOther", e.target.value)} />
              )}
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
            {atEmhip && <fieldset className="space-y-2 rounded-md border border-border p-3">
              <legend id="emhip-label" className="px-1 text-sm font-medium">Enrolled with EMHIP? *</legend>
              <RadioGroup
                aria-labelledby="emhip-label"
                aria-required="true"
                value={form.enrolledWithEmhip}
                onValueChange={(v) => set("enrolledWithEmhip", v as "yes" | "no")}
                className="grid grid-cols-2 gap-3"
                data-testid="radio-group-emhip"
              >
                <Label htmlFor="emhip-yes" className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 font-normal">
                  <RadioGroupItem value="yes" id="emhip-yes" data-testid="radio-emhip-yes" />
                  Yes
                </Label>
                <Label htmlFor="emhip-no" className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 font-normal">
                  <RadioGroupItem value="no" id="emhip-no" data-testid="radio-emhip-no" />
                  No
                </Label>
              </RadioGroup>
            </fieldset>}
            <div className="space-y-2">
              <Label>Checked by this programme before? *</Label>
              <RadioGroup value={form.checkedBefore} onValueChange={(v) => set("checkedBefore", v)} className="flex flex-wrap gap-6" data-testid="radio-group-checked-before">
                {CHECKED_BEFORE_OPTIONS.map((o) => (
                  <div key={o} className="flex items-center gap-2">
                    <RadioGroupItem value={o} id={`cb-${o}`} data-testid={`radio-checked-before-${o.toLowerCase().replace(/\s+/g, "-")}`} />
                    <Label htmlFor={`cb-${o}`} className="font-normal">{o}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>When was their blood pressure last checked (anywhere)? *</Label>
              <Select value={form.lastBpCheck} onValueChange={(v) => set("lastBpCheck", v)}>
                <SelectTrigger data-testid="select-last-bp-check"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {LAST_BP_CHECK_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {showPregnancy && (
              <div className="space-y-2">
                <Label>Is the participant currently pregnant? *</Label>
                <RadioGroup value={form.pregnant} onValueChange={(v) => set("pregnant", v as any)} className="flex gap-6" data-testid="radio-group-pregnant">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="no" id="preg-no" data-testid="radio-pregnant-no" />
                    <Label htmlFor="preg-no" className="font-normal">No</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="yes" id="preg-yes" data-testid="radio-pregnant-yes" />
                    <Label htmlFor="preg-yes" className="font-normal">Yes</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
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

            {avg && <BpGuidance systolic={avg.avgSys} diastolic={avg.avgDia} pregnant={isPregnant}
              noContactRoute={contactNeeded && !contactRequired && !hasContact && form.noContactRoute} />}

            {contactNeeded && !form.phone.trim() && (
              <Card className="border-orange-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">How can the SGH team contact them? *</CardTitle>
                  <CardDescription>No phone number was given. The team needs a way to reach them about this reading.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="phone2">Phone number</Label>
                    <Input id="phone2" type="tel" data-testid="input-phone-followup" value={form.phone}
                      onChange={(e) => set("phone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alt">Or another way to reach them</Label>
                    <Input id="alt" data-testid="input-alt-contact" placeholder="e.g. email, via their GP, or via the venue"
                      value={form.altContact} onChange={(e) => set("altContact", e.target.value)} />
                  </div>
                  {contactRequired && (
                    <p className="text-sm font-medium text-red-800 dark:text-red-300" data-testid="text-red-contact-required">
                      Red result: a contact route is required. The SGH team will contact them within 24–48 hours.
                    </p>
                  )}
                  {!hasContact && !contactRequired && (
                    <div className="flex items-start gap-2 rounded-md border border-border p-3">
                      <Checkbox id="nocontact" checked={form.noContactRoute}
                        onCheckedChange={(c) => set("noContactRoute", !!c)} data-testid="checkbox-no-contact" />
                      <Label htmlFor="nocontact" className="font-normal text-sm leading-relaxed">
                        They do not want to give any contact details. They will be told to arrange follow-up themselves.
                      </Label>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <MeasureField
              label="Height"
              methodOptions={["Measured", "Stated by participant", "Declined"]}
              method={form.heightMethod}
              onMethod={(v) => set("heightMethod", v)}
              unit={form.heightUnit}
              units={[{ value: "cm", label: "cm" }, { value: "ftin", label: "ft / in" }]}
              onUnit={(v) => set("heightUnit", v as any)}
              testId="height"
            >
              {form.heightUnit === "cm" ? (
                <Input aria-label="Height in cm" data-testid="input-height" inputMode="decimal" placeholder="cm"
                  value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input aria-label="Feet" data-testid="input-height-ft" inputMode="numeric" placeholder="ft"
                    value={form.heightFt} onChange={(e) => set("heightFt", e.target.value)} />
                  <Input aria-label="Inches" data-testid="input-height-in" inputMode="decimal" placeholder="in"
                    value={form.heightIn} onChange={(e) => set("heightIn", e.target.value)} />
                </div>
              )}
            </MeasureField>

            <MeasureField
              label="Weight"
              methodOptions={["Measured", "Estimated by participant", "Declined"]}
              method={form.weightMethod}
              onMethod={(v) => set("weightMethod", v)}
              unit={form.weightUnit}
              units={[{ value: "kg", label: "kg" }, { value: "stlb", label: "st / lb" }]}
              onUnit={(v) => set("weightUnit", v as any)}
              testId="weight"
            >
              {form.weightUnit === "kg" ? (
                <Input aria-label="Weight in kg" data-testid="input-weight" inputMode="decimal" placeholder="kg"
                  value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input aria-label="Stones" data-testid="input-weight-st" inputMode="numeric" placeholder="st"
                    value={form.weightSt} onChange={(e) => set("weightSt", e.target.value)} />
                  <Input aria-label="Pounds" data-testid="input-weight-lb" inputMode="decimal" placeholder="lb"
                    value={form.weightLb} onChange={(e) => set("weightLb", e.target.value)} />
                </div>
              )}
            </MeasureField>

            <div className="space-y-2">
              <Label htmlFor="waist">Waist circumference (cm)</Label>
              <div className="flex items-center gap-3">
                <Input id="waist" data-testid="input-waist" inputMode="decimal" value={form.waistDeclined ? "" : form.waistCm}
                  disabled={form.waistDeclined} onChange={(e) => set("waistCm", e.target.value)} className="max-w-40" />
                <div className="flex items-center gap-2">
                  <Checkbox id="waist-declined" checked={form.waistDeclined}
                    onCheckedChange={(c) => set("waistDeclined", !!c)} data-testid="checkbox-waist-declined" />
                  <Label htmlFor="waist-declined" className="font-normal text-sm">Declined</Label>
                </div>
              </div>
            </div>
            {bmi !== null && (
              <div className="flex items-center justify-between rounded-md bg-muted/50 border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground">{bmiEstimated ? "BMI (estimated)" : "Calculated BMI"}</span>
                <span className="text-base font-semibold tabular-nums" data-testid="text-bmi">{bmi}</span>
              </div>
            )}
            {heightCm !== null && form.heightUnit === "ftin" && (
              <p className="text-xs text-muted-foreground">Height saved as {heightCm} cm.</p>
            )}
            {weightKg !== null && form.weightUnit === "stlb" && (
              <p className="text-xs text-muted-foreground">Weight saved as {weightKg} kg.</p>
            )}
          </div>
        )}

        {step === 3 && (
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

        {step === 4 && (
          <div className="space-y-5">
            {avg && <BpGuidance systolic={avg.avgSys} diastolic={avg.avgDia} pregnant={isPregnant}
              noContactRoute={contactNeeded && !contactRequired && !hasContact && form.noContactRoute} />}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Review</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ReviewRow label="Participant" value={`${form.patientName} · DOB ${form.dob}`} />
                <ReviewRow label="Location" value={site || "—"} />
                {form.symptomsNow === "yes" && <ReviewRow label="Symptoms" value="Reported — 999 called" />}
                <ReviewRow label="Sex / Ethnicity" value={`${form.sex} · ${form.ethnicity}`} />
                <ReviewRow label="Postcode" value={form.postcode} />
                <ReviewRow label="GP" value={form.registeredWithGp === "yes" ? form.gpPractice : "Not registered"} />
                {atEmhip && <ReviewRow label="Enrolled with EMHIP" value={form.enrolledWithEmhip === "yes" ? "Yes" : "No"} />}
                <ReviewRow label="Contact" value={form.phone.trim() || form.altContact.trim() || (form.noContactRoute ? "None given" : "—")} />
                <ReviewRow label="Last BP check" value={form.lastBpCheck || "—"} />
                <ReviewRow label="Checked by programme before" value={form.checkedBefore || "—"} />
                {showPregnancy && <ReviewRow label="Pregnant" value={isPregnant ? "Yes" : "No"} />}
                <ReviewRow label="BP average" value={avg ? `${avg.avgSys}/${avg.avgDia} mmHg (${avg.category})` : "—"} />
                <ReviewRow label="Height" value={form.heightMethod === "Declined" ? "Declined" : heightCm !== null ? `${heightCm} cm (${form.heightMethod.toLowerCase()})` : "—"} />
                <ReviewRow label="Weight" value={form.weightMethod === "Declined" ? "Declined" : weightKg !== null ? `${weightKg} kg (${form.weightMethod.toLowerCase()})` : "—"} />
                <ReviewRow label={bmiEstimated ? "BMI (estimated)" : "BMI"} value={bmi !== null ? String(bmi) : "Not calculated"} />
                <ReviewRow label="Waist" value={form.waistDeclined ? "Declined" : form.waistCm.trim() ? `${form.waistCm} cm` : "—"} />
                <ReviewRow label="Known hypertension" value={form.knownHypertension === "yes" ? "Yes" : "No"} />
                <ReviewRow
                  label="Other conditions"
                  value={[...form.otherConditions, form.otherConditionsText].filter(Boolean).join(", ") || "None reported"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Consent</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Confirmed at the start of this screening: the participant has agreed that their details and
                  readings can be recorded and that a member of the clinical team may contact them about their
                  blood pressure.
                </p>

                {form.registeredWithGp === "yes" && (
                  <div className="flex items-start gap-2 rounded-md border border-border p-3">
                    <Checkbox id="consent-gp" checked={form.consentGpContact}
                      onCheckedChange={(c) => set("consentGpContact", !!c)} data-testid="checkbox-consent-gp" />
                    <Label htmlFor="consent-gp" className="font-normal text-sm leading-relaxed">
                      The participant has agreed that their GP practice may be informed of these results if the
                      clinical team feels it is appropriate (optional).
                    </Label>
                  </div>
                )}
              </CardContent>
            </Card>
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

function MeasureField({
  label, methodOptions, method, onMethod, unit, units, onUnit, testId, children,
}: {
  label: string;
  methodOptions: string[];
  method: string;
  onMethod: (v: string) => void;
  unit: string;
  units: { value: string; label: string }[];
  onUnit: (v: string) => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-2 rounded-md border border-border p-3">
      <legend className="px-1 text-sm font-medium">{label} *</legend>
      <RadioGroup value={method} onValueChange={onMethod} className="flex flex-wrap gap-x-5 gap-y-2" data-testid={`radio-group-${testId}-method`}>
        {methodOptions.map((o) => (
          <div key={o} className="flex items-center gap-2">
            <RadioGroupItem value={o} id={`${testId}-${o}`} data-testid={`radio-${testId}-${o.split(" ")[0].toLowerCase()}`} />
            <Label htmlFor={`${testId}-${o}`} className="font-normal text-sm">{o}</Label>
          </div>
        ))}
      </RadioGroup>
      {method && method !== "Declined" && (
        <div className="flex items-start gap-3 pt-1">
          <div className="flex-1">{children}</div>
          <div className="flex rounded-md border border-border overflow-hidden shrink-0" role="group" aria-label={`${label} units`}>
            {units.map((u) => (
              <button key={u.value} type="button" onClick={() => onUnit(u.value)}
                className={`px-3 h-9 text-sm ${unit === u.value ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                data-testid={`button-${testId}-unit-${u.value}`} aria-pressed={unit === u.value}>
                {u.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </fieldset>
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
