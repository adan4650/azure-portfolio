#!/usr/bin/env bash
# Run in the user's signed-in Azure Cloud Shell (Bash).
set -euo pipefail

portfolio_subscription='Azure for Students'
portfolio_group='azure-portfolio'
portfolio_app='func-portfolio-contact'
portfolio_identity='id-portfolio-api-deploy'
portfolio_credential='github-main'
portfolio_subject='repo:adan4650/azure-portfolio:ref:refs/heads/main'

# Resolve the existing app first. No resource creation if the app is unavailable.
portfolio_app_id=$(az functionapp show --subscription "$portfolio_subscription" \
  --resource-group "$portfolio_group" --name "$portfolio_app" --query id --output tsv)
portfolio_location=$(az functionapp show --subscription "$portfolio_subscription" \
  --resource-group "$portfolio_group" --name "$portfolio_app" --query location --output tsv)
test -n "$portfolio_app_id"
test -n "$portfolio_location"

portfolio_identity_count=$(az identity list --subscription "$portfolio_subscription" \
  --resource-group "$portfolio_group" --query "length([?name=='$portfolio_identity'])" --output tsv)
if [[ "$portfolio_identity_count" == '0' ]]; then
  az identity create --subscription "$portfolio_subscription" --resource-group "$portfolio_group" \
    --name "$portfolio_identity" --location "$portfolio_location" --output none
fi
portfolio_principal_id=$(az identity show --subscription "$portfolio_subscription" \
  --resource-group "$portfolio_group" --name "$portfolio_identity" --query principalId --output tsv)
test -n "$portfolio_principal_id"

portfolio_existing_subject=$(az identity federated-credential list --subscription "$portfolio_subscription" \
  --resource-group "$portfolio_group" --identity-name "$portfolio_identity" \
  --query "[?name=='$portfolio_credential'].subject | [0]" --output tsv)
if [[ -z "$portfolio_existing_subject" ]]; then
  az identity federated-credential create --subscription "$portfolio_subscription" \
    --resource-group "$portfolio_group" --identity-name "$portfolio_identity" \
    --name "$portfolio_credential" --issuer 'https://token.actions.githubusercontent.com' \
    --subject "$portfolio_subject" --audiences 'api://AzureADTokenExchange' --output none
elif [[ "$portfolio_existing_subject" != "$portfolio_subject" ]]; then
  echo 'Existing github-main credential trusts a different subject; inspect it before changing it.' >&2
  exit 1
fi
portfolio_trust_count=$(az identity federated-credential list --subscription "$portfolio_subscription" \
  --resource-group "$portfolio_group" --identity-name "$portfolio_identity" \
  --query "length([?name=='$portfolio_credential' && subject=='$portfolio_subject' && issuer=='https://token.actions.githubusercontent.com' && length(audiences)==\`1\` && contains(audiences, 'api://AzureADTokenExchange')])" --output tsv)
if [[ "$portfolio_trust_count" != '1' ]]; then
  echo 'Federated credential issuer/audience does not match GitHub OIDC; inspect it before continuing.' >&2
  exit 1
fi

# Website Contributor only on this Function App, not the resource group or subscription.
# The deployment identity is separate from the Function's storage identity.
portfolio_assignments=$(az role assignment list --subscription "$portfolio_subscription" \
  --scope "$portfolio_app_id" --query "length([?principalId=='$portfolio_principal_id' && roleDefinitionName=='Website Contributor'])" \
  --output tsv)
if [[ "$portfolio_assignments" == '0' ]]; then
  az role assignment create --subscription "$portfolio_subscription" \
    --assignee-object-id "$portfolio_principal_id" --assignee-principal-type ServicePrincipal \
    --role 'Website Contributor' --scope "$portfolio_app_id" --output none
fi

# Only public identifiers are printed. No app settings, keys, or tokens are read.
az identity show --subscription "$portfolio_subscription" --resource-group "$portfolio_group" \
  --name "$portfolio_identity" \
  --query '{AZURE_FUNCTION_CLIENT_ID:clientId,AZURE_FUNCTION_TENANT_ID:tenantId}' --output json
az account show --subscription "$portfolio_subscription" \
  --query '{AZURE_FUNCTION_SUBSCRIPTION_ID:id}' --output json
