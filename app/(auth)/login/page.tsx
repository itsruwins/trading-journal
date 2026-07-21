"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { friendlyAuthError } from "@/src/lib/auth-errors";
import { Button } from "@/src/components/ui/button";
import { TextField } from "@/src/components/ui/text-field";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setFormError(friendlyAuthError(error));
      setSubmitting(false);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-[-0.02em] text-ink">
        Welcome back
      </h1>
      <p className="mt-2 text-center text-[15px] text-muted">
        Sign in to your trading journal.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-[14px] text-muted">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-accent transition-colors duration-150 ease-out hover:text-ink"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
