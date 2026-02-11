# Assets Audit (public/assets)

This document inventories files under `public/assets/` and records how the UI config maps to real filenames.

## Inventory

### `public/assets/branding/`

- `NeumontLogo.jpg`
- `NeumontNoBackground.png`

### `public/assets/majors/`

- `BSCSLogo.svg`
- `Degree-Icons_24_Final_BSAAI.svg`
- `Degree-Icons_24_Final_BSAIE.svg`
- `Degree-Icons_24_Final_BSSE.svg`
- `bsgd_newicon.svg`
- `bsis_newicon.svg`

## Config Mapping

### Branding

- `NEUMONT_LOGO` -> `/assets/branding/NeumontLogo.jpg`
- `NEUMONT_MARK` -> `/assets/branding/NeumontNoBackground.png`

### Majors

- `BSCS` -> `/assets/majors/BSCSLogo.svg`
- `BSSE` -> `/assets/majors/Degree-Icons_24_Final_BSSE.svg`
- `BSIS` -> `/assets/majors/bsis_newicon.svg`
- `BSGD` -> `/assets/majors/bsgd_newicon.svg`
- `BSAIE` -> `/assets/majors/Degree-Icons_24_Final_BSAIE.svg`
- `BSAAI` -> `/assets/majors/Degree-Icons_24_Final_BSAAI.svg`
- `UNDECIDED` -> `/assets/majors/bsis_newicon.svg` (placeholder)

## Notes / Gaps

- No dedicated `UNDECIDED` icon file exists under `public/assets/majors/` yet, so `UNDECIDED` is temporarily pointing at the BSIS icon to avoid a broken path.

## Renamed to Canonical

### Branding

- `public/assets/branding/NeumontLogo.jpg` -> `public/assets/branding/neumont_logo.jpg` (kept `.jpg`)
- `public/assets/branding/NeumontNoBackground.png` -> `public/assets/branding/neumont_mark.png`

### Majors

- `public/assets/majors/BSCSLogo.svg` -> `public/assets/majors/bscs.svg`
- `public/assets/majors/Degree-Icons_24_Final_BSSE.svg` -> `public/assets/majors/bsse.svg`
- `public/assets/majors/bsis_newicon.svg` -> `public/assets/majors/bsis.svg`
- `public/assets/majors/bsgd_newicon.svg` -> `public/assets/majors/bsgd.svg`
- `public/assets/majors/Degree-Icons_24_Final_BSAIE.svg` -> `public/assets/majors/bsaie.svg`
- `public/assets/majors/Degree-Icons_24_Final_BSAAI.svg` -> `public/assets/majors/bsaai.svg`

### Undecided

- Created `public/assets/majors/undecided.svg` as a copy of `public/assets/majors/bsis.svg` (placeholder icon; no dedicated undecided asset existed).
