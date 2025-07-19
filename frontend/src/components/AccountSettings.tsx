import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DrawerTabs from "@/components/ui/DrawerTabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AccountSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_FUNCTION_TYPE = "sourceFunction";
const SOURCE_CREDIBILITY_TYPE = "sourceCredibility";
const INSIGHT_TYPE = "insightType";

const TABS = [
  { id: "account", label: "Account Info" },
  { id: "sourceFunctions", label: "Custom Source Functions" },
  { id: "sourceCredibilities", label: "Custom Source Credibilities" },
  { id: "insightTypes", label: "Custom Insight Types" },
];

export default function AccountSettings({ open, onOpenChange }: AccountSettingsProps) {
  const router = useRouter();
  const [customOptions, setCustomOptions] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("account");
  const [addInput, setAddInput] = useState<{ sourceFunction: string; sourceCredibility: string; insightType: string }>({ sourceFunction: "", sourceCredibility: "", insightType: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editInput, setEditInput] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [resetStep, setResetStep] = useState<"idle" | "code" | "password">("idle");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  // Fetch user email and custom options when modal opens
  useEffect(() => {
    if (open) {
      // Try to get email from localStorage first
      const storedEmail = typeof window !== "undefined" ? localStorage.getItem("email") : "";
      if (storedEmail) {
        setEmail(storedEmail);
      } else {
        // Fetch from backend if not in localStorage
        const token = localStorage.getItem("token");
        if (token) {
                  fetch(`${API_URL}/users/me`, {
          credentials: "include", // Send cookies with request
        })
            .then((res) => res.ok ? res.json() : Promise.reject("Failed to fetch user"))
            .then((data) => {
              setEmail(data.email);
              localStorage.setItem("email", data.email);
            })
            .catch(() => setEmail("Unknown"));
        }
      }

      // Fetch custom options
      setLoadingOptions(true);
      const token = localStorage.getItem("token");
      fetch(`${API_URL}/users/me/custom-options`, {
        credentials: "include", // Send cookies with request
      })
        .then((res) => res.ok ? res.json() : Promise.reject("Failed to fetch custom options"))
        .then((data) => setCustomOptions(data))
        .catch(() => setCustomOptions([]))
        .finally(() => setLoadingOptions(false));
    }
  }, [open]);

  // Add new custom option
  const getAddInput = (type: 'sourceFunction' | 'sourceCredibility' | 'insightType') => addInput[type] || "";

  const handleAddOption = async (type: string) => {
    const value = getAddInput(type as 'sourceFunction' | 'sourceCredibility' | 'insightType');
    if (!value.trim()) return;
    setAddingType(type);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/users/me/custom-options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        credentials: "include", // Ensure cookies/session are sent
        body: JSON.stringify({ option_type: type, value }),
      });
      if (res.ok) {
        const newOpt = await res.json();
        setCustomOptions((prev) => [...prev, newOpt]);
        setAddInput((prev) => ({ ...prev, [type]: "" }));
      } else {
        alert("Failed to add custom option");
      }
    } catch {
      alert("Failed to add custom option");
    } finally {
      setAddingType(null);
    }
  };

  // Edit custom option
  const handleEditOption = (id: number, value: string) => {
    setEditingId(id);
    setEditInput(value);
  };

  // Save edited custom option
  const handleSaveEdit = async (id: number, type: string) => {
    if (!editInput.trim()) return;
    setSavingEdit(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/users/me/custom-options/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        credentials: "include", // Ensure cookies/session are sent
        body: JSON.stringify({ value: editInput }),
      });
      if (res.ok) {
        setCustomOptions((prev) => prev.map(opt => opt.id === id ? { ...opt, value: editInput } : opt));
        setEditingId(null);
        setEditInput("");
      } else {
        alert("Failed to update custom option");
      }
    } catch {
      alert("Failed to update custom option");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete handler
  const handleDeleteOption = async (id: number) => {
    setDeletingId(id);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/users/me/custom-options/${id}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        credentials: "include", // Ensure cookies/session are sent
      });
      if (res.ok) {
        setCustomOptions((prev) => prev.filter((opt) => opt.id !== id));
      } else {
        alert("Failed to delete custom option");
      }
    } catch {
      alert("Failed to delete custom option");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter options by type
  const getOptionsByType = (type: string) => customOptions.filter(opt => opt.option_type === type);

  // Send code when user clicks Reset Password
  const handleStartReset = async () => {
    setResetLoading(true);
    setResetError("");
    setCodeSent(false);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResetStep("code");
        setCodeSent(true);
      } else {
        const data = await res.json();
        setResetError(data.detail || "Couldn't send code. Please try again.");
      }
    } catch {
      setResetError("Couldn't send code. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  // Resend code
  const handleResendCode = handleStartReset;

  // Move to password step after code entry
  const handleCodeNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError("");
    if (!/^[0-9]{6}$/.test(resetCode)) {
      setResetError("Please enter the 6-digit code from your email.");
      return;
    }
    setResetStep("password");
  };

  // Set new password
  const handleSetNewPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");
    if (!resetNewPassword || !resetConfirmPassword) {
      setResetError("Please enter and confirm your new password.");
      setResetLoading(false);
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      setResetLoading(false);
      return;
    }
    if (resetNewPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      setResetLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetCode, password: resetNewPassword }),
      });
      if (res.ok) {
        setResetStep("idle");
        setResetCode("");
        setResetNewPassword("");
        setResetConfirmPassword("");
        toast.success("Your password has been reset! You can now log in with your new password.");
        return;
      } else {
        const data = await res.json();
        if (data.detail === "Invalid or expired code") {
          setResetError("That code is incorrect or expired. Please try again or request a new code.");
          setResetStep("code");
          setResetCode("");
          setResetNewPassword("");
          setResetConfirmPassword("");
        } else {
          setResetError(data.detail || "Failed to reset password. Please try again.");
        }
      }
    } catch {
      setResetError("Failed to reset password. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    onOpenChange(false);
    router.push("/");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-0 overflow-hidden h-[60vh]">
        <div className="flex flex-col md:flex-row h-full">
          {/* Sidebar Tabs */}
          <div className="md:w-56 w-full md:border-r bg-gray-50">
            <DrawerTabs
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              className="flex-col md:h-full"
              vertical={true}
            />
          </div>
          {/* Main Content */}
          <div className="flex-1 p-6 min-h-[320px]">
            {activeTab === "account" && (
              <>
                <DialogTitle className="mb-2">Account Info</DialogTitle>
                <div className="mb-4">
                  <span className="font-semibold">Email:</span> {email || "Unknown"}
                </div>
                {resetStep === "idle" && (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleLogout}
                      danger
                    >
                      Logout
                    </Button>
                    <Button
                      className="bg-primary text-primary-foreground"
                      onClick={handleStartReset}
                      disabled={resetLoading}
                    >
                      {resetLoading ? "Sending code..." : "Reset Password"}
                    </Button>
                  </div>
                )}
                {resetStep === "code" && (
                  <div className="space-y-4 mt-4 max-w-sm">
                    <div className="text-sm mb-2">We've sent a 6-digit code to your email. Enter it below to continue.</div>
                    {resetError && <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{resetError}</div>}
                    <form onSubmit={handleCodeNext} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="resetCode">6-digit code</Label>
                        <Input
                          id="resetCode"
                          type="text"
                          value={resetCode}
                          onChange={e => setResetCode(e.target.value)}
                          placeholder="Enter code"
                          maxLength={6}
                          pattern="[0-9]{6}"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { setResetStep("idle"); setResetError(""); setResetCode(""); }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleResendCode}
                          disabled={resetLoading}
                          className="flex-1"
                        >
                          Resend code
                        </Button>
                        <Button
                          type="submit"
                          disabled={resetLoading}
                          className="flex-1"
                        >
                          Next
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
                {resetStep === "password" && (
                  <form onSubmit={handleSetNewPassword} className="space-y-4 mt-4 max-w-sm">
                    <div className="text-sm mb-2">Enter your new password below.</div>
                    {resetError && <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{resetError}</div>}
                    <div className="space-y-2">
                      <Label htmlFor="resetNewPassword">New Password</Label>
                      <Input
                        id="resetNewPassword"
                        type="password"
                        value={resetNewPassword}
                        onChange={e => setResetNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resetConfirmPassword">Confirm Password</Label>
                      <Input
                        id="resetConfirmPassword"
                        type="password"
                        value={resetConfirmPassword}
                        onChange={e => setResetConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setResetStep("code"); setResetError(""); setResetNewPassword(""); setResetConfirmPassword(""); }}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={resetLoading}
                        className="flex-1"
                      >
                        {resetLoading ? "Resetting..." : "Set New Password"}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
            {activeTab === "sourceFunctions" && (
              <>
                <DialogTitle className="mb-2">Custom Source Functions</DialogTitle>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={getAddInput(SOURCE_FUNCTION_TYPE)}
                    onChange={e => setAddInput(prev => ({ ...prev, [SOURCE_FUNCTION_TYPE]: e.target.value }))}
                    placeholder="Add new source function..."
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddOption(SOURCE_FUNCTION_TYPE); }}
                  />
                  <Button
                    type="button"
                    className="px-5 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition"
                    disabled={addingType === SOURCE_FUNCTION_TYPE || !getAddInput(SOURCE_FUNCTION_TYPE).trim()}
                    onClick={() => handleAddOption(SOURCE_FUNCTION_TYPE)}
                  >
                    {addingType === SOURCE_FUNCTION_TYPE ? "Adding..." : "Add"}
                  </Button>
                </div>
                {loadingOptions ? (
                  <div className="text-gray-500 text-sm">Loading...</div>
                ) : getOptionsByType(SOURCE_FUNCTION_TYPE).length === 0 ? (
                  <div className="text-gray-400 text-sm italic">No custom source functions saved.</div>
                ) : (
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
                    {getOptionsByType(SOURCE_FUNCTION_TYPE).map((opt, idx, arr) => (
                      <li key={opt.id} className="flex items-center justify-between px-3 py-2 group">
                        {editingId === opt.id ? (
                          <>
                            <input
                              type="text"
                              value={editInput}
                              onChange={e => setEditInput(e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-sm w-full mr-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(opt.id, SOURCE_FUNCTION_TYPE); }}
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="px-3 py-1 text-xs mr-2 rounded bg-primary text-white hover:bg-primary/90 transition"
                              disabled={savingEdit || !editInput.trim()}
                              onClick={() => handleSaveEdit(opt.id, SOURCE_FUNCTION_TYPE)}
                            >
                              {savingEdit ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="px-3 py-1 text-xs rounded hover:bg-gray-100 transition"
                              onClick={() => { setEditingId(null); setEditInput(""); }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="truncate text-sm mr-2 font-medium text-gray-800">{opt.value}</span>
                            <div className="flex gap-1"> {/* Always visible now */}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="rounded-full hover:bg-gray-100"
                                onClick={() => handleEditOption(opt.id, opt.value)}
                                aria-label="Edit"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6l11.293-11.293a1 1 0 0 0 0-1.414l-3.586-3.586a1 1 0 0 0-1.414 0L3 15v6z"/></svg>
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="rounded-full hover:bg-red-50"
                                disabled={deletingId === opt.id}
                                onClick={() => handleDeleteOption(opt.id)}
                                aria-label="Delete"
                              >
                                {deletingId === opt.id ? (
                                  <span className="text-xs">...</span>
                                ) : (
                                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 7V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2m5 4v6m4-6v6"/></svg>
                                )}
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {activeTab === "sourceCredibilities" && (
              <>
                <DialogTitle className="mb-2">Custom Source Credibilities</DialogTitle>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={getAddInput(SOURCE_CREDIBILITY_TYPE)}
                    onChange={e => setAddInput(prev => ({ ...prev, [SOURCE_CREDIBILITY_TYPE]: e.target.value }))}
                    placeholder="Add new source credibility..."
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddOption(SOURCE_CREDIBILITY_TYPE); }}
                  />
                  <Button
                    type="button"
                    className="px-5 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition"
                    disabled={addingType === SOURCE_CREDIBILITY_TYPE || !getAddInput(SOURCE_CREDIBILITY_TYPE).trim()}
                    onClick={() => handleAddOption(SOURCE_CREDIBILITY_TYPE)}
                  >
                    {addingType === SOURCE_CREDIBILITY_TYPE ? "Adding..." : "Add"}
                  </Button>
                </div>
                {loadingOptions ? (
                  <div className="text-gray-500 text-sm">Loading...</div>
                ) : getOptionsByType(SOURCE_CREDIBILITY_TYPE).length === 0 ? (
                  <div className="text-gray-400 text-sm italic">No custom source credibilities saved.</div>
                ) : (
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
                    {getOptionsByType(SOURCE_CREDIBILITY_TYPE).map((opt, idx, arr) => (
                      <li key={opt.id} className="flex items-center justify-between px-3 py-2 group">
                        {editingId === opt.id ? (
                          <>
                            <input
                              type="text"
                              value={editInput}
                              onChange={e => setEditInput(e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-sm w-full mr-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(opt.id, SOURCE_CREDIBILITY_TYPE); }}
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="px-3 py-1 text-xs mr-2 rounded bg-primary text-white hover:bg-primary/90 transition"
                              disabled={savingEdit || !editInput.trim()}
                              onClick={() => handleSaveEdit(opt.id, SOURCE_CREDIBILITY_TYPE)}
                            >
                              {savingEdit ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="px-3 py-1 text-xs rounded hover:bg-gray-100 transition"
                              onClick={() => { setEditingId(null); setEditInput(""); }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="truncate text-sm mr-2 font-medium text-gray-800">{opt.value}</span>
                            <div className="flex gap-1"> {/* Always visible now */}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="rounded-full hover:bg-gray-100"
                                onClick={() => handleEditOption(opt.id, opt.value)}
                                aria-label="Edit"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6l11.293-11.293a1 1 0 0 0 0-1.414l-3.586-3.586a1 1 0 0 0-1.414 0L3 15v6z"/></svg>
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="rounded-full hover:bg-red-50"
                                disabled={deletingId === opt.id}
                                onClick={() => handleDeleteOption(opt.id)}
                                aria-label="Delete"
                              >
                                {deletingId === opt.id ? (
                                  <span className="text-xs">...</span>
                                ) : (
                                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 7V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2m5 4v6m4-6v6"/></svg>
                                )}
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {activeTab === "insightTypes" && (
              <>
                <DialogTitle className="mb-2">Custom Insight Types</DialogTitle>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={getAddInput(INSIGHT_TYPE)}
                    onChange={e => setAddInput(prev => ({ ...prev, [INSIGHT_TYPE]: e.target.value }))}
                    placeholder="Add new insight type..."
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddOption(INSIGHT_TYPE); }}
                  />
                  <Button
                    type="button"
                    className="px-5 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition"
                    disabled={addingType === INSIGHT_TYPE || !getAddInput(INSIGHT_TYPE).trim()}
                    onClick={() => handleAddOption(INSIGHT_TYPE)}
                  >
                    {addingType === INSIGHT_TYPE ? "Adding..." : "Add"}
                  </Button>
                </div>
                {loadingOptions ? (
                  <div className="text-gray-500 text-sm">Loading...</div>
                ) : getOptionsByType(INSIGHT_TYPE).length === 0 ? (
                  <div className="text-gray-400 text-sm italic">No custom insight types saved.</div>
                ) : (
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
                    {getOptionsByType(INSIGHT_TYPE).map((opt, idx, arr) => (
                      <li key={opt.id} className="flex items-center justify-between px-3 py-2 group">
                        {editingId === opt.id ? (
                          <>
                            <input
                              type="text"
                              value={editInput}
                              onChange={e => setEditInput(e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-sm w-full mr-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(opt.id, INSIGHT_TYPE); }}
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="px-3 py-1 text-xs mr-2 rounded bg-primary text-white hover:bg-primary/90 transition"
                              disabled={savingEdit || !editInput.trim()}
                              onClick={() => handleSaveEdit(opt.id, INSIGHT_TYPE)}
                            >
                              {savingEdit ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="px-3 py-1 text-xs rounded hover:bg-gray-100 transition"
                              onClick={() => { setEditingId(null); setEditInput(""); }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="truncate text-sm mr-2 font-medium text-gray-800">{opt.value}</span>
                            <div className="flex gap-1"> {/* Always visible now */}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="rounded-full hover:bg-gray-100"
                                onClick={() => handleEditOption(opt.id, opt.value)}
                                aria-label="Edit"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6l11.293-11.293a1 1 0 0 0 0-1.414l-3.586-3.586a1 1 0 0 0-1.414 0L3 15v6z"/></svg>
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="rounded-full hover:bg-red-50"
                                disabled={deletingId === opt.id}
                                onClick={() => handleDeleteOption(opt.id)}
                                aria-label="Delete"
                              >
                                {deletingId === opt.id ? (
                                  <span className="text-xs">...</span>
                                ) : (
                                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 7V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2m5 4v6m4-6v6"/></svg>
                                )}
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 