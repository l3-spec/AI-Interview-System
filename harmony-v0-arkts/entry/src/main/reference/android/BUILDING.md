# Android Reference Build

The contents of this directory contain a frozen copy of `android-v0-compose/` (excluding the Gradle build outputs). Follow the upstream Android README notes if you need to confirm build behaviour while porting to HarmonyOS.

Common commands:

```bash
cd android-v0-compose
./gradlew assembleDebug
./gradlew connectedDebugAndroidTest
```

Keep the Android project in sync with the HarmonyOS ArkTS screens during the migration and make sure to port UI logic, data layer services, and assets page-by-page.
