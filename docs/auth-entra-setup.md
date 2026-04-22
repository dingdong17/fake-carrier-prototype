# Microsoft Entra SSO — Azure App Registration

Operational steps for registering the FakeCarrier app in Entra and
granting tenant admin consent. Only needed once per tenant; covermesh
is the only tenant onboarded at first.

## 1. Create the app registration (covermesh tenant admin)

1. Sign in to https://entra.microsoft.com as a covermesh tenant admin.
2. **Applications → App registrations → New registration.**
3. Fields:
   - **Name:** `FakeCarrier`
   - **Supported account types:** *Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)*
   - **Redirect URI:** Web, `https://fakecarrier.rorlach.de/api/auth/callback/microsoft-entra-id`
4. Register.

## 2. Add the localhost redirect URI (dev)

1. In the new app → **Authentication → Add URI.**
2. Add `http://localhost:3000/api/auth/callback/microsoft-entra-id`.
3. Save.

## 3. Create a client secret

1. **Certificates & secrets → Client secrets → New client secret.**
2. Description: `fakecarrier-prod`. Expiry: 12 months.
3. **Copy the secret value immediately** — it's only shown once.

## 4. Capture the three env values

From the app's **Overview** page:
- **Application (client) ID** → `AZURE_AD_CLIENT_ID`
- **Directory (tenant) ID** → `ENTRA_COVERMESH_TENANT_ID`
- Client secret from step 3 → `AZURE_AD_CLIENT_SECRET`

Push to Vercel:

```bash
vercel env add AZURE_AD_CLIENT_ID production
vercel env add AZURE_AD_CLIENT_SECRET production
vercel env add ENTRA_COVERMESH_TENANT_ID production
# Repeat for `preview` and `development` as needed.
```

And to local `.env.local`.

## 5. API permissions

Default `User.Read` (delegated, Microsoft Graph) is sufficient. No
additional scopes are needed — we only use the OpenID Connect flow
(`openid profile email`) to verify the user.

## 6. Admin consent

1. On the **API permissions** page → **Grant admin consent for
   covermesh**. This skips the per-user consent prompt for all
   covermesh users.
2. For each new tenant (Ecclesia, SCHUNCK), their tenant admin must
   grant consent via:

```
https://login.microsoftonline.com/{TENANT_ID}/adminconsent?client_id={AZURE_AD_CLIENT_ID}&redirect_uri=https://fakecarrier.rorlach.de/api/auth/callback/microsoft-entra-id
```

## 7. Test

1. `npm run dev`.
2. Open http://localhost:3000/login → Microsoft button.
3. Sign in with a covermesh account.
4. Expected: land on `/broker` (or `/admin` if already promoted).

## Adding another tenant later

1. The other tenant's admin grants consent via the URL in step 6.
2. Add an env var `ENTRA_ECCLESIA_TENANT_ID` (or SCHUNCK equivalent).
3. Update `src/lib/auth/entra-tenants.ts` — add a block mirroring the
   covermesh one inside `TENANT_ALLOWLIST()`.
4. Update `src/lib/auth/trusted-domains.ts` — append the domain to
   `TRUSTED_DOMAINS`.
5. Ship.
