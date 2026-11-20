// Return false for rejected tokens; throw when verification is unavailable.
export async function verifyTurnstile(token: string, env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch): Promise<boolean> {
  // Keep the secret on the server; only the site key goes to the browser.
  const secret = env.TURNSTILE_SECRET_KEY
  // Exact hostnames only: no schemes, paths, or wildcards.
  const hostnames = env.TURNSTILE_HOSTNAMES?.split(',').map(value => value.trim()).filter(Boolean)
  // Reject requests if verification is not configured.
  if (!secret || !hostnames?.length) throw new Error('Turnstile is not configured')
  // Verify the short-lived, single-use token with Cloudflare.
  const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
    // Leave time for the storage write.
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error('Verification unavailable')
  const result = await response.json() as { success?: unknown; hostname?: unknown; action?: unknown }
  // Require a valid token for this site and the contact action.
  return result.success === true && typeof result.hostname === 'string' && hostnames.includes(result.hostname) && result.action === 'contact'
}
