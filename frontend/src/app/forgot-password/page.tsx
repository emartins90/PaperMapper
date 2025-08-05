"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import AuthHeader from "../../components/AuthHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "code" | "password">("request");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const router = useRouter();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");
    setCodeSent(false);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStep("code");
        setCodeSent(true);
      } else {
        const data = await res.json();
        if (res.status === 429) {
          setError("Too many attempts. Please wait 5 minutes before trying again.");
        } else {
          setError(data.detail || "Failed to send reset code. Please try again.");
        }
      }
    } catch (err) {
      setError("Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = handleRequestReset;

  const handleCodeNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    if (!resetCode || resetCode.trim() === "") {
      setError("Please enter the 6-digit code from your email.");
      setLoading(false);
      return;
    }
    
    if (!/^\d+$/.test(resetCode)) {
      setError("Please enter only numbers in the code field.");
      setLoading(false);
      return;
    }
    
    if (!/^[0-9]{6}$/.test(resetCode)) {
      setError("Please enter the 6-digit code from your email.");
      setLoading(false);
      return;
    }
    
    // Validate code against backend
    try {
      const res = await fetch(`${API_URL}/auth/validate-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetCode }), // Using email field to pass the code
      });
      
      if (res.ok) {
        // Code is valid, proceed to password step
        setStep("password");
      } else {
        const data = await res.json();
        if (data.detail === "Invalid or expired code") {
          setError("That code is incorrect or expired. Please try again or request a new code.");
        } else {
          setError("Invalid code. Please check and try again.");
        }
      }
    } catch (error) {
      setError("Failed to validate code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      setLoading(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token: resetCode, 
          password: newPassword 
        }),
      });

      if (res.ok) {
        setSuccess("Password reset successfully! You can now log in with your new password.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        const data = await res.json();
        if (data.detail === "Invalid or expired code") {
          setError("That code is incorrect or expired. Please try again or request a new code.");
          setStep("code");
          setResetCode("");
          setNewPassword("");
          setConfirmPassword("");
        } else if (res.status === 400) {
          setError("Invalid code or password. Please check your information and try again.");
        } else {
          setError(data.detail || "Failed to reset password. Please try again.");
        }
      }
    } catch (err) {
      setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center relative">
      <AuthHeader />
      <div className="max-w-sm w-full mx-auto p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {step === "request" ? "Reset your password" : 
           step === "code" ? "Enter reset code" : 
           "Set new password"}
        </h2>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        
        {step === "request" && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? "Sending..." : "Send reset code"}
            </Button>
          </form>
        )}
        
        {step === "code" && (
          <div className="space-y-4">
            <Alert className="mb-4">
              <AlertDescription>
                We've sent a 6-digit code to your email. Enter it below to continue.
              </AlertDescription>
            </Alert>
            <form onSubmit={handleCodeNext} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep("request"); setError(""); setResetCode(""); }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="flex-1"
                >
                  Resend code
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  Next
                </Button>
              </div>
            </form>
          </div>
        )}
        
        {step === "password" && (
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div className="text-sm mb-2">Enter your new password below.</div>
            <div>
              <input
                type="password"
                placeholder="New password"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setStep("code"); setError(""); setNewPassword(""); setConfirmPassword(""); }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Resetting..." : "Set new password"}
              </Button>
            </div>
          </form>
        )}
        
        <div className="mt-4 text-center">
          <button
            className="text-blue-600 hover:underline"
            onClick={() => router.push("/login")}
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
} 