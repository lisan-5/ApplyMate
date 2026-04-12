import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { ApplyMateLogo } from "@/components/ApplyMateLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email");
const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");
const codeSchema = z
  .string()
  .regex(/^\d{5}$/, "Code must be exactly 5 digits");

const ADMIN_CHALLENGES = [
  "What is the boiling point of water in Fahrenheit minus 154?",
  "How many cards are in a standard deck minus the number of suits plus 6?",
  "If a cat has 9 lives and a dog has 1, multiply them and subtract the number of continents plus 51?",
  "What is a baker's dozen multiplied by 4, plus 6?",
  "How many hours in a day times 2, plus 10?",
];

const CORRECT_ANSWER = "58";

type AuthMode =
  | "login"
  | "signup"
  | "verify-email"
  | "forgot-password"
  | "reset-password";

export default function Auth() {
  const { user, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeQuestion, setChallengeQuestion] = useState("");
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [pendingAdmin, setPendingAdmin] = useState(false);

  useEffect(() => {
    if (user && isAdmin && !pendingAdmin) {
      const q =
        ADMIN_CHALLENGES[Math.floor(Math.random() * ADMIN_CHALLENGES.length)];
      setChallengeQuestion(q);
      setShowChallenge(true);
      setPendingAdmin(true);
    }
  }, [user, isAdmin, pendingAdmin]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (user && isAdmin && !showChallenge && pendingAdmin)
    return <Navigate to="/admin" replace />;
  if (user && isAdmin && !showChallenge && !pendingAdmin) return null;

  const resetFormState = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const validateEmail = () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: "Invalid email",
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast({
        title: "Invalid password",
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;

    if (mode === "login" || mode === "signup" || mode === "reset-password") {
      if (!validatePassword()) return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Confirm password must match the password exactly.",
        variant: "destructive",
      });
      return;
    }

    if (mode === "verify-email" || mode === "reset-password") {
      const codeResult = codeSchema.safeParse(code);
      if (!codeResult.success) {
        toast({
          title: "Invalid code",
          description: codeResult.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await api.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await api.auth.signUp({ email, password });
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description:
                "This email is already registered. Try logging in instead.",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }
        toast({
          title: "Verification code sent",
          description:
            "Check your email and enter the 5-digit code to finish creating your account.",
        });
        resetFormState("verify-email");
      } else if (mode === "verify-email") {
        const { error } = await api.auth.verifyEmailCode({ email, code });
        if (error) throw error;
      } else if (mode === "forgot-password") {
        const { error } = await api.auth.requestPasswordReset({ email });
        if (error) throw error;
        toast({
          title: "Reset code sent",
          description:
            "Check your email for the 5-digit reset code, then choose a new password.",
        });
        resetFormState("reset-password");
      } else if (mode === "reset-password") {
        if (password !== confirmPassword) {
          toast({
            title: "Passwords do not match",
            description: "Confirm password must match the password exactly.",
            variant: "destructive",
          });
          return;
        }
        const { error } = await api.auth.resetPasswordWithCode({
          email,
          code,
          password,
        });
        if (error) throw error;
        toast({
          title: "Password updated",
          description: "Your password was reset. Sign in with your new password.",
        });
        resetFormState("login");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChallengeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (challengeAnswer.trim() === CORRECT_ANSWER) {
      setShowChallenge(false);
    } else {
      toast({
        title: "Wrong answer",
        description: "Access denied. Try again.",
        variant: "destructive",
      });
      const q =
        ADMIN_CHALLENGES[Math.floor(Math.random() * ADMIN_CHALLENGES.length)];
      setChallengeQuestion(q);
      setChallengeAnswer("");
    }
  };

  const titleMap: Record<AuthMode, string> = {
    login: "Welcome back",
    signup: "Get started",
    "verify-email": "Verify your email",
    "forgot-password": "Forgot password",
    "reset-password": "Reset password",
  };

  const subtitleMap: Record<AuthMode, string> = {
    login: "Sign in to your account",
    signup: "Create your free account",
    "verify-email": "Enter the 5-digit code we sent to your inbox",
    "forgot-password": "Send a 5-digit reset code to your email",
    "reset-password": "Use your code and choose a new password",
  };

  const authBg = (
    <>
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 mesh-gradient" />
      <div
        className="absolute top-1/4 -left-20 h-72 w-72 animate-float rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--gradient-start)), hsl(var(--gradient-mid)))",
        }}
      />
      <div
        className="absolute bottom-1/4 -right-20 h-96 w-96 animate-float rounded-full opacity-15 blur-3xl"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--gradient-mid)), hsl(var(--gradient-end)))",
          animationDelay: "1.5s",
        }}
      />
    </>
  );

  if (showChallenge && user && isAdmin) {
    return (
      <div className="page-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        {authBg}
        <div className="absolute right-4 top-4 z-20">
          <ThemeToggle className="h-10 w-10" />
        </div>
        <div className="relative z-10 w-full max-w-md animate-fade-up space-y-8">
          <div className="flex flex-col items-center gap-3">
            <ApplyMateLogo size="lg" className="text-primary" />
            <h1
              className="gradient-text text-2xl font-bold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Admin Verification
            </h1>
          </div>
          <div className="animate-shimmer glass-card space-y-6 rounded-2xl p-8">
            <div className="space-y-2 text-center">
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Security Question
              </h2>
              <p className="text-sm text-muted-foreground">
                {challengeQuestion}
              </p>
            </div>
            <form onSubmit={handleChallengeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="challenge"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Your Answer
                </Label>
                <Input
                  id="challenge"
                  type="text"
                  placeholder="Type your answer..."
                  value={challengeAnswer}
                  onChange={(e) => setChallengeAnswer(e.target.value)}
                  required
                  className="h-12 rounded-xl border-border/50 bg-muted/50 transition-all focus:border-primary/50 focus:bg-background"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="gradient-primary glow h-12 w-full rounded-xl border-0 text-sm font-semibold text-white"
              >
                Verify <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            <button
              type="button"
              onClick={async () => {
                await api.auth.signOut();
                setShowChallenge(false);
                setPendingAdmin(false);
              }}
              className="w-full text-center text-sm text-muted-foreground hover:underline"
            >
              Sign out instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {authBg}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle className="h-10 w-10" />
      </div>
      <div className="relative z-10 w-full max-w-md animate-fade-up space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <ApplyMateLogo size="lg" className="text-primary" />
            <h1
              className="gradient-text text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              ApplyMate
            </h1>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Track applications, never miss a deadline
          </p>
        </div>
        <div className="animate-shimmer glass-card space-y-6 rounded-2xl p-8">
          <div className="space-y-1 text-center">
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {titleMap[mode]}
            </h2>
            <p className="text-sm text-muted-foreground">{subtitleMap[mode]}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={mode === "verify-email"}
                className="h-12 rounded-xl border-border/50 bg-muted/50 transition-all focus:border-primary/50 focus:bg-background"
              />
            </div>

            {(mode === "login" || mode === "signup" || mode === "reset-password") && (
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      mode === "reset-password"
                        ? "Choose a new password"
                        : "Enter your password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl border-border/50 bg-muted/50 pr-11 transition-all focus:border-primary/50 focus:bg-background"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {(mode === "signup" || mode === "reset-password") && (
              <div className="space-y-2">
                <Label
                  htmlFor="confirm-password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl border-border/50 bg-muted/50 pr-11 transition-all focus:border-primary/50 focus:bg-background"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {(mode === "verify-email" || mode === "reset-password") && (
              <div className="space-y-2">
                <Label
                  htmlFor="code"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  5-Digit Code
                </Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  placeholder="12345"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                  required
                  className="h-12 rounded-xl border-border/50 bg-muted/50 transition-all focus:border-primary/50 focus:bg-background"
                />
              </div>
            )}

            <Button
              type="submit"
              className="gradient-primary glow h-12 w-full rounded-xl border-0 text-sm font-semibold text-white"
              disabled={submitting}
            >
              {mode === "login" && "Sign In"}
              {mode === "signup" && "Send Verification Code"}
              {mode === "verify-email" && "Verify Email"}
              {mode === "forgot-password" && "Send Reset Code"}
              {mode === "reset-password" && "Reset Password"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="space-y-3 text-center text-sm">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => resetFormState("forgot-password")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
                <div>
                  <span className="text-muted-foreground">
                    Don&apos;t have an account?{" "}
                  </span>
                  <button
                    type="button"
                    onClick={() => resetFormState("signup")}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}

            {mode === "signup" && (
              <div>
                <span className="text-muted-foreground">
                  Already have an account?{" "}
                </span>
                <button
                  type="button"
                  onClick={() => resetFormState("login")}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>
            )}

            {mode === "verify-email" && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => resetFormState("signup")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Back to sign up
                </button>
                <div>
                  <span className="text-muted-foreground">Need a new code? </span>
                  <button
                    type="button"
                    onClick={() => resetFormState("signup")}
                    className="font-semibold text-primary hover:underline"
                  >
                    Resend it
                  </button>
                </div>
              </div>
            )}

            {mode === "forgot-password" && (
              <div>
                <button
                  type="button"
                  onClick={() => resetFormState("login")}
                  className="font-semibold text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            )}

            {mode === "reset-password" && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => resetFormState("forgot-password")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Request a new reset code
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => resetFormState("login")}
                    className="font-semibold text-primary hover:underline"
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
