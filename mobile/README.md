# Pitch Nav Mobile

This Expo app provides the Pitch Nav athlete, checkout, upload, Motion Lab, feedback, plan, and admin experiences on iPhone, iPad, and Android. It uses the same production website, account, Supabase data, Stripe Checkout, and staff workflow as the web app, so changes to the website appear in the mobile app automatically.

## What the app includes

- Persistent Pitch Nav sign-in and browser storage
- Phone and tablet layouts from the responsive website
- Camera, microphone, photo-library, and file-upload support
- Stripe Checkout and Supabase authentication inside the app
- Fullscreen and inline pitching-video playback
- Pull to refresh, Android back-button support, deep links, loading progress, and a friendly offline screen
- External support and social links open in the device browser

## Run it locally

1. Install Node.js 20 or newer.
2. Open Terminal and enter:

   ```bash
   cd "/Users/lukecondrin/Documents/Codex/2026-07-14/pitchframe-website/work/pitchframe-ai/mobile"
   npm install
   npm start
   ```

3. Follow Expo's instructions to open an iOS simulator, Android emulator, or development build.

The production site defaults to `https://pitch-nav.vercel.app`. To use a preview deployment, copy `.env.example` to `.env` and change `EXPO_PUBLIC_WEB_APP_URL`.

## Build an installable test app

Expo Application Services (EAS) builds signed iPhone/iPad and Android apps in the cloud.

```bash
cd "/Users/lukecondrin/Documents/Codex/2026-07-14/pitchframe-website/work/pitchframe-ai/mobile"
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform all --profile preview
```

Expo will provide install links when the preview builds finish.

## Build for the App Store and Google Play

You need an Apple Developer account and a Google Play Console account.

```bash
npx eas-cli build --platform all --profile production
npx eas-cli submit --platform ios --profile production
npx eas-cli submit --platform android --profile production
```

Before store submission:

- Confirm `com.pitchnav.app` is available as the iOS bundle ID and Android package name.
- Replace the support/contact/legal placeholders on the website.
- Test signup, email verification, subscriptions, video upload, staff review, report delivery, and account deletion on physical devices.
- Provide Apple and Google with a reviewer test account and clear instructions for reaching the paid workflow.
- Complete privacy labels/data-safety forms based on the actual Supabase, Stripe, Resend, OpenAI, and analytics configuration.

## Important deployment behavior

The mobile app loads the production website. Website fixes deploy through Vercel and appear in the app without a new store release. Changes to native permissions, icons, package IDs, or this Expo shell require a new mobile build and store release.
