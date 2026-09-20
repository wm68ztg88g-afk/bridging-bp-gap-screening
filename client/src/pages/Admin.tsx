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
import { Logo } from "@/components/Logo";
import { ArrowLeft, Download, LogOut, ShieldCheck, UserPlus } from "lucide-react";

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

const OUTCOME_OPTIONS = [
  "Not yet reviewed",
  "Referred to GP",
  "Referred to Acute Hypertension Clinic",
  "Contacted — advice given",
  "No action needed",
];

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
          <div className="flex flex-col items-center gap-2 text-center">
            <Logo className="w-10 h-10 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">Programme admin</h1>
            <p className="text-sm text-muted-foreground">For the clinical lead only</p>
          </div>
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
      <header className="border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6 text-primary" />
            <span className="font-semibold text-sm">Bridging the BP Gap — Admin</span>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setAdminPassword(null)} data-testid="button-admin-logout">
            <LogOut className="w-3.5 h-3.5" /> Log out
          </Button>
        </div>
        <div className="max-w-4xl mx-auto flex gap-4 mt-3 text-sm">
          <button
            className={`pb-2 border-b-2 -mb-px ${tab === "records" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground"}`}
            onClick={() => setTab("records")}
            data-testid="tab-records"
          >
            Screening records
          </button>
          <button
            className={`pb-2 border-b-2 -mb-px ${tab === "volunteers" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground"}`}
            onClick={() => setTab("volunteers")}
            data-testid="tab-volunteers"
          >
            Volunteers
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {tab === "records" ? <RecordsPanel password={adminPassword} /> : <VolunteersPanel password={adminPassword} />}
      </main>
    </div>
  );
}

function RecordsPanel({ password }: { password: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["/api/admin/screenings", password],
    queryFn: async () => (await adminFetch("/api/admin/screenings", password)).json(),
  });

  const outcomeMutation = useMutation({
    mutationFn: async ({ id, outcome }: { id: number; outcome: string }) =>
      (await adminFetch(`/api/admin/screenings/${id}/outcome`, password, {
        method: "PATCH",
        body: JSON.stringify({ outcome }),
      })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/screenings", password] }),
    onError: () => toast({ title: "Couldn't update outcome", variant: "destructive" }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading records…</p>;
  if (error) return <p className="text-sm text-destructive">Couldn't load records.</p>;

  const total = rows?.length ?? 0;
  const elevated = rows?.filter((r: any) => r.bpCategory !== "Normal").length ?? 0;
  const urgent = rows?.filter((r: any) => r.urgentFlag).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Screened" value={total} testId="stat-total" />
        <StatCard label="Elevated BP" value={elevated} testId="stat-elevated" />
        <StatCard label="Urgent flags" value={urgent} testId="stat-urgent" tone={urgent > 0 ? "destructive" : undefined} />
      </div>

      <div className="flex justify-end">
        <a
          href={`${API_BASE}/api/admin/screenings/export.csv?password=${encodeURIComponent(password)}`}
        >
          <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-export-csv">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </a>
      </div>

      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>BP avg</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>BMI</TableHead>
              <TableHead>Volunteer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows?.map((r: any) => (
              <TableRow key={r.id} data-testid={`row-screening-${r.id}`}>
                <TableCell className="font-medium">{r.patientName}</TableCell>
                <TableCell className="tabular-nums">{r.avgSystolic}/{r.avgDiastolic}</TableCell>
                <TableCell>
                  <Badge variant={r.urgentFlag ? "destructive" : r.bpCategory === "Normal" ? "secondary" : "outline"}>
                    {r.bpCategory}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums">{r.bmi}</TableCell>
                <TableCell className="text-muted-foreground">{r.volunteerName}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(r.screeningDate).toLocaleDateString("en-GB")}</TableCell>
                <TableCell>
                  <Select
                    value={r.outcome}
                    onValueChange={(v) => outcomeMutation.mutate({ id: r.id, outcome: v })}
                  >
                    <SelectTrigger className="h-8 text-xs w-48" data-testid={`select-outcome-${r.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOME_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {total === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No screenings recorded yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
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
            <Input placeholder="Access code (e.g. WCEN-1234)" value={code} onChange={(e) => setCode(e.target.value)} data-testid="input-volunteer-code" />
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
