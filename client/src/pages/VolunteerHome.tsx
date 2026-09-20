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

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="w-10 h-10 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-app-title">
            Bridging the BP Gap
          </h1>
          <p className="text-sm text-muted-foreground">Community blood pressure screening</p>
        </div>

        {!volunteer ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Volunteer sign-in</CardTitle>
              <CardDescription>
                Enter the personal access code your coordinator gave you after training and DBS clearance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Access code</Label>
                  <Input
                    id="code"
                    data-testid="input-access-code"
                    autoFocus
                    inputMode="text"
                    placeholder="e.g. WCEN-1234"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                  {loading ? "Checking..." : "Log in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hi {volunteer.name.split(" ")[0]}</CardTitle>
              <CardDescription>You're signed in and ready to record a screening.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2"
                size="lg"
                onClick={() => navigate("/screening/new")}
                data-testid="button-new-screening"
              >
                <ClipboardPlus className="w-4 h-4" />
                Record a new patient
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setVolunteer(null)}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            data-testid="link-admin"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Programme lead admin access
          </Link>
        </div>
      </div>
    </div>
  );
}
