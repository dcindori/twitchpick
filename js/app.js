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
  const removeWinnerBtn    = document.getElementById('remove-winner-btn');
  const prevWinnersWrap    = document.getElementById('prev-winners-wrap');
  const prevWinnersList    = document.getElementById('prev-winners-list');

  const participantsSection = document.getElementById('participants-section');
  const participantsList    = document.getElementById('participants-list');

  const resetCloudBtn      = document.getElementById('reset-cloud-btn');
  const messageCount       = document.getElementById('message-count');

  /* ── Sub-systems ─────────────────────────────────────────── */
  const chat = new TwitchChat();

  const wheel = new Wheel(
    document.getElementById('wheel-scene'),
    document.getElementById('wheel-slots')
  );

  const cloud = new WordCloud(
    document.getElementById('cloud-words'),
    document.getElementById('chat-feed'),
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
      connectBtn.textContent = 'Connect';
    } else {
      chat.connect(ch);
      connectBtn.textContent = 'Disconnect';
    }
  });

  channelInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') connectBtn.click();
  });

  chat.onStatus = (state, detail) => {
    statusBadge.className = 'status-badge ' + state;
    statusText.textContent = detail || state;

    if (state === 'connected') {
      connected = true;
      connectBtn.textContent = 'Disconnect';
    } else if (state === 'disconnected' || state === 'error') {
      connected = false;
      connectBtn.textContent = 'Connect';
    }
  };

  /* ── Chat messages ───────────────────────────────────────── */
  chat.onMessage = (username, message) => {
    const keyword = keywordInput.value.trim().toLowerCase();

    // Word cloud always gets every message
    cloud.addMessage(username, message);

    // Wheel: add participant if keyword matches (or no keyword set)
    if (keyword === '' || message.trim().toLowerCase() === keyword) {
      const added = wheel.addParticipant(username);
      if (added) {
        addParticipantChip(username);
        updateParticipantCount();
        // Highlight matching messages in feed
        if (keyword !== '') {
          const lastMsg = document.querySelector('.chat-feed .chat-message:last-child');
          if (lastMsg) lastMsg.classList.add('keyword-match');
        }
      }
    }
  };

  /* ── Wheel controls ──────────────────────────────────────── */
  clearParticipants.addEventListener('click', () => {
    wheel.clear();
    lastWinner = null;
    winnerDisplay.classList.add('hidden');
    participantsList.innerHTML = '';
    participantsSection.style.display = 'none';
    updateParticipantCount();
  });

  spinBtn.addEventListener('click', () => {
    if (wheel.count() === 0) return;
    winnerDisplay.classList.add('hidden');
    wheel.spin((winner) => {
      showWinner(winner);
      fireConfetti();
    });
  });

  removeWinnerBtn.addEventListener('click', () => {
    if (lastWinner) {
      wheel.removeWinner(lastWinner);
      winnerDisplay.classList.add('hidden');
      // Immediately spin again
      if (wheel.count() - allWinners.length > 0) {
        setTimeout(() => wheel.spin(w => { showWinner(w); fireConfetti(); }), 200);
      }
    }
  });

  function showWinner(winner) {
    lastWinner = winner;
    allWinners.push(winner);
    winnerName.textContent = winner;
    winnerDisplay.classList.remove('hidden');

    // Previous winners list
    prevWinnersWrap.style.display = 'block';
    const tag = document.createElement('span');
    tag.className = 'prev-winner-tag';
    tag.textContent = winner;
    prevWinnersList.appendChild(tag);
  }

  function addParticipantChip(username) {
    participantsSection.style.display = 'flex';
    const chip = document.createElement('span');
    chip.className = 'participant-chip';
    chip.textContent = username;
    participantsList.appendChild(chip);
    // Scroll to newest chip
    participantsList.scrollTop = participantsList.scrollHeight;
  }

  function updateParticipantCount() {
    const n = wheel.count();
    participantCount.textContent = `${n} participant${n !== 1 ? 's' : ''}`;
    spinBtn.disabled = (n === 0);
  }

  /* ── Word cloud controls ─────────────────────────────────── */
  resetCloudBtn.addEventListener('click', () => {
    cloud.reset();
  });

  /* ── Confetti ────────────────────────────────────────────── */
  function fireConfetti() {
    // Lightweight canvas-based confetti — no external deps
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
    const COLORS = ['#9147ff','#ff6b35','#00d566','#ffcb47','#ff4b4b','#fff'];
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
        p.vy += 0.12; // gravity
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
