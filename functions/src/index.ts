import { app } from '@azure/functions'
import { handleContact } from './contact.js'
import { saveContact } from './storage.js'
import { verifyTurnstile } from './turnstile.js'

app.setup({ enableHttpStream: true })
app.http('contact', {
  route: 'contact',
  methods: ['POST'],
  // This is the Functions key setting, not App Service Authentication.
  // Keep Azure Static Web Apps (Linked) authentication ENABLED in Azure.
  authLevel: 'anonymous',
  handler: (request, context) => handleContact(request, {
    verify: verifyTurnstile,
    save: saveContact,
    report: code => context.warn('contact_failure', { code, invocationId: context.invocationId }),
  }),
})
