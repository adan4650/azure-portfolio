# Monitoring evidence and Front Door subscription restriction

## Monitoring — verified November 20, 2026

User-provided Application Insights screenshots showed fresh `account` and `submissions` requests with HTTP 200. A 30-minute query initially returned no records; expanding the time window and generating new requests established that telemetry was being received. A blank query result alone did not establish an application failure.

The permanent log alert configuration was shown in Azure CLI output:

| Setting | Verified value |
| --- | --- |
| Rule | `alert-portfolio-api-5xx` |
| Resource group | `azure-portfolio` |
| Scope | Application Insights component `func-portfolio-contact` |
| Enabled / severity | Enabled / 2 (Warning) |
| Evaluation / window | Every 5 minutes / last 15 minutes |
| Measurement / threshold | Count of rows greater than 0 |
| Action group | `ag-portfolio-alerts` |
| Automatic resolution | Enabled |

```kusto
requests
| where timestamp > ago(15m)
| where toint(resultCode) between (500 .. 599)
```

The action group had one verified, enabled email receiver using the common alert schema. The portal's manual action-group test failed with a generic message. The CLI exposed `Conflict: Free subscription not supported`. Changing recipient settings did not solve that subscription restriction.

To verify real alert delivery without breaking the API, a temporary severity-3 rule named `alert-portfolio-email-chec` matched successful `account` requests. The user received its fired notification at 19:08 UTC on November 20. This verifies query evaluation → alert → email delivery. It does **not** prove the permanent 5xx rule fired on a real server failure. On November 20, the user confirmed that the temporary rule was deleted. Cleanup is user-reported; no independent Azure resource inventory was performed. Keep the permanent `alert-portfolio-api-5xx` rule and `ag-portfolio-alerts` action group.

The 5xx rule detects recorded server errors. It does not detect every browser/platform authorization error, an outage that emits no telemetry, or all storage failures. Some failures can occur before a request reaches the Function. Keep those limitations in the walkthrough. Monitor ingestion/retention cost and the existing spending budget.

## Front Door/WAF — attempted, blocked, deferred

The Azure Front Door Standard wizard passed validation for `afd-portfolio`, an origin pointing to the existing Static Web App, HTTPS forwarding, caching disabled, and a new `wafportfolio` policy. Actual deployment failed with:

> Free Trial and Student account is forbidden for Azure Frontdoor resources. (Code: BadRequest)

The resource group screenshot showed the standalone WAF policy, but no Front Door profile. The user subsequently reported removing `wafportfolio`. This cleanup is user-reported, not a new resource inventory check. The failed deployment record can remain as diagnostic history.

Front Door, its endpoint, custom WAF rules, and Front Door-origin restrictions are **not deployed**. The existing `azurestaticapps.net` hostname remains the entry point. No Front Door forwarding settings, Front Door-only origin lock, or new Turnstile hostname was applied by this setup. The linked Function authentication and existing SWA/API no-store settings remain part of the current design.

The decision is to keep the student subscription and defer this lab. Available student credit did not imply eligibility to create Front Door. Reconsider the service only with a supported subscription and a new cost review; do not claim Front Door/WAF protection in the project's architecture or demo.

The [separate Function deployment workflow](contact-phase-5.md) is deployed. Its first successful production run, six endpoint checks, and user-confirmed inbox refresh and new public submission are recorded in [release evidence](evidence/function-cicd-release-2026-11-20.json).

## Remaining closeout evidence

- Test live owner-setting revocation and restoration separately from deployment, recording observed propagation. Local authorization tests already cover the fail-closed behavior; Azure propagation remains untested.
- Complete the outstanding storage role audit and wrong-identity/Shared Key denial evidence without changing the working Function's permissions.
- Choose/document contact-message retention and a deletion procedure; no automatic deletion policy has been enabled.
- Inspect dependencies before removing the unused historical sign-in identity/registration. They are separate from storage and deployment identities.
- Record a walkthrough using synthetic messages, showing the deployed architecture, authorization repair, actual alert email, and Front Door restriction. Label planned or deferred capabilities explicitly.

## References

- [Azure log alert creation and query evaluation](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-create-log-alert-rule)
- [Microsoft response to the Front Door subscription error](https://learn.microsoft.com/en-us/answers/questions/1729771/unbale-to-create-azure-front-door-service-with-azu)
