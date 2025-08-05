import React, { useState } from "react";
import { Button } from "../components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AuthFormProps {
  onAuth: (token: string) => void;
  mode?: "login" | "register";
}

export default function AuthForm({ onAuth, mode: initialMode = "login" }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    console.log("AuthForm - API_URL:", API_URL);
    try {
      if (mode === "register") {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error("Registration failed");
        
        // Auto-login after successful registration
        const loginRes = await fetch(`${API_URL}/auth/cookie/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username: email, password }),
          credentials: "include", // Ensure cookies are set
        });
        if (!loginRes.ok) throw new Error("Auto-login failed after registration");
        
        localStorage.setItem("email", email);
        localStorage.setItem("token", "cookie-auth");
        onAuth("cookie-auth");
      } else {
        const res = await fetch(`${API_URL}/auth/cookie/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username: email, password }),
          credentials: "include", // Ensure cookies are set
        });
        if (!res.ok) throw new Error("Login failed");
        
        console.log("AuthForm - login successful, cookies after login:", document.cookie);
        console.log("AuthForm - login response headers:", res.headers);
        
        localStorage.setItem("email", email);
        localStorage.setItem("token", "cookie-auth"); // Set a token for app compatibility
        onAuth("cookie-auth");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded shadow">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PaperThread</h1>
        <p className="text-gray-600 text-sm">Weave your research into papers</p>
      </div>
      
      <h2 className="text-2xl font-bold mb-4 text-center">
        {mode === "login" ? "Welcome back" : "Get started"}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full px-3 py-2 border rounded"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full px-3 py-2 border rounded"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Loading..." : mode === "login" ? "Login" : "Register"}
        </Button>
      </form>
      <div className="mt-4 text-center">
        {mode === "login" ? (
          <>
            Don't have an account?{' '}
            <button
              className="text-blue-600 hover:underline"
              onClick={() => { setMode("register"); setError(""); }}
            >
              Register
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              className="text-blue-600 hover:underline"
              onClick={() => { setMode("login"); setError(""); }}
            >
              Login
            </button>
          </>
        )}
      </div>
    </div>
  );
} 