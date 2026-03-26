# TwitchPick

A simple web app that connects to any Twitch channel and monitors chat in real-time. Run giveaways with an optional keyword filter, or use the counters for quick community polls.

No login required, no API keys — just enter a channel name and connect.

## Features

- **Live chat feed** with keyword highlighting and winner highlighting
- **Keyword-based giveaways** — set an optional keyword and only viewers who type it enter the draw
- **Spin wheel** with CS:GO case-opening style animation to pick a winner
- **Participant list** — see who entered in real-time as chips
- **Auto-exclude winners** — winners are automatically removed from the participant pool
- **Remove & Respin** — if a winner doesn't respond, remove them and spin again to continue the giveaway
- **Clear All** — reset participants and start a fresh giveaway without disconnecting
- **Previous winners** tracked as tags so you don't lose track

### Chat

- Full live chat feed at the bottom of the screen
- Messages containing the keyword are highlighted in orange
- Winner messages are highlighted in green with a left accent bar
- Adjustable font size

### Word Counter

Counts every individual word from chat in real-time and ranks them by frequency. The most common word gets the largest font and sits at the top. Useful for single-word polls like "type 1 for X, type 2 for Y". Hit Reset Words to start fresh.

### Message Counter

Aggregates full chat messages (trimmed, case-insensitive) and ranks them by frequency. If 50 people type "Valorant" and 30 type "CS2", you instantly see which game wins. Perfect for open-ended questions like "what should we play?" where answers are full words or phrases. Hit Reset Messages to start a new question.

## Usage

1. Open `index.html` in any modern browser
2. Enter a channel name and click Connect
3. Optionally set a keyword for giveaways
4. Switch between Spin Wheel, Word Counter, and Message Counter tabs as needed

No build step, no dependencies, no server needed. Can also be hosted for free on GitHub Pages.

## Tech

Vanilla HTML / CSS / JavaScript. Connects to Twitch IRC over WebSocket for anonymous read-only chat access.

## License

MIT
