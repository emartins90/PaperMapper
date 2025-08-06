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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Edit, Trash2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AccountSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_FUNCTION_TYPE = "sourceFunction";
const SOURCE_CREDIBILITY_TYPE = "sourceCredibility";
const INSIGHT_TYPE = "insightType";
const CLASS_TYPE = "class";

const TABS = [
  { id: "account", label: "Account Info" },
  { id: "classes", label: "My Classes" },
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
  const [addInput, setAddInput] = useState<{ sourceFunction: string; sourceCredibility: string; insightType: string; class: string }>({ sourceFunction: "", sourceCredibility: "", insightType: "", class: "" });
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");

  // Fetch user email and custom options when modal opens
  useEffect(() => {
    if (open) {
      // Try to get email from localStorage first
      const storedEmail = typeof window !== "undefined" ? localStorage.getItem("email") : "";
      if (storedEmail) {
        setEmail(storedEmail);
      } else {
        // Fetch from backend if not in localStorage
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

      // Fetch custom options
      setLoadingOptions(true);
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
  const getAddInput = (type: 'sourceFunction' | 'sourceCredibility' | 'insightType' | 'class') => addInput[type] || "";

  const handleAddOption = async (type: string) => {
    const value = getAddInput(type as 'sourceFunction' | 'sourceCredibility' | 'insightType' | 'class');
    if (!value.trim()) return;
    setAddingType(type);
    try {
      const res = await fetch(`${API_URL}/users/me/custom-options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Use cookie-based authentication
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
    try {
      const res = await fetch(`${API_URL}/users/me/custom-options/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Use cookie-based authentication
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
    try {
      const res = await fetch(`${API_URL}/users/me/custom-options/${id}`, {
        method: "DELETE",
        credentials: "include", // Use cookie-based authentication
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
        if (res.status === 429) {
          setResetError("Too many attempts. Please wait 5 minutes before trying again.");
        } else {
          setResetError(data.detail || "Couldn't send code. Please try again.");
        }
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
  const handleCodeNext = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);
    
    if (!resetCode || resetCode.trim() === "") {
      setResetError("Please enter the 6-digit code from your email.");
      setResetLoading(false);
      return;
    }
    
    if (!/^\d+$/.test(resetCode)) {
      setResetError("Please enter only numbers in the code field.");
      setResetLoading(false);
      return;
    }
    
    if (!/^[0-9]{6}$/.test(resetCode)) {
      setResetError("Please enter the 6-digit code from your email.");
      setResetLoading(false);
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
        setResetStep("password");
      } else {
        const data = await res.json();
        if (data.detail === "Invalid or expired code") {
          setResetError("That code is incorrect or expired. Please try again or request a new code.");
        } else {
          setResetError("Invalid code. Please check and try again.");
        }
      }
    } catch (error) {
      setResetError("Failed to validate code. Please try again.");
    } finally {
      setResetLoading(false);
    }
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
        } else if (res.status === 400) {
          setResetError("Invalid code or password. Please check your information and try again.");
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

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/me/delete`, {
        method: "DELETE",
        credentials: "include", // Use cookie-based authentication
      });
      
      if (res.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("email");
        onOpenChange(false);
        router.push("/");
        toast.success("Your account has been deleted successfully.");
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete account. Please try again.");
      }
    } catch (error) {
      alert("Failed to delete account. Please try again.");
    } finally {
      setDeleteLoading(false);
      setDeleteStep("idle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-0 overflow-visible h-[60vh] md:h-[60vh] h-[100dvh] md:h-[60vh] max-h-[100dvh] rounded-none md:rounded-lg">
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="md:w-56 w-full md:border-r bg-gray-50 md:h-full overflow-hidden">
            <DrawerTabs
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              className="flex-col md:h-full overflow-hidden"
              vertical={true}
            />
          </div>
          {/* Main Content */}
          <div className="flex-1 p-6 flex flex-col h-full overflow-visible">
                          {activeTab === "account" && (
                <div className="flex flex-col h-full min-h-0 max-h-full overflow-visible">
                <div>
                  <DialogTitle className="mb-8">Account Info</DialogTitle>
                  <div className="mb-6">
                    <span className="font-semibold">Email:</span> {email || "Unknown"}
                  </div>
                </div>
                
                {resetStep === "idle" && deleteStep === "idle" && (
                  <div className="flex flex-col h-full">
                    <div className="flex gap-3 mb-6">
                      <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="text-red-600 border-red-200 hover:bg-red-50"
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
                    
                    {/* Error alert for reset password */}
                    {resetError && (
                      <Alert variant="destructive">
                        <AlertDescription>{resetError}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="pt-6 border-t border-gray-200 mb-6">
                      {/* Divider moved up */}
                    </div>
                    
                    {/* Account deletion at bottom */}
                    <div className="mt-auto">
                      <Button
                        variant="destructive"
                        onClick={() => setDeleteStep("confirm")}
                        disabled={deleteLoading}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                )}
                {resetStep === "code" && (
                  <div className="space-y-4 mt-4 max-w-sm">
                    <Alert className="mb-4">
                      <AlertDescription>
                        We've sent a 6-digit code to your email. Enter it below to continue.
                      </AlertDescription>
                    </Alert>
                    {resetError && (
                      <Alert variant="destructive">
                        <AlertDescription>{resetError}</AlertDescription>
                      </Alert>
                    )}
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
                    {resetError && (
                      <Alert variant="destructive">
                        <AlertDescription>{resetError}</AlertDescription>
                      </Alert>
                    )}
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
                {deleteStep === "confirm" && (
                  <div className="flex flex-col h-full">
                    <div className="mt-auto">
                      <div className="text-lg font-semibold text-red-600 mb-2">Confirm Account Deletion</div>
                      <div className="text-sm text-gray-700 mb-4">
                        Are you sure you want to delete your account? This action cannot be undone.
                        This will permanently delete all your data and settings.
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDeleteStep("idle")}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={deleteLoading}
                          className="flex-1"
                        >
                          {deleteLoading ? "Deleting..." : "Delete Account"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
              {activeTab === "classes" && (
                <div className="flex flex-col h-full min-h-0 max-h-full overflow-visible">
                  <DialogTitle className="mb-2">My Classes</DialogTitle>
                  <div className="flex gap-2 mb-4 overflow-visible">
                    <input
                      type="text"
                      value={getAddInput(CLASS_TYPE)}
                      onChange={e => setAddInput(prev => ({ ...prev, [CLASS_TYPE]: e.target.value }))}
                      placeholder="Add new class..."
                      className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                      onKeyDown={e => { if (e.key === 'Enter') handleAddOption(CLASS_TYPE); }}
                    />
                    <Button
                      type="button"
                      className="px-5 h-10 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition"
                      disabled={addingType === CLASS_TYPE || !getAddInput(CLASS_TYPE).trim()}
                      onClick={() => handleAddOption(CLASS_TYPE)}
                    >
                      {addingType === CLASS_TYPE ? "Adding..." : "Add"}
                    </Button>
                  </div>
                  {loadingOptions ? (
                    <div className="text-gray-500 text-sm">Loading...</div>
                  ) : getOptionsByType(CLASS_TYPE).length === 0 ? (
                    <div className="text-gray-400 text-sm italic">No classes saved.</div>
                  ) : (
                    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white flex-1 overflow-y-auto min-h-0">
                      {getOptionsByType(CLASS_TYPE).map((opt, idx, arr) => (
                        <li key={opt.id} className="flex items-center justify-between px-3 py-2 group">
                          {editingId === opt.id ? (
                            <>
                              <input
                                type="text"
                                value={editInput}
                                onChange={e => setEditInput(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full mr-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(opt.id, CLASS_TYPE); }}
                                autoFocus
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="px-3 py-1 text-xs mr-2 rounded bg-primary text-white hover:bg-primary/90 transition"
                                disabled={savingEdit || !editInput.trim()}
                                onClick={() => handleSaveEdit(opt.id, CLASS_TYPE)}
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
                              <span className="text-sm mr-2 font-medium text-gray-800 break-words flex-1 min-w-0">{opt.value}</span>
                              <div className="flex gap-1"> {/* Always visible now */}
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-full hover:bg-gray-100"
                                  onClick={() => handleEditOption(opt.id, opt.value)}
                                  aria-label="Edit"
                                >
                                  <Edit className="h-4 w-4 text-gray-600" />
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
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  )}
                                </Button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {activeTab === "sourceFunctions" && (
                <div className="flex flex-col h-full min-h-0 max-h-full overflow-visible">
                  <DialogTitle className="mb-2">Custom Source Functions</DialogTitle>
                  <div className="flex gap-2 mb-4 overflow-visible">
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
                    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white flex-1 overflow-y-auto min-h-0">
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
                              <span className="text-sm mr-2 font-medium text-gray-800 break-words flex-1 min-w-0">{opt.value}</span>
                              <div className="flex gap-1"> {/* Always visible now */}
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-full hover:bg-gray-100"
                                  onClick={() => handleEditOption(opt.id, opt.value)}
                                  aria-label="Edit"
                                >
                                  <Edit className="h-4 w-4 text-gray-600" />
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
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  )}
                                </Button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {activeTab === "sourceCredibilities" && (
                <div className="flex flex-col h-full min-h-0 max-h-full overflow-visible">
                  <DialogTitle className="mb-2">Custom Source Credibilities</DialogTitle>
                  <div className="flex gap-2 mb-4 overflow-visible">
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
                    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white flex-1 overflow-y-auto min-h-0">
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
                              <span className="text-sm mr-2 font-medium text-gray-800 break-words flex-1 min-w-0">{opt.value}</span>
                              <div className="flex gap-1"> {/* Always visible now */}
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-full hover:bg-gray-100"
                                  onClick={() => handleEditOption(opt.id, opt.value)}
                                  aria-label="Edit"
                                >
                                  <Edit className="h-4 w-4 text-gray-600" />
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
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  )}
                                </Button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {activeTab === "insightTypes" && (
                <div className="flex flex-col h-full min-h-0 max-h-full overflow-visible">
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
                    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white flex-1 overflow-y-auto min-h-0">
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
                              <span className="text-sm mr-2 font-medium text-gray-800 break-words flex-1 min-w-0">{opt.value}</span>
                              <div className="flex gap-1"> {/* Always visible now */}
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-full hover:bg-gray-100"
                                  onClick={() => handleEditOption(opt.id, opt.value)}
                                  aria-label="Edit"
                                >
                                  <Edit className="h-4 w-4 text-gray-600" />
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
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  )}
                                </Button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );
} 