# Project Context

## Snapshot

- Date: 2026-04-29
- Project: sastreria (React Native + Expo)
- Stage: MVP with CI/CD setup in progress

## Current Focus

- Validate EAS APK build pipeline from GitHub Actions.
- Stabilize mobile workflow for physical Android testing.
- Define agent-driven development lifecycle.

## Tech Stack

- Expo SDK 54
- React Native 0.81.x
- TypeScript strict
- Zustand, React Hook Form, Zod
- Expo SQLite (offline-first)
- EAS Build + GitHub Actions

## Risks / Blockers

- Network instability for Expo API in some environments.
- Node engine warnings in local environment (non-blocking now).
- EXPO_TOKEN was exposed previously and must be rotated.

## Recent Milestones

- EAS project linked and initialized.
- android.package configured for non-interactive EAS build.
- APK workflow created and adjusted.
- Specialized agents created for planning, build, testing, review, architecture, orchestration.

## Next Verification

- Re-run GitHub Action Build APK and validate successful artifact URL.
