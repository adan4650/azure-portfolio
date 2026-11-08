# Phase 1 — public form and linked Function App

This is the current phase. I am doing the Azure setup myself, and the code stays local until I choose to deploy it. The homepage, project links, videos, and existing frontend deployment remain available.

The local form and API are implemented. A successful response requires a real Table Storage write. Phase 2 creates the contact data account, table, and managed identity permissions. Until then, leave `VITE_TURNSTILE_SITE_KEY` unset in GitHub: the page explains that the form is being set up and disables sending. Do not advertise it as a working inbox yet.

## 1. Review the budget and resource names

Open **Azure portal → Cost Management + Billing → my Azure for Students subscription → Cost Management → Budgets**. Review my existing budget and alerts before adding paid resources. Budget alerts notify me; they do not stop resources automatically. Check my remaining student credit and the offer's available services in the subscription.

Use the existing `azure-portfolio` resource group where supported. Choose one region available to my subscription for the Function App and its storage. If the portal rejects the existing resource group because of hosting constraints, use a new resource group for these backend resources; the existing Static Web App does not need to move.

Suggested names (replace the suffix with a unique lowercase value):

| Resource | Suggested name | Purpose |
| --- | --- | --- |
| Function App | `func-portfolio-contact-<suffix>` | Runs the TypeScript API, compiled to JavaScript |
| Host storage | `stpfhost<suffix>` | Functions runtime state and deployment content |
| Contact storage | `stpfdata<suffix>` — **phase 2** | Private contact records, separate from runtime storage |

Storage names must be globally unique, 3–24 lowercase letters/numbers. Function names must also be globally unique. Record the actual names and region; do not record access keys or secrets in this repository.

**Cost decision:** Static Web Apps Standard adds a recurring charge; verify the actual quote for my offer in the portal. Windows Consumption has usage charges and host storage charges even when the workload is small. We will defer Front Door: its published Standard base price is USD $35/month, billed hourly, plus traffic/request charges and applicable WAF charges. Do not enable the separate SWA enterprise-grade edge add-on for this design. See [SWA pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/static/) and [Front Door pricing](https://azure.microsoft.com/en-us/pricing/details/frontdoor/).

## 2. Create the host storage account

Go to **Storage accounts → Create**:

| Setting | Value | Why |
| --- | --- | --- |
| Subscription/resource group | My student subscription / chosen project group | Keeps ownership and costs visible |
| Region | The chosen Function region | Keeps the runtime and its storage together |
| Performance / account kind | Standard, general-purpose v2 (`StorageV2`) | Supports the runtime's Blob, Queue, Table, and File services |
| Redundancy | LRS | Lower cost for this learning build; no region-level disaster recovery |
| Secure transfer / minimum TLS | Enabled / 1.2 or newer | Requires encrypted transport |
| Allow Blob anonymous access | Disabled | Prevents anonymous blob access |
| Allow storage account key access | Enabled **on this host account** | Windows Consumption content storage can depend on Azure Files connection strings |
| Public network access | Enabled | This starting plan is not using private endpoints/VNet integration |

Public network reachability does not grant data access. Do not reuse this account for contact records. In phase 2, Shared Key will be disabled on the **contact data account**, not blindly disabled on the runtime account.

**Verify:** after creation, check **Overview** for region, account kind, and LRS, then **Configuration** for HTTPS, TLS, and disabled anonymous Blob access. No public containers are needed.

## 3. Create the standalone Function App

Go to **Create a resource → Function App → Consumption → Select**. Select:

| Setting | Value | Why |
| --- | --- | --- |
| Publish | Code | This is a standalone compiled TypeScript application |
| OS | Windows | The requested starting platform |
| Runtime | Node.js 24 LTS, Functions runtime v4 | Supported runtime; matches the existing frontend CI Node major |
| Plan | Consumption, SKU Y1/Dynamic | Scales with requests; accepts cold starts to control cost |
| Region | Same region as host storage | Simplifies access and latency |
| Storage | The host account created above | Keeps runtime files separate from contact data |
| Monitoring | Defer creating Application Insights until phase 4 | We will choose one workspace deliberately; if a resource is already present, retain it and record its workspace |
| Deployment | Do not connect the frontend workflow here | The Function gets a separate deployment path |

Windows Consumption is now described as a legacy plan; it remains supported. Microsoft's preferred serverless option is Linux Flex Consumption. I am intentionally starting on Windows Consumption as requested and recording that migration tradeoff. See [hosting guidance](https://learn.microsoft.com/en-us/azure/azure-functions/consumption-plan) and [supported runtimes](https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions).

After creation, open **Settings → Configuration / General settings** and require HTTPS with TLS 1.2 or newer. Leave FTP publishing disabled. Do not add wildcard CORS origins. Requests will use the website's same-origin `/api/contact` URL.

In **Settings → Environment variables → App settings**, verify/add:

| Setting | Value |
| --- | --- |
| `FUNCTIONS_EXTENSION_VERSION` | `~4` |
| `FUNCTIONS_WORKER_RUNTIME` | `node` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~24` |
| `FUNCTIONS_REQUEST_BODY_SIZE_LIMIT` | `32768` |

Keep the platform-created host storage/content settings. The 32 KiB host limit complements the code's actual byte counting; the code does not trust `Content-Length` alone. Oversized requests can be rejected by the host before reaching our handler, so the UI also handles non-JSON failures.

**Verify:** Overview shows **Running**, Windows, and the intended plan/region. Configuration shows runtime v4/Node 24. No HTTP function appears until code is published.

## 4. Upgrade and link the existing Static Web App

When ready to link, open the existing **Static Web App → Settings → Hosting plan → Standard → Save**. Keep its existing source repository, branch, custom domains, and frontend workflow.

Open **Settings → APIs → Production → Link**. Choose **Function App**, my subscription, and the new Function App's production backend, then link it.

**Verify immediately:** open **Function App → Authentication**. The **Azure Static Web Apps (Linked)** identity provider must be present, authentication enabled, and unauthenticated direct access rejected. Do not delete that provider, allow anonymous direct access, or add another provider that broadens access. The Functions code's `authLevel: 'anonymous'` removes the need for a Function key; it does **not** mean disabling this platform authentication layer.

The frontend workflow already uses `api_location: ""` and `skip_api_build: true`; keep both. Keep the Function route prefix `/api`. Linked backends apply to production, not SWA pull-request environments, so PR builds intentionally receive no public Turnstile key. [Microsoft's linking guide](https://learn.microsoft.com/en-us/azure/static-web-apps/functions-bring-your-own) explains the integration and its authentication boundary.

## 5. Configure Turnstile

In **Cloudflare dashboard → Turnstile → Add widget**, name it for the portfolio, select **Managed**, and allow the exact production SWA hostname and any currently used public custom hostname. Do not include schemes or paths. A Cloudflare DNS migration is not required.

- The **site key** is public. Keep it ready for GitHub **Settings → Secrets and variables → Actions → Variables → `VITE_TURNSTILE_SITE_KEY`**, but leave that variable unset until phase 2 verifies a real write.
- The **secret key** belongs only in **Function App → Environment variables → `TURNSTILE_SECRET_KEY`**. Never put it in a `VITE_*` value, source control, browser code, screenshots, or chat.
- Set Function app setting **`TURNSTILE_HOSTNAMES`** to the exact allowed hostnames, comma separated, with no wildcard. Add the future Front Door hostname during phase 4.

The server requires Siteverify `success: true`, an exact allowed hostname, and `action: contact`. Tokens expire after five minutes and are single-use, so every attempted submission refreshes verification. A filled honeypot fails before Siteverify or storage. [Cloudflare validation guide](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

For local interactive tests, use a separate development widget allowing `localhost` and `127.0.0.1`; keep the production widget restricted. Dummy keys are useful for isolated tests but do not prove production hostname/action checks. The automated tests inject a verifier explicitly; deployed code has no verification bypass.

## 6. Build and publish the API separately

Install Azure CLI and Azure Functions Core Tools v4 using [Microsoft's local development instructions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local). Use Node 24 LTS and the repository's pnpm version. Azure CLI and Core Tools were not present in the agent environment during this phase; no Azure deployment has been executed.

From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm --dir functions install --ignore-workspace --frozen-lockfile
pnpm test
pnpm --dir functions test
pnpm build
```

For local Functions execution, copy `functions/local.settings.example.json` to the ignored `functions/local.settings.json`, supply the development Turnstile settings, run Azurite for the **host** storage, and run `pnpm --dir functions start`. Copy `.env.example` to the ignored `.env.local` and set only the development widget's public `VITE_TURNSTILE_SITE_KEY`. In a second terminal, run `pnpm dev` (restart after changing Vite environment settings). Vite forwards `/api` to port 7071. Local storage calls use my `az login` identity, whose table permission is a phase 2 step; Azure execution uses only the app's managed identity. Do not publish local settings.

For the initial deployment, prepare an isolated folder with ordinary dependency directories so pnpm development links are not shipped to Windows hosting:

```powershell
# Run from the repository root after the builds above.
$contactDeployPath = Join-Path $PWD ('work/contact-api-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $contactDeployPath | Out-Null
Copy-Item functions/host.json, functions/package.json, functions/pnpm-lock.yaml -Destination $contactDeployPath
Copy-Item functions/dist -Destination $contactDeployPath -Recurse
pnpm --dir $contactDeployPath install --prod --ignore-workspace --node-linker=hoisted --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'Dependency packaging failed' }

az login
az account set --subscription '<my-subscription-id>'
Push-Location $contactDeployPath
try {
  func azure functionapp publish '<my-function-app-name>' --no-build
  if ($LASTEXITCODE -ne 0) { throw 'Function publish failed' }
} finally {
  Pop-Location
}
```

Publish only to the new linked Function App. This does not deploy the frontend, create storage data, or change the existing frontend workflow. Phase 5 will replace this manual publish with a dedicated GitHub Actions workflow and a federated deployment identity. Do not turn on basic publishing authentication as a workaround for deployment errors; bring back the non-secret error first.

## 7. Verify the phase 1 boundary

Use only test data. Test against the production SWA hostname after publishing the Function:

```powershell
$siteUrl = 'https://<my-site>.azurestaticapps.net'
$functionUrl = 'https://<my-function-hostname-from-Overview>'

# Expect 400 JSON with code validation_failed, not a 200 HTML page.
$invalidBody = '{"name":"","email":"invalid","message":"","website":"","turnstileToken":""}'
Invoke-WebRequest "$siteUrl/api/contact" -Method Post -ContentType 'application/json' -Body $invalidBody -SkipHttpErrorCheck

# Expect a platform 401/403. Do not use a browser login cookie or Function key.
Invoke-WebRequest "$functionUrl/api/contact" -Method Post -ContentType 'application/json' -Body $invalidBody -SkipHttpErrorCheck

# A forged website identity must still be rejected at the Function's direct endpoint.
$fakeIdentity = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('{"identityProvider":"aad","userId":"test","userDetails":"test@example.com","userRoles":["authenticated","site_admin"]}'))
Invoke-WebRequest "$functionUrl/api/contact" -Method Post -ContentType 'application/json' -Body $invalidBody -Headers @{ 'x-ms-client-principal' = $fakeIdentity } -SkipHttpErrorCheck
```

`-SkipHttpErrorCheck` requires PowerShell 7. Record status codes, the UTC time, and the linked provider screenshot with identifiers/secrets hidden. A response from our handler (for example `validation_failed`) on the **direct** endpoint is a failed security test, even if its HTTP status is 400. Fix the linked authentication before proceeding. CORS alone does not block direct callers.

Also visit `/`, `/#projects`, and `/videos` on the existing public site. They must remain public and usable. The contact page becomes available when the frontend changes are deployed through the existing workflow; with the public key unset it stays in setup mode.

**Stop here.** Send back the non-secret resource names, region, whether the linked provider is present, and the three test status codes. Phase 2 will create `ContactSubmissions`, enable the system-assigned identity, assign table-scoped access, disable contact-account Shared Key, and verify a real anonymous submission before enabling the public form. Do not treat an expected 503 while storage is unconfigured as a completed end-to-end test.

## Local evidence and remaining tests

Verified on November 8, 2026: production frontend build; 13 backend tests; 8 frontend tests; browser inspection at desktop and mobile widths using test text. The frontend tests cover sending, success, validation, retry, duplicate-click prevention, draft retention, and non-JSON/false-success responses. API dependencies are stubbed in tests; these are not Azure authorization tests.

- [Desktop setup-state screenshot](evidence/phase-1-contact-desktop.jpg)
- [Mobile setup-state screenshot](evidence/phase-1-contact-mobile.jpg)

| Evidence still needed | Phase |
| --- | --- |
| Real Turnstile verification and durable anonymous submission | 2 |
| Managed identity write, wrong identity denied, Shared Key denied | 2 |
| Member, admin, unauthorized account, role revocation, forged headers | 3 |
| Front Door hostname sign-in, SWA origin lock, cache checks, WAF block and KQL correlation | 4 |
| Dedicated Function pipeline and final regression recording | 5 |
