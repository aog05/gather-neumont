# Avatars (DiceBear)

This project generates avatar SVGs using the DiceBear JavaScript library.

## Install

Install dependencies with Bun:

```sh
bun install
```

## How It Works

- Avatars are generated at runtime using `@dicebear/core` + `@dicebear/collection`.
- Each DiceBear "style" produces an SVG string (which we can render directly or convert later as needed).

## Style Registry

We keep a registry of enabled DiceBear styles here:

- `src/avatars/dicebear_registry.ts`

This file is currently a stub and will be auto-generated from a dump file.

## Dump Workflow (Scaffolding)

There is a safe "paste zone" file intended for dropping unformatted import blocks while assembling the registry:

- `src/avatars/dicebear_dump.ts`

Do not wire these files into UI yet; this is scaffolding only.

## Troubleshooting

If `bun install` fails with "No version matching ^11.0.0", the versions are wrong; use 9.x.

After updating `package.json`, run:

```sh
bun install
```

## Fixing bun install if it keeps trying to install DiceBear 11.x

Older lockfiles can pin the wrong DiceBear versions even after updating `package.json`.

Exact steps:

1. Stop the dev server.
2. Delete `bun.lockb`.
3. Delete `node_modules`.
4. Run:

```sh
bun install
```

Verify the installed versions are 9.x:

```sh
bun pm ls @dicebear/core @dicebear/collection
```
