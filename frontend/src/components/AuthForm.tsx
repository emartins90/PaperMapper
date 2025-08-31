import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaCircleCheck } from "react-icons/fa6";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { hasCookieConsent } from "@/lib/cookieUtils";
import { useUser } from "@/contexts/UserContext";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AuthFormProps {
  onAuth: (token: string) => void;
  mode?: "login" | "Sign Up";
}

interface PasswordRequirement {
  id: string;
  text: string;
  validator: (password: string) => boolean;
}

export default function AuthForm({ onAuth, mode: initialMode = "login" }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "Sign Up">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const router = useRouter();
  const { setUser } = useUser();

  // Show password requirements immediately for Sign Up mode
  useEffect(() => {
    if (mode === "Sign Up") {
      setShowPasswordRequirements(true);
    }
  }, [mode]);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Password requirements
  const passwordRequirements: PasswordRequirement[] = [
    {
      id: "length",
      text: "At least 8 characters",
      validator: (password: string) => password.length >= 8
    },
    {
      id: "uppercase",
      text: "One uppercase letter",
      validator: (password: string) => /[A-Z]/.test(password)
    },
    {
      id: "lowercase",
      text: "One lowercase letter",
      validator: (password: string) => /[a-z]/.test(password)
    },
    {
      id: "number",
      text: "One number",
      validator: (password: string) => /\d/.test(password)
    }
  ];

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError("");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("");
      return false;
    }
    
    const failedRequirements = passwordRequirements.filter(req => !req.validator(password));
    
    if (failedRequirements.length > 0) {
      setPasswordError(`Password requirements not met`);
      return false;
    }
    
    setPasswordError("");
    return true;
  };

  const getPasswordRequirementStatus = (requirement: PasswordRequirement) => {
    if (!password) return "pending";
    const isValid = requirement.validator(password);
    
    // Only show red if user has attempted to submit and this requirement is not met
    if (hasAttemptedSubmit && !isValid) {
      return "invalid";
    }
    
    return isValid ? "valid" : "pending";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    // Only validate if the field has been touched (blurred or submitted)
    if (emailTouched) {
      validateEmail(newEmail);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    // Show password requirements for Sign Up mode
    if (mode === "Sign Up") {
      setShowPasswordRequirements(true);
    }
    // Only validate if the field has been touched (blurred or submitted) and in Sign Up mode
    if (passwordTouched && mode === "Sign Up") {
      validatePassword(newPassword);
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    // Only validate password for Sign Up mode
    if (mode === "Sign Up") {
      validatePassword(password);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Check cookie consent before proceeding
    if (!hasCookieConsent()) {
      setError("Please accept cookies to continue. Cookies are required for authentication.");
      return;
    }
    
    // Mark fields as touched and validate before submission
    setEmailTouched(true);
    setPasswordTouched(true);
    setHasAttemptedSubmit(true);
    
    if (!validateEmail(email)) {
      return;
    }
    
    // Only validate password for Sign Up
    if (mode === "Sign Up" && !validatePassword(password)) {
      return;
    }
    
    // Check privacy consent for Sign Up
    if (mode === "Sign Up" && !privacyConsent) {
      setError("Please agree to the Privacy Policy to continue.");
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      if (mode === "Sign Up") {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        
        if (!res.ok) {
          if (res.status === 400) {
            const errorData = await res.json();
            if (errorData.detail && errorData.detail.includes("REGISTER_USER_ALREADY_EXISTS")) {
              throw new Error("An account with this email already exists. Want to log in?");
            } else {
              throw new Error("Please check your information and try again.");
            }
          } else if (res.status === 422) {
            throw new Error("Please check your information and try again.");
          } else {
            throw new Error("Unable to create your account. Please try again later.");
          }
        }
        
        // Auto-login after successful registration
        const loginRes = await fetch(`${API_URL}/auth/cookie/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username: email, password }),
          credentials: "include", // Ensure cookies are set
        });
        if (!loginRes.ok) throw new Error("Account created but unable to log you in automatically. Please try logging in.");
        
        localStorage.setItem("email", email);
        localStorage.setItem("token", "cookie-auth");
        
        // Set user in context for PostHog identification
        const userWithId = {
          id: email, // Use email as temporary ID until we get the real ID from backend
          email: email,
          name: email.split('@')[0],
        };
        setUser(userWithId);
        
        onAuth("cookie-auth");
      } else {
        const res = await fetch(`${API_URL}/auth/cookie/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username: email, password }),
          credentials: "include", // Ensure cookies are set
        });
        
        
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Incorrect email or password. Please check your information and try again.");
          } else if (res.status === 400) {
            // Server returns 400 for bad credentials (doesn't differentiate between email/password)
            throw new Error("Incorrect email or password. Please check your information and try again.");
          } else if (res.status === 500) {
            throw new Error("Something went wrong on our end. Please try again in a moment.");
          } else {
            throw new Error("Unable to log you in. Please try again later.");
          }
        }
        
   
        
        localStorage.setItem("email", email);
        localStorage.setItem("token", "cookie-auth"); // Set a token for app compatibility
        
        // Set user in context for PostHog identification
        const userWithId = {
          id: email, // Use email as temporary ID until we get the real ID from backend
          email: email,
          name: email.split('@')[0],
        };
        setUser(userWithId);
        
        onAuth("cookie-auth");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm w-full mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {mode === "login" ? "Welcome back" : "Get started"}
      </h2>
      
      {/* Error Alert for Login and Sign Up */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {error.includes("Want to log in?") ? (
              <>
                An account with this email already exists.{" "}
                <button
                  className="underline hover:no-underline"
                  onClick={() => router.push("/login")}
                >
                  Want to log in?
                </button>
              </>
            ) : (
              error
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Email"
            className={`w-full px-3 py-2 border rounded ${
              emailError ? "border-red-500" : "border-gray-300"
            }`}
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            required
          />
          {emailError && <div className="text-red-500 text-sm mt-1">{emailError}</div>}
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            className={`w-full px-3 py-2 border rounded ${
              passwordError ? "border-red-500" : "border-gray-300"
            }`}
            value={password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            required
          />
          {passwordError && <div className="text-red-500 text-sm mt-1">{passwordError}</div>}
          
          {/* Password Requirements Checklist - Only for Sign Up */}
          {mode === "Sign Up" && showPasswordRequirements && (
            <div className="mt-2 space-y-1">
              {passwordRequirements.map((requirement) => {
                const status = getPasswordRequirementStatus(requirement);
                return (
                  <div key={requirement.id} className="flex items-center text-sm">
                    {status === "valid" ? (
                      <FaCircleCheck className="mr-2 text-success-300" />
                    ) : (
                      <span className={`mr-2 ${
                        status === "invalid" ? "text-error-500" : "text-gray-400"
                      }`}>
                        {status === "invalid" ? "✗" : "○"}
                      </span>
                    )}
                    <span className={
                      status === "valid" ? "text-success-500" : 
                      status === "invalid" ? "text-error-500" : "text-gray-500"
                    }>
                      {requirement.text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Privacy Policy Consent - Only for Sign Up */}
        {mode === "Sign Up" && (
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="privacy-consent"
              checked={privacyConsent}
              onChange={(e) => setPrivacyConsent(e.target.checked)}
              className="mt-1"
              required
            />
            <label htmlFor="privacy-consent" className="text-sm text-gray-700">
              I have read and agree to the{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </Link>
              {" "}and{" "}
              <Link href="/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </Link>
            </label>
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading || !!emailError || (mode === "Sign Up" && !!passwordError) || (mode === "Sign Up" && !privacyConsent)}
        >
          {loading ? "Loading..." : mode === "login" ? "Log In" : "Sign Up"}
        </Button>
        
        {/* Forgot password link - only show on login */}
        {mode === "login" && (
          <div className="text-center mt-2">
            <button
              type="button"
              className="text-blue-600 hover:underline text-sm"
              onClick={() => router.push("/forgot-password")}
            >
              Forgot password?
            </button>
          </div>
        )}
      </form>
      <div className="mt-4 text-center">
        {mode === "login" ? (
          <>
            Don't have an account?{' '}
            <button
              className="text-blue-600 hover:underline"
              onClick={() => router.push("/signup")}
            >
              Sign Up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              className="text-blue-600 hover:underline"
              onClick={() => router.push("/login")}
            >
              Log In
            </button>
          </>
        )}
      </div>
    </div>
  );
} 