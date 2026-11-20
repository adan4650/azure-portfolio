import { authorize, decodeBase64Json, jsonReply, type ProtectedRequest, type ApiResult } from './auth.js'

export const INBOX_PAGE_SIZE = 20
export type Submission = { id: string; name: string; email: string; message: string; submittedAt: string; status: string }
export type SubmissionPage = { submissions: Submission[]; nextCursor: string | null }
type Dependencies = { list: (cursor?: string) => Promise<SubmissionPage>; report: (code: 'submissions_unavailable') => void }

// The cursor is opaque paging state, never a filter or an authorization token.
export function validateCursor(cursor: string): void {
  const value = decodeBase64Json(cursor, 4096)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid cursor')
  const token = value as Record<string, unknown>
  if (Object.keys(token).some(key => key !== 'nextPartitionKey' && key !== 'nextRowKey')
    || typeof token.nextPartitionKey !== 'string' || !token.nextPartitionKey || token.nextPartitionKey.length > 2048
    || (token.nextRowKey !== undefined && (typeof token.nextRowKey !== 'string' || token.nextRowKey.length > 2048))) {
    throw new Error('Invalid cursor')
  }
}

export async function handleSubmissions(request: ProtectedRequest, deps: Dependencies): Promise<ApiResult> {
  // Check the role before parsing paging state or touching storage.
  const auth = authorize(request, 'site_admin')
  if (auth.error) return auth.error
  let cursor: string | undefined
  try {
    const query = new URL(request.url).searchParams
    if ([...query.keys()].some(key => key !== 'cursor') || query.getAll('cursor').length > 1) throw new Error('Invalid query')
    cursor = query.get('cursor') ?? undefined
    if (cursor !== undefined) validateCursor(cursor)
  } catch { return jsonReply(400, 'invalid_cursor') }
  try {
    const page = await deps.list(cursor)
    return jsonReply(200, 'submissions', { ...page, pageSize: INBOX_PAGE_SIZE })
  } catch {
    deps.report('submissions_unavailable')
    return jsonReply(503, 'temporarily_unavailable')
  }
}
