# Phase 3 — optional sign-in and private inbox

I am doing the Azure work myself. The public portfolio and contact form are deployed. On November 20, 2026, I chose SWA's built-in Microsoft sign-in so I can use a personal Microsoft account with my Gmail address. Azure subsequently returned inconsistent custom roles for that same user. The [owner authorization repair](inbox-owner-repair.md) is now deployed in both the Function and website. Three owner account checks, six inbox loads/refreshes, and anonymous/forged-header denial probes passed in production. This document retains the original role-based setup as history.

The original custom registration reached my university's administrator-consent screen after enabling ID-token issuance. The website uses Microsoft's preconfigured provider instead of that university registration; it does not change the university's consent policy. In the repair, other Microsoft accounts can sign in, but only the exact website user ID configured on the Function can read submissions. GitHub sign-in is blocked. The separate-account test was user-reported rather than independently verified; live owner-configuration revocation remains untested.

## What the code does

| Code | Responsibility |
| --- | --- |
| `functions/src/auth.ts` | Validates the SWA principal and matches the configured owner before an inbox read |
| `functions/src/account.ts` | Returns the authenticated user's account summary |
| `functions/src/inbox.ts` | Requires the configured owner, validates the cursor, and returns a bounded page |
| `functions/src/storage.ts` | Uses the Function's managed identity and a fixed table/partition query |
| `public/staticwebapp.config.json` | Uses built-in Microsoft sign-in, blocks GitHub sign-in, protects API/admin routes, and disables caching on personalized routes |
| `src/auth/AuthContext.tsx` | Loads the account, obtains an optional display name, and rechecks the session when returning to the page |
| `src/pages/AccountPage.tsx` | Public sign-in landing page and signed-in account controls |
| `src/pages/AdminInboxPage.tsx` | Private message display, loading/error states, and previous/next navigation |

The header is trusted only because **Azure Static Web Apps (Linked)** authentication remains enabled on the Function App. Base64 decoding is not authentication. The Function's `authLevel: 'anonymous'` means it does not require a Function key; it does not replace the platform authentication boundary. Keep **Require authentication** and the HTTP **401** response on the Function App. Do not add another provider there to fix website sign-in.

The repair checks an authenticated Microsoft principal for `/api/account` and also requires an exact `INBOX_OWNER_USER_ID` match for `/api/admin/submissions`. SWA requires authentication before forwarding either API request. The Function makes the final owner decision on every read; `site_admin` alone cannot grant access. It never derives admin access from an email address, query parameter, storage role, or browser state. The inbox renders message text without interpreting HTML. Browser data stays in memory; API, account, admin, and authentication routes use `Cache-Control: no-store`.

## The identities are separate

| Identity or permission | Job | Does not grant |
| --- | --- | --- |
| My personal Microsoft account | Identifies the website user; Gmail can be its username | Automatic inbox access or Azure resource permissions |
| Function `INBOX_OWNER_USER_ID` setting | Names the one authenticated website identity permitted to read the inbox | Azure resource or Table Storage permissions |
| SWA `site_admin` role | Original inbox gate; replaced by the configured owner check in the repair | Access to the repaired inbox by itself |
| Function system-assigned identity | Reads/writes contact entities using table-scoped Storage Table Data Contributor | Website membership or sign-in privileges |
| `id-portfolio-signin` user-assigned identity | Belongs to the previous custom sign-in setup; no longer referenced by the website configuration | Contact table access; it has no storage role |
| My Azure user with Storage Table Data Reader | Allows my CLI identity to inspect this table directly | The website's `site_admin` role |
| GitHub deployment identity | Publishes application code | A visitor session or intended data-reader role |

The existing frontend workflow uses a deployment token. A separate federated identity for Function deployment is planned for phase 5. Deployment privileges are still powerful: someone who can replace backend code can change what the app does with its runtime permissions.

My goal is for my account to be the only human with inbox access. Configure only my verified website user ID on the Function and audit direct/inherited storage roles separately. The Function necessarily reads the table. Administrators who can change Function settings or code may change this access policy; a table-scoped storage assignment does not remove their administrative authority.

## Original setup history (sections 1–6)

The sections below record the original role-based deployment. Use [the owner repair runbook](inbox-owner-repair.md) for current deployment, access assignment, and revocation. Removing a SWA role no longer revokes inbox access after the owner repair is deployed; change or clear the Function's owner setting instead.

## 1. Prepare my personal Microsoft account

Open [Microsoft account](https://account.microsoft.com/) privately and try my Gmail address. If it already identifies a Microsoft account, use that account. Otherwise, choose **Create an account**, use my existing Gmail address, and complete Microsoft's verification. This is Microsoft authentication using Gmail as the username, not Google authentication. My Google password is not a Microsoft sign-in credential. See [Microsoft's account guidance](https://support.microsoft.com/en-us/accounts-billing/manage/link-your-google-account-and-microsoft-account).

The frontend release removes the custom `auth` registration from `staticwebapp.config.json`. SWA then uses its [preconfigured Microsoft provider](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization#prerequisites). An explicit route blocks `/.auth/login/github` because built-in providers otherwise include GitHub. The Function also rejects principals from providers other than `aad`, even if they contain `site_admin`. The Microsoft sign-in URL stays `/.auth/login/aad`. No Google OAuth registration or new Azure subscription is needed for this website sign-in choice.

The old SWA settings `AZURE_CLIENT_ID` and `OVERRIDE_USE_MI_FIC_ASSERTION_CLIENTID` are no longer referenced by the website configuration. The `portfolio-web-signin` registration and `id-portfolio-signin` identity are not prerequisites. After personal sign-in and role tests pass, review dependencies and remove those unused settings, identity attachment, federation, and registration manually if they are dedicated to this project. No Azure cleanup has been performed by this code release.

My current Azure subscription ownership and storage reader assignment are separate from website access. My personal account only needs the website's `site_admin` role to view the inbox. The Function's system-assigned storage identity and SWA-linked authentication remain required.

**Recording:** pause for account creation, passwords, email verification, and MFA. Blur personal account details and unrelated browser tabs. Keep secret values, cookies, tokens, connection strings, invitation URLs, and real messages off screen.

## 2. Deploy the Function package first

This stage is already complete. Switching the website's Microsoft provider does not require another Function deployment; the existing `aad` principal checks and role requirements also apply to the built-in Microsoft provider. The instructions below remain for rebuilding the backend when its code changes.

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

Verify the successful GitHub Actions run before opening the production site in a new private window. Check `/`, `/#projects`, `/videos`, and `/contact` while signed out. Submit only a test message. `/account` must show the Microsoft sign-in button without the old organization restriction. An unsigned request to either protected API must be denied, not receive contact records or a `200` HTML fallback. `/.auth/login/github` must return `404`; Microsoft sign-in must start the built-in provider flow. Azure handles built-in authentication callbacks internally, so callback status codes alone do not prove successful sign-in or provider blocking.

Do not copy local mock identities or the ignored `work/auth-preview.mjs` into deployed code. `pnpm dev` alone does not emulate Azure's authentication boundary; actual sign-in is tested on SWA.

## 4. Verify sign-in before assigning admin

Open `/account` in a new private window and use **Sign in with Microsoft**. Sign in with my personal Microsoft account using its Gmail address. If the chooser offers my university account, choose another account. The page should show my available display name or account identifier, a sign-out control, and no inbox access yet. `/api/account` should return `200` with `isAdmin: false`; `/api/admin/submissions` should be denied with no records. Check response headers for `no-store`.

Any Microsoft account can attempt to sign in with the built-in provider, subject to Microsoft's policies and any work/school account's organizational restrictions. This release intentionally drops tenant-restricted eligibility. The private inbox still requires an explicitly assigned website role at both SWA and the Function. Do not infer admin access from an email address or browser state.

If personal sign-in fails, record the error code privately and confirm I selected the personal Microsoft account. Do not disable Function authentication or weaken the inbox role check. A work/school account may still require its organization's approval; this setup does not authorize bypassing that policy.

## 5. Assign the website role only to my account

Open **andre-portfolio → Role management → Invite**. Choose Microsoft Entra ID, the exact identity/email shown for my personal Microsoft sign-in, the production SWA domain, role `site_admin`, and a short invitation lifetime. Verify account details first, since a Microsoft account may have aliases. Generate the link and redeem it privately using that same account. Then sign out and back in and verify the inbox opens. Review existing assignments and remove any previous account's `site_admin` role so only my chosen personal account has it. Do not grant this role to a normal member/test user.

To revoke access, select my user in **Role management**, remove `site_admin`, and select **Update**. Refresh the inbox and repeat the API request; allow propagation, then check a fresh sign-in too. Deleting the SWA user is a separate option that invalidates its permissions and changes its SWA user ID if added again. See [role management](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom#manage-roles).

The Function checks the role on every read, but it receives the platform's current principal. Record observed propagation time rather than claiming immediate revocation. The UI clears old messages on refresh and when the page is hidden, and rechecks the session on return. Data already viewed or copied cannot be recalled. After the revocation test, restore `site_admin` only to my account and confirm access again.

### Intermittent inbox access

On November 20, a user-provided response showed `isAdmin: true`, followed by a screenshot of a successful inbox read. Access was also reported to fail within seconds. The UI describes every inbox `401` or `403` as session expiry, so that wording alone does not establish an expired login.

Live browser inspection subsequently reproduced inconsistent roles in Azure's own `/.auth/me` endpoint, independently of the React application. Azure Portal Role management showed the personal account assigned `site_admin`, including after refreshing the assignment list. After a full website sign-out and a new personal Microsoft sign-in, successive endpoint observations returned `site_admin` present at 13:46:16 UTC, absent at 13:46:21, and present again at 13:46:56. The same user ID and the `authenticated` role remained present. These are observation times on November 20, 2026, not server request timestamps. This demonstrates changing platform role information rather than an expired login; the underlying Azure cause remains unconfirmed.

Reapplying `site_admin` with `az staticwebapp users update` completed successfully, but subsequent checks at 13:50:58, 13:51:12, and 13:54:16 UTC still lacked that role. The inbox API returned Azure's platform HTML `403` page. A fresh sign-in after the update still lacked the role at 13:56:01 UTC. Authentication and the same user ID persisted. The [owner repair](inbox-owner-repair.md) therefore moves the final access decision to a configured user-ID match in the Function, while retaining SWA authentication and the linked-origin boundary. It does not delete/reinvite the identity or add retries to conceal denials.

An experimental frontend release coalesced browser events and retried a denied read after reconfirming the same administrator. Although its tests passed, the user reported worse access after deployment. The session code and tests were restored to the previous version. Live inspection then isolated the changing platform role information described above. No server authorization rule or role assignment was changed during that inspection.

After deployment, hard-refresh `/account`, open the inbox, and check normal reading, a tab switch, and a direct `/admin` reload. If denials continue, privately inspect the failed `/api/admin/submissions` response: record only UTC time, HTTP status, whether it is platform HTML or application JSON, and a fixed error code. Do not share cookie headers, tokens, full network exports, personal identifiers, or messages. A successful local recovery test does not prove the Azure-side issue is resolved.

## 6. Test other users without giving them inbox access

Use a second permitted Microsoft account for the non-admin test. It does not need a guest invitation into my university directory for the built-in provider. Leave it without `site_admin`; expect a working account page and a denied inbox/API with no records. Use only synthetic contact messages in recordings.

If I return to a tenant-restricted design later, an authorized directory administrator can use **Microsoft Entra ID → Users → New user → Create new user** or **Invite external user**, subject to directory policies. A directory guest invitation and a SWA role invitation serve different purposes. Subscription Owner does not automatically grant directory administration rights. See [create or invite users](https://learn.microsoft.com/en-us/entra/fundamentals/add-users).

## 7. Record access tests

Use test messages and note UTC time, identity category, HTTP status, and whether records were returned. Do not record cookies, bearer tokens, or whole network exports.

| Check | Expected | Evidence status |
| --- | --- | --- |
| Anonymous contact form | Real verification followed by durable receipt | Phase 1 success screenshot observed; repeat after release |
| Anonymous account/inbox APIs | Denied, no records | November 20: both returned `401` |
| Personal Microsoft account | `200`, account details and sign-out visible | November 20: user screenshot confirmed sign-in and account API response |
| Signed-in non-owner inbox | Denied, no records | Local tests pass; user reported completing the cloud test, distinct identity/result not independently verified |
| My configured owner ID | Bounded newest-first pages despite custom-role changes | Local role-fluctuation tests pass; November 20: six production inbox loads/refreshes passed without another sign-in |
| Owner setting changed or cleared | Further reads denied after setting propagation/restart | Local tests pass; cloud pending |
| Direct Function request | Platform `401`/`403` | November 20: inbox returned `401`; contact `401` previously observed |
| Forged principal through either hostname | Denied without records | November 20: inbox returned `401` through both SWA and the direct Function hostname |
| Wrong storage identity / Shared Key | Storage denies access | Cloud test pending |
| Correct Function identity | Contact write and admin read work | Public receipt and one production admin read observed |

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

The owner repair passed 27 backend tests, 18 frontend tests, and the production build. Its package dependencies and compiled owner check were verified separately. Both releases are deployed; repeated owner reads and anonymous/forged-header denial probes passed. See the [repair runbook](inbox-owner-repair.md) for production evidence and remaining checks. The earlier session-recovery experiment passed 28 frontend tests but was rolled back after worse production access was reported; no retry-based recovery is included in this repair.

On November 20, 2026, the built-in provider release passed 25 backend tests, 18 frontend tests, and the production build. [Live release probes](evidence/phase-3-personal-signin-release.json) confirmed public page access, contact validation, `401` responses from private endpoints and forged-principal probes, and the GitHub login entry point's `404`. The Microsoft redirect used Azure's shared identity service and `/common/oauth2/v2.0/authorize` with the platform registration. This verifies the start of login only; it does not verify personal account login, role assignment, storage reads, or revocation. No credentials, cookies, state, nonce, or message contents were recorded.

On November 19, 2026, 25 backend tests and 18 frontend tests passed. Both production builds passed. The added route regression test fails with the old registration and passes with the correction. Automated tests use injected dependencies and synthetic identities; they do not establish the Azure platform trust boundary.

Core Tools 4.16.1 (Functions runtime 4.1054.250.26428) reproduced the original reserved-route error and then served all three corrected routes. Five local HTTP probes verified anonymous denial, member denial, invalid admin cursor rejection, and the contact validation path. [Runtime evidence](evidence/phase-3-runtime-routing.json) records statuses and test scope. This isolated check used no Azure host storage or Application Insights connection, so storage health warnings were expected; it did not test cloud identity or data access. After redeployment, the November 19 user screenshot showed HTTP `401`, `Cache-Control: no-store`, and `{"code":"unauthorized"}` from the actual inbox endpoint through SWA (response time 02:36:21 UTC on November 20). Later November 20 screenshots confirmed personal sign-in and a production admin read; role revocation remains unverified in Azure.

Browser checks covered desktop and mobile account/inbox layouts, mobile navigation, and public access to the contact page. The local preview used synthetic responses and no production sign-in credentials. These images demonstrate layout only:

- [Public account page](evidence/phase-3-account-desktop.jpg)
- [Desktop inbox with test messages](evidence/phase-3-inbox-desktop.jpg)
- [Mobile inbox with test messages](evidence/phase-3-inbox-mobile.jpg)

Application warning logs contain fixed failure codes and invocation IDs. No handler logs names, emails, bodies, auth headers, or raw storage exceptions. Monitoring configuration, Log Analytics inspection, Front Door, WAF, and backend GitHub deployment remain later phases; their absence is not covered by these unit tests.
