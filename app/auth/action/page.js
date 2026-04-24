"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { useFirebaseBootstrapVersion } from "../../../hooks/useFirebaseBootstrapVersion";
import { formatFirebaseAuthError } from "../../../lib/firebaseAuthErrors";
import { PASSWORD_RULES_HINT, validatePasswordForSignup } from "../../../lib/passwordRules";

function AuthActionInner() {
  const params = useSearchParams();
  useFirebaseBootstrapVersion();

  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accountEmail, setAccountEmail] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!auth) return;
    if (!mode || !oobCode) {
      setError("This link is missing required parameters. Try the link in your email again.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        if (mode === "resetPassword") {
          const email = await verifyPasswordResetCode(auth, oobCode);
          if (cancelled) return;
          setAccountEmail(email);
          setLoading(false);
          return;
        }

        if (mode === "verifyEmail") {
          const info = await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);
          if (cancelled) return;
          setAccountEmail(info?.data?.email || "");
          setSuccess(
            "Your email is verified. You can now post and use all features.",
          );
          setLoading(false);
          return;
        }

        if (mode === "verifyAndChangeEmail") {
          const info = await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);
          if (cancelled) return;
          setAccountEmail(info?.data?.email || "");
          setSuccess(
            "Your new email is confirmed. Sign in again with the new address.",
          );
          setLoading(false);
          return;
        }

        if (mode === "recoverEmail") {
          const info = await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);
          if (cancelled) return;
          setAccountEmail(info?.data?.email || "");
          setSuccess(
            "Your email has been restored. If you did not request this, change your password immediately.",
          );
          setLoading(false);
          return;
        }

        setError(`Unsupported action (mode: ${mode}).`);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(formatFirebaseAuthError(err));
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [mode, oobCode]);

  async function handleResetSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!auth || !oobCode) return;
    const rules = validatePasswordForSignup(password);
    if (!rules.ok) {
      setError(rules.message);
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(
        "Password reset. Sign in with your new password.",
      );
      setPassword("");
      setPasswordConfirm("");
    } catch (err) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  function renderBody() {
    if (loading) {
      return <p className="mt-4 text-sm text-neutral-500">Checking your link…</p>;
    }

    if (error) {
      return (
        <>
          <div className="mt-3 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50/90 p-3 text-xs text-red-900">
            {error}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/login" className="app-btn-primary text-center no-underline">
              Back to sign in
            </Link>
            <Link
              href="/forgot-password"
              className="app-mode-btn text-center no-underline"
            >
              Request a new reset link
            </Link>
          </div>
        </>
      );
    }

    if (success) {
      return (
        <>
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 text-sm text-emerald-900">
            {success}
            {accountEmail ? (
              <>
                <br />
                <span className="font-mono text-xs">{accountEmail}</span>
              </>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/login" className="app-btn-primary text-center no-underline">
              Go to sign in
            </Link>
            <Link href="/profile" className="app-mode-btn text-center no-underline">
              Back to Profile
            </Link>
          </div>
        </>
      );
    }

    if (mode === "resetPassword") {
      return (
        <>
          <p className="mt-2 text-sm text-neutral-600">
            Resetting the password for{" "}
            <span className="font-mono text-neutral-900">{accountEmail}</span>.
          </p>
          <form onSubmit={handleResetSubmit} className="mt-4 flex flex-col gap-2">
            <label className="app-label mb-0">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span>New password</span>
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="app-input"
                required
              />
            </label>
            <label className="app-label mb-0">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span>Confirm new password</span>
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800"
                  onClick={() => setShowPasswordConfirm((v) => !v)}
                >
                  {showPasswordConfirm ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPasswordConfirm ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                className="app-input"
                required
              />
            </label>
            <p className="text-xs text-neutral-500">{PASSWORD_RULES_HINT}</p>
            <button
              type="submit"
              disabled={busy}
              className="app-btn-primary disabled:opacity-60"
            >
              {busy ? "Updating…" : "Set new password"}
            </button>
          </form>
        </>
      );
    }

    return <p className="mt-4 text-sm text-neutral-500">Done.</p>;
  }

  const title =
    mode === "resetPassword"
      ? "Reset password"
      : mode === "verifyEmail"
      ? "Verify email"
      : mode === "verifyAndChangeEmail"
      ? "Confirm new email"
      : mode === "recoverEmail"
      ? "Recover email"
      : "Account action";

  return (
    <main className="app-shell">
      <h1 className="app-title">{title}</h1>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {renderBody()}
      </div>
    </main>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell">
          <h1 className="app-title">Account action</h1>
          <p className="mt-4 text-sm text-neutral-500">Loading…</p>
        </main>
      }
    >
      <AuthActionInner />
    </Suspense>
  );
}
