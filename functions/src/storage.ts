import { randomUUID } from 'node:crypto'
import { TableClient } from '@azure/data-tables'
import { AzureCliCredential, ManagedIdentityCredential } from '@azure/identity'
import type { Contact } from './contact.js'

let client: TableClient | undefined

export function submissionEntity(contact: Contact, now = new Date(), id = randomUUID()) {
  return {
    partitionKey: 'inbox',
    rowKey: `${String(9999999999999 - now.getTime()).padStart(13, '0')}_${id}`,
    ...contact,
    submittedAt: now.toISOString(),
    status: 'new',
  }
}

export async function saveContact(contact: Contact): Promise<void> {
  if (!client) {
    const endpoint = process.env.CONTACT_TABLE_ENDPOINT
    if (!endpoint || !/^https:\/\/[a-z0-9]{3,24}\.table\.core\.windows\.net\/?$/.test(endpoint)) throw new Error('Contact storage is not configured')
    // Cloud execution never falls back to a developer login, service principal, or storage key.
    const credential = process.env.WEBSITE_INSTANCE_ID ? new ManagedIdentityCredential() : new AzureCliCredential()
    client = new TableClient(endpoint, 'ContactSubmissions', credential, { retryOptions: { maxRetries: 0 } })
  }
  // The operator creates the table. No resource creation permission is needed here.
  await client.createEntity(submissionEntity(contact), { abortSignal: AbortSignal.timeout(8000) })
}
