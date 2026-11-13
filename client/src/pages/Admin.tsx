import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { BrandBanner, Logo } from "@/components/Logo";
import { AlertTriangle, ArrowLeft, Download, LogOut, Minus, Plus, ShieldCheck, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  FOLLOW_UP_STATUSES, RESULT_OPTIONS, isOverdue, needsAction, needsReason, compareForAdmin,
  countUniquePeople, followUpDeadline,
} from "@shared/followup";
import { participantAdvice, isRedNoContact, isNoContactFlag } from "@shared/participant-advice";
import { classifyBp, BP_PROTOCOL_VERSION } from "@shared/bp-protocol";
import { BpBandBadge } from "@/components/BpGuidance";
import { countEmhip, emhipLabel } from "@shared/emhip";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

async function adminFetch(path: string, password: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), "x-admin-password": password, ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }
  return res;
}


export default function Admin() {
  const { adminPassword, setAdminPassword } = useStore();
  const [, navigate] = useLocation();
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"records" | "volunteers">("records");

  if (!adminPassword) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-10 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <BrandBanner title="Programme admin" subtitle="For the programme lead only" />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Admin sign-in
              </CardTitle>
              <CardDescription>Enter the admin password to view screening data.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoginError("");
                  try {
                    const res = await fetch(`${API_BASE}/api/admin/login`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ password: passwordInput }),
                    });
                    if (!res.ok) throw new Error();
                    setAdminPassword(passwordInput);
                  } catch {
                    setLoginError("Incorrect password.");
                  }
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    data-testid="input-admin-password"
                    type="password"
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                  />
                  {loginError && <p className="text-sm text-destructive" data-testid="text-login-error">{loginError}</p>}
                </div>
                <Button type="submit" className="w-full" data-testid="button-admin-login">Sign in</Button>
              </form>
            </CardContent>
          </Card>
          <Button variant="ghost" className="w-full gap-2" onClick={() => navigate("/")} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" /> Back to volunteer sign-in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-[#24387a] text-white px-4 pt-3 border-b-4 border-[#f7c631]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-9 h-9" />
            <div className="leading-tight">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#f7c631]">Bridging the BP Gap</div>
              <div className="font-extrabold text-base">Programme admin</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-white hover:bg-white/10 hover:text-white" onClick={() => setAdminPassword(null)} data-testid="button-admin-logout">
            <LogOut className="w-3.5 h-3.5" /> Log out
          </Button>
        </div>
        <div className="max-w-6xl mx-auto flex gap-4 mt-3 text-sm">
          <button
            className={`pb-2 border-b-2 -mb-px ${tab === "records" ? "border-[#f7c631] text-white font-semibold" : "border-transparent text-white/70 hover:text-white"}`}
            onClick={() => setTab("records")}
            data-testid="tab-records"
          >
            Screening records
          </button>
          <button
            className={`pb-2 border-b-2 -mb-px ${tab === "volunteers" ? "border-[#f7c631] text-white font-semibold" : "border-transparent text-white/70 hover:text-white"}`}
            onClick={() => setTab("volunteers")}
            data-testid="tab-volunteers"
          >
            Volunteers
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "records" ? <RecordsPanel password={adminPassword} /> : <VolunteersPanel password={adminPassword} />}
      </main>
    </div>
  );
}

function fmtDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-GB") : "";
}

function RecordsPanel({ password }: { password: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showTests, setShowTests] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["/api/admin/screenings", password],
    queryFn: async () => (await adminFetch("/api/admin/screenings", password)).json(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading records…</p>;
  if (error) return <p className="text-sm text-destructive">Couldn't load records.</p>;

  const now = new Date();
  const all = (rows ?? []).map((r: any) => ({ ...r, band: classifyBp(r.avgSystolic, r.avgDiastolic).category }));
  const real = all.filter((r: any) => !r.isTest);
  const testCount = all.length - real.length;

  // All counts exclude test records.
  const total = real.length;
  const people = countUniquePeople(real);
  const elevated = real.filter((r: any) => r.band !== "Green").length;
  const urgent = real.filter((r: any) => r.band === "Red").length;
  const followUp = real.filter((r: any) => needsAction(r.band, r.outcome)).length;
  const overdue = real.filter((r: any) => isOverdue(r.band, r.outcome, r.createdAt, now)).length;
  const noGp = real.filter((r: any) => r.registeredWithGp === false).length;
  const unableToContact = real.filter((r: any) => r.outcome === "Unable to contact").length;
  const confirmed = real.filter((r: any) => r.resultOutcome === "New hypertension confirmed").length;
  const maternity = real.filter((r: any) => r.advicePathway === "Maternity").length;
  const noContact = real.filter((r: any) => r.noContactRoute).length;
  const noContactFlags = real.filter((r: any) => isNoContactFlag(r.band, r.noContactRoute, r.pregnant) && r.outcome === "Not yet reviewed");
  const redNoContact = noContactFlags.filter((r: any) => r.band === "Red");
  const amberNoContact = noContactFlags.filter((r: any) => r.band === "Amber");
  const longGap = real.filter((r: any) => r.lastBpCheck === "Never" || r.lastBpCheck === "More than 5 years ago").length;
  const symptoms = real.filter((r: any) => r.symptomsReported).length;
  const declinedMeasure = real.filter((r: any) => r.weightMethod === "Declined" || r.heightMethod === "Declined" || r.waistDeclined).length;
  const emhip = countEmhip(real);

  const visible = (showTests ? all : real).sort((a: any, b: any) =>
    compareForAdmin(
      { band: a.band, status: a.outcome, createdAt: a.createdAt, flagged: isNoContactFlag(a.band, a.noContactRoute, a.pregnant) },
      { band: b.band, status: b.outcome, createdAt: b.createdAt, flagged: isNoContactFlag(b.band, b.noContactRoute, b.pregnant) },
      now,
    ),
  );

  return (
    <div className="space-y-5">
      {noContactFlags.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border-2 border-red-700 bg-red-50 p-3 text-sm text-red-950 dark:bg-red-950 dark:text-red-100" data-testid="banner-red-nocontact">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            <strong>No contact details given:</strong>{" "}
            {redNoContact.length > 0 && <>{redNoContact.length} red (told to go straight to St George’s A&E — check attendance){amberNoContact.length > 0 ? "; " : ". "}</>}
            {amberNoContact.length > 0 && <>{amberNoContact.length} amber (told to see their GP within 4 weeks). </>}
            Listed first below.
          </p>
        </div>
      )}
      {overdue > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-red-600/50 bg-red-50 p-3 text-sm text-red-950 dark:bg-red-950 dark:text-red-100" data-testid="banner-overdue">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p><strong>{overdue} overdue follow-up{overdue === 1 ? "" : "s"}.</strong> Red records need action within 48 hours and amber within 4 weeks. They are listed first below.</p>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Follow-up</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Needs follow-up (amber/red)" value={followUp} testId="stat-followup" />
          <StatCard label="Overdue" value={overdue} testId="stat-overdue" tone="destructive" />
          <StatCard label="Unable to contact" value={unableToContact} testId="stat-unable" />
          <StatCard label="New hypertension confirmed" value={confirmed} testId="stat-confirmed" />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Screening</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="People (by name + DOB)" value={people} testId="stat-people" />
          <StatCard label="Screenings" value={total} testId="stat-total" />
          <StatCard label="Yellow / amber / red" value={elevated} testId="stat-elevated" />
          <StatCard label="Red band" value={urgent} testId="stat-urgent" tone="destructive" />
          <StatCard label="Not registered with a GP" value={noGp} testId="stat-nogp" />
        </div>
        <p className="text-xs text-muted-foreground">
          Counts exclude test records. Current programme bands ({BP_PROTOCOL_VERSION}) are calculated from the recorded BP averages;
          historical readings and saved categories are unchanged. CSV includes both the recorded category and current programme band.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Reach and safety</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="BP never checked or 5+ years ago" value={longGap} testId="stat-longgap" />
          <StatCard label="Maternity redirects" value={maternity} testId="stat-maternity" />
          <StatCard label="No contact route" value={noContact} testId="stat-nocontact" />
          <StatCard label="999 symptoms reported" value={symptoms} testId="stat-symptoms" tone="destructive" />
          <StatCard label="Height, weight or waist declined" value={declinedMeasure} testId="stat-declined" />
        </div>
        <p className="text-xs text-muted-foreground">These questions were added on 13 November 2026; earlier records are not counted.</p>
      </section>

      <section aria-labelledby="emhip-summary-title" className="space-y-2">
        <h2 id="emhip-summary-title" className="text-sm font-medium">Enrolled with EMHIP?</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Yes" value={emhip.yes} testId="stat-emhip-yes" />
          <StatCard label="No" value={emhip.no} testId="stat-emhip-no" />
          <StatCard label="Not recorded" value={emhip.notRecorded} testId="stat-emhip-not-recorded" />
        </div>
        <p className="text-xs text-muted-foreground">
          Counts screening records, not unique people. Earlier records without this answer are shown as Not recorded.
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showTests} onCheckedChange={setShowTests} data-testid="switch-show-tests" />
          Show test records ({testCount})
        </label>
        <a href={`${API_BASE}/api/admin/screenings/export.csv?password=${encodeURIComponent(password)}`}>
          <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-export-csv">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </a>
      </div>

      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>BP avg</TableHead>
              <TableHead>Band / advice given</TableHead>
              <TableHead>GP</TableHead>
              <TableHead>EMHIP</TableHead>
              <TableHead>BMI</TableHead>
              <TableHead>Volunteer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Follow-up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r: any) => {
              const current = { category: r.band, advice: participantAdvice({ systolic: r.avgSystolic, diastolic: r.avgDiastolic, pregnant: r.pregnant, noContactRoute: r.noContactRoute, contactViaGp: r.contactViaGp, registeredWithGp: r.registeredWithGp }).advice };
              const late = !r.isTest && isOverdue(r.band, r.outcome, r.createdAt, now);
              const flagged = !r.isTest && isNoContactFlag(r.band, r.noContactRoute, r.pregnant) && r.outcome === "Not yet reviewed";
              const deadline = followUpDeadline(r.band, r.createdAt);
              return (
                <TableRow
                  key={r.id}
                  data-testid={`row-screening-${r.id}`}
                  className={r.isTest ? "opacity-60" : late || flagged ? "bg-red-50 dark:bg-red-950/40" : undefined}
                >
                  <TableCell className="font-medium">
                    <div>{r.patientName}</div>
                    {r.isTest && <Badge variant="outline" className="mt-1">Test record</Badge>}
                    {r.symptomsReported && <Badge className="mt-1 bg-red-700 text-white hover:bg-red-700">999 symptoms</Badge>}
                    {r.pregnant && <Badge variant="outline" className="mt-1">Pregnant</Badge>}
                    {isRedNoContact(r.band, r.noContactRoute, r.pregnant)
                      ? <Badge className="mt-1 bg-red-700 text-white hover:bg-red-700" data-testid={`badge-red-nocontact-${r.id}`}>No contact details — sent to A&E</Badge>
                      : isNoContactFlag(r.band, r.noContactRoute, r.pregnant)
                        ? <Badge className="mt-1 bg-orange-500 text-orange-950 hover:bg-orange-500" data-testid={`badge-amber-nocontact-${r.id}`}>No contact details — told to see GP</Badge>
                        : r.noContactRoute && <Badge variant="outline" className="mt-1">No contact route</Badge>}
                    {r.contactViaGp && <Badge variant="outline" className="mt-1">Contact via GP</Badge>}
                    {late && (
                      <Badge className="mt-1 bg-red-700 text-white hover:bg-red-700" data-testid={`badge-overdue-${r.id}`}>
                        Overdue
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{r.avgSystolic}/{r.avgDiastolic}</TableCell>
                  <TableCell>
                    <BpBandBadge band={current.category} />
                    <p className="text-xs mt-1 min-w-48 max-w-xs">{current.advice}</p>
                    {r.bpCategory !== current.category && (
                      <p className="text-xs text-muted-foreground mt-1">Originally recorded: {r.bpCategory}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.registeredWithGp ? (r.gpPractice || "Registered") : <span className="font-medium">Not registered</span>}
                  </TableCell>
                  <TableCell data-testid={`emhip-screening-${r.id}`}>{r.enrolledWithEmhip == null && r.lastBpCheck ? "Not asked (other site)" : emhipLabel(r.enrolledWithEmhip)}</TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {r.bmi ?? "—"}{r.bmi != null && r.bmiEstimated ? <span className="text-xs text-muted-foreground"> est.</span> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.volunteerName}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{fmtDate(r.screeningDate)}</TableCell>
                  <TableCell className="min-w-52 text-xs space-y-1">
                    <div className="font-medium text-sm">{r.outcome}</div>
                    {r.resultOutcome && r.resultOutcome !== "Not yet known" && <div>Result: {r.resultOutcome}</div>}
                    {r.contactAttempts > 0 && <div>Contact attempts: {r.contactAttempts}</div>}
                    {deadline && r.outcome === "Not yet reviewed" && !r.isTest && (
                      <div className={late ? "text-red-700 dark:text-red-300 font-medium" : "text-muted-foreground"}>
                        {late ? "Was due" : "Due by"} {deadline.toLocaleDateString("en-GB")}
                      </div>
                    )}
                    {r.outcomeUpdatedAt && <div className="text-muted-foreground">Updated {fmtDate(r.outcomeUpdatedAt)}</div>}
                    <Button size="sm" variant="outline" className="h-7 mt-1" onClick={() => setEditing(r)} data-testid={`button-followup-${r.id}`}>
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No screenings recorded yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <FollowUpDialog
          record={editing}
          password={password}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["/api/admin/screenings", password] });
            toast({ title: "Follow-up saved" });
          }}
        />
      )}
    </div>
  );
}

function FollowUpDialog({ record, password, onClose, onSaved }: { record: any; password: string; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<string>(record.outcome);
  const [result, setResult] = useState<string>(record.resultOutcome || "Not yet known");
  const [attempts, setAttempts] = useState<number>(record.contactAttempts || 0);
  const [notes, setNotes] = useState<string>(record.outcomeNotes || "");
  const [isTest, setIsTest] = useState<boolean>(!!record.isTest);
  const [saving, setSaving] = useState(false);
  const reasonRequired = needsReason(record.band, outcome);

  async function save() {
    if (reasonRequired && !notes.trim()) {
      toast({ title: "Add a reason", description: "Amber and red records need a reason for “No action needed”.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await adminFetch(`/api/admin/screenings/${record.id}/outcome`, password, {
        method: "PATCH",
        body: JSON.stringify({ outcome, resultOutcome: result, contactAttempts: attempts, outcomeNotes: notes }),
      });
      if (isTest !== !!record.isTest) {
        await adminFetch(`/api/admin/screenings/${record.id}/test`, password, {
          method: "PATCH",
          body: JSON.stringify({ isTest }),
        });
      }
      onSaved();
    } catch {
      toast({ title: "Couldn't save follow-up", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Follow-up: {record.patientName}</DialogTitle>
          <DialogDescription>
            {record.band} · {record.avgSystolic}/{record.avgDiastolic} mmHg · screened {fmtDate(record.screeningDate)}
            {[record.phone, record.email, record.altContact].filter(Boolean).length
              ? ` · ${[record.phone, record.email, record.altContact].filter(Boolean).join(" · ")}`
              : record.contactViaGp ? ` · contact via GP: ${record.gpPractice}` : record.noContactRoute ? " · no contact route given" : " · no contact recorded"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Follow-up status</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_STATUSES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Confirmed result</Label>
            <Select value={result} onValueChange={setResult}>
              <SelectTrigger data-testid="select-result"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESULT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contact attempts</Label>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setAttempts(Math.max(0, attempts - 1))} aria-label="One fewer attempt">
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <span className="w-8 text-center tabular-nums" data-testid="text-attempts">{attempts}</span>
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setAttempts(attempts + 1)} aria-label="One more attempt">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="followup-notes">Notes{reasonRequired ? " (reason required)" : ""}</Label>
            <Textarea id="followup-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder={reasonRequired ? "Why does this amber/red record need no action?" : "Optional"} data-testid="input-followup-notes" />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
            <span>
              <span className="font-medium">Test record</span>
              <span className="block text-xs text-muted-foreground">Excluded from all counts and the follow-up list.</span>
            </span>
            <Switch checked={isTest} onCheckedChange={setIsTest} data-testid="switch-test-record" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} data-testid="button-save-followup">{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, testId, tone }: { label: string; value: number; testId: string; tone?: "destructive" }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className={`text-xl font-semibold tabular-nums ${tone === "destructive" && value > 0 ? "text-destructive" : ""}`} data-testid={testId}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function VolunteersPanel({ password }: { password: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const { data: volunteers, isLoading } = useQuery({
    queryKey: ["/api/admin/volunteers", password],
    queryFn: async () => (await adminFetch("/api/admin/volunteers", password)).json(),
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (await adminFetch("/api/admin/volunteers", password, {
        method: "POST",
        body: JSON.stringify({ name, code, active: true }),
      })).json(),
    onSuccess: () => {
      setName("");
      setCode("");
      qc.invalidateQueries({ queryKey: ["/api/admin/volunteers", password] });
    },
    onError: () => toast({ title: "Couldn't add volunteer", description: "That access code may already be in use.", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) =>
      adminFetch(`/api/admin/volunteers/${id}`, password, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/volunteers", password] }),
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add a trained volunteer</CardTitle>
          <CardDescription>Only add someone once training and DBS clearance are confirmed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => { e.preventDefault(); if (name.trim() && code.trim()) createMutation.mutate(); }}
          >
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-volunteer-name" />
            <Input placeholder="Access code (e.g. CEN-1234)" value={code} onChange={(e) => setCode(e.target.value)} data-testid="input-volunteer-code" />
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-add-volunteer">Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Access code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>}
            {volunteers?.map((v: any) => (
              <TableRow key={v.id} data-testid={`row-volunteer-${v.id}`}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="font-mono text-sm">{v.code}</TableCell>
                <TableCell>
                  <Badge variant={v.active ? "secondary" : "outline"}>{v.active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate({ id: v.id, active: !v.active })}
                    data-testid={`button-toggle-volunteer-${v.id}`}
                  >
                    {v.active ? "Deactivate" : "Reactivate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {volunteers?.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No volunteers added yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
