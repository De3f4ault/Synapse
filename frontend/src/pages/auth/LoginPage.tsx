import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Mail, Key } from "lucide-react";

import { AuthenticationService } from "@/api/generated";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/lib/authGuard";
import { startTokenRefreshCycle } from "@/lib/tokenLifecycle";
import {
  GatekeeperLayout,
  SecurityBadge,
  QuantumInput,
  BiometricScanner,
} from "@/components/auth/GatekeeperUI";

export function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return AuthenticationService.loginApiV1AuthLoginPost(credentials);
    },
    onSuccess: async (response: any) => {
      setStatus("success");

      // The client returns { data: TokenResponse, ... }
      const accessToken = response.data?.access_token || response.access_token;

      if (!accessToken) {
        console.error(
          "Login successful but no access token found in response:",
          response,
        );
        setStatus("idle");
        toast({
          variant: "destructive",
          title: "Login Error",
          description: "Server returned an invalid response.",
        });
        return;
      }

      // Set token first to authenticate subsequent requests
      setAuth(accessToken, null);

      // Reset AuthGuard and start proactive token refresh cycle
      AuthGuard.reset();
      startTokenRefreshCycle(accessToken);

      try {
        // Fetch user profile
        const userResponse =
          await AuthenticationService.getCurrentUserProfileApiV1AuthMeGet();

        // Handle potential wrapped response for the profile as well
        const user = (userResponse as any).data || userResponse;

        setAuth(accessToken, user);

        toast({
          title: "Welcome back",
          description: `Successfully logged in to Synapse.`,
        });

        setTimeout(() => {
          navigate("/dashboard");
        }, 500);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        // Fallback: navigate anyway (token is valid)
        navigate("/dashboard");
      }
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      setStatus("error");
      const message = error.response?.data?.detail || "Invalid Credentials";
      setErrorMsg(message);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setStatus("error");
      setErrorMsg("MISSING_CREDENTIALS");
      return;
    }

    setStatus("loading");

    loginMutation.mutate({
      email: email.trim(),
      password: password,
    });
  };

  return (
    <GatekeeperLayout status={status}>
      <SecurityBadge status={status} />

      <form onSubmit={handleSubmit}>
        <QuantumInput
          label="Email Address"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
          disabled={status === "loading" || status === "success"}
          error={errorMsg && !email ? "REQUIRED" : undefined}
        />

        <QuantumInput
          label="Password"
          icon={Key}
          type="password"
          value={password}
          onChange={(e: any) => setPassword(e.target.value)}
          disabled={status === "loading" || status === "success"}
          error={errorMsg && !password ? "REQUIRED" : undefined}
        />

        <BiometricScanner
          onClick={handleSubmit}
          loading={status === "loading"}
          label="Sign In"
          disabled={status === "success"}
        />
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/auth/register"
          className={`
                    inline-flex items-center gap-2 text-sm text-muted-foreground
                    hover:text-primary transition-colors
                    ${status === "loading" ? "pointer-events-none opacity-50" : ""}
                `}
        >
          <span>Don't have an account?</span>
          <span className="font-medium text-primary hover:underline">
            Sign up
          </span>
        </Link>
      </div>
    </GatekeeperLayout>
  );
}
