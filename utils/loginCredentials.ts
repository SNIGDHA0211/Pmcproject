export function normalizeLoginCredentials(username: string, password: string) {
  return {
    username: username.trim().toLowerCase(),
    password: password.trim(),
  };
}

export function getLoginFailureMessage(error: unknown, fallback = 'Invalid username or password.') {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('invalid username') || lower.includes('invalid password')) {
    return 'Invalid username or password. Usernames are lowercase (e.g. pmc_hse1, pmc_tl19). Passwords are case-sensitive (e.g. Pmc@HSE1).';
  }

  return fallback;
}
