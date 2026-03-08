# Forum Known Issues and Troubleshooting

Last updated: March 8, 2026

## Known issues

### Emulator data mismatch with non-chat systems
Symptom:
- Forum works locally, but NPC dialogue or other Firestore-backed systems appear broken.

Cause:
- Emulator seed script only seeds chat collections.
- Current local rules allow only chat reads/writes by default, so non-chat reads can fail in emulator mode.

What to check:
- Whether app is connected to emulator or project Firestore
- Whether required non-chat collections exist in emulator
- Whether rules permit required reads

### Direct writes and server API can drift
Symptom:
- Behavior differs between UI direct actions and backend API expectations.

Cause:
- Forum UI currently uses direct Firestore writes.
- Server chat endpoints still exist with separate guard logic.

What to check:
- Which path is being used for the action
- Whether rule enforcement is expected at client or server boundary

### Emulator not running or wrong host
Symptom:
- Feed/report/send errors such as `permission-denied` or connection failures.

What to check:
- `bun run emu:start` is active
- Emulator host/port match current config
- If env override is used, host value is correct

### Port conflict on 8080
Symptom:
- Emulator fails to start.

What to check:
- Stop existing process on `8080`
- Or change emulator port and update both app and seed host settings

### Missing index errors
Symptom:
- Query errors for feed/reported/quarantined views.

What to check:
- `firestore.indexes.json` includes required composites
- Emulator restarted after index changes

## Fast triage checklist
1. Confirm emulator status and ports.
2. Confirm app is using expected Firestore target (emulator vs project).
3. Confirm chat seed data exists.
4. Confirm rules/indexes loaded.
5. Confirm auth mode and admin role if moderation actions fail.

## Known temporary constraints
- Emulator workflow is temporary until Firebase access/deployment control is restored.
- Seeded data is demo data, not canonical project content.
- Local rules are intentionally permissive for chat MVP and should not be treated as production policy.
