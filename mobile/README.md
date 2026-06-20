# Resend Inbox Mobile

Expo 54 mobile app for Resend Inbox.

## Scripts

```sh
npm install
npm start
npm run ios
npm run android
npm run typecheck
```

## MVP Scope

- Dynamic backend URL onboarding
- `/health` and `/meta` compatibility validation
- Resend API key validation through the backend
- SecureStore for the API key
- AsyncStorage for backend URL and domain metadata
- Inbox list
- Thread detail with text and HTML rendering
- Compose from verified-domain aliases
- Replies with backend-managed thread headers
- Settings with backend status, domain status, backend URL update, and reset

For a local backend, use a public HTTPS tunnel URL on physical devices. Android emulators can also use `http://10.0.2.2:3000`; iOS simulators can use `http://localhost:3000`.
