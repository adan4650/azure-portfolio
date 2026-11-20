export type Principal = {
  identityProvider: 'aad'
  userId: string
  userDetails: string
  userRoles: string[]
}

export type ProtectedRequest = {
  method: string
  headers: Pick<Headers, 'get'>
  url: string
}

export type ApiResult = {
  status: number
  headers: Record<string, string>
  jsonBody: Record<string, unknown>
}

export function jsonReply(status: number, code: string, data: Record<string, unknown> = {}): ApiResult {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    jsonBody: { code, ...data },
  }
}

export function decodeBase64Json(value: string, maxLength: number): unknown {
  if (!value || value.length > maxLength || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('Invalid encoding')
  const bytes = Buffer.from(value, 'base64')
  if (bytes.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')) throw new Error('Invalid encoding')
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

// Trust this header only behind the enabled SWA (Linked) authentication provider.
// Decoding Base64 does not authenticate a direct caller.
export function readPrincipal(headers: Pick<Headers, 'get'>): Principal | null {
  try {
    const value = decodeBase64Json(headers.get('x-ms-client-principal') ?? '', 16384)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const principal = value as Record<string, unknown>
    if (principal.identityProvider !== 'aad'
      || typeof principal.userId !== 'string' || !principal.userId.trim() || principal.userId.length > 256
      || typeof principal.userDetails !== 'string' || !principal.userDetails.trim() || principal.userDetails.length > 1024
      || !Array.isArray(principal.userRoles) || principal.userRoles.length > 64
      || !principal.userRoles.every(role => typeof role === 'string' && role.length <= 128)
      || !principal.userRoles.includes('authenticated')) return null
    return principal as Principal
  } catch { return null }
}

export function authorize(request: ProtectedRequest, role: 'authenticated' | 'site_admin'):
  { principal: Principal; error?: never } | { principal?: never; error: ApiResult } {
  const principal = readPrincipal(request.headers)
  if (!principal) return { error: jsonReply(401, 'unauthorized') }
  if (!principal.userRoles.includes(role)) return { error: jsonReply(403, 'forbidden') }
  if (request.method !== 'GET') {
    const error = jsonReply(405, 'method_not_allowed')
    error.headers.Allow = 'GET'
    return { error }
  }
  return { principal }
}
