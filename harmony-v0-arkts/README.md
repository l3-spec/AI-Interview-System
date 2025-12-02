# HarmonyOS Port of AI Interview App

This module hosts the HarmonyOS (ArkTS Stage model) port of the Android Compose AI Interview client that lives under `android-v0-compose/`. The project layout mirrors the default DevEco Studio template so it can be opened directly in the IDE and incrementally migrated page by page.

## Structure

- `AppScope/` – global bundle metadata (`app.json5`).
- `entry/` – main ability module converted to the Stage model with ArkTS sources under `src/main/ets`.
- `entry/src/main/ets/pages/` – entry pages that will gradually replace the Jetpack Compose screens.
- `entry/src/main/resources/` – shared HarmonyOS resources (strings, colors, icons).
- `entry/src/main/reference/android/` – a verbatim copy of the Android Compose implementation for side-by-side conversion.

## Getting Started

1. Open the project in DevEco Studio (`File -> Open -> harmony-v0-arkts`).
2. Sync dependencies with `ohpm install` (or use the IDE prompt).
3. Start porting Compose screens in `reference/android/` to ArkTS components under `ets/pages`.
4. Update `module.json5` and `EntryAbility.ets` with actual routing when pages are ready.

Refer to `reference/android/BUILDING.md` (auto-generated from the Android project) for parity checks during the migration.
