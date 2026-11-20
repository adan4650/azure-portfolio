# Inbox owner authorization repair

**Status — November 20, 2026:** prepared and locally verified; Function deployment and frontend release pending. Do not treat the incident as resolved until the live checks below pass.

## Why this change is needed

Direct browser inspection of Azure's `/.auth/me` endpoint showed the same authenticated user alternately with and without `site_admin`. The portal retained the assignment. Reapplying it and signing in again did not restore consistent access. The failing inbox request returned Azure's own HTML `403`, before the Function ran. This isolates inconsistent platform role information; it does not identify the internal Azure defect.

The new policy authorizes exactly one Microsoft website identity in the Function. SWA still authenticates each private API request and its linked provider still protects the Function origin. The Function compares the trusted principal's `userId` to its server-side `INBOX_OWNER_USER_ID` setting before reading storage. Other users are denied, including a different user with `site_admin` or the same email text. Missing or malformed owner configuration denies all inbox reads.

SWA's `userId` is app-specific and persists for that website user. Deleting and re-adding the user changes it; migrating to another SWA resource also requires explicitly verifying and configuring the new ID. See [Microsoft's user-information documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/user-information).

This replaces the website's custom-role authorization policy. `site_admin` is no longer an access grant or revocation control after this release. Storage RBAC and managed identity remain separate and unchanged. Anyone with authority to replace backend code or edit the Function's settings can change this policy.

## 1. Configure the intended owner

Sign in with the intended personal Microsoft account and privately inspect `/.auth/me`. Use its exact `userId`, not its email, an Entra object ID, or an Azure subscription ID. Set it only on `func-portfolio-contact`, not in frontend source, a `VITE_` variable, or a request parameter. The actual identifier is intentionally omitted from this repository.

In Cloud Shell Bash, replace the placeholder before running:

```bash
az functionapp config appsettings set \
  --subscription "Azure for Students" \
  --resource-group "azure-portfolio" \
  --name "func-portfolio-contact" \
  --settings INBOX_OWNER_USER_ID="<verified-website-user-id>" \
  --output none
```

This explicitly names the single permitted reader. Keep SWA (Linked) authentication enabled with Require authentication and an unauthenticated `401` response. The principal header is trusted only behind that boundary; Base64 decoding alone is not authentication.

## 2. Deploy the Function before changing route rules

Upload `work/portfolio-inbox-owner-api-2026-11-20.zip` using Cloud Shell's Manage files → Upload. This package contains contact, account, and submissions, compiled JavaScript, and production dependencies. It contains no local settings or credentials.

- Bytes: `11015853`
- SHA-256: `47815E5454C3C57D94AED734074362369BD2066527175D34B99A6B21A1BDAC5B`

```bash
az functionapp deployment source config-zip \
  --subscription "Azure for Students" \
  --resource-group "azure-portfolio" \
  --name "func-portfolio-contact" \
  --src "portfolio-inbox-owner-api-2026-11-20.zip" \
  --build-remote false \
  --timeout 600
```

After Azure reports success, inspect `/api/account` in the owner's signed-in browser. It must return `isAdmin: true` consistently, including when `/.auth/me` lacks `site_admin`. A different Microsoft account must return `isAdmin: false`. The old website role gate may still block `/admin` and the submissions API until the next step.

## 3. Release the website route change

Only after the new Function and setting are verified, release `public/staticwebapp.config.json` through the existing GitHub frontend workflow. Private routes require `authenticated`; the Function's owner check is the mandatory authorization boundary for message data. An authenticated non-owner may receive the static page shell, which contains no contact records. The API must return `403` without reading storage.

The account page and navigation already use the Function's `isAdmin` result. The UI error copy now reports an authorization failure without asserting that the session expired. No automatic retries or cached admin decisions are added.

## 4. Verify the production behavior

1. As the owner, open the inbox, refresh repeatedly, switch tabs and return, and reload `/admin` directly. Confirm the same test message remains accessible without signing in again.
2. As a different Microsoft account, confirm `isAdmin: false` and an API `403` with no records. A custom `site_admin` role alone must not grant access.
3. While signed out, private API requests must remain denied. Repeat fabricated-principal probes through both the SWA and Function hostnames. For a strong origin check, use the configured owner ID privately in the fake header; never include real authentication cookies or tokens. The origin must reject it at platform authentication.
4. Verify the public portfolio and invalid contact submission still work. Do not create real contact messages merely to test authorization.

Record only status, fixed response codes, role presence, and identity equality. Do not save cookies, tokens, raw network exports, account identifiers, or message contents.

## Revocation and rollback

To revoke access, clear or change `INBOX_OWNER_USER_ID` on the Function. Settings changes can restart the app and take time to propagate; verify that a previously signed-in owner can no longer read the API. Clearing the setting produces `503 temporarily_unavailable` and no data; selecting a different owner produces `403` for the old owner. Local tests prove handler behavior, not Azure propagation timing. Previously viewed data cannot be recalled.

If rolling back, restore the frontend `site_admin` route gates first and wait for that deployment to complete. Only then restore the previous role-based Function package (`portfolio-inbox-api-flex-route-fix-2026-11-19.zip`). This returns to the previous access model and its known reliability issue. Do not roll back only the Function while leaving broader frontend authentication gates in place.

## Verification completed locally

27 backend tests, 18 frontend tests, and the production build passed. Backend coverage includes alternating custom roles for the same owner, a different user with `site_admin`, email collisions, malformed identities, missing configuration, configuration revocation, request-supplied setting spoofing, bounded storage queries, and contact validation. Package verification confirmed compiled owner authorization, production dependency resolution, required root files, portable archive paths, and absence of local settings and native modules. These checks do not establish the live Azure trust boundary; the production checks above remain required.
