/**
 * TwitchChat — anonymous read-only Twitch IRC over WebSocket.
 * No API keys or OAuth required for reading chat.
 */
class TwitchChat {
    constructor() {
        this.ws = null;
        this.channel = "";
        this.onMessage = null; // fn(username, message)
        this.onStatus = null; // fn('connecting'|'connected'|'disconnected'|'error', detail)
        this._pingTimer = null;
        this._reconnectTimer = null;
        this._intentional = false;
    }

    connect(channel) {
        this.disconnect();
        this._intentional = false;
        this.channel = channel.toLowerCase().replace(/^#/, "");

        this._setStatus("connecting", `Joining #${this.channel}…`);

        this.ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

        this.ws.onopen = () => {
            // Anonymous login (justinfan + random number)
            const nick = "justinfan" + Math.floor(Math.random() * 90000 + 10000);
            this.ws.send("PASS SCHMOOPIIE");
            this.ws.send("NICK " + nick);
            this.ws.send("JOIN #" + this.channel);

            // Keep-alive ping every 4 minutes
            this._pingTimer = setInterval(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send("PING :tmi.twitch.tv");
                }
            }, 240000);
        };

        this.ws.onmessage = (event) => {
            const raw = event.data;

            // Handle multi-line messages
            raw.trim()
                .split("\r\n")
                .forEach((line) => this._parseLine(line));
        };

        this.ws.onclose = (e) => {
            this._clearTimers();
            if (!this._intentional) {
                this._setStatus("error", "Connection lost — reconnecting…");
                this._reconnectTimer = setTimeout(() => this.connect(this.channel), 4000);
            } else {
                this._setStatus("disconnected", "Disconnected");
            }
        };

        this.ws.onerror = () => {
            this._setStatus("error", "WebSocket error");
        };
    }

    disconnect() {
        this._intentional = true;
        this._clearTimers();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    _parseLine(line) {
        // Respond to PING immediately
        if (line.startsWith("PING")) {
            this.ws.send("PONG :tmi.twitch.tv");
            return;
        }

        // Detect successful channel join
        if (line.includes("JOIN #" + this.channel)) {
            this._setStatus("connected", "#" + this.channel);
            return;
        }

        // PRIVMSG — chat message
        // Format: :username!username@username.tmi.twitch.tv PRIVMSG #channel :message text
        const privmsgMatch = line.match(/^:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)$/);
        if (privmsgMatch && this.onMessage) {
            const username = privmsgMatch[1];
            const message = privmsgMatch[2];
            this.onMessage(username, message);
        }
    }

    _setStatus(state, detail) {
        if (this.onStatus) this.onStatus(state, detail || "");
    }

    _clearTimers() {
        clearInterval(this._pingTimer);
        clearTimeout(this._reconnectTimer);
    }
}
