# TwitchPick

A web app that connects to any Twitch channel and monitors chat in real-time. Run giveaways with an optional keyword filter or use the counters for quick community polls.

No login required, no API keys — just enter a channel name and connect.

## Features

- **Spin Wheel** — pick a random winner from chat participants
- **Optional keyword filter** — only viewers who type the keyword enter the giveaway
- **Live participant list** — see who entered in real-time
- **Winners auto-excluded** from the next spin, tracked as tags
- **Clear All** — reset and start a fresh giveaway without disconnecting

### Chat

- Live chat feed with adjustable font size
- Keyword messages highlighted in orange
- Winner messages highlighted in green

### Word Counter

Counts individual words from chat and ranks by frequency. Useful for quick polls like "type 1 for X, type 2 for Y".

### Message Counter

Aggregates full messages (trimmed, case-insensitive) and ranks by frequency. Perfect for open-ended questions like "what should we play?" — instantly see what chat is voting for.

## Usage

1. Open `index.html` in any browser
2. Enter a channel name and connect
3. Switch between Spin Wheel, Word Counter, and Message Counter tabs

No build step, no dependencies, no server needed. Works on GitHub Pages.

## Tech

Vanilla HTML / CSS / JS. Connects to Twitch IRC over WebSocket for anonymous read-only chat access.

## License

MIT
