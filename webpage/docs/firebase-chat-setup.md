# Firebase Chat Rules/Indexes Setup

This project now includes chat-specific Firestore deployment config in:

- `webpage/firebase.json`
- `webpage/firestore.rules`
- `webpage/firestore.indexes.json`

## Apply from the `webpage` directory

1. Authenticate Firebase CLI for the target project.
2. Run:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Notes

- Feed queries still use `orderBy(documentId())` as a tie-breaker in client code.
- Firestore index files cannot explicitly include `__name__`; if Firebase prompts for additional index details, follow the generated link and merge updates into `firestore.indexes.json`.
