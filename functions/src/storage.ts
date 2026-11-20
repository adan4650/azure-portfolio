import { randomUUID } from 'node:crypto'
import { TableClient, type TableEntityResultPage } from '@azure/data-tables'
import { AzureCliCredential, ManagedIdentityCredential } from '@azure/identity'
import type { Contact } from './contact.js'
import { INBOX_PAGE_SIZE, type SubmissionPage } from './inbox.js'

// Reuse the client within each Function process.
let client: TableClient | undefined

// Managed identity is the default; local settings explicitly enable Azure CLI.
export function contactStorageCredential(env: NodeJS.ProcessEnv = process.env) {
  return env.CONTACT_STORAGE_USE_AZURE_CLI === 'true'
    ? new AzureCliCredential()
    : new ManagedIdentityCredential()
}

// Build an entity identified by its partition and row keys.
export function submissionEntity(contact: Contact, now = new Date(), id = randomUUID()) {
  return {
    // A single partition suits this small inbox.
    partitionKey: 'inbox',
    // Padded reverse timestamps sort newest first; UUIDs prevent key collisions.
    rowKey: `${String(9999999999999 - now.getTime()).padStart(13, '0')}_${id}`,
    ...contact,
    submittedAt: now.toISOString(),
    status: 'new',
  }
}

function tableClient(): TableClient {
  if (!client) {
    // Use the separate contact account's HTTPS Table endpoint.
    const endpoint = process.env.CONTACT_TABLE_ENDPOINT
    if (!endpoint || !/^https:\/\/[a-z0-9]{3,24}\.table\.core\.windows\.net\/?$/.test(endpoint)) throw new Error('Contact storage is not configured')
    // The selected identity needs table-scoped access.
    const credential = contactStorageCredential()
    // Disable retries to keep requests short.
    client = new TableClient(endpoint, 'ContactSubmissions', credential, { retryOptions: { maxRetries: 0 } })
  }
  return client
}

export async function saveContact(contact: Contact): Promise<void> {
  // Insert into the pre-created table; errors propagate to the handler.
  // A write may succeed before a timeout, so a form retry can create a duplicate.
  await tableClient().createEntity(submissionEntity(contact), { abortSignal: AbortSignal.timeout(8000) })
}

export async function listSubmissions(cursor?: string, client: Pick<TableClient, 'listEntities'> = tableClient()): Promise<SubmissionPage> {
  // Keep the partition/filter fixed, even when the caller supplies a cursor.
  const pages = client.listEntities<Contact & { submittedAt: string; status: string }>({
    queryOptions: {
      filter: "PartitionKey eq 'inbox'",
      select: ['RowKey', 'name', 'email', 'message', 'submittedAt', 'status'],
    },
    abortSignal: AbortSignal.timeout(8000),
  }).byPage({ maxPageSize: INBOX_PAGE_SIZE, continuationToken: cursor })
  const result = await pages.next()
  if (result.done || !result.value) return { submissions: [], nextCursor: null }
  const value: TableEntityResultPage<Contact & { submittedAt: string; status: string }> = result.value
  const submissions = value.map(entity => {
    if (![entity.rowKey, entity.name, entity.email, entity.message, entity.submittedAt, entity.status].every(field => typeof field === 'string')) {
      throw new Error('Invalid stored submission')
    }
    return { id: entity.rowKey!, name: entity.name, email: entity.email, message: entity.message, submittedAt: entity.submittedAt, status: entity.status }
  })
  return { submissions, nextCursor: value.continuationToken ?? null }
}
