export async function verifyTurnstile(token: string, env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY
  const hostnames = env.TURNSTILE_HOSTNAMES?.split(',').map(value => value.trim()).filter(Boolean)
  if (!secret || !hostnames?.length) throw new Error('Turnstile is not configured')
  const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error('Verification unavailable')
  const result = await response.json() as { success?: unknown; hostname?: unknown; action?: unknown }
  return result.success === true && typeof result.hostname === 'string' && hostnames.includes(result.hostname) && result.action === 'contact'
}
