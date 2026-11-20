import { authorize, hasInboxAccess, jsonReply, type ProtectedRequest, type ApiResult } from './auth.js'

export function handleAccount(request: ProtectedRequest, ownerUserId: string | undefined): ApiResult {
  const auth = authorize(request)
  if (auth.error) return auth.error
  const { userId, userDetails } = auth.principal
  return jsonReply(200, 'account', {
    user: { id: userId, details: userDetails, isAdmin: hasInboxAccess(auth.principal, ownerUserId) },
  })
}
