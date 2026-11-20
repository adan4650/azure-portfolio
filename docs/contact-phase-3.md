# Phase 3 — optional sign-in and private inbox

I am doing the Azure work myself. This release adds the account and inbox code; the public portfolio and contact form remain public. Complete one numbered stage, verify it, then continue. The corrected backend now returns `401` with `{"code":"unauthorized"}` for an unsigned inbox request. The next stage is **publish the frontend and verify Microsoft sign-in before assigning `site_admin`**.

## What the code does

| Code | Responsibility |
| --- | --- |
| `functions/src/auth.ts` | Validates the SWA principal and checks the required role before a protected handler runs |
| `functions/src/account.ts` | Returns the authenticated user's account summary |
| `functions/src/inbox.ts` | Requires `site_admin`, validates the cursor, and returns a bounded page |
| `functions/src/storage.ts` | Uses the Function's managed identity and a fixed table/partition query |
| `public/staticwebapp.config.json` | Selects the tenant-specific provider, protects API/admin routes, and disables caching on personalized routes |
| `src/auth/AuthContext.tsx` | Loads the account, obtains an optional display name, and rechecks the session when returning to the page |
| `src/pages/AccountPage.tsx` | Public sign-in landing page and signed-in account controls |
| `src/pages/AdminInboxPage.tsx` | Private message display, loading/error states, and previous/next navigation |

The header is trusted only because **Azure Static Web Apps (Linked)** authentication remains enabled on the Function App. Base64 decoding is not authentication. The Function's `authLevel: 'anonymous'` means it does not require a Function key; it does not replace the platform authentication boundary. Keep **Require authentication** and the HTTP **401** response on the Function App. Do not add another provider there to fix website sign-in.

The API checks `authenticated` for `/api/account` and `site_admin` for `/api/admin/submissions`. It never derives admin access from an email address, query parameter, storage role, or browser state. The inbox renders message text without interpreting HTML. Browser data stays in memory; API, account, admin, and authentication routes use `Cache-Control: no-store`.

## The identities are separate

| Identity or permission | Job | Does not grant |
| --- | --- | --- |
| My Microsoft Entra user | Identifies the person signing in | Automatic inbox access |
| SWA `site_admin` role | Lets the assigned website user request the private inbox | Azure resource or Table Storage permissions |
| Function system-assigned identity | Reads/writes contact entities using table-scoped Storage Table Data Contributor | Website membership or sign-in privileges |
| `id-portfolio-signin` user-assigned identity | Lets SWA authenticate to the Entra app registration through federation | Contact table access; it has no storage role |
| My Azure user with Storage Table Data Reader | Allows my CLI identity to inspect this table directly | The website's `site_admin` role |
| GitHub deployment identity | Publishes application code | A visitor session or intended data-reader role |

The existing frontend workflow uses a deployment token. A separate federated identity for Function deployment is planned for phase 5. Deployment privileges are still powerful: someone who can replace backend code can change what the app does with its runtime permissions.

My goal is for my account to be the only human with inbox access. Assign `site_admin` only to my account and audit direct/inherited storage roles separately. The Function necessarily reads the table. Subscription or directory administrators may be able to grant themselves access; a table-scoped assignment does not remove their administrative authority.

## 1. Verify the sign-in prerequisites already configured

In **Static Web Apps → andre-portfolio → Identity → User assigned**, confirm `id-portfolio-signin` is attached. In **Environment variables**, use the **Production** environment:

| Setting | Value source |
| --- | --- |
| `AZURE_CLIENT_ID` | App registration `portfolio-web-signin` application/client ID |
| `OVERRIDE_USE_MI_FIC_ASSERTION_CLIENTID` | `id-portfolio-signin` client ID |

The app registration is single tenant (`AzureADMyOrg`). Its web callback is `https://icy-stone-01026931e.4.azurestaticapps.net/.auth/login/aad/callback`. Its federated credential uses the sign-in identity's **object ID** as subject, the tenant's v2 issuer, and audience `api://AzureADTokenExchange`. Keep this identity attached only to this SWA. This follows Microsoft's [managed identity sign-in configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom#use-a-managed-identity-instead-of-a-secret).

These settings belong to **SWA**, not the Function App or Vite. The deployed JSON selects the matching tenant and setting names. No Entra client secret is needed for this setup.

**Recording:** client, tenant, and object IDs identify resources but are not credentials. Blur personal account details and unrelated browser tabs. Keep all secret values, cookies, tokens, connection strings, invitation URLs, and real messages off screen.

## 2. Deploy the Function package first

The corrected archive is `work/portfolio-inbox-api-flex-route-fix-2026-11-19.zip`. It supersedes the earlier inbox ZIP. It contains the existing contact handler plus the new account and submissions handlers. The frontend workflow continues to deploy only `dist/`; it does not deploy this API.

Package check: 11,015,522 bytes; SHA-256 `509998FF404ED29413B72E2E8E71F26FD28A3BE2D24569563B7011753769722C`. Required entry points and dependencies are present, paths use forward slashes, and local settings, environment files, and native modules are absent. The corrected package source was exercised in the real local Functions runtime before packaging.

**Routing correction:** Azure listed all three functions, but the public inbox URL returned `404`. Core Tools reproduced a reserved-route error for the original `admin/submissions` template. The [host validates templates before applying the prefix](https://github.com/Azure/azure-functions-host/blob/dev/src/WebJobs.Script/Host/ScriptHost.cs), so `host.json` now sets `routePrefix` to an empty string and every trigger explicitly starts with `api/`. The resulting public URLs are still `/api/contact`, `/api/account`, and `/api/admin/submissions`. A function listing proves discovery, not that each HTTP route is working.

In Azure **Cloud Shell → Bash → Manage files → Upload**, select the archive from the local project folder. Confirm the uploaded filename, then run:

```bash
az functionapp deployment source config-zip \
  --subscription "Azure for Students" \
  --resource-group "azure-portfolio" \
  --name "func-portfolio-contact" \
  --src "portfolio-inbox-api-flex-route-fix-2026-11-19.zip" \
  --build-remote false \
  --timeout 600
```

The ZIP already contains compiled JavaScript and production dependencies. This updates the existing Function code, so all three handlers are packaged together. Keep publishing basic authentication disabled. See [Microsoft's Flex deployment instructions](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-how-to#deploy-your-code-project).

After deployment succeeds:

```bash
az functionapp function list \
  --subscription "Azure for Students" \
  --resource-group "azure-portfolio" \
  --name "func-portfolio-contact" \
  --query "[].{Function:name}" \
  --output table
```

**Expected:** `func-portfolio-contact/contact`, `func-portfolio-contact/account`, and `func-portfolio-contact/submissions`. Then verify the actual inbox route before releasing the frontend:

```bash
curl --silent --show-error --include \
  --max-time 30 \
  "https://icy-stone-01026931e.4.azurestaticapps.net/api/admin/submissions"
```

**Expected before the frontend release:** HTTP `401` with `{"code":"unauthorized"}`. The route exists and the handler rejects a request with no signed-in identity. A `404` means the route is still unavailable. This does not yet verify successful sign-in or storage reads. Stop here before releasing the frontend. If Cloud Shell resets, these commands still work without restoring shell variables; upload the ZIP again if the ephemeral session lost it.

## 3. Release the frontend after that check

Review and commit the phase 3 source, tests, documentation, and `public/staticwebapp.config.json`, then push through the existing frontend workflow. Keep `VITE_TURNSTILE_SITE_KEY` in the GitHub repository variable. Keep `api_location` empty, because the separate Function is already linked.

Verify the successful GitHub Actions run before opening the production site in a new private window. Check `/`, `/#projects`, `/videos`, and `/contact` while signed out. Submit only a test message. `/account` must show the Microsoft sign-in button. An unsigned request to either protected API must be denied, not receive contact records or a `200` HTML fallback.

Do not copy local mock identities or the ignored `work/auth-preview.mjs` into deployed code. `pnpm dev` alone does not emulate Azure's authentication boundary; actual sign-in is tested on SWA.

## 4. Verify sign-in before assigning admin

Open `/account` and use **Sign in with Microsoft**. Sign in with my account in the configured tenant. The page should show my name, a sign-out control, and no inbox access yet. `/api/account` should return `200` with `isAdmin: false`; `/api/admin/submissions` should be denied with no records. Check response headers for `no-store`.

Sign-in is restricted to the configured tenant's members and accepted guests, subject to its consent, assignment, and access policies. It does not mean only my account can sign in. A personal Microsoft account outside that tenant should not authenticate to this app. This distinction follows Microsoft's [tenant-restricted authentication guidance](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization).

If Entra asks for administrator consent or denies access, record the error code privately and resolve it with the tenant administrator. Do not switch the issuer to `common` or disable authentication to bypass that policy. The university portal restriction previously observed does not prove that my app registration is broken; the CLI successfully created it.

## 5. Assign the website role only to my account

Open **andre-portfolio → Role management → Invite**. Choose Microsoft Entra ID, my sign-in email, the production SWA domain, role `site_admin`, and a short invitation lifetime. Generate the link and redeem it privately using that same account. Then sign out and back in and verify the inbox opens. Do not grant this role to a normal member/test user.

To revoke access, select my user in **Role management**, remove `site_admin`, and select **Update**. Refresh the inbox and repeat the API request; allow propagation, then check a fresh sign-in too. Deleting the SWA user is a separate option that invalidates its permissions and changes its SWA user ID if added again. See [role management](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom#manage-roles).

The Function checks the role on every read, but it receives the platform's current principal. Record observed propagation time rather than claiming immediate revocation. The UI clears old messages on refresh and when the page is hidden, and rechecks the session on return. Data already viewed or copied cannot be recalled. After the revocation test, restore `site_admin` only to my account and confirm access again.

## 6. Test other users without giving them inbox access

Prefer an existing permitted tenant member for the non-admin test. For a new account, an authorized tenant administrator can use **Microsoft Entra ID → Users → New user → Create new user**. For an external tester, use **Invite external user** and have them accept the invitation. Directory permissions and guest invitation policy apply; subscription Owner is not automatically an Entra user administrator. Keep initial passwords and invitation links out of recordings. See [create or invite users](https://learn.microsoft.com/en-us/entra/fundamentals/add-users).

An Entra guest invitation makes a person eligible to authenticate in the tenant. A SWA role invitation grants a website role. They are different operations. Use the tenant invitation only where permitted, and do not assign `site_admin` to that tester. The expected result is a working account page and a denied inbox/API. The real contact data remains private.

## 7. Record access tests

Use test messages and note UTC time, identity category, HTTP status, and whether records were returned. Do not record cookies, bearer tokens, or whole network exports.

| Check | Expected | Evidence status |
| --- | --- | --- |
| Anonymous contact form | Real verification followed by durable receipt | Phase 1 success screenshot observed; repeat after release |
| Anonymous account/inbox APIs | Denied, no records | Cloud test pending |
| Tenant member account | `200`, name and sign-out visible | Cloud test pending |
| Tenant member inbox | Denied, no records | Local tests pass; cloud pending |
| My explicitly assigned `site_admin` | Bounded newest-first pages | Local tests pass; cloud pending |
| Role removed | Further reads denied after propagation | Local tests pass; cloud pending |
| Direct Function request | Platform `401`/`403` | Contact `401` observed; repeat for new endpoints |
| Forged principal through either hostname | Denied without records | Cloud test pending |
| Wrong storage identity / Shared Key | Storage denies access | Cloud test pending |
| Correct Function identity | Contact write and admin read work | Public receipt observed; admin read pending |

In Cloud Shell Bash, these probes use no real sign-in tokens and do not read messages:

```bash
siteUrl="https://icy-stone-01026931e.4.azurestaticapps.net"
functionHost="func-portfolio-contact-eghdbdf6e0bmf7ey.westus2-01.azurewebsites.net"
fakePrincipal=$(printf '%s' \
  '{"identityProvider":"aad","userId":"test","userDetails":"test@example.com","userRoles":["authenticated","site_admin"]}' \
  | base64 -w 0)

curl --silent --show-error --include \
  --max-time 30 \
  "${siteUrl}/api/account"

curl --silent --show-error --include \
  --max-time 30 \
  --header "x-ms-client-principal: ${fakePrincipal}" \
  "${siteUrl}/api/admin/submissions"

curl --silent --show-error --include \
  --max-time 30 \
  "https://${functionHost}/api/admin/submissions"

curl --silent --show-error --include \
  --max-time 30 \
  --header "x-ms-client-principal: ${fakePrincipal}" \
  "https://${functionHost}/api/admin/submissions"
```

Every probe must be denied with no submissions. A fabricated principal reaching the direct Function handler is a failed boundary test, even if some later check returns an error. Fix linked authentication before using the inbox. Keep Shared Key disabled on `stpfcontact`; do not use a connection string to work around a permission failure. Direct and inherited storage data roles still need a separate audit.

## Local verification and recording evidence

On November 19, 2026, 25 backend tests and 18 frontend tests passed. Both production builds passed. The added route regression test fails with the old registration and passes with the correction. Automated tests use injected dependencies and synthetic identities; they do not establish the Azure platform trust boundary.

Core Tools 4.16.1 (Functions runtime 4.1054.250.26428) reproduced the original reserved-route error and then served all three corrected routes. Five local HTTP probes verified anonymous denial, member denial, invalid admin cursor rejection, and the contact validation path. [Runtime evidence](evidence/phase-3-runtime-routing.json) records statuses and test scope. This isolated check used no Azure host storage or Application Insights connection, so storage health warnings were expected; it did not test cloud identity or data access. After redeployment, the November 19 user screenshot showed HTTP `401`, `Cache-Control: no-store`, and `{"code":"unauthorized"}` from the actual inbox endpoint through SWA (response time 02:36:21 UTC on November 20). Successful sign-in, admin reads, and role revocation still need cloud tests.

Browser checks covered desktop and mobile account/inbox layouts, mobile navigation, and public access to the contact page. The local preview used synthetic responses and no production sign-in credentials. These images demonstrate layout only:

- [Public account page](evidence/phase-3-account-desktop.jpg)
- [Desktop inbox with test messages](evidence/phase-3-inbox-desktop.jpg)
- [Mobile inbox with test messages](evidence/phase-3-inbox-mobile.jpg)

Application warning logs contain fixed failure codes and invocation IDs. No handler logs names, emails, bodies, auth headers, or raw storage exceptions. Monitoring configuration, Log Analytics inspection, Front Door, WAF, and backend GitHub deployment remain later phases; their absence is not covered by these unit tests.
