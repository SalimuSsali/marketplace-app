"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { formatFirebaseAuthError } from "../../lib/firebaseAuthErrors";
import { auth, db } from "../../lib/firebase";
import { useFirebaseBootstrapVersion } from "../../hooks/useFirebaseBootstrapVersion";
import { PASSWORD_RULES_HINT, validatePasswordForSignup } from "../../lib/passwordRules";
import {
  isValidEmailFormat,
  setSellerSignupMode,
  SELLER_SIGNUP_MODE,
} from "../../lib/sellerIdentity";
import { ensureUserDoc } from "../../lib/ensureUserDoc";

const AUTH_MISSING_ALERT =
  "Auth is not configured. Add NEXT_PUBLIC_FIREBASE_* keys from Firebase Console (see .env.example) to .env.local or Vercel, then restart / redeploy.";

export default function ProfilePage() {
  const fbBoot = useFirebaseBootstrapVersion();
  const [authUser, setAuthUser] = useState(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailPasswordConfirm, setEmailPasswordConfirm] = useState("");
  const [emailTab, setEmailTab] = useState("signup");
  const [authBusy, setAuthBusy] = useState(false);
  const [authFormError, setAuthFormError] = useState(null);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordConfirm, setShowSignupPasswordConfirm] =
    useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);

  const [verificationNotice, setVerificationNotice] = useState(null);
  const [verificationBusy, setVerificationBusy] = useState(false);

  const [settingsTab, setSettingsTab] = useState(null);
  const [settingsMessage, setSettingsMessage] = useState(null);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNewConfirm, setPwNewConfirm] = useState("");
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwNewConfirm, setShowPwNewConfirm] = useState(false);

  const [newEmailDraft, setNewEmailDraft] = useState("");
  const [newEmailPw, setNewEmailPw] = useState("");
  const [showNewEmailPw, setShowNewEmailPw] = useState(false);

  useEffect(() => {
    setShowSignupPassword(false);
    setShowSignupPasswordConfirm(false);
    setShowSigninPassword(false);
  }, [emailTab]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUser(u);
      if (u) setAuthFormError(null);
    });
    return () => unsub();
  }, [fbBoot]);

  async function handleSignOut() {
    if (!auth) return;
    setAuthBusy(true);
    try {
      await signOut(auth);
    } catch (err) {
      alert(formatFirebaseAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleEmailSignup(e) {
    e.preventDefault();
    if (!auth) {
      setAuthFormError(AUTH_MISSING_ALERT);
      return;
    }
    const email = emailDraft.trim();
    if (!email) {
      alert("Enter your email.");
      return;
    }
    if (!isValidEmailFormat(email)) {
      alert("Please enter a valid email.");
      return;
    }
    const pwCheck = validatePasswordForSignup(emailPassword);
    if (!pwCheck.ok) {
      alert(pwCheck.message);
      return;
    }
    if (emailPassword !== emailPasswordConfirm) {
      alert("Passwords do not match. Re-enter both password fields.");
      return;
    }
    setAuthFormError(null);
    setAuthBusy(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, emailPassword);
      try {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        await sendEmailVerification(
          res.user,
          origin ? { url: `${origin}/profile`, handleCodeInApp: false } : undefined,
        );
        setVerificationNotice(
          `We sent a verification link to ${email}. Open it to confirm your account.`,
        );
      } catch (verr) {
        console.warn("[auth] sendEmailVerification failed", verr);
      }
      const ensured = await ensureUserDoc(db, res?.user || null);
      if (!ensured.ok) {
        setAuthFormError(
          `Account created, but could not initialize user profile.\n\n${ensured.error}`,
        );
        return;
      }
      setSellerSignupMode(SELLER_SIGNUP_MODE.EMAIL);
      setEmailPassword("");
      setEmailPasswordConfirm("");
    } catch (err) {
      const text = formatFirebaseAuthError(err);
      setAuthFormError(text);
      alert(text);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleEmailSignin(e) {
    e.preventDefault();
    if (!auth) {
      setAuthFormError(AUTH_MISSING_ALERT);
      return;
    }
    const email = emailDraft.trim();
    if (!email) {
      alert("Enter your email.");
      return;
    }
    if (!isValidEmailFormat(email)) {
      alert("Please enter a valid email.");
      return;
    }
    if (!emailPassword) {
      alert("Enter your password.");
      return;
    }
    setAuthFormError(null);
    setAuthBusy(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, emailPassword);
      const ensured = await ensureUserDoc(db, res?.user || null);
      if (!ensured.ok) {
        setAuthFormError(
          `Signed in, but could not initialize user profile.\n\n${ensured.error}`,
        );
        return;
      }
      setSellerSignupMode(SELLER_SIGNUP_MODE.EMAIL);
      setEmailPassword("");
      setEmailPasswordConfirm("");
    } catch (err) {
      const text = formatFirebaseAuthError(err);
      setAuthFormError(text);
      alert(text);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handlePasswordReset() {
    if (!auth) {
      setAuthFormError(AUTH_MISSING_ALERT);
      return;
    }
    const email = emailDraft.trim();
    if (!email) {
      alert("Enter your email first, then tap Forgot password.");
      return;
    }
    if (!isValidEmailFormat(email)) {
      alert("Please enter a valid email.");
      return;
    }
    setAuthFormError(null);
    setAuthBusy(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await sendPasswordResetEmail(
        auth,
        email,
        origin
          ? {
              url: `${origin}/profile`,
              handleCodeInApp: false,
            }
          : undefined,
      );
      alert(
        "If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.",
      );
    } catch (err) {
      const text = formatFirebaseAuthError(err);
      setAuthFormError(text);
      alert(text);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleResendVerification() {
    if (!auth?.currentUser) return;
    setVerificationBusy(true);
    setVerificationNotice(null);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await sendEmailVerification(
        auth.currentUser,
        origin ? { url: `${origin}/profile`, handleCodeInApp: false } : undefined,
      );
      setVerificationNotice(
        `Verification link sent to ${auth.currentUser.email}. Check your inbox (and spam).`,
      );
    } catch (err) {
      setVerificationNotice(formatFirebaseAuthError(err));
    } finally {
      setVerificationBusy(false);
    }
  }

  function resetSettingsFeedback() {
    setSettingsMessage(null);
    setSettingsError(null);
  }

  async function reauthenticateCurrentUser(currentPassword) {
    if (!auth?.currentUser?.email) {
      throw Object.assign(new Error("Not signed in."), {
        code: "auth/no-current-user",
      });
    }
    const cred = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword,
    );
    await reauthenticateWithCredential(auth.currentUser, cred);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    resetSettingsFeedback();
    if (!auth?.currentUser) {
      setSettingsError(AUTH_MISSING_ALERT);
      return;
    }
    if (!pwCurrent) {
      setSettingsError("Enter your current password.");
      return;
    }
    const rules = validatePasswordForSignup(pwNew);
    if (!rules.ok) {
      setSettingsError(rules.message);
      return;
    }
    if (pwNew !== pwNewConfirm) {
      setSettingsError("New passwords do not match.");
      return;
    }
    if (pwNew === pwCurrent) {
      setSettingsError("New password must differ from current password.");
      return;
    }
    setSettingsBusy(true);
    try {
      await reauthenticateCurrentUser(pwCurrent);
      await updatePassword(auth.currentUser, pwNew);
      setPwCurrent("");
      setPwNew("");
      setPwNewConfirm("");
      setSettingsMessage("Password updated. Use the new password next time you sign in.");
    } catch (err) {
      setSettingsError(formatFirebaseAuthError(err));
    } finally {
      setSettingsBusy(false);
    }
  }

  async function handleChangeEmail(e) {
    e.preventDefault();
    resetSettingsFeedback();
    if (!auth?.currentUser) {
      setSettingsError(AUTH_MISSING_ALERT);
      return;
    }
    const nextEmail = newEmailDraft.trim();
    if (!isValidEmailFormat(nextEmail)) {
      setSettingsError("Enter a valid new email address.");
      return;
    }
    if (
      auth.currentUser.email &&
      nextEmail.toLowerCase() === auth.currentUser.email.toLowerCase()
    ) {
      setSettingsError("That is already your current email.");
      return;
    }
    if (!newEmailPw) {
      setSettingsError("Enter your current password to confirm.");
      return;
    }
    setSettingsBusy(true);
    try {
      await reauthenticateCurrentUser(newEmailPw);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await verifyBeforeUpdateEmail(
        auth.currentUser,
        nextEmail,
        origin ? { url: `${origin}/profile`, handleCodeInApp: false } : undefined,
      );
      setNewEmailDraft("");
      setNewEmailPw("");
      setSettingsMessage(
        `Verification link sent to ${nextEmail}. Open it to finish switching your email. Your current email stays active until you confirm.`,
      );
    } catch (err) {
      setSettingsError(formatFirebaseAuthError(err));
    } finally {
      setSettingsBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">Profile</h1>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-neutral-900">Guest &amp; account</p>
        <p className="mt-1 text-sm text-neutral-600">
          Browse without signing in. To post, create an account (or sign in) with your{" "}
          <strong>email &amp; password</strong>.
        </p>
        {!auth ? (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-xs text-red-950">
            <p className="font-semibold">Auth is not configured in this build</p>
            <p className="mt-1">
              Firebase Web SDK never started because required{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">
                NEXT_PUBLIC_FIREBASE_*
              </code>{" "}
              variables are missing or empty (see <code className="font-mono text-[11px]">.env.example</code>
              ). This is separate from “Google” toggles in Firebase—without these keys, every sign-in
              button will fail.
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>
                <strong>Firebase Console</strong> → your project →{" "}
                <strong>Project settings</strong> (gear) → <strong>Your apps</strong> → Web (
                <code className="font-mono text-[11px]">&lt;/&gt;</code>) → copy the{" "}
                <code className="font-mono text-[11px]">firebaseConfig</code> object.
              </li>
              <li>
                Put matching values in <code className="font-mono text-[11px]">.env.local</code>{" "}
                locally, then <strong>restart</strong> the dev server.
              </li>
              <li>
                On <strong>Vercel</strong> → Project → Environment Variables → add the same{" "}
                <code className="font-mono text-[11px]">NEXT_PUBLIC_FIREBASE_*</code> keys for{" "}
                <strong>Production</strong> → <strong>Redeploy</strong>.
              </li>
              <li>
                Then enable <strong>Authentication</strong> → <strong>Sign-in method</strong> →{" "}
                <strong>Google</strong> → On; under <strong>Settings</strong> →{" "}
                <strong>Authorized domains</strong>, add your site host (e.g.{" "}
                <code className="font-mono text-[11px]">localhost</code>,{" "}
                <code className="font-mono text-[11px]">marketplace-app-43621.vercel.app</code>).
              </li>
            </ol>
          </div>
        ) : null}
        {authUser ? (
          <p className="mt-2 text-xs text-emerald-700">
            Signed in — new posts use <span className="font-medium">{authUser.email}</span>.
          </p>
        ) : null}

        {authFormError ? (
          <div className="mt-3 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50/90 p-3 text-xs text-red-900">
            {authFormError}
            <button
              type="button"
              onClick={() => setAuthFormError(null)}
              className="mt-2 block text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {authUser ? (
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-neutral-700">
                  Signed in as{" "}
                  <span className="font-semibold text-neutral-900">{authUser.email}</span>
                  {authUser.emailVerified ? (
                    <span className="ml-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Verified
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Not verified
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={authBusy}
                  className="self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-gray-50 disabled:opacity-60 sm:self-auto"
                >
                  Sign out
                </button>
              </div>

              {!authUser.emailVerified ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950">
                  <p className="font-semibold">Verify your email</p>
                  <p className="mt-1">
                    We sent a verification link to{" "}
                    <span className="font-mono">{authUser.email}</span>. Open it to confirm
                    your account. Didn&apos;t get it?
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={verificationBusy}
                    className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                  >
                    {verificationBusy ? "Sending…" : "Resend verification email"}
                  </button>
                  {verificationNotice ? (
                    <p className="mt-2 rounded bg-white px-2 py-1 text-[11px] text-amber-900">
                      {verificationNotice}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-lg border border-dashed border-gray-300 bg-neutral-50/80 p-3">
                <p className="text-sm font-semibold text-neutral-900">Account settings</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetSettingsFeedback();
                      setSettingsTab(settingsTab === "password" ? null : "password");
                    }}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                      settingsTab === "password"
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 bg-white text-neutral-800"
                    }`}
                  >
                    Change password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetSettingsFeedback();
                      setSettingsTab(settingsTab === "email" ? null : "email");
                    }}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                      settingsTab === "email"
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 bg-white text-neutral-800"
                    }`}
                  >
                    Change email
                  </button>
                </div>

                {settingsMessage ? (
                  <p className="mt-2 whitespace-pre-wrap rounded-lg border border-emerald-200 bg-emerald-50/90 p-2 text-xs text-emerald-900">
                    {settingsMessage}
                  </p>
                ) : null}
                {settingsError ? (
                  <p className="mt-2 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50/90 p-2 text-xs text-red-900">
                    {settingsError}
                  </p>
                ) : null}

                {settingsTab === "password" ? (
                  <form onSubmit={handleChangePassword} className="mt-3 flex flex-col gap-2">
                    <label className="app-label mb-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span>Current password</span>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800"
                          onClick={() => setShowPwCurrent((v) => !v)}
                        >
                          {showPwCurrent ? "Hide" : "Show"}
                        </button>
                      </div>
                      <input
                        type={showPwCurrent ? "text" : "password"}
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                        autoComplete="current-password"
                        className="app-input"
                      />
                    </label>
                    <label className="app-label mb-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span>New password</span>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800"
                          onClick={() => setShowPwNew((v) => !v)}
                        >
                          {showPwNew ? "Hide" : "Show"}
                        </button>
                      </div>
                      <input
                        type={showPwNew ? "text" : "password"}
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        autoComplete="new-password"
                        className="app-input"
                      />
                    </label>
                    <label className="app-label mb-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span>Confirm new password</span>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800"
                          onClick={() => setShowPwNewConfirm((v) => !v)}
                        >
                          {showPwNewConfirm ? "Hide" : "Show"}
                        </button>
                      </div>
                      <input
                        type={showPwNewConfirm ? "text" : "password"}
                        value={pwNewConfirm}
                        onChange={(e) => setPwNewConfirm(e.target.value)}
                        autoComplete="new-password"
                        className="app-input"
                      />
                    </label>
                    <p className="text-xs text-neutral-500">{PASSWORD_RULES_HINT}</p>
                    <button
                      type="submit"
                      disabled={settingsBusy}
                      className="app-btn-primary disabled:opacity-60"
                    >
                      {settingsBusy ? "Updating…" : "Update password"}
                    </button>
                  </form>
                ) : null}

                {settingsTab === "email" ? (
                  <form onSubmit={handleChangeEmail} className="mt-3 flex flex-col gap-2">
                    <label className="app-label mb-0">
                      New email
                      <input
                        type="email"
                        value={newEmailDraft}
                        onChange={(e) => setNewEmailDraft(e.target.value)}
                        autoComplete="email"
                        placeholder="new@example.com"
                        className="app-input"
                      />
                    </label>
                    <label className="app-label mb-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span>Current password</span>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800"
                          onClick={() => setShowNewEmailPw((v) => !v)}
                        >
                          {showNewEmailPw ? "Hide" : "Show"}
                        </button>
                      </div>
                      <input
                        type={showNewEmailPw ? "text" : "password"}
                        value={newEmailPw}
                        onChange={(e) => setNewEmailPw(e.target.value)}
                        autoComplete="current-password"
                        className="app-input"
                      />
                    </label>
                    <p className="text-xs text-neutral-500">
                      We&apos;ll send a verification link to the new address. Your current
                      email stays active until you open that link.
                    </p>
                    <button
                      type="submit"
                      disabled={settingsBusy}
                      className="app-btn-primary disabled:opacity-60"
                    >
                      {settingsBusy ? "Sending…" : "Send verification link"}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : null}

          {!authUser ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-3">
              <p className="text-sm font-semibold text-neutral-900">Email &amp; password</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEmailTab("signup")}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                    emailTab === "signup"
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 bg-white text-neutral-800"
                  }`}
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTab("signin")}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                    emailTab === "signin"
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 bg-white text-neutral-800"
                  }`}
                >
                  Sign in
                </button>
              </div>

              {emailTab === "signup" ? (
                <form onSubmit={handleEmailSignup} className="flex flex-col gap-2">
                  <label className="app-label mb-0">
                    Email
                    <input
                      type="email"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="app-input"
                    />
                  </label>
                  <label className="app-label mb-0">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span>Password</span>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800"
                        onClick={() => setShowSignupPassword((v) => !v)}
                        aria-pressed={showSignupPassword}
                        aria-label={
                          showSignupPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showSignupPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Choose a password"
                      className="app-input"
                    />
                  </label>
                  <label className="app-label mb-0">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span>Confirm password</span>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800"
                        onClick={() => setShowSignupPasswordConfirm((v) => !v)}
                        aria-pressed={showSignupPasswordConfirm}
                        aria-label={
                          showSignupPasswordConfirm
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showSignupPasswordConfirm ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showSignupPasswordConfirm ? "text" : "password"}
                      value={emailPasswordConfirm}
                      onChange={(e) => setEmailPasswordConfirm(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Same password again"
                      className="app-input"
                    />
                  </label>
                  <p className="text-xs text-neutral-500">{PASSWORD_RULES_HINT}</p>
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="app-btn-primary disabled:opacity-60"
                  >
                    {authBusy ? "Please wait…" : "Create account"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleEmailSignin} className="flex flex-col gap-2">
                  <label className="app-label mb-0">
                    Email
                    <input
                      type="email"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="app-input"
                    />
                  </label>
                  <label className="app-label mb-0">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span>Password</span>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800"
                        onClick={() => setShowSigninPassword((v) => !v)}
                        aria-pressed={showSigninPassword}
                        aria-label={
                          showSigninPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showSigninPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showSigninPassword ? "text" : "password"}
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Your password"
                      className="app-input"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={authBusy}
                    className="self-start text-sm font-semibold text-blue-700 underline decoration-blue-700/50 hover:text-blue-800 disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="app-btn-primary disabled:opacity-60"
                  >
                    {authBusy ? "Please wait…" : "Sign in"}
                  </button>
                </form>
              )}
            </div>
          ) : null}

        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-neutral-900">Ratings &amp; Reviews</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Open any item to read reviews and submit your own (name + star rating + optional
          comment).
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Link href="/items" className="app-btn-primary no-underline">
          Browse Items
        </Link>
        <Link href="/add" className="app-mode-btn text-center no-underline">
          Post an Ad
        </Link>
      </div>
    </main>
  );
}
