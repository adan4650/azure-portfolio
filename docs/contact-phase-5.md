# Phase 5 — automated Function deployments

**Status — November 20, 2026:** deployed. Workflows merged in [PR #1](https://github.com/adan4650/azure-portfolio/pull/1). After correcting Azure's federated subject to match GitHub's immutable-ID claim, [production run 44823422547, attempt 2](https://github.com/adan4650/azure-portfolio/actions/runs/44823422547/attempts/2) successfully signed in with OIDC and deployed the tested package to the existing Function App. Six post-deployment public/access-boundary checks passed, and the user confirmed that messages still loaded after refreshing the signed-in inbox. A fresh public submission check remains pending. See [release evidence](evidence/function-cicd-release-2026-11-20.json).

The deployed application commit is `1d566c8fb3e62097d39bbf4f1ec9aba1d135c73d`. Its Function ZIP SHA-256 is `ec1482e634a0f1a528a51755e7e0614f77699fadfbe51259cc512688549340af`. Azure reported successful One Deploy completion at 21:58:51 UTC. The later setup-script correction in `970d61e` changes no application code; rerunning the failed deployment reused the verified release artifact. The [frontend production workflow](https://github.com/adan4650/azure-portfolio/actions/runs/44823422652) also passed.

## Deployment design

`.github/workflows/deploy-function-app.yml` tests the API on pull requests, relevant pushes to `main`, and manual runs. It compiles TypeScript and assembles a Linux release from only `host.json`, `package.json`, the frozen lockfile, compiled `dist/`, and production dependencies. A hoisted dependency install makes the package self-contained. The entry point, route prefix, top-level allowlist, and dependency paths are checked before zipping and again after extraction. The ZIP is retained for 14 days and its SHA-256 appears in the workflow summary.

Pull requests can build and test but cannot deploy or request an Azure token. The production job runs only on `main`, after tests/package verification, and only when `AZURE_FUNCTION_DEPLOY_ENABLED` is exactly `true`. Deployments are serialized without canceling a running deployment. The deploy job alone has `id-token: write`. Action revisions are pinned to commits.

The dedicated user-assigned identity `id-portfolio-api-deploy` must trust exactly `repo:adan4650@119706246/azure-portfolio@1448468046:ref:refs/heads/main`. This is the actual subject seen in the GitHub run; the numeric IDs are public repository/owner identifiers. Its Website Contributor assignment is scoped to `func-portfolio-contact`. It is distinct from the Function's system-assigned storage identity and the unused historical sign-in identity. A deployment identity can change application code/settings, so repository write access remains security-sensitive.

The workflow uses OIDC, not a publish profile or client secret. It deploys the already-built ZIP with remote build disabled. It does not change the Function's linked authentication, owner setting, Turnstile settings, storage configuration, or the website's API link. The existing frontend workflow also now runs its test suite before building/deploying.

## 1. Create the Azure deployment identity

Open **Azure Portal → Cloud Shell → Bash**. Use **Manage files → Upload** to upload `scripts/setup-function-deployment.sh` from this repository, then run:

```bash
bash setup-function-deployment.sh
```

The script first checks that the existing Function App can be read. It then creates/reuses the dedicated identity, creates or verifies its GitHub `main` trust, and assigns Website Contributor on the app only. It also corrects this setup's known earlier name-only subject to the observed immutable-ID subject; it refuses to overwrite any unrelated subject. It is safe to rerun after an interrupted setup. It prints only three public identifiers; it does not read app settings or credentials. If Azure denies an operation, preserve the exact error and resolve it before enabling deployment. Do not broaden the role to the subscription or enable publishing basic authentication to work around an error.

**Build finding:** the first production login returned `AADSTS700213`. The Microsoft example used the older name-only subject, while this repository's token includes immutable owner/repository IDs. GitHub documents this default for repositories created after July 15, 2026. Update Azure's trust to the exact issued subject; do not remove the branch restriction or replace OIDC with a stored password. The failed run did not reach the deployment step. See [GitHub's immutable subject reference](https://docs.github.com/en/actions/reference/security/oidc#immutable-subject-claims).

## 2. Set GitHub repository variables

Open **adan4650/azure-portfolio → Settings → Secrets and variables → Actions → Variables → New repository variable**. Add the three values printed by the script:

| Variable | Value |
| --- | --- |
| `AZURE_FUNCTION_CLIENT_ID` | Client ID of `id-portfolio-api-deploy` |
| `AZURE_FUNCTION_TENANT_ID` | Directory/tenant ID returned for that identity |
| `AZURE_FUNCTION_SUBSCRIPTION_ID` | Subscription ID returned by the script |

These identifiers are not credentials. Do not put `INBOX_OWNER_USER_ID`, Turnstile secrets, storage keys, or a publish profile here. Keep those application settings in Azure.

Leave `AZURE_FUNCTION_DEPLOY_ENABLED` unset until the first build/package run succeeds and the identity/variables are configured. Then create this fourth repository variable with the value `true`.

## 3. Run the first production deployment

After the workflow is on `main`, open **GitHub → Actions → Contact API CI/CD → Run workflow**, select **main**, and run it. Both **Test and package API** and **Deploy production API** must succeed. A skipped deploy job means deployment is not enabled or the run is not on `main`; it is not proof of a deployment. The Azure Functions action detects the existing Flex Consumption app and uses its supported package deployment method.

Inspect the first real run before relying on automated deployment. Do not re-run failed deployment attempts blindly; inspect the failed step. A newly created identity/role may need propagation time. A failed Azure login is distinct from an application sign-in failure.

## 4. Verify the release

- Verify the public homepage and contact page still load. Send one synthetic test message and confirm it appears in the owner's inbox.
- As the already signed-in owner, refresh the inbox and reload `/admin`; no new sign-in should be required during these checks.
- Confirm anonymous and forged-principal requests to the inbox remain denied through the website and direct Function hostname. No records should be returned.
- Check new `account` and `submissions` requests in Application Insights. Do not place message contents, identities, cookies, tokens, or raw network exports in release evidence.
- Record the commit, workflow run URL, package hash, deployment result, and exact scope of live checks. The earlier second-account test is user-reported; do not claim the pipeline reran it.

These are release checks, not a reason to weaken authentication. Keep the Function's **Azure Static Web Apps (Linked)** provider enabled with Require authentication and unauthenticated HTTP 401.

## Rollback and disable

To stop further automatic API releases, set `AZURE_FUNCTION_DEPLOY_ENABLED` to `false`. This does not stop a deployment already in progress or stop the running API. For a code rollback, revert the bad change on `main` and let the same tests/package/deploy workflow run, or use a separately verified retained ZIP through the documented Cloud Shell deployment method. Do not re-run an old workflow blindly: it deploys the old run's commit and may restore older authorization behavior. Review [the owner repair rollback constraints](inbox-owner-repair.md#revocation-and-rollback).

For later maintenance, review branch protection and required checks, dependency/action updates, artifact retention, and deployment access. Do not grant this identity a storage data role.

## Sources

- [Azure Functions GitHub Actions and OIDC](https://learn.microsoft.com/en-us/azure/azure-functions/functions-how-to-github-actions)
- [Azure Functions action: Flex package and remote-build inputs](https://github.com/Azure/functions-action)
