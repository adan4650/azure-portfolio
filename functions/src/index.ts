import { app } from '@azure/functions'
import { handleContact } from './contact.js'
import { saveContact, listSubmissions } from './storage.js'
import { verifyTurnstile } from './turnstile.js'
import { handleAccount } from './account.js'
import { handleSubmissions } from './inbox.js'

// Stream requests so the handler can enforce its byte limit.
app.setup({ enableHttpStream: true })
app.http('contact', {
  // Explicit /api routes avoid the host's reserved "admin" template prefix.
  route: 'api/contact',
  methods: ['POST'],
  // No Function key is required. Keep SWA (Linked) authentication enabled
  // in Azure to block direct access to the Function.
  authLevel: 'anonymous',
  // Connect the handler to its services.
  handler: (request, context) => handleContact(request, {
    verify: verifyTurnstile,
    save: saveContact,
    // Log codes and invocation IDs only, never personal data or tokens.
    report: code => context.warn('contact_failure', { code, invocationId: context.invocationId }),
  }),
})

app.http('account', {
  route: 'api/account', methods: ['GET'], authLevel: 'anonymous',
  handler: request => handleAccount(request),
})

app.http('submissions', {
  route: 'api/admin/submissions', methods: ['GET'], authLevel: 'anonymous',
  handler: (request, context) => handleSubmissions(request, {
    list: cursor => listSubmissions(cursor),
    report: code => context.warn('inbox_failure', { code, invocationId: context.invocationId }),
  }),
})
