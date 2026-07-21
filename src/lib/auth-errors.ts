import { AuthError } from "@supabase/supabase-js";

export function friendlyAuthError(error: unknown): string {
  if (error instanceof AuthError) {
    const message = error.message.toLowerCase();

    if (message.includes("invalid login credentials")) {
      return "That email and password don't match. Check them and try again.";
    }
    if (message.includes("already registered")) {
      return "An account with this email already exists. Try signing in instead.";
    }
    if (message.includes("rate limit") || error.status === 429) {
      return "Too many attempts. Wait a minute, then try again.";
    }
    if (message.includes("email not confirmed")) {
      return "Confirm your email first — check your inbox for the link we sent.";
    }
    if (
      message.includes("unable to validate email") ||
      message.includes("invalid format")
    ) {
      return "That doesn't look like a valid email address.";
    }
    if (message.includes("password should be")) {
      return error.message;
    }
    return error.message;
  }

  if (
    error instanceof Error &&
    error.message.toLowerCase().includes("fetch")
  ) {
    return "Can't reach the server. Check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}
