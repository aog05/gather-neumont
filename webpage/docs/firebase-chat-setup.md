# Firebase Chat Setup

The chat write/admin endpoints use Firebase Admin SDK credentials on the Bun server.

## Credential options

### Option 1: `FIREBASE_SERVICE_ACCOUNT_JSON` (existing)

Set the full service-account JSON as an environment variable.

PowerShell (current session):

```powershell
$json = Get-Content -Raw "C:\secure\firebase-admin-service-account.json"
$env:FIREBASE_SERVICE_ACCOUNT_JSON = $json
# Optional override:
$env:FIREBASE_PROJECT_ID = ($json | ConvertFrom-Json).project_id
```

PowerShell (persistent for current user):

```powershell
$json = Get-Content -Raw "C:\secure\firebase-admin-service-account.json"
[Environment]::SetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_JSON", $json, "User")
[Environment]::SetEnvironmentVariable("FIREBASE_PROJECT_ID", (($json | ConvertFrom-Json).project_id), "User")
```

Open a new terminal after persistent changes.

### Option 2: `FIREBASE_SERVICE_ACCOUNT_PATH` (dev-friendly)

Set an absolute path to a local service-account JSON file outside the repo.

PowerShell (current session):

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_PATH = "C:\secure\firebase-admin-service-account.json"
# Optional override:
$env:FIREBASE_PROJECT_ID = "test-neumont"
```

PowerShell (persistent for current user):

```powershell
[Environment]::SetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_PATH", "C:\secure\firebase-admin-service-account.json", "User")
[Environment]::SetEnvironmentVariable("FIREBASE_PROJECT_ID", "test-neumont", "User")
```

Open a new terminal after persistent changes.

## `.env.local` notes

- Bun auto-loads `.env*` files unless `--no-env-file` is used.
- `.env.local` is gitignored in this repo, but it still contains secrets if you put credentials there.
- Do not commit any real credentials.
- A committable template is available at `webpage/.env.example`.

## Behavior when credentials are missing

If neither `FIREBASE_SERVICE_ACCOUNT_JSON` nor `FIREBASE_SERVICE_ACCOUNT_PATH` is configured, chat write/admin endpoints return `503 chat_unavailable`.

## Firestore rules/indexes deployment

This project includes chat-specific Firestore deployment config in:

- `webpage/firebase.json`
- `webpage/firestore.rules`
- `webpage/firestore.indexes.json`

Apply from the `webpage` directory:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Notes

- Feed queries still use `orderBy(documentId())` as a tie-breaker in client code.
- Firestore index files cannot explicitly include `__name__`; if Firebase prompts for additional index details, follow the generated link and merge updates into `firestore.indexes.json`.
