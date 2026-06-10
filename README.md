# Planning Poker

A self-hosted planning poker app for agile team estimation. Real-time multiplayer via WebSockets.

## Features

- Create or join rooms with a 6-character code
- Poker-table layout: participants seated around a virtual table, cards revealed at their seats
- Multiple card decks: Fibonacci, Modified Fibonacci, T-Shirt, Powers of 2, Days
- Real-time voting — participants see who has voted without revealing values
- Facilitator controls: reveal votes, start new round, change deck, kick participants
- Issue queue: add stories, select the active one, set final estimates
- Throw emojis at teammates: click a player to open an emoji flyout (with full emoji picker and recently-used slots) and watch the projectile fly across the table
- GIF reactions: curated classics out of the box, plus Giphy search when `GIPHY_API_KEY` is set
- i18n: French by default, English available via the FR/EN switcher
- Meme quotes during voting and tongue-in-cheek one-liners about the revealed results
- Observer mode
- Mobile-responsive layout
- Invite link via room code copy

## Quick Start (Docker)

```bash
docker compose up --build
```

App is available at **http://localhost:3000**

## Development

Requires Node.js 20+. The repo is an npm workspace (`shared` + `server` + `client`),
written in strict TypeScript end to end.

```bash
# Install all workspaces
npm install

# Run server (tsx watch) and client (vite) in dev mode
npm run dev

# Type-check everything
npm run typecheck

# Production build (server bundle + client assets)
npm run build
```

- Client: http://localhost:5173
- Server: http://localhost:3001

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `VITE_SERVER_URL` | `` (same origin) | Override WebSocket server URL for the client |
| `GIPHY_API_KEY` | _(unset)_ | Optional. Enables GIF search in the reaction picker (free key from [developers.giphy.com](https://developers.giphy.com)). Without it, the curated GIF set still works. |

## Architecture

- **Shared**: TypeScript workspace package with the socket event contracts, domain
  types, deck definitions and vote statistics used by both sides
- **Server**: Node.js + Express + Socket.io in strict TypeScript (in-memory state, no
  database needed), bundled by esbuild into a single self-contained file
- **Client**: React + Vite + TailwindCSS in strict TypeScript
- **Deployment**: Docker Compose with Nginx reverse proxy; the server image ships only
  the bundled file (no node_modules)

## Usage

1. One team member creates a room and shares the invite link or room code
2. Others join via the link or by entering the room code
3. The facilitator (room creator) manages the session
4. Everyone picks a card — votes are hidden until the facilitator reveals them
5. Discuss, then start a new round
