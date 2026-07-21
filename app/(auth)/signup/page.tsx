"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { friendlyAuthError } from "@/src/lib/auth-errors";
import { Button } from "@/src/components/ui/button";
import { TextField } from "@/src/components/ui/text-field";

const MIN_PASSWORD_LENGTH = 6;

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    let valid = true;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(
        `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
      );
      valid = false;
    }
    if (confirm !== password) {
      setConfirmError("Passwords don't match.");
      valid = false;
    }
    if (!valid) return;

    setSubmitting(true);
    const trimmedEmail = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (error) {
      setFormError(friendlyAuthError(error));
      setSubmitting(false);
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      return;
    }

    // Email confirmation is enabled — no session until the link is opened.
    setSentTo(trimmedEmail);
    setSubmitting(false);
  }

  if (sentTo) {
    return (
      <div className="animate-rise text-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
          Check your inbox
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          We sent a confirmation link to{" "}
          <span className="font-medium text-ink">{sentTo}</span>. Open it to
          activate your account, then sign in.
        </p>
        <p className="mt-8 text-[14px] text-muted">
          <Link
            href="/login"
            className="font-medium text-accent transition-colors duration-150 ease-out hover:text-ink"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-[-0.02em] text-ink">
        Create your account
      </h1>
      <p className="mt-2 text-center text-[15px] text-muted">
        Start building your edge, one trade at a time.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          hint={
            passwordError
              ? undefined
              : `At least ${MIN_PASSWORD_LENGTH} characters.`
          }
          error={passwordError ?? undefined}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError(null);
          }}
        />
        <TextField
          label="Confirm password"
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          required
          error={confirmError ?? undefined}
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (confirmError) setConfirmError(null);
          }}
        />

        {formError && (
          <p
            role="alert"
            className="animate-fade text-[13px] leading-relaxed text-danger"
          >
            {formError}
          </p>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-[14px] text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-accent transition-colors duration-150 ease-out hover:text-ink"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
