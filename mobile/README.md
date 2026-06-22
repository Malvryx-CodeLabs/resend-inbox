# Resend Inbox Mobile

Expo 54 mobile app for Resend Inbox.

## Scripts

```sh
npm install
npm start
npm run android
npm run typecheck
npm run android:prebuild
npm run apk:debug
npm run apk:release
```

## MVP Scope

- Dynamic backend URL onboarding
- `/health` and `/meta` compatibility validation
- Server access key registration
- Resend API key validation through the backend
- App session token storage
- AsyncStorage for backend URL and domain metadata
- Per-user webhook URL and signing secret setup
- Inbox list
- Thread detail with text and HTML rendering
- Compose from verified-domain aliases
- Replies with backend-managed thread headers
- Settings with backend status, webhook status, domain status, backend URL update, local sign out, and server account deletion

For a local backend, use a public HTTPS tunnel URL on physical devices. Android emulators can also use `http://10.0.2.2:3000`; iOS simulators can use `http://localhost:3000`.

## Local Android APK Build

This project does not use EAS Build or EAS Submit. Android APKs are built locally with Android SDK, Java, and Gradle. AAB and iOS builds are out of scope for now.

Prerequisites:

- JDK 17
- Android Studio or Android SDK command-line tools
- `ANDROID_HOME` or `ANDROID_SDK_ROOT` pointing to your Android SDK
- Android SDK Platform and Build Tools installed

Generate the native Android project:

```sh
npm run android:prebuild
```

Build a debug APK:

```sh
npm run apk:debug
```

Debug output:

```text
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Create a release keystore if you do not already have one:

```sh
keytool -genkeypair -v -storetype PKCS12 -keystore /absolute/path/to/resend-inbox-release.keystore -alias resend-inbox -keyalg RSA -keysize 2048 -validity 10000
```

Create `mobile/android/key.properties`:

```properties
storeFile=/absolute/path/to/resend-inbox-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=resend-inbox
keyPassword=YOUR_KEY_PASSWORD
```

Build a release APK:

```sh
npm run apk:release
```

Release output:

```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```

`mobile/android/key.properties`, keystores, and Firebase config files are ignored by git. Do not commit signing passwords or keystore files.

Android package name:

```text
com.malvryx.resendinbox
```

## Push Notifications

Push notifications use native Android FCM through `expo-notifications`; no Expo push service is used.

- `mobile/google-services.json` must exist and must target `com.malvryx.resendinbox`.
- The backend must be configured with Firebase Admin credentials.
- After changing notification or Firebase config, run `npm run android:prebuild` before building the APK.
