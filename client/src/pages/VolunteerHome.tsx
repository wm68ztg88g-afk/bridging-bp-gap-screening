import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { LogOut, ClipboardPlus, ShieldCheck } from "lucide-react";

export default function VolunteerHome() {
  const { volunteer, setVolunteer } = useStore();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/volunteer/login", { code: code.trim() });
      const data = await res.json();
      setVolunteer(data);
      setCode("");
    } catch (err: any) {
      toast({
        title: "Couldn't log in",
        description: "That access code isn't recognised. Check with your volunteer coordinator.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { n: 1, label: "Ask", sub: "Welcome them in", color: "bg-[#f7c631] text-[#24387a]" },
    { n: 2, label: "Sit & check", sub: "Two readings", color: "bg-[#f37a4b] text-white" },
    { n: 3, label: "Know your numbers", sub: "Card + advice", color: "bg-[#2ba05b] text-white" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-[#f7c631]">
      <div className="relative flex-1 overflow-hidden px-4 pt-8 pb-8">
        {/* decorative dots and arc, as on the poster */}
        <div aria-hidden className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-[#fbd968]" />
        <div aria-hidden className="absolute right-10 top-8 h-4 w-4 rounded-full bg-[#b12f78]" />
        <div aria-hidden className="absolute right-24 top-20 h-2.5 w-2.5 rounded-full bg-[#f37a4b]" />

        <div className="relative w-full max-w-sm mx-auto space-y-5">
          <div className="flex items-center gap-2">
            <Logo className="w-9 h-9" />
            <span className="rounded-full bg-[#24387a] px-3 py-1 text-[10px] font-bold tracking-[0.18em] uppercase text-white">
              Bridging the BP Gap
            </span>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-[#24387a] px-6 pt-6 pb-10 text-white shadow-lg">
              <h1 className="text-[2.1rem] font-extrabold leading-[1.05] tracking-tight" data-testid="text-app-title">
                Every check<br />closes the gap.
              </h1>
              <p className="mt-3 text-sm text-white/85">
                Thank you for volunteering. Your check today could be someone's first.
              </p>
            </div>
            <div className="absolute -bottom-4 right-4 rotate-[-3deg] rounded-full bg-[#b12f78] px-5 py-2 text-lg font-extrabold text-white shadow-md">
              Let's check!
            </div>
          </div>

          <p className="pt-3 text-sm font-bold italic text-[#24387a]">Hypertension: By the People, For the People</p>

          {!volunteer ? (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#24387a]">Volunteer sign-in</CardTitle>
                <CardDescription>Use the personal code you were given after training.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="sr-only">Access code</Label>
                    <Input
                      id="code"
                      data-testid="input-access-code"
                      autoFocus
                      inputMode="text"
                      autoCapitalize="characters"
                      placeholder="Your code, e.g. CEN-1234"
                      className="h-12 text-base tracking-wide"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full h-12 text-base font-bold" disabled={loading} data-testid="button-login">
                    {loading ? "Checking..." : "Start screening"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#24387a]">Hi {volunteer.name.split(" ")[0]} 👋</CardTitle>
                <CardDescription>You're signed in. Ready when they are.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-center gap-2 h-12 text-base font-bold"
                  size="lg"
                  onClick={() => navigate("/screening/new")}
                  data-testid="button-new-screening"
                >
                  <ClipboardPlus className="w-5 h-5" />
                  Record a new participant
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => setVolunteer(null)}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-2">
            {steps.map((s) => (
              <div key={s.n} className="rounded-xl bg-white/70 px-2 py-3 text-center">
                <div className={`mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold ${s.color}`}>{s.n}</div>
                <div className="text-xs font-bold leading-tight text-[#24387a]">{s.label}</div>
                <div className="text-[11px] text-[#24387a]/70">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="bg-[#24387a] px-4 py-4 text-center">
        <div className="text-base font-extrabold text-[#f7c631]">heartknowhow.net</div>
        <Link
          href="/admin"
          className="mt-1 inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white"
          data-testid="link-admin"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Programme lead admin access
        </Link>
      </footer>
    </div>
  );
}
