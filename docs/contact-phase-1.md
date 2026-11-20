# Phase 1 — public form and linked Function App

I am doing the Azure setup myself. The frontend is deployed through its existing GitHub Actions workflow. The backend is prepared locally for a separate deployment to Flex Consumption.

The public form and API are deployed. November 19 screenshots showed a successful Function deployment, a `400 validation_failed` response through SWA, a direct-Function `401`, and a successful anonymous form receipt after Turnstile verification. The contact account has Shared Key disabled and the Function has its table-scoped role. The instructions below preserve the setup procedure; continue with [phase 3](contact-phase-3.md) for sign-in and the inbox. Negative storage tests and a full access audit still need recorded evidence.

## 1. Review the budget and resource names

Open **Azure portal → Cost Management + Billing → my Azure for Students subscription → Cost Management → Budgets**. Review my existing budget and alerts before adding paid resources. Budget alerts notify me; they do not stop resources automatically. Check my remaining student credit and the offer's available services in the subscription.

Use the existing `azure-portfolio` resource group where supported. Choose one region available to my subscription for the Function App and its storage. If the portal rejects the existing resource group because of hosting constraints, use a new resource group for these backend resources; the existing Static Web App does not need to move.

Resources for this deployment:

| Resource | Name | Purpose |
| --- | --- | --- |
| Function App | `func-portfolio-contact` | Runs the TypeScript API, compiled to JavaScript, on Flex Consumption in West US 2 |
| Host storage | `stpfhost` | Functions runtime state and deployment content |
| Contact storage | `stpfcontact` | Contact records in `ContactSubmissions` |

Storage names must be globally unique, 3–24 lowercase letters/numbers. Function names must also be globally unique. Record the actual names and region; do not record access keys or secrets in this repository.

**Cost decision:** Static Web Apps Standard adds a recurring charge. Verify the actual quote for my offer in the portal. Flex Consumption executions, host storage, and telemetry can incur charges. Keep always-ready instances at zero for this starting build. Add Front Door in its later phase after checking the subscription quote. See [SWA pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/static/) and [Front Door pricing](https://azure.microsoft.com/en-us/pricing/details/frontdoor/).

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
| Allow storage account key access | Enabled **on this host account** | The current `AzureWebJobsStorage` and deployment storage configuration use connection strings |
| Public network access | Enabled | This starting plan is not using private endpoints/VNet integration |

Storage requests require authorization. Contact records use `stpfcontact`, where Shared Key has been disabled. The host account retains the authentication required by its runtime and deployment settings.

**Verify:** after creation, check **Overview** for region, account kind, and LRS, then **Configuration** for HTTPS, TLS, and disabled anonymous Blob access. No public containers are needed.

## 3. Create the standalone Function App

The Function App has been created. These are the intended settings to verify under its overview and configuration:

| Setting | Value | Why |
| --- | --- | --- |
| Publish | Code | This is a standalone compiled TypeScript application |
| OS | Linux | Flex Consumption uses Linux |
| Runtime | Node.js 24 LTS, Functions runtime v4 | Supported runtime; matches the existing frontend CI Node major |
| Plan | Flex Consumption, SKU FC1 | The student subscription permitted this deployment after Y1 quota requests failed |
| Region | Same region as host storage | Simplifies access and latency |
| Storage | The host account created above | Keeps runtime files separate from contact data |
| Monitoring | Application Insights and workspace created by the wizard | Record the existing workspace and verify telemetry in the monitoring phase |
| Deployment | Do not connect the frontend workflow here | The Function gets a separate deployment path |

I originally selected Windows Consumption, but the subscription had no usable Y1 quota and could not obtain an increase. I created a Flex Consumption app in West US 2. Runtime settings and deployment now follow the [Flex Consumption guide](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-how-to).

After creation, open **Settings → Configuration / General settings** and require HTTPS with TLS 1.2 or newer. Leave FTP publishing disabled. Do not add wildcard CORS origins. Requests will use the website's same-origin `/api/contact` URL.

In **Settings → Environment variables → App settings**, verify/add:

| Setting | Value |
| --- | --- |
| `CONTACT_TABLE_ENDPOINT` | `https://stpfcontact.table.core.windows.net` |
| `TURNSTILE_SECRET_KEY` | Widget secret, entered privately |
| `TURNSTILE_HOSTNAMES` | `icy-stone-01026931e.4.azurestaticapps.net` |
| `CONTACT_STORAGE_USE_AZURE_CLI` | Unset or `false` in Azure, so the code uses managed identity |

Flex stores its runtime selection in `functionAppConfig.runtime`. Verify Node.js 24 there instead of adding Windows runtime app settings. The handler counts actual request bytes and rejects bodies over 32 KiB, including requests with an inaccurate `Content-Length`. The UI also handles failures returned by the host.

**Verify:** Overview shows **Running**, Flex Consumption, and West US 2. Check the Node runtime selection before publishing. The `contact` HTTP function should appear after code is published.

## 4. Upgrade and link the existing Static Web App

When ready to link, open the existing **Static Web App → Settings → Hosting plan → Standard → Save**. Keep its existing source repository, branch, custom domains, and frontend workflow.

Open **Settings → APIs → Production → Link**. Choose **Function App**, my subscription, and the new Function App's production backend, then link it.

Verify that `func-portfolio-contact` can be selected and linked on the actual subscription. If the portal rejects this Flex backend, record the error and resolve the integration before enabling public submissions. The final routing and authentication checks below establish whether this specific deployment works.

**Verify immediately:** open **Function App → Authentication**. The **Azure Static Web Apps (Linked)** identity provider must be present, authentication enabled, and unauthenticated direct access rejected. Do not delete that provider, allow anonymous direct access, or add another provider that broadens access. The Functions code's `authLevel: 'anonymous'` removes the need for a Function key; it does **not** mean disabling this platform authentication layer.

The frontend workflow already uses `api_location: ""` and `skip_api_build: true`; keep both. Keep the Function route prefix `/api`. Linked backends apply to production, not SWA pull-request environments, so PR builds intentionally receive no public Turnstile key. [Microsoft's linking guide](https://learn.microsoft.com/en-us/azure/static-web-apps/functions-bring-your-own) explains the integration and its authentication boundary.

## 5. Configure Turnstile

In **Cloudflare dashboard → Turnstile → Add widget**, name it for the portfolio, select **Managed**, and allow the exact production SWA hostname and any currently used public custom hostname. Do not include schemes or paths. A Cloudflare DNS migration is not required.

- The **site key** is public. Add it to GitHub **Settings → Secrets and variables → Actions → Variables → `VITE_TURNSTILE_SITE_KEY`** after the backend routing and direct-access checks pass. Then deploy the frontend and test a real write with test data.
- The **secret key** belongs only in **Function App → Environment variables → `TURNSTILE_SECRET_KEY`**. Never put it in a `VITE_*` value, source control, browser code, screenshots, or chat.
- Set Function app setting **`TURNSTILE_HOSTNAMES`** to the exact allowed hostnames, comma separated, with no wildcard. Add the future Front Door hostname during phase 4.

The server requires Siteverify `success: true`, an exact allowed hostname, and `action: contact`. Tokens expire after five minutes and are single-use, so every attempted submission refreshes verification. A filled honeypot fails before Siteverify or storage. [Cloudflare validation guide](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

For local interactive tests, use a separate development widget allowing `localhost` and `127.0.0.1`; keep the production widget restricted. Dummy keys are useful for isolated tests but do not prove production hostname/action checks. The automated tests inject a verifier explicitly; deployed code has no verification bypass.

## 6. Build and publish the API separately

Use Node 24 LTS and the repository's pnpm version to build locally. The first deployment uses Azure CLI in Cloud Shell with an uploaded ZIP. Cloud Shell supplies the CLI and an authenticated Azure session. Core Tools is needed only for local Functions execution in these instructions. A separate GitHub Actions workflow with a federated deployment identity will automate subsequent backend deployments.

From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm --dir functions install --ignore-workspace --frozen-lockfile
pnpm test
pnpm --dir functions test
pnpm build
```

For local Functions execution, install Azure CLI and Core Tools v4 using [Microsoft's instructions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local). Copy `functions/local.settings.example.json` to the ignored `functions/local.settings.json`, supply development Turnstile settings, run Azurite for the host storage, and run `pnpm --dir functions start`. The example sets `CONTACT_STORAGE_USE_AZURE_CLI=true` to use my local `az login` identity, which needs its own table permission. Managed identity is the default when that setting is absent or `false`. Copy `.env.example` to the ignored `.env.local` and set the development widget's public `VITE_TURNSTILE_SITE_KEY`. In a second terminal run `pnpm dev`. Vite forwards `/api` to port 7071. Local settings are excluded from the deployment package.

For the initial deployment, prepare an isolated folder containing compiled JavaScript and production dependencies. Hoisted dependencies produce ordinary package directories that can be zipped for Linux hosting:

```powershell
# Run from the repository root after the builds above.
$contactDeployPath = Join-Path $PWD ('work/contact-api-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $contactDeployPath | Out-Null
Copy-Item functions/host.json, functions/package.json, functions/pnpm-lock.yaml -Destination $contactDeployPath
Copy-Item functions/dist -Destination $contactDeployPath -Recurse
pnpm --dir $contactDeployPath install --prod --ignore-workspace --node-linker=hoisted --frozen-lockfile --ignore-scripts
if ($LASTEXITCODE -ne 0) { throw 'Dependency packaging failed' }

$contactZipPath = "$contactDeployPath.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($contactDeployPath, $contactZipPath)
$contactZipPath
```

The current dependencies are JavaScript packages and the package has been checked after extraction. Revisit Linux build requirements if native dependencies are introduced. The archive must contain `host.json`, `package.json`, `dist/index.js`, and production `node_modules` at its root. Exclude `.env` files and local settings.

In Cloud Shell, choose **Manage files → Upload** and select the ZIP. Use the uploaded filename in the following Bash command, after linking and checking the authentication configuration in section 4:

```bash
az functionapp deployment source config-zip \
  --subscription "Azure for Students" \
  --resource-group "azure-portfolio" \
  --name "func-portfolio-contact" \
  --src "<uploaded-package-name>.zip" \
  --build-remote false
```

The package includes compiled code and dependencies, so a remote build is unnecessary. Modern Azure CLI supports Microsoft Entra deployment authentication while basic publishing authentication stays disabled. See [Flex deployment](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-how-to#deploy-your-code-project) and [deployment authentication](https://learn.microsoft.com/en-us/azure/app-service/configure-basic-auth-disable#deploy-without-basic-authentication).

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

Record whether the linked provider is present and the three test status codes. Then add the production site key to GitHub, deploy the frontend, and verify a real anonymous submission using test data. Confirm the resulting entity exists in `ContactSubmissions`. A successful local build or role assignment alone does not verify a cloud storage write.

## Local evidence and remaining tests

Verified on November 8, 2026: production frontend build; 13 backend tests; 8 frontend tests; browser inspection at desktop and mobile widths using test text. The frontend tests cover sending, success, validation, retry, duplicate-click prevention, draft retention, and non-JSON/false-success responses. API dependencies are stubbed in tests; these are not Azure authorization tests.

Verified on November 19, 2026: the first deployment package built successfully and passed 14 backend tests, including managed identity selection without hosting-instance variables. The ZIP excluded local settings and passed an extracted-package import check. Subsequent user screenshots showed successful Azure deployment, validation through SWA, direct-origin denial, and a successful anonymous form receipt. The phase 3 release extends local coverage to 25 backend and 18 frontend tests. Its corrected inbox route now denies unsigned requests in Azure; signed-in authorization checks remain pending.

- [Desktop setup-state screenshot](evidence/phase-1-contact-desktop.jpg)
- [Mobile setup-state screenshot](evidence/phase-1-contact-mobile.jpg)

| Evidence still needed | Phase |
| --- | --- |
| Independent inspection of the stored test entity | 2 |
| Wrong identity denied, explicit Shared Key request denied, inherited-role audit | 2 |
| Member, admin, unauthorized account, role revocation, forged headers | 3 |
| Front Door hostname sign-in, SWA origin lock, cache checks, WAF block and KQL correlation | 4 |
| Dedicated Function pipeline and final regression recording | 5 |
