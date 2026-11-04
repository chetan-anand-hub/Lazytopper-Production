/**
 * EMAIL-CODE-1 - the ONE reader of the client switch VITE_EMAIL_CODE_SIGNIN_ENABLED ("sign in with a 6-digit code from
 * email", typed on the same screen). Import-free on purpose, so Login and the thank-you screen can follow the flag without
 * pulling the sign-in code into their chunks. The server has its own switch (EMAIL_CODE_SIGNIN_ENABLED); BOTH are needed.
 * Off -> every screen exactly as before.
 */
export function isEmailCodeSigninClientEnabled(): boolean {
  try {
    // A literal `import.meta.env.VITE_…` expression, so Vite and Vitest both rewrite it.
    const raw: unknown = import.meta.env.VITE_EMAIL_CODE_SIGNIN_ENABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}
