"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, ArrowRight, ChevronLeft } from "lucide-react";

type AuthStep = "email" | "password" | "register";

export function AuthModal() {
  const { login: setAuth } = useAuth();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

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
      // Fetch user info with the token
      const user = await apiService.getMe(access_token);
      setAuth(user, access_token);
      toast.success("Welcome back!");
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
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 }
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-md overflow-hidden bg-card border border-border rounded-2xl shadow-2xl"
      >
        <div className="p-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-playfair font-bold tracking-tight text-foreground">
              {step === "email" ? "Welcome" : step === "password" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {step === "email" 
                ? "Enter your email to get started" 
                : step === "password" 
                  ? `Enter password for ${email}` 
                  : "Complete your profile to continue"}
            </p>
          </div>

          <div className="relative h-[280px]">
            <AnimatePresence mode="wait" custom={step === "email" ? 1 : -1}>
              {step === "email" && (
                <motion.form
                  key="email"
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  custom={1}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  onSubmit={handleEmailNext}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        className="pl-10 h-12 rounded-xl"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
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
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <button 
                    type="button"
                    onClick={() => setStep("email")}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back to email
                  </button>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 h-12 rounded-xl"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log In"}
                  </Button>
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
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <button 
                    type="button"
                    onClick={() => setStep("email")}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back to email
                  </button>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        className="pl-10 h-12 rounded-xl"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 h-12 rounded-xl"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-6 bg-muted/50 border-t border-border">
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
