# TwitchPick

A browser-based Twitch chat tool for streamers — no login, no API keys, just enter a channel name and go.

**Live demo:** `https://<your-github-username>.github.io/twitchpick`

---

## Features

### Spin Wheel
- Reads Twitch chat anonymously via IRC WebSocket — zero authentication required
- Optional keyword filter: only viewers who type an exact keyword enter the giveaway (e.g. `!enter`, `gg`, or any word you call out)
- Participant chips appear in real-time as people type the keyword
- **CS:GO case-opening easing** — starts at full speed, decelerates exponentially to a near-halt
- **iOS drum / 3D cylinder effect** — items rotate on the X axis as they scroll past, giving depth
- A fixed orange centre line acts as the selector; the winning name snaps under it
- Participants are shuffled randomly before every spin
- **Remove & Respin** — removes the current winner from the pool and immediately spins again
- Previous winners shown as tags at the bottom

### Word Cloud
- Every chat message is captured and displayed in a live scrolling feed
- Words are counted in real-time across all messages
- Most common word = largest font at the top; each rank below is progressively smaller
- Font size is frequency-proportional — the leader always dominates visually
- Perfect for "type 1 for X, type 2 for Y" polls — the top response rises to the top automatically
- **Reset** button wipes all counts and starts fresh without disconnecting

---

## Usage

### Option A — Open locally
1. Clone or download this repo
2. Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge)
3. No build step, no dependencies, no server needed

### Option B — GitHub Pages (free hosting)
1. Fork this repo
2. Go to **Settings → Pages**
3. Set Source to `Deploy from a branch`, branch `main`, folder `/ (root)`
4. Save — your site will be live at `https://<your-username>.github.io/twitchpick`

---

## How to run a giveaway

1. Enter your channel name and hit **Connect**
2. *(Optional)* Type a keyword (e.g. `!enter`) — only viewers who type this exact message will be entered
3. Announce the giveaway in your stream
4. Watch participant chips appear as viewers type
5. Hit **Spin** — the wheel launches fast and decelerates to a winner
6. Use **Remove & Respin** if the winner doesn't respond

## How to run a poll / word cloud

1. Connect to your channel (no keyword needed)
2. Tell chat: *"Type 1 for Option A, type 2 for Option B"*
3. Watch the word cloud update live — the most common response rises to the top
4. Hit **Reset** to start a new question

---

## Tech

- Vanilla HTML / CSS / JavaScript — no frameworks, no build tools
- Twitch IRC over WebSocket (`wss://irc-ws.chat.twitch.tv`) — anonymous read-only access
- 3D cylinder wheel uses `rotateX` CSS transforms calculated per-frame via `requestAnimationFrame`
- Easing: `1 - 2^(-10t)` (easeOutExpo)
- Confetti: lightweight canvas-based, no external libraries

---

## License

MIT
