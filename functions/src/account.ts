import { authorize, jsonReply, type ProtectedRequest, type ApiResult } from './auth.js'

export function handleAccount(request: ProtectedRequest): ApiResult {
  const auth = authorize(request, 'authenticated')
  if (auth.error) return auth.error
  const { userId, userDetails, userRoles } = auth.principal
  return jsonReply(200, 'account', {
    user: { id: userId, details: userDetails, isAdmin: userRoles.includes('site_admin') },
  })
}
