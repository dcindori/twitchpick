/**
 * WordCloud — counts word frequencies from chat messages and renders
 * a ranked vertical list: most common word on top (largest font),
 * each subsequent word smaller.
 *
 * Font size is proportional to count relative to the maximum count,
 * so the leader is always the largest regardless of absolute numbers.
 *
 * Font range : 14px – 56px
 * Max words  : 30 displayed at once
 */
class WordCloud {
  constructor(cloudEl, feedEl, countEl) {
    this.cloudEl = cloudEl;
    this.feedEl  = feedEl;
    this.countEl = countEl;

    this.counts       = {};   // word → count
    this.totalMessages = 0;
    this.MAX_FEED     = 60;   // keep last N messages in feed
    this.MAX_WORDS    = 30;   // displayed word rows

    this.FONT_MAX = 56;
    this.FONT_MIN = 14;

    this._renderScheduled = false;
  }

  /* ── Public API ─────────────────────────────────────────── */

  addMessage(username, text) {
    this.totalMessages++;
    if (this.countEl) this.countEl.textContent = `${this.totalMessages} message${this.totalMessages !== 1 ? 's' : ''}`;

    // Remove the empty-state placeholder
    const empty = this.feedEl.querySelector('.chat-empty');
    if (empty) empty.remove();

    // Add to live feed
    this._addToFeed(username, text);

    // Count every word in the message
    const words = text.trim().toLowerCase().split(/\s+/);
    for (const raw of words) {
      const word = raw.replace(/[^a-z0-9áéíóúñü!?]/gi, '');
      if (word.length === 0) continue;
      this.counts[word] = (this.counts[word] || 0) + 1;
    }

    // Schedule a cloud re-render (debounced to ~60fps)
    if (!this._renderScheduled) {
      this._renderScheduled = true;
      requestAnimationFrame(() => {
        this._renderCloud();
        this._renderScheduled = false;
      });
    }
  }

  reset() {
    this.counts        = {};
    this.totalMessages = 0;

    if (this.countEl) this.countEl.textContent = '0 messages';

    this.cloudEl.innerHTML = '<div class="cloud-empty">Capturing messages — words will appear here</div>';
    this.feedEl.innerHTML  = '<div class="chat-empty">Waiting for messages...</div>';
  }

  /* ── Internal ────────────────────────────────────────────── */

  _addToFeed(username, text) {
    const el = document.createElement('div');
    el.className = 'chat-message';
    el.innerHTML = `<span class="username">${this._escape(username)}</span>${this._escape(text)}`;
    this.feedEl.appendChild(el);

    // Cap feed size
    while (this.feedEl.children.length > this.MAX_FEED) {
      this.feedEl.removeChild(this.feedEl.firstChild);
    }

    // Auto-scroll to bottom
    this.feedEl.scrollTop = this.feedEl.scrollHeight;
  }

  _renderCloud() {
    // Sort words by count descending
    const sorted = Object.entries(this.counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.MAX_WORDS);

    if (sorted.length === 0) return;

    const maxCount = sorted[0][1];

    // Remove empty placeholder
    const empty = this.cloudEl.querySelector('.cloud-empty');
    if (empty) empty.remove();

    // We reuse existing rows if possible to avoid layout thrashing
    const existingRows = Array.from(this.cloudEl.querySelectorAll('.cloud-word-row'));

    sorted.forEach(([word, count], rank) => {
      const fontSize = this._calcFontSize(count, maxCount, rank, sorted.length);
      const opacity  = 0.55 + 0.45 * (count / maxCount);

      let row = existingRows[rank];
      if (!row) {
        row = document.createElement('div');
        row.className = 'cloud-word-row';
        row.innerHTML = `
          <span class="cloud-word-rank"></span>
          <span class="cloud-word-text"></span>
          <span class="cloud-word-count"></span>
        `;
        this.cloudEl.appendChild(row);
      }

      row.querySelector('.cloud-word-rank').textContent  = rank + 1;
      row.querySelector('.cloud-word-text').textContent  = word;
      row.querySelector('.cloud-word-text').style.fontSize = `${fontSize}px`;
      row.querySelector('.cloud-word-text').style.opacity  = opacity;
      row.querySelector('.cloud-word-count').textContent = `×${count}`;
    });

    // Remove surplus rows (list got shorter after reset somehow)
    for (let i = sorted.length; i < existingRows.length; i++) {
      existingRows[i].remove();
    }
  }

  /**
   * Font size calculation:
   * - rank 0 (top) always gets FONT_MAX regardless of count ratio
   * - subsequent words scale by their count ratio relative to max
   * - but we also apply a rank-based floor so the list grades smoothly
   */
  _calcFontSize(count, maxCount, rank, total) {
    const countRatio = count / maxCount;               // 0–1
    const rankRatio  = 1 - (rank / Math.max(total, 1)); // 1 → 0

    // Blend both signals: count ratio dominates, rank ensures ordering
    const blended = countRatio * 0.7 + rankRatio * 0.3;
    const size    = this.FONT_MIN + blended * (this.FONT_MAX - this.FONT_MIN);

    return Math.round(Math.max(this.FONT_MIN, Math.min(this.FONT_MAX, size)));
  }

  _escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
