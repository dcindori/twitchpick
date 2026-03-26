/**
 * app.js — wires TwitchChat + Wheel + WordCloud together.
 */

(function () {
  /* ── DOM refs ─────────────────────────────────────────────── */
  const channelInput  = document.getElementById('channel-input');
  const keywordInput  = document.getElementById('keyword-input');
  const connectBtn    = document.getElementById('connect-btn');
  const statusBadge   = document.getElementById('status-badge');
  const statusText    = document.getElementById('status-text');

  const participantCount   = document.getElementById('participant-count');
  const clearParticipants  = document.getElementById('clear-participants-btn');
  const spinBtn            = document.getElementById('spin-btn');
  const winnerDisplay      = document.getElementById('winner-display');
  const winnerName         = document.getElementById('winner-name');
  const prevWinnersWrap    = document.getElementById('prev-winners-wrap');
  const prevWinnersList    = document.getElementById('prev-winners-list');

  const participantsList   = document.getElementById('participants-list');

  const resetCloudBtn      = document.getElementById('reset-cloud-btn');
  const wordCount          = document.getElementById('word-count');
  const resetMsgCloudBtn   = document.getElementById('reset-msgcloud-btn');
  const messageCount       = document.getElementById('message-count');

  const chatFontDown  = document.getElementById('chat-font-down');
  const chatFontUp    = document.getElementById('chat-font-up');
  const chatFontLabel = document.getElementById('chat-font-label');

  /* ── Tabs ───────────────────────────────────────────────── */
  const tabs        = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      tabContents.forEach(tc => tc.classList.remove('active'));
      document.getElementById('tab-' + target).classList.add('active');
    });
  });

  /* ── Sub-systems ─────────────────────────────────────────── */
  const chat = new TwitchChat();

  const wheel = new Wheel(
    document.getElementById('wheel-scene'),
    document.getElementById('wheel-slots')
  );

  const cloud = new WordCloud(
    document.getElementById('cloud-words'),
    document.getElementById('chat-feed'),
    wordCount
  );

  const msgCloud = new MessageCloud(
    document.getElementById('msgcloud-words'),
    messageCount
  );

  /* ── State ───────────────────────────────────────────────── */
  let connected      = false;
  let lastWinner     = null;
  const allWinners   = [];

  /* ── Connect / Disconnect ────────────────────────────────── */
  connectBtn.addEventListener('click', () => {
    const ch = channelInput.value.trim();
    if (!ch) {
      channelInput.focus();
      return;
    }
    if (connected) {
      chat.disconnect();
      connected = false;
      connectBtn.innerHTML = '<span class="btn-connect-dot"></span>Connect';
      connectBtn.classList.remove('is-connected');
      resetEverything();
    } else {
      chat.connect(ch);
      connectBtn.innerHTML = '<span class="btn-connect-dot"></span>Disconnect';
      connectBtn.classList.add('is-connected');
    }
  });

  // Enter key on both inputs triggers connect
  channelInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') connectBtn.click();
  });
  keywordInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') connectBtn.click();
  });

  chat.onStatus = (state, detail) => {
    statusBadge.className = 'status-badge ' + state;
    statusText.textContent = detail || state;

    if (state === 'connected') {
      connected = true;
      connectBtn.innerHTML = '<span class="btn-connect-dot"></span>Disconnect';
      connectBtn.classList.add('is-connected');
    } else if (state === 'disconnected' || state === 'error') {
      connected = false;
      connectBtn.innerHTML = '<span class="btn-connect-dot"></span>Connect';
      connectBtn.classList.remove('is-connected');
    }
  };

  /* ── Chat messages ───────────────────────────────────────── */
  chat.onMessage = (username, message) => {
    const keyword = keywordInput.value.trim().toLowerCase();

    // Both counters get every message
    cloud.addMessage(username, message);
    msgCloud.addMessage(username, message);

    // After the message is added to the feed, check if this user is a winner
    const isWinner = allWinners.some(w => w.toLowerCase() === username.toLowerCase());
    if (isWinner) {
      const lastMsg = document.querySelector('.chat-feed .chat-message:last-child');
      if (lastMsg) lastMsg.classList.add('winner-match');
    }

    // Wheel: add participant if any word in message matches keyword exactly (case insensitive)
    const words = message.trim().toLowerCase().split(/\s+/);
    if (keyword === '' || words.includes(keyword)) {
      const added = wheel.addParticipant(username);
      if (added) {
        addParticipantChip(username);
        updateParticipantCount();
        // Highlight matching messages in feed (keyword takes precedence over winner)
        if (keyword !== '') {
          const lastMsg = document.querySelector('.chat-feed .chat-message:last-child');
          if (lastMsg) {
            lastMsg.classList.remove('winner-match');
            lastMsg.classList.add('keyword-match');
          }
        }
      }
    }
  };

  /* ── Wheel controls ──────────────────────────────────────── */
  clearParticipants.addEventListener('click', () => {
    wheel.clear();
    lastWinner = null;
    allWinners.length = 0;
    winnerDisplay.classList.add('hidden');
    participantsList.innerHTML = '<span class="empty-hint">Waiting for viewers…</span>';
    prevWinnersList.innerHTML = '';
    prevWinnersWrap.style.display = 'none';
    updateParticipantCount();
    // Remove winner highlights from existing chat messages
    document.querySelectorAll('.chat-message.winner-match').forEach(el => {
      el.classList.remove('winner-match');
    });
  });

  spinBtn.addEventListener('click', () => {
    if (wheel.count() === 0) return;
    winnerDisplay.classList.add('hidden');
    wheel.spin((winner) => {
      showWinner(winner);
      fireConfetti();
    });
  });

  function showWinner(winner) {
    lastWinner = winner;
    allWinners.push(winner);

    // Auto-exclude winner from future spins
    wheel.removeWinner(winner);
    removeParticipantChip(winner);

    winnerName.textContent = winner;
    winnerDisplay.classList.remove('hidden');

    // Previous winners list
    prevWinnersWrap.style.display = 'block';
    const tag = document.createElement('span');
    tag.className = 'prev-winner-tag';
    tag.textContent = winner;
    prevWinnersList.appendChild(tag);

    // Retroactively highlight this winner's messages in chat
    highlightWinnerMessages(winner);
  }

  function highlightWinnerMessages(winner) {
    const lowerWinner = winner.toLowerCase();
    document.querySelectorAll('.chat-feed .chat-message').forEach(msg => {
      const usernameEl = msg.querySelector('.username');
      if (usernameEl && usernameEl.textContent.toLowerCase() === lowerWinner) {
        if (!msg.classList.contains('keyword-match')) {
          msg.classList.add('winner-match');
        }
      }
    });
  }

  function addParticipantChip(username) {
    const hint = participantsList.querySelector('.empty-hint');
    if (hint) hint.remove();

    const chip = document.createElement('span');
    chip.className = 'participant-chip';
    chip.dataset.username = username.toLowerCase();
    chip.textContent = username;
    participantsList.appendChild(chip);
    participantsList.scrollTop = participantsList.scrollHeight;
  }

  function removeParticipantChip(username) {
    const chip = participantsList.querySelector(
      `.participant-chip[data-username="${username.toLowerCase()}"]`
    );
    if (chip) {
      chip.style.transition = 'opacity .2s, transform .2s';
      chip.style.opacity = '0';
      chip.style.transform = 'scale(.8)';
      setTimeout(() => chip.remove(), 200);
    }
    updateParticipantCount();
  }

  function updateParticipantCount() {
    const n = wheel.count();
    participantCount.textContent = n;
    spinBtn.disabled = (n === 0);
  }

  /* ── Reset everything (on disconnect) ──────────────────── */
  function resetEverything() {
    wheel.clear();
    lastWinner = null;
    allWinners.length = 0;
    winnerDisplay.classList.add('hidden');
    participantsList.innerHTML = '<span class="empty-hint">Waiting for viewers…</span>';
    prevWinnersList.innerHTML = '';
    prevWinnersWrap.style.display = 'none';
    updateParticipantCount();

    // Reset counters and chat feed
    cloud.reset();
    cloud.clearFeed();
    msgCloud.reset();
  }

  /* ── Counter controls ────────────────────────────────────── */
  resetCloudBtn.addEventListener('click', () => {
    cloud.reset();
  });

  resetMsgCloudBtn.addEventListener('click', () => {
    msgCloud.reset();
  });

  /* ── Chat font size controls ───────────────────────────── */
  let chatFontSize = 12;
  const CHAT_FONT_MIN = 10;
  const CHAT_FONT_MAX = 18;

  function setChatFontSize(size) {
    chatFontSize = Math.max(CHAT_FONT_MIN, Math.min(CHAT_FONT_MAX, size));
    document.documentElement.style.setProperty('--chat-font', chatFontSize + 'px');
    chatFontLabel.textContent = chatFontSize;
  }

  chatFontDown.addEventListener('click', () => setChatFontSize(chatFontSize - 1));
  chatFontUp.addEventListener('click', () => setChatFontSize(chatFontSize + 1));

  /* ── Confetti ────────────────────────────────────────────── */
  function fireConfetti() {
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      document.body.appendChild(canvas);
    }
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx    = canvas.getContext('2d');
    const pieces = [];
    const COLORS = ['#a970ff','#f97316','#22c55e','#facc15','#ef4444','#fff'];
    const N      = 140;

    for (let i = 0; i < N; i++) {
      pieces.push({
        x:   Math.random() * canvas.width,
        y:   Math.random() * -canvas.height * 0.5,
        w:   6 + Math.random() * 8,
        h:   10 + Math.random() * 6,
        r:   Math.random() * Math.PI * 2,
        dr:  (Math.random() - 0.5) * 0.2,
        vx:  (Math.random() - 0.5) * 4,
        vy:  3 + Math.random() * 5,
        col: COLORS[Math.floor(Math.random() * COLORS.length)],
        op:  1,
      });
    }

    let frame;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of pieces) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.12;
        p.r  += p.dr;
        if (p.y > canvas.height * 0.7) p.op -= 0.015;
        if (p.op <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.op);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) {
        frame = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(frame);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    draw();
  }

  /* ── Initial state ───────────────────────────────────────── */
  updateParticipantCount();
})();
