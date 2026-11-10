# MiniGames

MiniGames is a single-page application for discovering casual games. It is written in Vanilla TypeScript and SCSS, built with Vite, and developed as part of the RS School course.

Live demo: [minigames-sand-delta.vercel.app](https://minigames-sand-delta.vercel.app/)

## Features

- Browse featured games and the weekly leaderboard.
- Browse the game library with category filters, sorting, and pagination.
- Open game details, view comments, add comments, like comments, and manage favorites.
- Sign in with email and password or Google.
- Use browser history, deep links, and URL-synchronised dialogs and filters.
- See loading, empty, and error states with retry actions.

### Cloud Collections

Cloud Collections is the project's creative extension. Authenticated users can:

- Create, rename, describe, and delete personal game collections.
- Add a game to a collection from the game-details dialog.
- Remove games while editing a collection.
- Open a collection on a dedicated URL: `/profile/collections/:id`.
- Access their private collections after signing in again.

Collections are stored in Cloud Firestore under `users/{uid}/collections/{collectionId}`. Each collection keeps its saved games in an `items/{gameSlug}` subcollection. Firestore security rules restrict reads and writes to the collection owner and validate stored data. Transactions prevent duplicate game entries and keep collection metadata consistent.

## Architecture

- `src/app` — application startup, routing, URL navigation, dialogs, and authentication flow.
- `src/pages` — Home, Library, Profile, and Collection pages.
- `src/components` — reusable UI components, dialogs, forms, and loading states.
- `src/api` — requests to the MiniGames REST API.
- `src/services/session` — client-side session state.
- `src/services/firebase` — Firebase initialization and authentication.
- `src/services/collections` — shared collections state and Firestore repository operations.

The application keeps page and dialog state in the URL. Components request navigation through a custom event, the router updates browser history, and the dialog controller opens the dialog selected by query parameters.

## Tech Stack

- TypeScript
- SCSS
- Vite
- Firebase Authentication and Cloud Firestore
- Vitest
- ESLint, Prettier, Husky, and commitlint

## Getting Started

Requires a current Node.js LTS.

```bash
npm install
npm run dev
```

To use authentication and Cloud Collections locally, create `.env` from `.env.example` and provide the Firebase web-app configuration. `VITE_API_BASE_URL` is optional; the application uses its default API URL when it is not set.

Deploy the rules from [firestore.rules](./firestore.rules) to the Firebase project used by the app.

## Scripts

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the development server             |
| `npm run build`        | Type-check and create a production build |
| `npm run preview`      | Preview the production build locally     |
| `npm run test`         | Run unit tests                           |
| `npm run typecheck`    | Run TypeScript checks                    |
| `npm run lint`         | Run ESLint                               |
| `npm run lint:fix`     | Run ESLint and fix issues                |
| `npm run format`       | Format the project with Prettier         |
| `npm run format:check` | Check formatting with Prettier           |

## Client Session

The client app session is stored under `minigames:minigames-aidar:app-session` in `localStorage` and expires seven days after authentication. It is used only for client-side UI state; it does not contain credentials and does not grant backend access. Firebase Authentication and Firestore security rules enforce access to private cloud collections.
