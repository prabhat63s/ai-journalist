"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { apiService } from "@/services/api";
import { Loader2, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/shared";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type AuthStep = "email" | "password" | "register";

export default function Home() {
  const router = useRouter();
  const { login: setAuth } = useAuth();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      router.push('/chat');
    }
  }, [user, router]);

  const handleEmailNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !agreed) return;

    setLoading(true);
    try {
      const response = await apiService.checkEmail(email);
      if (response.exists) {
        setStep("password");
        if (response.name) setName(response.name);
      } else {
        setStep("register");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to check email");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { access_token } = await apiService.login({ email, password });
      const user = await apiService.getMe(access_token);
      setAuth(user, access_token);
      toast.success("Welcome back!");
      router.push('/chat');
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { access_token } = await apiService.register({ email, password, name });
      const user = await apiService.getMe(access_token);
      setAuth(user, access_token);
      toast.success("Account created successfully!");
      router.push('/chat');
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 20 : -20,
      opacity: 0
    })
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground font-sans selection:bg-primary/30 relative">
      {/* Theme Toggle in Corner */}
      <div className="fixed top-6 right-6 z-[60]">
        <ThemeToggle />
      </div>

      {/* Subtle Grainy Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] dark:invert-0 invert" />

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg z-10"
      >
        <header className="mb-10">
          <h1 className="text-8xl flex gap-2 font-bold tracking-tighter leading-none mb-1">
            Identify <span className="text-primary">Yourself.</span>
          </h1>
          <p className="text-muted-dark text-base max-w-[300px] leading-snug font-medium">
            Initialize session to access the central intelligence engine.
          </p>
        </header>

        <div className="relative">
          <AnimatePresence mode="wait" custom={step === "email" ? 1 : -1}>
            {step === "email" && (
              <motion.form
                key="email"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleEmailNext}
                className="space-y-8"
              >
                <div className="space-y-5">
                  <h3 className="text-muted-dark text-lg font-medium tracking-tight">Enter your email address</h3>
                  <div className="relative group">
                    <input
                      type="email"
                      placeholder="email address"
                      className="w-full bg-transparent border-none border-b-2 border-border/40 pb-3 text-3xl font-medium placeholder:text-muted/30 focus:outline-none focus:ring-0 transition-all duration-500"
                      style={{
                        borderBottom: '2px solid var(--border)',
                        boxShadow: 'none'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderBottom = '2px solid var(--primary)'}
                      onBlur={(e) => e.currentTarget.style.borderBottom = '2px solid var(--border)'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                    <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-primary to-primary-hover w-0 group-focus-within:w-full transition-all duration-700" />
                  </div>
                </div>

                <div className="flex items-start gap-4 max-w-sm">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      id="agree"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="peer h-4 w-4 appearance-none border-2 border-border/40 rounded bg-transparent checked:bg-primary checked:border-primary transition-all cursor-pointer"
                    />
                    <svg
                      className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="4"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <label htmlFor="agree" className="text-[11px] text-muted leading-relaxed cursor-pointer select-none">
                    I agree to the <span className="text-primary hover:underline">Terms of Service</span> and <span className="text-primary hover:underline">Privacy Policy</span>, including responsible use of AI and full accountability for outputs.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !agreed}
                  className="px-10 py-3 rounded-full bg-primary text-white font-bold tracking-[0.2em] text-[10px] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 uppercase"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
                </button>
              </motion.form>
            )}

            {step === "password" && (
              <motion.form
                key="password"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleLogin}
                className="space-y-8"
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-muted-dark text-lg font-medium tracking-tight">Enter password</h3>
                    <button
                      type="button"
                      onClick={() => setStep("email")}
                      className="text-[9px] text-primary hover:text-primary/40 transition-colors uppercase tracking-[0.2em] font-bold flex items-center gap-2"
                    >
                      <ChevronLeft className="h-3 w-3" /> Change email
                    </button>
                  </div>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full bg-transparent border-none border-b-2 border-border/40 pb-3 pr-10 text-3xl font-medium placeholder:text-muted/30 focus:outline-none focus:ring-0 transition-all duration-500"
                      style={{
                        borderBottom: '2px solid var(--border)',
                        boxShadow: 'none'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderBottom = '2px solid var(--primary)'}
                      onBlur={(e) => e.currentTarget.style.borderBottom = '2px solid var(--border)'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 bottom-3 text-muted hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-primary to-primary-hover w-0 group-focus-within:w-full transition-all duration-700" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-10 py-3 rounded-full bg-surface border border-border/40 text-muted-dark font-bold tracking-[0.2em] text-[10px] hover:bg-surface-hover hover:text-foreground disabled:opacity-30 transition-all duration-300 uppercase"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log In"}
                </button>
              </motion.form>
            )}

            {step === "register" && (
              <motion.form
                key="register"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleRegister}
                className="space-y-8"
              >
                <div className="space-y-8">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-muted-dark text-lg font-medium tracking-tight">Full name</h3>
                      <button
                        type="button"
                        onClick={() => setStep("email")}
                        className="text-[9px] text-muted hover:text-primary transition-colors uppercase tracking-[0.2em] font-bold flex items-center gap-2"
                      >
                        <ChevronLeft className="h-3 w-3" /> Change email
                      </button>
                    </div>
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="your name"
                        className="w-full bg-transparent border-none border-b-2 border-border/40 pb-3 text-3xl font-medium placeholder:text-muted/30 focus:outline-none focus:ring-0 transition-all duration-500"
                        style={{ borderBottom: '2px solid var(--border)' }}
                        onFocus={(e) => e.currentTarget.style.borderBottom = '2px solid var(--primary)'}
                        onBlur={(e) => e.currentTarget.style.borderBottom = '2px solid var(--border)'}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h3 className="text-muted-dark text-lg font-medium tracking-tight">Create password</h3>
                    <div className="relative group">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="w-full bg-transparent border-none border-b-2 border-border/40 pb-3 pr-10 text-3xl font-medium placeholder:text-muted/30 focus:outline-none focus:ring-0 transition-all duration-500"
                        style={{ borderBottom: '2px solid var(--border)' }}
                        onFocus={(e) => e.currentTarget.style.borderBottom = '2px solid var(--primary)'}
                        onBlur={(e) => e.currentTarget.style.borderBottom = '2px solid var(--border)'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 bottom-3 text-muted hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-10 py-3 rounded-full bg-[#141414] border border-[#222222] text-[#333333] font-bold tracking-[0.2em] text-[10px] hover:bg-[#1a1a1a] hover:text-[#888888] disabled:opacity-30 transition-all duration-300 uppercase"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}


