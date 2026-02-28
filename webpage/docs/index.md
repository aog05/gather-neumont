# Docs Index

This project is a Bun-served React SPA with a Phaser game always running in the
background. Most UI (auth, onboarding, account, daily quiz) renders as overlay
routes/panels on top of the game.

## Table of contents

- [Docs index](index.md)
- [Tech stack](tech-stack.md)
- [Architecture](architecture.md)
- [Flows (with ASCII diagrams)](flows.md)
- [API reference](api.md)
- [Data model (DB handoff)](data-model.md)
- [Diagram: system architecture](diagrams/system-architecture.md)
- [Diagram: UI map](diagrams/ui-map.md)
- [Diagram: data flow](diagrams/data-flow.md)
- [Presentation (5-minute summary)](presentation.md)
- [Note: assets audit](assets_audit.md)
- [Note: avatars](avatars.md)
- [Note: onboarding/login](onboarding_login.md)

## How to run (quick start)

Prereqs: Bun installed.

```sh
bun install
bun dev
```

Then open the URL printed in the server console (typically `http://localhost:3000`).
