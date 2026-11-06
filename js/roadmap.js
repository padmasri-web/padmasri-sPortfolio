import { sound } from './audio.js';

// ==========================================================================
// SINGLE SOURCE OF TRUTH: Open Source Contributions & Stats
// ==========================================================================
export const openSource = {
  jaeger: 11,
  opentelemetry: 3,
  get total() {
    return this.jaeger + this.opentelemetry; // 14
  },
  status: "Actively contributing",
  username: "padmasri-web",
  jaegerUrl: "https://github.com/pulls?q=is%3Apr+author%3Apadmasri-web+is%3Amerged+org%3Ajaegertracing",
  opentelemetryUrl: "https://github.com/pulls?q=is%3Apr+author%3Apadmasri-web+is%3Amerged+org%3Aopen-telemetry",
  highlightedPRs: [
    // Optional array: { title: "PR title", repo: "jaegertracing/jaeger", url: "https://github.com/..." }
  ]
};

export class RoadmapGame {
  constructor() {
    this.currentProgress = 0; // 0.0 to 1.0
    this.targetProgress = 0;
    this.currentMilestone = 0;
    this.nextMilestone = 1;
    this.coinsCollected = 0;
    this.totalCoins = 5;
    this.playerXp = 350;
    this.playerMaxXp = 1000;
    this.lastScrollY = 0;
    this.scrollTimeout = null;
    this.lastStepTime = 0;
    this.lastX = 330;
    this.ticking = false;
    this.isWalking = false;
    this.worldW = 1000;
    this.worldH = 2000;
    this.windowW = typeof window !== 'undefined' ? window.innerWidth : 1000;
    this.windowH = typeof window !== 'undefined' ? window.innerHeight : 800;
    this.maxScroll = 1;
    this.lastActiveStation = -1;
    this.isProgrammaticScroll = false;
    this.pinElements = [];
    this.cardElements = [];

    // DOM Elements
    this.worldEl = document.getElementById('roadmap-world');
    this.pathEl = document.getElementById('roadmap-svg-path');
    this.characterEl = document.getElementById('player-character');
    this.speechBubbleEl = document.getElementById('character-speech');
    this.nextStopNameEl = document.getElementById('next-stop-name');
    this.currentStopNameEl = document.getElementById('current-stop-name');
    this.nextMeterFillEl = document.getElementById('next-meter-fill');
    this.nextDistanceTextEl = document.getElementById('next-distance-text');
    this.compassTextEl = document.getElementById('compass-text');
    this.coinCounterEl = document.getElementById('coin-counter-val');
    this.xpFillEl = document.getElementById('hud-xp-fill');

    // Modals
    this.modalBackdrop = document.getElementById('rpg-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalTag = document.getElementById('modal-station-tag');
    this.modalBody = document.getElementById('modal-body-content');

    // Milestones definitions (mapped along path 0.0 to 1.0 at equal distances: i / 7)
    const TOTAL_INTERVALS = 7;
    this.milestones = [
      {
        id: 0,
        progress: 0 / TOTAL_INTERVALS,
        name: "ORIGIN & START",
        title: "START: Padmasri's Origin",
        tag: "STATION 0",
        type: "about",
        cardId: "card-start"
      },
      {
        id: 1,
        progress: 1 / TOTAL_INTERVALS,
        name: "01 • ACADEMY",
        title: "Knowledge Glade: Mirai School of Tech",
        tag: "STATION 1",
        type: "education",
        cardId: "card-education"
      },
      {
        id: 2,
        progress: 2 / TOTAL_INTERVALS,
        name: "02 • TECH ARSENAL",
        title: "The Arsenal: Full-Stack & AI Stack",
        tag: "STATION 2",
        type: "skills",
        cardId: "card-skills"
      },
      {
        id: 3,
        progress: 3 / TOTAL_INTERVALS,
        name: "03 • OPEN SOURCE",
        title: "OPEN SOURCE PROFILE",
        tag: "STATION 3",
        type: "opensource",
        cardId: "card-opensource"
      },
      {
        id: 4,
        progress: 4 / TOTAL_INTERVALS,
        name: "04 • QUEST VALLEY",
        title: "Quest Valley: 5 Featured Projects",
        tag: "STATION 4",
        type: "projects",
        cardId: "card-projects"
      },
      {
        id: 5,
        progress: 5 / TOTAL_INTERVALS,
        name: "05 • SERVICES",
        title: "Workshop: What I Can Build For You",
        tag: "STATION 5",
        type: "services",
        cardId: "card-services"
      },
      {
        id: 6,
        progress: 6 / TOTAL_INTERVALS,
        name: "06 • BOSS LOGS",
        title: "Battle Arena: 250+ LeetCode & Achievements",
        tag: "STATION 6",
        type: "achievements",
        cardId: "card-achievements"
      },
      {
        id: 7,
        progress: 1.0,
        name: "07 • GOLDEN SUMMIT",
        title: "Golden Summit: Contact & Hire Padmasri",
        tag: "STATION 7",
        type: "contact",
        cardId: "card-contact"
      }
    ];

    this.init();
  }

  init() {
    if (!this.pathEl || !this.characterEl) {
      console.warn("Roadmap path or character element missing.");
      return;
    }

    this.pathLength = this.pathEl.getTotalLength();
    this.positionPinsAlongPath();

    // Cache interactive DOM nodes
    this.pinElements = Array.from(document.querySelectorAll('.milestone-pin-container'));
    this.cardElements = Array.from(document.querySelectorAll('.milestone-card-overlay'));

    // Cache dimensions to eliminate layout thrashing during scroll
    this.updateDimensions();

    // 1. Native Window Scroll
    window.addEventListener('scroll', () => {
      if (this.isProgrammaticScroll) return;
      const scrollY = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      this.targetProgress = Math.max(0, Math.min(1, scrollY / max));
    }, { passive: true });

    // 2. Desktop Wheel & Trackpad
    window.addEventListener('wheel', (e) => {
      if (this.modalBackdrop && this.modalBackdrop.classList.contains('open')) return;
      const hirePopover = document.getElementById('hire-me-popover');
      if (hirePopover && hirePopover.classList.contains('open')) return;

      const delta = Math.sign(e.deltaY) * Math.min(0.04, Math.abs(e.deltaY) * 0.00035);
      this.targetProgress = Math.max(0, Math.min(1, this.targetProgress + delta));
      this.syncScrollPosition();
    }, { passive: true });

    // 3. Mobile Touch Gestures with natural momentum flick
    let touchLastY = 0;
    let touchVelocity = 0;
    let lastTouchTime = 0;
    let isTouching = false;

    window.addEventListener('touchstart', (e) => {
      sound.init();
      if (e.touches.length === 1) {
        touchLastY = e.touches[0].clientY;
        lastTouchTime = performance.now();
        touchVelocity = 0;
        isTouching = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isTouching || e.touches.length !== 1) return;
      if (this.modalBackdrop && this.modalBackdrop.classList.contains('open')) return;
      const hirePopover = document.getElementById('hire-me-popover');
      if (hirePopover && hirePopover.classList.contains('open')) return;

      const currentY = e.touches[0].clientY;
      const deltaY = touchLastY - currentY; // positive = swipe up = move forward down the road
      const now = performance.now();
      const dt = Math.max(1, now - lastTouchTime);

      touchVelocity = deltaY / dt;
      touchLastY = currentY;
      lastTouchTime = now;

      // Responsive touch step sensitivity
      const sensitivity = 1 / (window.innerHeight * 2.5);
      this.targetProgress = Math.max(0, Math.min(1, this.targetProgress + deltaY * sensitivity));
      this.syncScrollPosition();
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (!isTouching) return;
      isTouching = false;
      // Add natural momentum flick
      if (Math.abs(touchVelocity) > 0.35) {
        const momentum = Math.max(-0.15, Math.min(0.15, touchVelocity * 0.08));
        this.targetProgress = Math.max(0, Math.min(1, this.targetProgress + momentum));
        this.syncScrollPosition();
      }
    }, { passive: true });

    // Handle resize & orientation with debounce
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.updateDimensions();
        this.updateView(this.currentProgress);
      }, 50);
    }, { passive: true });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.updateDimensions();
        this.updateView(this.currentProgress);
      }, 150);
    }, { passive: true });

    // Initial position at Start (Progress 0)
    this.updateView(0);

    // Start continuous physics lerp loop
    requestAnimationFrame(() => this.tick());

    // Bind controls, pins, and collectibles
    this.bindControls();
    this.bindPinsAndCards();
    this.bindCollectibles();

    // Auto update audio icon
    this.updateAudioIcon();
  }

  syncScrollPosition() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.isProgrammaticScroll = true;
    window.scrollTo(0, this.targetProgress * max);
    this.isProgrammaticScroll = false;
  }

  updateDimensions() {
    this.windowW = window.innerWidth;
    this.windowH = window.innerHeight;
    if (this.worldEl) {
      this.worldW = this.worldEl.offsetWidth || 1000;
      this.worldH = this.worldEl.offsetHeight || 2000;
    }
  }

  // Continuous physics lerp animation loop (guarantees silky-smooth gliding)
  tick() {
    const diff = this.targetProgress - this.currentProgress;

    if (Math.abs(diff) > 0.0001) {
      // Smooth exponential easing (0.12 provides responsive, fluid glide)
      this.currentProgress += diff * 0.12;

      const isMovingForward = diff > 0;

      // Play footsteps sound while moving (only if audio unmuted)
      const now = performance.now();
      if (!sound.isMuted() && now - this.lastStepTime > 180 && Math.abs(diff) > 0.001) {
        sound.playStep();
        this.lastStepTime = now;
      }

      // Walking animation state toggle
      if (!this.isWalking) {
        this.characterEl.classList.add('is-walking');
        this.isWalking = true;
      }
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.characterEl.classList.remove('is-walking');
        this.isWalking = false;
      }, 100);

      this.updateView(this.currentProgress, isMovingForward);
    } else if (this.isWalking) {
      this.characterEl.classList.remove('is-walking');
      this.isWalking = false;
    }

    requestAnimationFrame(() => this.tick());
  }

  updateView(progress, isMovingForward = true) {
    if (!this.pathEl) return;
    this.currentProgress = progress;

    // Calculate exact point on SVG path (viewBox: 0 0 1000 2000)
    const point = this.pathEl.getPointAtLength(progress * this.pathLength);

    // Percentage coordinates relative to 1000 x 2000 coordinate space
    const leftPercent = (point.x / 1000) * 100;
    const topPercent = (point.y / 2000) * 100;

    this.characterEl.style.left = `${leftPercent.toFixed(2)}%`;
    this.characterEl.style.top = `${topPercent.toFixed(2)}%`;

    // Direction flip
    if (point.x < this.lastX - 0.5) {
      this.characterEl.classList.add('facing-left');
    } else if (point.x > this.lastX + 0.5) {
      this.characterEl.classList.remove('facing-left');
    }
    this.lastX = point.x;

    // Responsive 2D Camera Tracking: Zero layout thrashing using cached dimensions
    if (this.worldEl) {
      const worldW = this.worldW || 1000;
      const worldH = this.worldH || 2000;
      const winW = this.windowW || window.innerWidth;
      const winH = this.windowH || window.innerHeight;

      const charPixelX = (point.x / 1000) * worldW;
      const charPixelY = (point.y / 2000) * worldH;

      // Vertical tracking: centers character at ~52% of screen height
      const minCamY = Math.min(0, winH - worldH);
      const targetCamY = (winH * 0.52) - charPixelY;
      const camY = Math.max(minCamY, Math.min(0, targetCamY));

      // Horizontal tracking: centers on desktop, smoothly pans on mobile
      if (winW < worldW) {
        const targetCamX = (winW / 2) - charPixelX;
        const minCamX = winW - worldW;
        const camX = Math.max(minCamX, Math.min(0, targetCamX));
        this.worldEl.style.left = '0';
        this.worldEl.style.transform = `translate3d(${camX.toFixed(1)}px, ${camY.toFixed(1)}px, 0)`;
      } else {
        this.worldEl.style.left = '50%';
        this.worldEl.style.transform = `translate3d(-50%, ${camY.toFixed(1)}px, 0)`;
      }
    }

    // Real-Time "Next Stop" calculation
    this.updateNextStop(progress);
  }

  updateNextStop(progress) {
    let nextIdx = this.milestones.findIndex(m => m.progress > progress + 0.02);
    if (nextIdx === -1) nextIdx = this.milestones.length - 1;

    let currentIdx = nextIdx > 0 ? nextIdx - 1 : 0;
    this.currentMilestone = currentIdx;
    this.nextMilestone = nextIdx;

    const currentM = this.milestones[currentIdx];
    const nextM = this.milestones[nextIdx];

    // Distance calculation
    const range = Math.max(0.01, nextM.progress - currentM.progress);
    const subProgress = Math.max(0, Math.min(1, (progress - currentM.progress) / range));
    const percentRemaining = Math.max(0, Math.round((1 - subProgress) * 100));

    // Update HUD Banner (prevent redundant DOM mutations)
    if (this.currentStopNameEl && this.currentStopNameEl.textContent !== currentM.name) {
      this.currentStopNameEl.textContent = currentM.name;
    }
    const nextText = progress >= 0.98 ? "🏆 SUMMIT REACHED!" : nextM.name;
    if (this.nextStopNameEl && this.nextStopNameEl.textContent !== nextText) {
      this.nextStopNameEl.textContent = nextText;
    }
    if (this.nextMeterFillEl) {
      this.nextMeterFillEl.style.width = `${Math.round(subProgress * 100)}%`;
    }
    const distText = progress >= 0.98 ? "VICTORY" : `${percentRemaining}% to stop`;
    if (this.nextDistanceTextEl && this.nextDistanceTextEl.textContent !== distText) {
      this.nextDistanceTextEl.textContent = distText;
    }

    // Update Floating Waypoint Compass at bottom
    const compassText = progress >= 0.98 ? "🏆 AT THE SUMMIT" : `NEXT STOP: ${nextM.name}`;
    if (this.compassTextEl && this.compassTextEl.textContent !== compassText) {
      this.compassTextEl.textContent = compassText;
    }

    // Update Floating Speech Bubble over character
    if (this.speechBubbleEl) {
      const distToCurrent = Math.abs(progress - currentM.progress);
      let bubbleHtml;
      if (distToCurrent < 0.03 && currentIdx > 0) {
        bubbleHtml = `<span>📍</span><span>At ${currentM.name}!</span>`;
      } else if (progress >= 0.98) {
        bubbleHtml = `<span>🏆</span><span>Summit Victory!</span>`;
      } else {
        bubbleHtml = `<span>🚀</span><span>Next: ${nextM.name} ➔</span>`;
      }
      if (this.speechBubbleEl.innerHTML !== bubbleHtml) {
        this.speechBubbleEl.innerHTML = bubbleHtml;
      }
    }

    // Highlight active pin & card ONLY when active station changes
    if (this.lastActiveStation !== currentIdx) {
      this.lastActiveStation = currentIdx;

      if (!this.pinElements || this.pinElements.length === 0) {
        this.pinElements = Array.from(document.querySelectorAll('.milestone-pin-container'));
      }
      this.pinElements.forEach(p => {
        const isTarget = parseInt(p.dataset.station, 10) === currentIdx;
        p.classList.toggle('active-target', isTarget);
      });

      if (!this.cardElements || this.cardElements.length === 0) {
        this.cardElements = Array.from(document.querySelectorAll('.milestone-card-overlay'));
      }
      this.cardElements.forEach(c => {
        const isTarget = parseInt(c.dataset.station, 10) === currentIdx;
        c.classList.toggle('active', isTarget);
      });
    }
  }

  // Smoothly scroll to a milestone
  scrollToMilestone(index, openModalAfter = false) {
    if (index < 0 || index >= this.milestones.length) return;
    const milestone = this.milestones[index];
    this.targetProgress = milestone.progress;

    sound.playClick();

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const targetScrollY = milestone.progress * maxScroll;

    this.isProgrammaticScroll = true;
    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });
    setTimeout(() => {
      this.isProgrammaticScroll = false;
    }, 600);

    if (openModalAfter) {
      setTimeout(() => {
        this.openModal(index);
      }, 700);
    }
  }

  bindControls() {
    // START Button
    const startBtn = document.getElementById('start-btn-overlay');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.scrollToMilestone(1, true);
      });
    }

    // Waypoint Compass click -> Travel to Next Stop
    const compassPill = document.getElementById('waypoint-compass-pill');
    if (compassPill) {
      compassPill.addEventListener('click', () => {
        this.scrollToMilestone(this.nextMilestone, false);
      });
    }

    // Hero Passport Button & HUD Avatar
    const heroBtn = document.getElementById('btn-hero-passport');
    const playerChip = document.getElementById('player-hud-chip');
    if (heroBtn) heroBtn.addEventListener('click', () => this.openHeroPassport());
    if (playerChip) playerChip.addEventListener('click', () => this.openHeroPassport());

    // Origin Hero Shrine click on map
    const originShrine = document.getElementById('hero-origin-shrine');
    if (originShrine) {
      originShrine.addEventListener('click', () => {
        sound.playMilestone();
        this.openHeroPassport();
      });
    }

    // Prev / Next Controls
    const prevBtn = document.getElementById('btn-prev-milestone');
    const nextBtn = document.getElementById('btn-next-milestone');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const prevIdx = Math.max(0, this.currentMilestone - 1);
        this.scrollToMilestone(prevIdx, false);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const nextIdx = Math.min(this.milestones.length - 1, this.currentMilestone + 1);
        this.scrollToMilestone(nextIdx, false);
      });
    }

    // Audio Toggle
    const audioBtn = document.getElementById('btn-sound-toggle');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        sound.toggleMute();
        this.updateAudioIcon();
      });
    }

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (this.modalBackdrop.classList.contains('open')) {
        if (e.key === 'Escape') this.closeModal();
        return;
      }

      const hirePopover = document.getElementById('hire-me-popover');
      if (hirePopover && hirePopover.classList.contains('open')) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'KeyS' || e.key === 'KeyD') {
        const nextIdx = Math.min(this.milestones.length - 1, this.currentMilestone + 1);
        this.scrollToMilestone(nextIdx, false);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'KeyW' || e.key === 'KeyA') {
        const prevIdx = Math.max(0, this.currentMilestone - 1);
        this.scrollToMilestone(prevIdx, false);
      } else if (e.key === 'KeyP' || e.key === 'KeyC') {
        this.openHeroPassport();
      } else if (e.key === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        this.openModal(this.currentMilestone);
      }
    });

    // Close Modal Button & Backdrop
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
    if (this.modalBackdrop) {
      this.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.modalBackdrop) this.closeModal();
      });
    }
  }

  updateAudioIcon() {
    const audioBtn = document.getElementById('btn-sound-toggle');
    if (audioBtn) {
      audioBtn.innerHTML = sound.isMuted() 
        ? '<span>🔇</span><span>MUTED</span>' 
        : '<span>🔊</span><span>SOUND ON</span>';
    }
  }

  // Position milestone pins precisely at each stop along the SVG road path
  positionPinsAlongPath() {
    if (!this.pathEl) return;
    this.milestones.forEach((m, idx) => {
      if (idx === 0 || idx === 7) return; // Origin monument and summit trophy are positioned specifically
      const point = this.pathEl.getPointAtLength(m.progress * this.pathLength);
      const leftPercent = (point.x / 1000) * 100;
      const topPercent = (point.y / 2000) * 100;

      const pin = document.querySelector(`.milestone-pin-container[data-station="${idx}"]`);
      if (pin) {
        pin.style.left = `${leftPercent.toFixed(1)}%`;
        pin.style.top = `${topPercent.toFixed(1)}%`;
      }
    });
  }

  bindPinsAndCards() {
    document.querySelectorAll('.milestone-pin-container').forEach(pin => {
      pin.addEventListener('click', () => {
        const station = parseInt(pin.dataset.station, 10);
        this.scrollToMilestone(station, true);
      });
    });

    document.querySelectorAll('.milestone-card-overlay').forEach(card => {
      card.addEventListener('click', () => {
        const station = parseInt(card.dataset.station, 10);
        this.scrollToMilestone(station, true);
      });
    });

    const trophy = document.getElementById('summit-trophy');
    if (trophy) {
      trophy.addEventListener('click', () => {
        this.scrollToMilestone(7, true);
      });
    }
  }

  bindCollectibles() {
    document.querySelectorAll('.secret-coin').forEach(coin => {
      coin.addEventListener('click', (e) => {
        if (coin.classList.contains('collected')) return;
        coin.classList.add('collected');

        sound.playCoin();
        this.coinsCollected++;
        this.playerXp = Math.min(this.playerMaxXp, this.playerXp + 130);

        if (this.coinCounterEl) {
          this.coinCounterEl.textContent = `${this.coinsCollected}/${this.totalCoins}`;
        }
        if (this.xpFillEl) {
          this.xpFillEl.style.width = `${(this.playerXp / this.playerMaxXp) * 100}%`;
        }

        const floatEl = document.createElement('div');
        floatEl.className = 'floating-xp-text';
        floatEl.textContent = '+130 XP!';
        floatEl.style.left = `${e.clientX - 20}px`;
        floatEl.style.top = `${e.clientY - 20}px`;
        document.body.appendChild(floatEl);
        setTimeout(() => floatEl.remove(), 900);

        if (this.coinsCollected === this.totalCoins) {
          sound.playVictory();
        }
      });
    });
  }

  // Open Hero Adventurer Passport with her real photo & stats
  openHeroPassport() {
    sound.playMilestone();
    this.modalTag.textContent = "HERO PASSPORT";
    this.modalTitle.textContent = "OFFICIAL GUILD ADVENTURER CARD";
    this.modalBody.innerHTML = `
      <div class="hero-passport-card">
        <div class="passport-top-row">
          <div class="passport-photo-frame">
            <img src="./assets/padmasri.jpg" alt="Padmasri Chikle" class="passport-photo">
            <span class="passport-verified-stamp">VERIFIED ARCHITECT</span>
          </div>
          <div class="passport-identity">
            <h2 class="passport-name">PADMASRI CHIKLE</h2>
            <div class="passport-class">Level 22 • AI/ML & Full-Stack Architect</div>
            <div class="passport-stats-grid">
              <div class="stat-item">
                <div class="stat-label">INSTITUTION</div>
                <div class="stat-val">Mirai School of Tech</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">LOCATION</div>
                <div class="stat-val">Bengaluru, Karnataka</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">ALGORITHMIC BATTLES</div>
                <div class="stat-val">250+ LeetCode Solved</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">CNCF MERGED PRS</div>
                <div class="stat-val">${openSource.total} (Jaeger & OTel)</div>
              </div>
            </div>
          </div>
        </div>

        <div class="passport-quote-box">
          <em>"Passionate developer building performant web architectures, generative AI integrations with Google Gemini, and distributed microservices. Creator and architect of this gamified roadmap world."</em>
        </div>

        <div class="passport-actions-row">
          <a href="https://drive.google.com/file/d/1cT9AdrHuSwM93CPUsjus9PfUzDXhagcT/view?usp=sharing" target="_blank" rel="noopener noreferrer" class="rpg-btn gold">📄 View Resume ↗</a>
          <a href="mailto:padmasrichikle@gmail.com" class="rpg-btn primary">📧 Send Email Transmission</a>
          <a href="https://www.linkedin.com/in/padmasri-chikle/" target="_blank" rel="noopener noreferrer" class="rpg-btn">💼 LinkedIn Profile</a>
          <a href="https://github.com/padmasri-web" target="_blank" rel="noopener noreferrer" class="rpg-btn">🐙 GitHub Repos</a>
          <a href="https://leetcode.com/u/padmasrii_codes/" target="_blank" rel="noopener noreferrer" class="rpg-btn">⚡ LeetCode</a>
          <a href="https://codeforces.com/profile/padmasri2310" target="_blank" rel="noopener noreferrer" class="rpg-btn">⚡ Codeforces</a>
          <button class="rpg-btn" onclick="window.roadmapInstance.scrollToMilestone(1, true); window.roadmapInstance.closeModal();">Begin Adventure ▶</button>
        </div>
      </div>
    `;
    this.modalBackdrop.classList.add('open');
  }

  openModal(index) {
    const milestone = this.milestones[index];
    if (!milestone) return;

    sound.playClick();
    this.modalTag.textContent = milestone.tag;
    this.modalTitle.textContent = milestone.title;
    this.modalBody.innerHTML = this.getModalContent(index);

    this.modalBackdrop.classList.add('open');
  }

  closeModal() {
    this.modalBackdrop.classList.remove('open');
    sound.playClick();
  }

  getModalContent(index) {
    switch (index) {
      case 0:
        return `
          <div style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px;">
            <div style="width: 100px; height: 115px; border-radius: 10px; border: 3px solid #f1c40f; overflow: hidden; flex-shrink: 0; background: #252b38;">
              <img src="./assets/padmasri.jpg" alt="Padmasri Chikle" style="width: 100%; height: 100%; object-fit: cover; object-position: center 20%;">
            </div>
            <div>
              <h2 style="font-family: 'Press Start 2P', monospace; font-size: 14px; color: #f1c40f; margin-bottom: 8px;">PADMASRI CHIKLE</h2>
              <div style="font-size: 13px; color: #38bdf8; margin-bottom: 8px;">AI/ML Undergraduate & Full-Stack Developer</div>
              <div style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
                📍 Bengaluru, Karnataka • 🎓 Mirai School of Technology • 📧 padmasrichikle@gmail.com
              </div>
            </div>
          </div>
          <div style="background: #232936; border: 2px solid #363e52; border-radius: 10px; padding: 16px; margin-bottom: 18px; line-height: 1.7; font-size: 13px; color: #cbd5e1;">
            Passionate software developer and Artificial Intelligence / Machine Learning engineering student with a track record of building performant full-stack web platforms, real-time distributed applications, and open-source contributions.
            <br><br>
            Active contributor to CNCF (Cloud Native Computing Foundation) projects including <strong>Jaeger</strong> (${openSource.jaeger} PRs) and <strong>OpenTelemetry</strong> (${openSource.opentelemetry} PRs) with <strong>${openSource.total} merged PRs</strong>, and an avid competitive programmer with <strong>250+ solved algorithmic problems</strong> on LeetCode.
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            <a href="https://drive.google.com/file/d/1cT9AdrHuSwM93CPUsjus9PfUzDXhagcT/view?usp=sharing" target="_blank" rel="noopener noreferrer" class="rpg-btn gold">📄 View Resume ↗</a>
            <button class="rpg-btn primary" onclick="window.roadmapInstance.scrollToMilestone(1, true); window.roadmapInstance.closeModal();">Start Journey ▶</button>
            <button class="rpg-btn" onclick="window.roadmapInstance.openHeroPassport();">Inspect Full Passport 📜</button>
          </div>
        `;

      case 1:
        return `
          <div class="inventory-section">
            <div class="inventory-section-title"><span>🎓</span> ACADEMIC INSTITUTION</div>
            <div style="background: #232936; border: 2px solid #363e52; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: #ffffff; font-size: 14px;">Mirai School of Technology</strong>
                <span class="project-badge">2025 – Present</span>
              </div>
              <div style="color: #38bdf8; font-size: 12px; margin-bottom: 8px;">Bachelor of Engineering (B.E.) in AI & Machine Learning</div>
              <div style="color: #94a3b8; font-size: 12px;">Location: Bengaluru, Karnataka</div>
            </div>

            <div class="inventory-section-title"><span>📜</span> CORE PILLARS OF STUDY</div>
            <div class="inventory-grid">
              <div class="inventory-slot">
                <div class="slot-name-row"><span>Data Structures & Algo</span><span>Mastery</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 95%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>Full-Stack Architecture</span><span>Advanced</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 90%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>Machine Learning / LLMs</span><span>Active</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 85%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>Distributed Systems</span><span>Applied</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 88%;"></div></div>
              </div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 16px;">
            <button class="rpg-btn" onclick="window.roadmapInstance.scrollToMilestone(0, true); window.roadmapInstance.closeModal();">◀ Back</button>
            <button class="rpg-btn primary" onclick="window.roadmapInstance.scrollToMilestone(2, true); window.roadmapInstance.closeModal();">Next: Tech Skills ▶</button>
          </div>
        `;

      case 2:
        return `
          <!-- Recruiter Summary Callout -->
          <div class="skills-summary-callout">
            <div class="skills-summary-title">Full-Stack MERN & AI Developer</div>
            <p class="skills-summary-text">
              Building end-to-end production web applications with React and Node.js, real-time bi-directional systems with Socket.IO, and AI features powered by the Google Gemini API. Active CNCF open source contributor (Jaeger & OpenTelemetry).
            </p>
          </div>

          <!-- Category 1: Frontend Architecture -->
          <div class="skill-category-card">
            <div class="skill-category-header">
              <span class="skill-category-name">01 • FRONTEND ARCHITECTURE</span>
              <span class="skill-category-role">Client-Side & SPAs</span>
            </div>
            <div class="skill-tags-flex">
              <span class="skill-tag primary-tag">React.js / React 18</span>
              <span class="skill-tag">TypeScript</span>
              <span class="skill-tag">JavaScript (ES6+)</span>
              <span class="skill-tag">HTML5 & CSS3</span>
              <span class="skill-tag">GSAP Animations</span>
              <span class="skill-tag">Three.js (3D Canvas)</span>
              <span class="skill-tag">Bootstrap</span>
              <span class="skill-tag">EJS Templating</span>
            </div>
          </div>

          <!-- Category 2: Backend, APIs & Real-time -->
          <div class="skill-category-card">
            <div class="skill-category-header">
              <span class="skill-category-name">02 • BACKEND & MICROSERVICES</span>
              <span class="skill-category-role">Server & APIs</span>
            </div>
            <div class="skill-tags-flex">
              <span class="skill-tag primary-tag">Node.js</span>
              <span class="skill-tag primary-tag">Express.js</span>
              <span class="skill-tag accent-tag">RESTful APIs</span>
              <span class="skill-tag accent-tag">Socket.IO (WebSockets)</span>
              <span class="skill-tag">Passport.js (Auth)</span>
              <span class="skill-tag">Mongoose ODM</span>
              <span class="skill-tag">Multer</span>
            </div>
          </div>

          <!-- Category 3: Databases & Media Cloud -->
          <div class="skill-category-card">
            <div class="skill-category-header">
              <span class="skill-category-name">03 • DATABASES & CLOUD</span>
              <span class="skill-category-role">Persistence & Media</span>
            </div>
            <div class="skill-tags-flex">
              <span class="skill-tag primary-tag">MongoDB</span>
              <span class="skill-tag">Cloudinary (Media CDN)</span>
              <span class="skill-tag">Data Modeling</span>
              <span class="skill-tag">Aggregation Pipelines</span>
            </div>
          </div>

          <!-- Category 4: AI & Machine Learning -->
          <div class="skill-category-card">
            <div class="skill-category-header">
              <span class="skill-category-name">04 • AI & GENERATIVE MODELS</span>
              <span class="skill-category-role">Integrations</span>
            </div>
            <div class="skill-tags-flex">
              <span class="skill-tag accent-tag">Google Gemini Flash API</span>
              <span class="skill-tag">LLM Prompt Engineering</span>
              <span class="skill-tag">AI Plot & Synopsis Generation</span>
              <span class="skill-tag">GenAI Workflows</span>
            </div>
          </div>

          <!-- Category 5: Core Problem Solving & Tools -->
          <div class="skill-category-card">
            <div class="skill-category-header">
              <span class="skill-category-name">05 • LANGUAGES & TOOLS</span>
              <span class="skill-category-role">Problem Solving & DevOps</span>
            </div>
            <div class="skill-tags-flex">
              <span class="skill-tag primary-tag">C++ (Data Structures & Algo)</span>
              <span class="skill-tag">Git & GitHub</span>
              <span class="skill-tag">Postman</span>
              <span class="skill-tag">Render & Vercel</span>
              <span class="skill-tag">VS Code</span>
              <span class="skill-tag">GitHub Pages</span>
              <span class="skill-tag">Figma & Framer</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 16px;">
            <button class="rpg-btn" onclick="window.roadmapInstance.scrollToMilestone(1, true); window.roadmapInstance.closeModal();">◀ Back: Academy</button>
            <button class="rpg-btn primary" onclick="window.roadmapInstance.scrollToMilestone(3, true); window.roadmapInstance.closeModal();">Next: Open Source ▶</button>
          </div>
        `;

      case 3:
        return `
          <div class="opensource-modal-container">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
              <div>
                <h2 class="services-modal-heading" style="color: #38bdf8; margin-bottom: 6px;">Open Source Contributor, CNCF</h2>
                <p class="services-modal-subline" style="margin-bottom: 0; padding-bottom: 0; border-bottom: none;">
                  Actively contributing to production observability tools used by engineering teams worldwide.
                </p>
              </div>
              <span class="project-badge" style="color: #2ecc71; border-color: #27ae60; background: rgba(46, 204, 113, 0.15); font-size: 11px; padding: 5px 10px; display: inline-flex; align-items: center; gap: 6px;">
                <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #2ecc71; box-shadow: 0 0 6px #2ecc71;"></span>
                ${openSource.status}
              </span>
            </div>

            <!-- Total CNCF Merged PRs Banner -->
            <div class="opensource-total-banner">
              <div class="opensource-total-num">${openSource.total}</div>
              <div class="opensource-total-label">CNCF MERGED PULL REQUESTS ACROSS PRODUCTION REPOSITORIES</div>
            </div>

            <!-- 2 Stat Cards -->
            <div class="opensource-orgs-grid">
              <!-- Jaeger -->
              <div class="opensource-org-card">
                <div class="opensource-org-header">
                  <div class="opensource-org-logo">⚡</div>
                  <div class="opensource-org-info">
                    <h3 class="opensource-org-name">Jaeger Tracing</h3>
                    <span class="opensource-org-tag">Distributed Tracing (CNCF Graduated)</span>
                  </div>
                </div>
                <div class="opensource-stat-box">
                  <span class="opensource-stat-count">${openSource.jaeger}</span>
                  <span class="opensource-stat-desc">Merged Pull Requests</span>
                </div>
                <p class="opensource-org-desc">
                  Cloud-native distributed tracing backend monitoring complex microservice transactions.
                </p>
                <a href="${openSource.jaegerUrl}" target="_blank" rel="noopener noreferrer" class="rpg-btn primary" style="width: 100%; margin-top: 10px;">
                  Jaeger PRs on GitHub ↗
                </a>
              </div>

              <!-- OpenTelemetry -->
              <div class="opensource-org-card">
                <div class="opensource-org-header">
                  <div class="opensource-org-logo">🔭</div>
                  <div class="opensource-org-info">
                    <h3 class="opensource-org-name">OpenTelemetry</h3>
                    <span class="opensource-org-tag">Telemetry Standards (CNCF Incubating)</span>
                  </div>
                </div>
                <div class="opensource-stat-box">
                  <span class="opensource-stat-count">${openSource.opentelemetry}</span>
                  <span class="opensource-stat-desc">Merged Pull Requests</span>
                </div>
                <p class="opensource-org-desc">
                  Industry standard framework, collection agents, and APIs for traces, metrics, and logs.
                </p>
                <a href="${openSource.opentelemetryUrl}" target="_blank" rel="noopener noreferrer" class="rpg-btn primary" style="width: 100%; margin-top: 10px;">
                  OpenTelemetry PRs on GitHub ↗
                </a>
              </div>
            </div>

            <!-- Optional Highlighted PRs List -->
            ${openSource.highlightedPRs && openSource.highlightedPRs.length > 0 ? `
              <div class="highlighted-prs-section" style="margin-top: 18px;">
                <h4 style="font-family: 'Press Start 2P', monospace; font-size: 10px; color: #f1c40f; margin-bottom: 10px;">FEATURED CONTRIBUTIONS</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${openSource.highlightedPRs.map(pr => `
                    <a href="${pr.url}" target="_blank" rel="noopener noreferrer" class="highlighted-pr-item">
                      <span style="font-family: 'Press Start 2P', monospace; font-size: 8.5px; color: #38bdf8;">${pr.repo}</span>
                      <span style="font-size: 12px; color: #ffffff;">${pr.title}</span>
                      <span style="font-size: 10px; color: #f1c40f;">➔</span>
                    </a>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Milestone Navigation -->
            <div style="display: flex; justify-content: space-between; margin-top: 18px; padding-top: 14px; border-top: 1px solid #2e3544;">
              <button class="rpg-btn" onclick="window.roadmapInstance.scrollToMilestone(2, true); window.roadmapInstance.closeModal();">◀ Back: Arsenal</button>
              <button class="rpg-btn primary" onclick="window.roadmapInstance.scrollToMilestone(4, true); window.roadmapInstance.closeModal();">Next: Quests ▶</button>
            </div>
          </div>
        `;

      case 4:
        return `
          <div class="quest-projects-grid">
            <!-- ShopBazar -->
            <div class="quest-project-card">
              <div class="project-card-top">
                <div class="project-name-group">
                  <span class="project-icon">🛍️</span>
                  <span class="project-name">ShopBazar</span>
                </div>
                <span class="project-badge">Full-Stack E-Commerce</span>
              </div>
              <p class="project-description">
                End-to-end commerce platform with Buyer/Seller authentication, role-based authorization, inventory catalog management, shopping cart, checkout, and verified ratings/reviews.
              </p>
              <div class="tech-tags-list">
                <span class="tech-tag">React 18</span>
                <span class="tech-tag">Node.js</span>
                <span class="tech-tag">Express.js</span>
                <span class="tech-tag">MongoDB</span>
                <span class="tech-tag">Cloudinary</span>
                <span class="tech-tag">REST APIs</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px;">
                <a href="https://shopbazar-hufs.onrender.com/" target="_blank" rel="noopener noreferrer" class="rpg-btn primary">🚀 Live Demo ↗</a>
                <a href="https://github.com/padmasri-web/shopBazar" target="_blank" rel="noopener noreferrer" class="rpg-btn">🐙 GitHub Repo ↗</a>
              </div>
            </div>

            <!-- MovieAdda -->
            <div class="quest-project-card">
              <div class="project-card-top">
                <div class="project-name-group">
                  <span class="project-icon">🎬</span>
                  <span class="project-name">MovieAdda</span>
                </div>
                <span class="project-badge">AI-Powered Cinema Hub</span>
              </div>
              <p class="project-description">
                Full-stack movie discovery hub with instant search, user ratings, community reviews, and Google Gemini Flash AI integration for dynamic synopsis generation.
              </p>
              <div class="tech-tags-list">
                <span class="tech-tag">Google Gemini AI</span>
                <span class="tech-tag">Node.js</span>
                <span class="tech-tag">Express.js</span>
                <span class="tech-tag">MongoDB</span>
                <span class="tech-tag">EJS</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px;">
                <a href="https://github.com/padmasri-web" target="_blank" rel="noopener noreferrer" class="rpg-btn primary">🐙 GitHub Repo ↗</a>
              </div>
            </div>

            <!-- CampusFind -->
            <div class="quest-project-card">
              <div class="project-card-top">
                <div class="project-name-group">
                  <span class="project-icon">🔍</span>
                  <span class="project-name">CampusFind</span>
                </div>
                <span class="project-badge">Real-Time Lost & Found</span>
              </div>
              <p class="project-description">
                Real-time campus lost-and-found portal for instant item reporting, ownership verification claims, live Socket.IO notifications, and Cloudinary photo uploads.
              </p>
              <div class="tech-tags-list">
                <span class="tech-tag">Socket.IO</span>
                <span class="tech-tag">Passport.js</span>
                <span class="tech-tag">Node.js</span>
                <span class="tech-tag">MongoDB</span>
                <span class="tech-tag">Cloudinary</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px;">
                <a href="https://campusfind-8hn9.onrender.com/" target="_blank" rel="noopener noreferrer" class="rpg-btn primary">🚀 Live Demo ↗</a>
                <a href="https://github.com/padmasri-web/CampusFind" target="_blank" rel="noopener noreferrer" class="rpg-btn">🐙 GitHub Repo ↗</a>
              </div>
            </div>

            <!-- Matiks -->
            <div class="quest-project-card">
              <div class="project-card-top">
                <div class="project-name-group">
                  <span class="project-icon">🧩</span>
                  <span class="project-name">Matiks</span>
                </div>
                <span class="project-badge">Hackathon Winner</span>
              </div>
              <p class="project-description">
                Gamified math and brain-puzzle platform featuring Sudoku, Lights Out, Memory Match, Snake, XP & rank progression systems, daily routines via Node-Cron, and live leaderboards.
              </p>
              <div class="tech-tags-list">
                <span class="tech-tag">Gamification</span>
                <span class="tech-tag">Node-Cron</span>
                <span class="tech-tag">Socket.IO</span>
                <span class="tech-tag">JavaScript</span>
                <span class="tech-tag">MongoDB</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px;">
                <a href="https://matiks-7ptu.onrender.com/" target="_blank" rel="noopener noreferrer" class="rpg-btn primary">🚀 Live Demo ↗</a>
                <a href="https://github.com/padmasri-web/Matiks" target="_blank" rel="noopener noreferrer" class="rpg-btn">🐙 GitHub Repo ↗</a>
              </div>
            </div>

            <!-- Amazon Clone -->
            <div class="quest-project-card">
              <div class="project-card-top">
                <div class="project-name-group">
                  <span class="project-icon">📦</span>
                  <span class="project-name">Amazon Clone</span>
                </div>
                <span class="project-badge">Responsive Frontend</span>
              </div>
              <p class="project-description">
                High-fidelity Amazon-inspired e-commerce frontend with category filtering, search interface, deals slider, cart state management, deployed to GitHub Pages.
              </p>
              <div class="tech-tags-list">
                <span class="tech-tag">HTML5</span>
                <span class="tech-tag">CSS3</span>
                <span class="tech-tag">JavaScript</span>
                <span class="tech-tag">GitHub Pages</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px;">
                <a href="https://padmasri-web.github.io/Amazon-Clone/" target="_blank" rel="noopener noreferrer" class="rpg-btn primary">🚀 Live Demo ↗</a>
                <a href="https://github.com/padmasri-web/Amazon-Clone" target="_blank" rel="noopener noreferrer" class="rpg-btn">🐙 GitHub Repo ↗</a>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 16px;">
            <button class="rpg-btn" onclick="window.roadmapInstance.scrollToMilestone(3, true); window.roadmapInstance.closeModal();">◀ Back: Open Source</button>
            <button class="rpg-btn primary" onclick="window.roadmapInstance.scrollToMilestone(5, true); window.roadmapInstance.closeModal();">Next: Services ▶</button>
          </div>
        `;

      case 5:
        return `
          <div class="services-modal-container">
            <h2 class="services-modal-heading">What I can build for you</h2>
            <p class="services-modal-subline">I’m a full-stack developer who ships working products. Pick what fits, or tell me what you need.</p>

            <div class="services-cards-grid">
              <!-- Service 1 -->
              <div class="service-offer-card">
                <div class="service-card-header">
                  <span class="service-card-number">01</span>
                  <h3 class="service-offer-title">Full-stack web app (MERN)</h3>
                </div>
                <p class="service-offer-desc">
                  A complete web app, from database to polished UI: login, dashboards, payments, admin panels, and deployment.
                </p>
                <div class="service-detail-block">
                  <div class="service-meta-row">
                    <span class="service-meta-label">Built with:</span>
                    <span class="service-meta-text">React, Node/Express, MongoDB, Passport.js</span>
                  </div>
                  <div class="service-meta-row">
                    <span class="service-meta-label">Good for:</span>
                    <span class="service-meta-text">small businesses, startups, college clubs, MVPs</span>
                  </div>
                  <div class="service-meta-row">
                    <span class="service-meta-label">Proof:</span>
                    <span class="service-proof-links">
                      <a href="https://shopbazar-hufs.onrender.com/" target="_blank" rel="noopener noreferrer" class="service-proof-link">ShopBazar ↗</a>, 
                      <a href="https://padmasri-web.github.io/Amazon-Clone/" target="_blank" rel="noopener noreferrer" class="service-proof-link">Amazon Clone ↗</a>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Service 2 -->
              <div class="service-offer-card">
                <div class="service-card-header">
                  <span class="service-card-number">02</span>
                  <h3 class="service-offer-title">AI features for your existing site</h3>
                </div>
                <p class="service-offer-desc">
                  I add an AI feature to a site you already have: a chatbot trained on your content, smart recommendations, search, or summaries.
                </p>
                <div class="service-detail-block">
                  <div class="service-meta-row">
                    <span class="service-meta-label">Built with:</span>
                    <span class="service-meta-text">Gemini API, Node.js, React</span>
                  </div>
                  <div class="service-meta-row">
                    <span class="service-meta-label">Good for:</span>
                    <span class="service-meta-text">stores, content sites, support pages</span>
                  </div>
                  <div class="service-meta-row">
                    <span class="service-meta-label">Proof:</span>
                    <span class="service-proof-links">
                      <a href="https://github.com/padmasri-web" target="_blank" rel="noopener noreferrer" class="service-proof-link">MovieAdda ↗</a>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Service 3 -->
              <div class="service-offer-card">
                <div class="service-card-header">
                  <span class="service-card-number">03</span>
                  <h3 class="service-offer-title">Real-time features</h3>
                </div>
                <p class="service-offer-desc">
                  Live chat, notifications, live status updates, and collaborative or multi-user features that update instantly without a page refresh.
                </p>
                <div class="service-detail-block">
                  <div class="service-meta-row">
                    <span class="service-meta-label">Built with:</span>
                    <span class="service-meta-text">Socket.IO, Node.js, React</span>
                  </div>
                  <div class="service-meta-row">
                    <span class="service-meta-label">Good for:</span>
                    <span class="service-meta-text">marketplaces, community apps, booking and tracking tools</span>
                  </div>
                  <div class="service-meta-row">
                    <span class="service-meta-label">Proof:</span>
                    <span class="service-proof-links">
                      <a href="https://campusfind-8hn9.onrender.com/" target="_blank" rel="noopener noreferrer" class="service-proof-link">CampusFind ↗</a>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- CTA Container -->
            <div class="services-cta-container">
              <a href="mailto:padmasrichikle@gmail.com?subject=Project%20Inquiry%20-%20Start%20a%20Project" class="rpg-btn primary services-cta-btn">Start a project →</a>
              <p class="services-cta-subtext">Not sure which fits? Send me a short note about your idea and I’ll reply with a plan.</p>
            </div>

            <!-- Milestone Navigation -->
            <div style="display: flex; justify-content: space-between; margin-top: 18px; padding-top: 14px; border-top: 1px solid #2e3544;">
              <button class="rpg-btn" onclick="window.roadmapInstance.scrollToMilestone(4, true); window.roadmapInstance.closeModal();">◀ Back: Quests</button>
              <button class="rpg-btn primary" onclick="window.roadmapInstance.scrollToMilestone(6, true); window.roadmapInstance.closeModal();">Next: Achievements ▶</button>
            </div>
          </div>
        `;

      case 6:
        return `
          <div class="battle-cards-grid">
            <div class="battle-trophy-card">
              <div class="battle-icon">🥇</div>
              <div class="battle-score">250+</div>
              <div class="battle-title">LeetCode Solved</div>
              <p class="battle-desc">Data Structures, DP, Graph Traversals, Trees & Greedy Algorithms.</p>
              <a href="https://leetcode.com/u/padmasrii_codes/" target="_blank" rel="noopener noreferrer" class="rpg-btn primary" style="margin-top: 10px; width: 100%;">LeetCode Profile ↗</a>
            </div>

            <div class="battle-trophy-card">
              <div class="battle-icon">⚔️</div>
              <div class="battle-score">777</div>
              <div class="battle-title">Codeforces Rating</div>
              <p class="battle-desc">130+ Competitive programming problems solved across speed challenges.</p>
              <a href="https://codeforces.com/profile/padmasri2310" target="_blank" rel="noopener noreferrer" class="rpg-btn primary" style="margin-top: 10px; width: 100%;">Codeforces Profile ↗</a>
            </div>

            <div class="battle-trophy-card">
              <div class="battle-icon">🌐</div>
              <div class="battle-score">${openSource.total} Merged PRs</div>
              <div class="battle-title">CNCF Open Source</div>
              <p class="battle-desc">
                <strong>${openSource.jaeger} Merged PRs</strong> in <em>Jaeger Tracing</em><br>
                <strong>${openSource.opentelemetry} Merged PRs</strong> in <em>OpenTelemetry</em>
              </p>
              <a href="https://github.com/${openSource.username}" target="_blank" rel="noopener noreferrer" class="rpg-btn primary" style="margin-top: 10px; width: 100%;">GitHub Activity ↗</a>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 20px;">
            <button class="rpg-btn" onclick="window.roadmapInstance.scrollToMilestone(5, true); window.roadmapInstance.closeModal();">◀ Back: Services</button>
            <button class="rpg-btn gold" onclick="window.roadmapInstance.scrollToMilestone(7, true); window.roadmapInstance.closeModal();">Reach The Summit 🏆</button>
          </div>
        `;

      case 7:
        return `
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="position: relative; width: 110px; height: 125px; margin: 0 auto 12px auto; border-radius: 12px; border: 4px solid #f1c40f; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.6); background: #252b38;">
              <img src="./assets/padmasri.jpg" alt="Padmasri Chikle" style="width: 100%; height: 100%; object-fit: cover; object-position: center 20%;">
            </div>
            <div style="font-size: 24px; margin-bottom: 4px;">🏆 👑 🏆</div>
            <h2 style="font-family: 'Press Start 2P', monospace; font-size: 13px; color: #f1c40f; margin-bottom: 6px;">SUMMIT VICTORY HALL OF FAME!</h2>
            <p style="font-size: 12px; color: #94a3b8;">You have traversed the entire roadmap of Padmasri's engineering journey.</p>
          </div>

          <div class="contact-scroll-box" style="background: #232936; border: 2px solid #363e52; border-radius: 10px; padding: 18px;">
            <h3 style="font-family: 'Press Start 2P', monospace; font-size: 10px; color: #38bdf8; margin-bottom: 12px;">TRANSMIT OPPORTUNITY / GREETINGS</h3>
            <form onsubmit="event.preventDefault(); window.location.href='mailto:padmasrichikle@gmail.com?subject=' + encodeURIComponent(document.getElementById('modal-email-subject').value) + '&body=' + encodeURIComponent(document.getElementById('modal-email-body').value);">
              <div style="margin-bottom: 10px;">
                <input type="text" id="modal-email-subject" placeholder="Subject / Project / Job Opportunity" style="width: 100%; background: #171a22; border: 2px solid #363e52; border-radius: 6px; padding: 10px; color: #ffffff; font-family: inherit; font-size: 13px;" required>
              </div>
              <div style="margin-bottom: 12px;">
                <textarea id="modal-email-body" rows="4" placeholder="Hello Padmasri, I explored your roadmap portfolio and..." style="width: 100%; background: #171a22; border: 2px solid #363e52; border-radius: 6px; padding: 10px; color: #ffffff; font-family: inherit; font-size: 13px; resize: none;" required></textarea>
              </div>
              <button type="submit" class="rpg-btn primary" style="width: 100%;">📨 Send Direct Email to Padmasri</button>
            </form>

            <div class="contact-action-buttons" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px;">
              <a href="https://drive.google.com/file/d/1cT9AdrHuSwM93CPUsjus9PfUzDXhagcT/view?usp=sharing" target="_blank" rel="noopener noreferrer" class="rpg-btn gold">📄 View Resume ↗</a>
              <a href="mailto:padmasrichikle@gmail.com" class="rpg-btn">📧 Email Direct</a>
              <a href="https://www.linkedin.com/in/padmasri-chikle/" target="_blank" rel="noopener noreferrer" class="rpg-btn">💼 LinkedIn</a>
              <a href="https://github.com/padmasri-web" target="_blank" rel="noopener noreferrer" class="rpg-btn">🐙 GitHub</a>
              <a href="https://leetcode.com/u/padmasrii_codes/" target="_blank" rel="noopener noreferrer" class="rpg-btn">⚡ LeetCode</a>
              <button class="rpg-btn gold" onclick="window.roadmapInstance.scrollToMilestone(0, false); window.roadmapInstance.closeModal();">🔄 Back to Start</button>
            </div>
          </div>
        `;
      default:
        return `<p>Milestone details not found.</p>`;
    }
  }
}
