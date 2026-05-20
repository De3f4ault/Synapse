import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Key, User, Shield } from "lucide-react";

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

export function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const registerMutation = useMutation({
    mutationFn: (data: any) =>
      AuthenticationService.registerApiV1AuthRegisterPost(data.requestBody),
    onSuccess: async (data) => {
      setStatus("success");
      setTimeout(() => {
        setAuth(data.access_token, data as any);
        AuthGuard.reset();
        startTokenRefreshCycle(data.access_token);
        toast({
          title: "Account Created",
          description: "Welcome to Synapse.",
        });
        navigate("/dashboard");
      }, 1500);
    },
    onError: (error: any) => {
      setStatus("error");
      const message = error.response?.data?.detail || "Registration Failed";
      setErrorMsg(message);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMsg("PASSWORD_MISMATCH");
      return;
    }

    if (password.length < 8) {
      setStatus("error");
      setErrorMsg("PASSWORD_TOO_SHORT");
      return;
    }

    if (!fullName || !email) {
      setStatus("error");
      setErrorMsg("INCOMPLETE_DATA");
      return;
    }

    setStatus("loading");

    registerMutation.mutate({
      requestBody: {
        full_name: fullName,
        email,
        password,
      },
    });
  };

  return (
    <GatekeeperLayout status={status}>
      <SecurityBadge status={status} />

      <form onSubmit={handleSubmit}>
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <QuantumInput
              label="Full Name"
              icon={User}
              value={fullName}
              onChange={(e: any) => setFullName(e.target.value)}
              disabled={status === "loading" || status === "success"}
            />
          </motion.div>
        </AnimatePresence>

        <QuantumInput
          label="Email Address"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
          disabled={status === "loading" || status === "success"}
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

        <QuantumInput
          label="Confirm Password"
          icon={Shield}
          type="password"
          value={confirmPassword}
          onChange={(e: any) => setConfirmPassword(e.target.value)}
          disabled={status === "loading" || status === "success"}
          error={errorMsg === "PASSWORD_MISMATCH" ? "MISMATCH" : undefined}
        />

        <BiometricScanner
          onClick={handleSubmit}
          loading={status === "loading"}
          label="Create Account"
          disabled={status === "success"}
        />
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/auth/login"
          className={`
            inline-flex items-center gap-2 text-sm text-muted-foreground
            hover:text-primary transition-colors
            ${status === "loading" ? "pointer-events-none opacity-50" : ""}
            `}
        >
          <span>Already have an account?</span>
          <span className="font-medium text-primary hover:underline">
            Sign in
          </span>
        </Link>
      </div>
    </GatekeeperLayout>
  );
}
