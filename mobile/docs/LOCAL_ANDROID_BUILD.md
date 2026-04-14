# Local Android APK (no EAS cloud)

Build an **APK on your machine** with Gradle. No Expo build queue.

## One-time setup

1. **JDK 17** (Temurin / Android Studio bundled JBR).
2. **Android Studio** — install **Android SDK**, **SDK Platform** for your `compileSdk`, and **Build-Tools**.
3. Environment (add to `~/.zshrc` or equivalent):

   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"   # macOS default
   export PATH="$PATH:$ANDROID_HOME/platform-tools"
   ```

4. From repo root, install JS deps: `cd mobile && npm install`.

## Regenerate native project (when needed)

After changing `app.json` splash, icons, package name, or adding native modules:

```bash
cd mobile
npm run android:prebuild
```

This updates the `android/` folder. Commit the result if your team relies on a fixed native tree.

## Build APK

**Release APK** (minified when enabled; currently signed with **debug** keystore for easy internal installs — see `android/app/build.gradle`):

```bash
cd mobile
npm run apk:release
```

**Release AAB** (Android App Bundle — **upload this to Google Play**):

```bash
cd mobile
npm run aab:release
```

**Both** in one command:

```bash
cd mobile
npm run android:release
```

**Debug** (faster, larger):

```bash
cd mobile
npm run apk:debug
```

### Output paths

| Artifact | Location |
|----------|----------|
| Release APK | `android/app/build/outputs/apk/release/app-release.apk` |
| Release AAB (Play Store) | `android/app/build/outputs/bundle/release/app-release.aab` |
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` |

Send the file to testers; they enable **Install unknown apps** for their file manager / browser.

## Windows

Use `android\\gradlew.bat` instead of `./gradlew`, or run commands from **Android Studio** → **Build** → **Build Bundle(s) / APK(s)**.

## Play Store / production signing

The template **release** build may use the **debug** signing config for convenience. Before Play upload, generate a **release keystore**, add `keystore.properties` (never commit), and point `signingConfigs.release` at it — see [React Native signed APK](https://reactnative.dev/docs/signed-apk-android).

## EAS (optional)

`npm run build:android` / `build:android:apk` still call **EAS Build** if you want cloud builds occasionally; they are not required for local APKs.
