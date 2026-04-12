"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { formatFirebaseAuthError } from "../../lib/firebaseAuthErrors";
import { auth } from "../../lib/firebase";
import { PASSWORD_RULES_HINT, validatePasswordForSignup } from "../../lib/passwordRules";
import {
  getSellerSignupMode,
  isValidEmailFormat,
  setSellerSignupMode,
  SELLER_SIGNUP_MODE,
} from "../../lib/sellerIdentity";

export default function ProfilePage() {
  const [authUser, setAuthUser] = useState(null);
  const [signupPath, setSignupPath] = useState(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailPasswordConfirm, setEmailPasswordConfirm] = useState("");
  const [emailTab, setEmailTab] = useState("signup");
  const [authBusy, setAuthBusy] = useState(false);
  const [authFormError, setAuthFormError] = useState(null);
  const [pageHost, setPageHost] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordConfirm, setShowSignupPasswordConfirm] =
    useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);

  useEffect(() => {
    setPageHost(window.location.hostname || "");
  }, []);

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
  }, []);

  useEffect(() => {
    setSignupPath(getSellerSignupMode());
  }, []);

  /** Finish Google sign-in after signInWithRedirect (when pop-ups are blocked). */
  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    getRedirectResult(auth)
      .then((result) => {
        if (cancelled) return;
        if (result?.user) {
          setSellerSignupMode(SELLER_SIGNUP_MODE.ACCOUNT);
          setSignupPath(SELLER_SIGNUP_MODE.ACCOUNT);
          setAuthFormError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAuthFormError(formatFirebaseAuthError(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGoogleSignIn() {
    if (!auth) {
      alert("Auth is not configured.");
      return;
    }
    setAuthFormError(null);
    setAuthBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (popupErr) {
        if (popupErr?.code === "auth/popup-blocked") {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }
      setSellerSignupMode(SELLER_SIGNUP_MODE.ACCOUNT);
      setSignupPath(SELLER_SIGNUP_MODE.ACCOUNT);
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user") return;
      const text = formatFirebaseAuthError(err);
      setAuthFormError(text);
      alert(text);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleSignInFullPage() {
    if (!auth) {
      alert("Auth is not configured.");
      return;
    }
    setAuthFormError(null);
    setAuthBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (err) {
      const text = formatFirebaseAuthError(err);
      setAuthFormError(text);
      alert(text);
      setAuthBusy(false);
    }
  }

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
      alert("Auth is not configured.");
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
      await createUserWithEmailAndPassword(auth, email, emailPassword);
      setSellerSignupMode(SELLER_SIGNUP_MODE.EMAIL);
      setSignupPath(SELLER_SIGNUP_MODE.EMAIL);
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
      alert("Auth is not configured.");
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
      await signInWithEmailAndPassword(auth, email, emailPassword);
      setSellerSignupMode(SELLER_SIGNUP_MODE.EMAIL);
      setSignupPath(SELLER_SIGNUP_MODE.EMAIL);
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
      alert("Auth is not configured.");
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

  function selectEmailPath() {
    setSignupPath(SELLER_SIGNUP_MODE.EMAIL);
    setSellerSignupMode(SELLER_SIGNUP_MODE.EMAIL);
  }

  function selectAccountPath() {
    setSignupPath(SELLER_SIGNUP_MODE.ACCOUNT);
    setSellerSignupMode(SELLER_SIGNUP_MODE.ACCOUNT);
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">Profile</h1>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-neutral-900">Guest &amp; account</p>
        <p className="mt-1 text-sm text-neutral-600">
          Browse without signing in. To post, choose <strong>email &amp; password</strong> or{" "}
          <strong>Google</strong> below, then sign in.
        </p>
        {pageHost ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
            <span className="font-semibold">Google sign-in:</span> Firebase → Authentication →
            Settings → <span className="font-medium">Authorized domains</span> → Add{" "}
            <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] text-neutral-900">
              {pageHost}
            </code>
            . That fixes <code className="font-mono text-[11px]">getProjectConfig</code> 400 and
            “Unable to verify that the app domain is authorized.”
            {process.env.NODE_ENV === "development" &&
            (pageHost === "localhost" || pageHost === "127.0.0.1") ? (
              <span className="text-neutral-700">
                {" "}
                <code className="font-mono text-[11px]">127.0.0.1</code> and{" "}
                <code className="font-mono text-[11px]">localhost</code> are separate—add the one
                that matches your address bar.
              </span>
            ) : null}
          </p>
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
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="sr-only">Posting identity</legend>
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-neutral-50/80 p-3 text-sm">
                <input
                  type="radio"
                  name="seller-signup"
                  className="mt-0.5"
                  checked={signupPath === SELLER_SIGNUP_MODE.EMAIL}
                  onChange={selectEmailPath}
                />
                <span>
                  <span className="font-semibold text-neutral-900">Post with email &amp; password</span>
                  <span className="mt-0.5 block text-neutral-600">
                    Create an account with your email and a password that meets the rules, or sign
                    in if you already have one.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-neutral-50/80 p-3 text-sm">
                <input
                  type="radio"
                  name="seller-signup"
                  className="mt-0.5"
                  checked={signupPath === SELLER_SIGNUP_MODE.ACCOUNT}
                  onChange={selectAccountPath}
                />
                <span>
                  <span className="font-semibold text-neutral-900">Post with a Google account</span>
                  <span className="mt-0.5 block text-neutral-600">
                    Sign in with Google. Your listings use that account email.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {authUser ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-700">
                Signed in as{" "}
                <span className="font-semibold text-neutral-900">{authUser.email}</span>
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={authBusy}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-gray-50 disabled:opacity-60"
              >
                Sign out
              </button>
            </div>
          ) : null}

          {!authUser && signupPath === SELLER_SIGNUP_MODE.EMAIL ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-3">
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

          {!authUser && signupPath === SELLER_SIGNUP_MODE.ACCOUNT ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authBusy}
                className="app-mode-btn disabled:opacity-60"
              >
                {authBusy ? "Please wait…" : "Continue with Google"}
              </button>
              <button
                type="button"
                onClick={handleGoogleSignInFullPage}
                disabled={authBusy}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-semibold text-neutral-800 hover:bg-gray-50 disabled:opacity-60"
              >
                Sign in with Google (full page)
              </button>
              <p className="text-xs text-neutral-500">
                Use full page if you see “invalid” errors or blocked pop-ups. Allow pop-ups for
                this site if you prefer the first button.
              </p>
            </div>
          ) : null}

          {!authUser && !signupPath ? (
            <p className="text-xs text-neutral-500">
              Select an option above to set up posting.
            </p>
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
