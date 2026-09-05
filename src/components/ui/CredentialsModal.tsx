// CredentialsModal component for Urban Furniture Accounting System.
// Displays a popup modal showing the newly created user's Login ID, Password, and Role with 1-click copy support.
// Used by: /users/new, /signup, and /master/contacts/new whenever a user is provisioned.

"use client";

import { useState } from "react";
import { Copy, Check, Eye, EyeOff, ShieldCheck, KeyRound, X } from "lucide-react";
import { Button } from "./Button";
import { Badge } from "./Badge";

export interface CredentialsData {
  name: string;
  loginId: string;
  password?: string;
  role: string;
  email?: string;
}

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: CredentialsData | null;
  title?: string;
  subtitle?: string;
}

export function CredentialsModal({
  isOpen,
  onClose,
  credentials,
  title = "User Account Provisioned!",
  subtitle = "Please save or share these login credentials securely.",
}: CredentialsModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !credentials) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = () => {
    const text = [
      `Urban Furniture Accounting System — Login Credentials`,
      `Name: ${credentials.name}`,
      `Role: ${credentials.role}`,
      `Login ID: ${credentials.loginId}`,
      credentials.password ? `Password: ${credentials.password}` : "",
      credentials.email ? `Email: ${credentials.email}` : "",
      `URL: http://localhost:3000/login`,
    ]
      .filter(Boolean)
      .join("\n");

    copyToClipboard(text, "all");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFDF8] border-2 border-[#171717] rounded-sm max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-[#171717] text-[#FFFDF8] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#B91C1C] flex items-center justify-center text-white shrink-0">
              <KeyRound size={20} />
            </div>
            <div>
              <h3
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
              >
                {title}
              </h3>
              <p className="text-xs text-[#D4CCC0] mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#D4CCC0] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* User info chips */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E2D9CC]">
            <div>
              <div className="text-sm font-semibold text-[#171717]">{credentials.name}</div>
              {credentials.email && (
                <div className="text-xs text-[#3D3A36]">{credentials.email}</div>
              )}
            </div>
            <Badge variant="confirmed">
              {credentials.role.replace("_", " ")}
            </Badge>
          </div>

          {/* Login ID Row */}
          <div className="p-3 bg-[#F7F4EE] border border-[#E2D9CC] rounded-sm">
            <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#3D3A36] mb-1">
              Login ID (Username)
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-bold text-[#171717] select-all">
                {credentials.loginId}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(credentials.loginId, "loginId")}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-[#D4CCC0] rounded-sm hover:bg-[#F7F4EE] transition-colors"
              >
                {copiedField === "loginId" ? (
                  <>
                    <Check size={13} className="text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Password Row */}
          {credentials.password && (
            <div className="p-3 bg-[#F7F4EE] border border-[#E2D9CC] rounded-sm">
              <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#3D3A36] mb-1">
                Password
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-[#B91C1C] select-all">
                  {showPassword ? credentials.password : "••••••••••••"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-[#3D3A36] hover:text-[#171717]"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(credentials.password!, "password")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-[#D4CCC0] rounded-sm hover:bg-[#F7F4EE] transition-colors"
                  >
                    {copiedField === "password" ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-sm text-xs text-emerald-800">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Yeh credentials use karke seedha <strong>/login</strong> se sign-in kiya ja sakta hai.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F7F4EE] border-t border-[#E2D9CC] flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={copyAll}
            className="text-xs"
          >
            {copiedField === "all" ? (
              <>
                <Check size={14} className="mr-1 text-emerald-600" />
                Copied All!
              </>
            ) : (
              <>
                <Copy size={14} className="mr-1" />
                Copy All Details
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onClose}
            className="text-xs"
          >
            Got it, Done
          </Button>
        </div>
      </div>
    </div>
  );
}
