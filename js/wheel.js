/**
 * Wheel — CS:GO-style vertical slot machine with iOS 3-D drum effect.
 *
 * Animation model
 * ───────────────
 * All items share a single "scroll offset" (a float, in pixels).
 * scrollOffset / ITEM_H  →  which item is conceptually centered.
 *
 * A fixed pool of DOM slots is reused (virtual list). Each slot is
 * positioned at the vertical centre of the container and then
 * transformed to appear at the correct place on a virtual cylinder.
 *
 * Cylinder model
 * ──────────────
 * Imagine a drum of radius R whose axis runs left–right through the
 * centre of the container. Items sit on the drum surface.
 * For a slot at logical offset `d` items from centre:
 *   angle  = d * ITEM_H / R        (radians)
 *   visualY = sin(angle) * R
 *   visualZ = cos(angle) * R − R   (depth; at angle=0 → Z=0, at ±90° → Z=−R)
 *   rotateX = −angle (degrees)
 *   opacity = cos(angle)           (0 at ±90°, 1 at centre)
 *
 * Easing
 * ──────
 * Uses easeOutExpo: starts very fast, decelerates exponentially.
 * This matches the CS:GO case-opening feel.
 */

class Wheel {
  constructor(sceneEl, slotsEl) {
    this.scene    = sceneEl;
    this.slotsEl  = slotsEl;

    // Geometry
    this.ITEM_H   = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--item-h')) || 64;
    this.R        = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cylinder-r')) || 160;
    this.NUM_SLOTS = 13;   // odd — centre slot is index 6

    // State
    this.participants  = [];   // current unique participant set
    this.removed       = [];   // winners that have been removed
    this.scrollOffset  = 0;    // current scroll position (pixels)
    this.isSpinning    = false;

    // Animation
    this._raf   = null;
    this._t0    = null;
    this._from  = 0;
    this._to    = 0;
    this._dur   = 0;
    this._onDone = null;

    // The items array — participants (shuffled) repeated many times
    // so we can spin freely without running out.
    this._items = [];

    this._buildSlots();
  }

  /* ── Public API ───────────────────────────────────────────── */

  addParticipant(username) {
    if (!this.participants.includes(username)) {
      this.participants.push(username);
      this._rebuildItems();
      return true;
    }
    return false;
  }

  clear() {
    this.participants = [];
    this.removed      = [];
    this._items       = [];
    this.scrollOffset = 0;
    this._render();
  }

  count() { return this.participants.length; }

  spin(onWinner) {
    if (this.isSpinning || this.participants.length === 0) return;

    // Eligible participants (not already removed)
    const eligible = this.participants.filter(p => !this.removed.includes(p));
    if (eligible.length === 0) return;

    // Shuffle eligible list; first item becomes winner
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const winner   = shuffled[0];

    // Rebuild items with this shuffle so the winner appears at index 0
    this._rebuildItems(shuffled);

    const SPINS        = 8 + Math.floor(Math.random() * 4); // 8–11 full revolutions
    const startIndex   = Math.round(this.scrollOffset / this.ITEM_H);
    const winnerIdx    = 0; // winner is at position 0 in the shuffled list
    const n            = shuffled.length;

    // Target: land on winner after SPINS full cycles past current position
    const targetIndex  = startIndex + SPINS * n + winnerIdx;
    const targetOffset = targetIndex * this.ITEM_H;

    // Adjust duration based on distance so very small lists don't snap
    const distance = targetOffset - this.scrollOffset;
    const duration = Math.max(4500, Math.min(7000, distance / 6));

    this.isSpinning = true;
    this.scene.classList.add('spinning');

    this._animate(this.scrollOffset, targetOffset, duration, () => {
      this.isSpinning = false;
      this.scene.classList.remove('spinning');
      this._markCenterSlot(true);
      if (onWinner) onWinner(winner);
    });
  }

  removeWinner(winner) {
    this.removed.push(winner);
  }

  /* ── Internal ─────────────────────────────────────────────── */

  _buildSlots() {
    this.slots = [];
    for (let i = 0; i < this.NUM_SLOTS; i++) {
      const wrap  = document.createElement('div');
      wrap.className = 'wheel-slot';

      const inner = document.createElement('div');
      inner.className = 'wheel-slot-inner';

      wrap.appendChild(inner);
      this.slotsEl.appendChild(wrap);
      this.slots.push({ wrap, inner });
    }
  }

  _rebuildItems(shuffled) {
    // Use provided shuffle or create one from participants
    const base = shuffled || [...this.participants].sort(() => Math.random() - 0.5);
    if (base.length === 0) { this._items = []; return; }

    // Repeat enough times that the spin animation never runs out
    const REPS  = Math.max(30, Math.ceil(600 / base.length));
    this._items = [];
    for (let r = 0; r < REPS; r++) {
      for (const p of base) this._items.push(p);
    }
  }

  _itemAt(index) {
    if (this._items.length === 0) return '';
    const i = ((index % this._items.length) + this._items.length) % this._items.length;
    return this._items[i];
  }

  _render() {
    const IH        = this.ITEM_H;
    const R         = this.R;
    const CENTER    = Math.floor(this.NUM_SLOTS / 2); // e.g. 6
    const centerIdx = this.scrollOffset / IH;         // fractional item index

    // Fractional part (always 0–1) representing how far past the integer boundary we are
    const frac = centerIdx - Math.floor(centerIdx);

    this.slots.forEach((slot, s) => {
      const offset        = s - CENTER;               // slots relative to centre
      const exactOffset   = offset - frac;            // sub-slot precision (continuous)
      const itemIndex     = Math.floor(centerIdx) + offset;
      const name          = this._itemAt(itemIndex);

      // Cylinder transform
      const angle   = (exactOffset * IH) / R;         // radians
      const absAngle = Math.abs(angle);

      if (absAngle > Math.PI * 0.52) {
        // Behind the drum — hide
        slot.wrap.style.opacity   = '0';
        slot.wrap.style.visibility = 'hidden';
        slot.inner.textContent    = '';
        slot.wrap.classList.remove('is-center');
        return;
      }

      const sinA  = Math.sin(angle);
      const cosA  = Math.cos(angle);
      const y     = sinA * R;
      const z     = cosA * R - R;
      const rotX  = -(angle * 180) / Math.PI;
      const op    = Math.max(0, cosA);

      slot.wrap.style.visibility = 'visible';
      slot.wrap.style.opacity    = op.toFixed(3);
      slot.wrap.style.transform  =
        `translateY(${y.toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${rotX.toFixed(2)}deg)`;

      // Centre slot indicator — only mark during animation if very close to snapped
      // _markCenterSlot() is called on completion for the definitive highlight
      if (!this.isSpinning) {
        const snapped = Math.abs(frac) < 0.04 || Math.abs(frac - 1) < 0.04;
        slot.wrap.classList.toggle('is-center', offset === 0 && snapped);
      }

      slot.inner.textContent = name;
    });
  }

  _markCenterSlot(flash) {
    this.slots.forEach((slot, s) => {
      const CENTER = Math.floor(this.NUM_SLOTS / 2);
      if (s === CENTER) {
        slot.wrap.classList.add('is-center');
        if (flash) {
          slot.wrap.classList.remove('flash');
          void slot.wrap.offsetWidth; // reflow to restart animation
          slot.wrap.classList.add('flash');
        }
      } else {
        slot.wrap.classList.remove('is-center', 'flash');
      }
    });
  }

  /* ── Animation ────────────────────────────────────────────── */

  _animate(from, to, duration, onDone) {
    this._from   = from;
    this._to     = to;
    this._dur    = duration;
    this._t0     = null;
    this._onDone = onDone;

    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(t => this._tick(t));
  }

  _tick(timestamp) {
    if (this._t0 === null) this._t0 = timestamp;

    const elapsed = timestamp - this._t0;
    const t       = Math.min(elapsed / this._dur, 1);
    const eased   = this._easeOutExpo(t);

    this.scrollOffset = this._from + (this._to - this._from) * eased;
    this._render();

    if (t < 1) {
      this._raf = requestAnimationFrame(ts => this._tick(ts));
    } else {
      this.scrollOffset = this._to;
      this._render();
      if (this._onDone) this._onDone();
    }
  }

  /**
   * easeOutExpo — identical feel to CS:GO case opening.
   * Rapid start that decelerates to a near-halt at t=1.
   */
  _easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
}
