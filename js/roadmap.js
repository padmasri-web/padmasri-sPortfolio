import { sound } from './audio.js';

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

    // Milestones definitions (mapped along path 0.0 to 1.0)
    this.milestones = [
      {
        id: 0,
        progress: 0.0,
        name: "ORIGIN & START",
        title: "START: Padmasri's Origin",
        tag: "STATION 0",
        type: "about",
        cardId: "card-start"
      },
      {
        id: 1,
        progress: 0.20,
        name: "01 • ACADEMY",
        title: "Knowledge Glade: Mirai School of Tech",
        tag: "STATION 1",
        type: "education",
        cardId: "card-education"
      },
      {
        id: 2,
        progress: 0.42,
        name: "02 • TECH ARSENAL",
        title: "The Arsenal: Full-Stack & AI Stack",
        tag: "STATION 2",
        type: "skills",
        cardId: "card-skills"
      },
      {
        id: 3,
        progress: 0.65,
        name: "03 • QUEST VALLEY",
        title: "Quest Valley: 5 Featured Projects",
        tag: "STATION 3",
        type: "projects",
        cardId: "card-projects"
      },
      {
        id: 4,
        progress: 0.83,
        name: "04 • BATTLE ARENA",
        title: "Battle Arena: 250+ LeetCode & CNCF PRs",
        tag: "STATION 4",
        type: "achievements",
        cardId: "card-achievements"
      },
      {
        id: 5,
        progress: 1.0,
        name: "05 • GOLDEN SUMMIT",
        title: "Golden Summit: Contact & Hire Padmasri",
        tag: "STATION 5",
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

    // Bind scroll-driven movement
    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    window.addEventListener('resize', () => this.updateView(this.currentProgress));
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateView(this.currentProgress), 150);
    });

    // Mobile touch swipe support
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      sound.init();
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && !this.modalBackdrop.classList.contains('open')) {
        const currentY = e.touches[0].clientY;
        const deltaY = (touchStartY - currentY) * 1.4;
        touchStartY = currentY;
        window.scrollBy({ top: deltaY, behavior: 'auto' });
      }
    }, { passive: true });

    // Initial position at Start (Progress 0)
    this.updateView(0);

    // Bind controls, pins, and collectibles
    this.bindControls();
    this.bindPinsAndCards();
    this.bindCollectibles();

    // Auto update audio icon
    this.updateAudioIcon();
  }

  // Handle continuous scroll-driven character movement
  handleScroll() {
    const scrollY = window.scrollY;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, scrollY / maxScroll));

    sound.init();

    const isMovingForward = scrollY >= this.lastScrollY;
    this.lastScrollY = scrollY;

    // Footsteps sound while scrolling
    const now = performance.now();
    if (now - this.lastStepTime > 180) {
      sound.playStep();
      this.lastStepTime = now;
    }

    // Update character state
    this.characterEl.classList.add('is-walking');
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.characterEl.classList.remove('is-walking');
    }, 150);

    this.updateView(progress, isMovingForward);
  }

  updateView(progress, isMovingForward = true) {
    if (!this.pathEl) return;
    this.currentProgress = progress;

    // Calculate exact point on SVG path (viewBox: 0 0 1000 2000)
    const point = this.pathEl.getPointAtLength(progress * this.pathLength);

    // Percentage coordinates relative to 1000 x 2000 coordinate space
    const leftPercent = (point.x / 1000) * 100;
    const topPercent = (point.y / 2000) * 100;

    this.characterEl.style.left = `${leftPercent}%`;
    this.characterEl.style.top = `${topPercent}%`;

    // Direction flip
    if (point.x < this.lastX - 0.5) {
      this.characterEl.classList.add('facing-left');
    } else if (point.x > this.lastX + 0.5) {
      this.characterEl.classList.remove('facing-left');
    }
    this.lastX = point.x;

    // Responsive 2D Camera Tracking: Smoothly pans to follow the player on all screen sizes
    if (this.worldEl) {
      const worldW = this.worldEl.offsetWidth;
      const worldH = this.worldEl.offsetHeight;

      const charPixelX = (point.x / 1000) * worldW;
      const charPixelY = (point.y / 2000) * worldH;

      // Vertical tracking
      const minCamY = Math.min(0, window.innerHeight - worldH);
      const targetCamY = (window.innerHeight * 0.52) - charPixelY;
      const camY = Math.max(minCamY, Math.min(0, targetCamY));

      // Horizontal tracking when screen is narrower than the world (mobile/tablets)
      if (window.innerWidth < worldW) {
        const targetCamX = (window.innerWidth / 2) - charPixelX;
        const minCamX = window.innerWidth - worldW;
        const camX = Math.max(minCamX, Math.min(0, targetCamX));
        this.worldEl.style.left = '0';
        this.worldEl.style.transform = `translate3d(${camX}px, ${camY}px, 0)`;
      } else {
        this.worldEl.style.left = '50%';
        this.worldEl.style.transform = `translate3d(-50%, ${camY}px, 0)`;
      }
    }

    // Real-Time "Next Stop" calculation
    this.updateNextStop(progress);
  }

  updateNextStop(progress) {
    // Find next upcoming milestone
    let nextIdx = this.milestones.findIndex(m => m.progress > progress + 0.02);
    if (nextIdx === -1) nextIdx = 5;

    let currentIdx = nextIdx > 0 ? nextIdx - 1 : 0;
    this.currentMilestone = currentIdx;
    this.nextMilestone = nextIdx;

    const currentM = this.milestones[currentIdx];
    const nextM = this.milestones[nextIdx];

    // Distance calculation
    const range = Math.max(0.01, nextM.progress - currentM.progress);
    const subProgress = Math.max(0, Math.min(1, (progress - currentM.progress) / range));
    const percentRemaining = Math.max(0, Math.round((1 - subProgress) * 100));

    // Update HUD Banner
    if (this.currentStopNameEl) {
      this.currentStopNameEl.textContent = currentM.name;
    }
    if (this.nextStopNameEl) {
      this.nextStopNameEl.textContent = progress >= 0.98 ? "🏆 SUMMIT REACHED!" : nextM.name;
    }
    if (this.nextMeterFillEl) {
      this.nextMeterFillEl.style.width = `${Math.round(subProgress * 100)}%`;
    }
    if (this.nextDistanceTextEl) {
      this.nextDistanceTextEl.textContent = progress >= 0.98 ? "VICTORY" : `${percentRemaining}% to stop`;
    }

    // Update Floating Waypoint Compass at bottom
    if (this.compassTextEl) {
      this.compassTextEl.textContent = progress >= 0.98 ? "🏆 AT THE SUMMIT" : `NEXT STOP: ${nextM.name}`;
    }

    // Update Floating Speech Bubble over character
    if (this.speechBubbleEl) {
      const distToCurrent = Math.abs(progress - currentM.progress);
      if (distToCurrent < 0.03 && currentIdx > 0) {
        this.speechBubbleEl.innerHTML = `<span>📍</span><span>At ${currentM.name}!</span>`;
      } else if (progress >= 0.98) {
        this.speechBubbleEl.innerHTML = `<span>🏆</span><span>Summit Victory!</span>`;
      } else {
        this.speechBubbleEl.innerHTML = `<span>🚀</span><span>Next: ${nextM.name} ➔</span>`;
      }
    }

    // Highlight active pin & card
    document.querySelectorAll('.milestone-pin-container').forEach(p => p.classList.remove('active-target'));
    const activePin = document.querySelector(`.milestone-pin-container[data-station="${currentIdx}"]`);
    if (activePin) activePin.classList.add('active-target');

    document.querySelectorAll('.milestone-card-overlay').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(currentM.cardId);
    if (activeCard) activeCard.classList.add('active');
  }

  // Smoothly scroll to a milestone
  scrollToMilestone(index, openModalAfter = false) {
    if (index < 0 || index >= this.milestones.length) return;
    const milestone = this.milestones[index];
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const targetScrollY = milestone.progress * maxScroll;

    sound.playClick();

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });

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
        this.scrollToMilestone(5, true);
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
                <div class="stat-val">10 (Jaeger & OTel)</div>
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
            Active contributor to CNCF (Cloud Native Computing Foundation) projects including <strong>Jaeger</strong> and <strong>OpenTelemetry</strong>, and an avid competitive programmer with <strong>250+ solved algorithmic problems</strong> on LeetCode.
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
          <div class="inventory-section">
            <div class="inventory-section-title"><span>🗡️</span> CORE LANGUAGES</div>
            <div class="inventory-grid">
              <div class="inventory-slot">
                <div class="slot-name-row"><span>C++</span><span>Proficient (90%)</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 90%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>JavaScript (ES6+)</span><span>Advanced (95%)</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 95%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>TypeScript</span><span>Advanced (85%)</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 85%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>HTML5 & CSS3</span><span>Expert (95%)</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 95%;"></div></div>
              </div>
            </div>
          </div>

          <div class="inventory-section">
            <div class="inventory-section-title"><span>🛡️</span> FRONTEND & UI MAGIC</div>
            <div class="inventory-grid">
              <div class="inventory-slot">
                <div class="slot-name-row"><span>React 18</span><span>Component Arch</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 90%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>Three.js</span><span>3D Visuals</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 75%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>GSAP & Canvas</span><span>Animations</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 82%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>Tailwind / EJS</span><span>Templates</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 88%;"></div></div>
              </div>
            </div>
          </div>

          <div class="inventory-section">
            <div class="inventory-section-title"><span>⚡</span> BACKEND, AI & CLOUD ENGINES</div>
            <div class="inventory-grid">
              <div class="inventory-slot">
                <div class="slot-name-row"><span>Node.js / Express</span><span>Microservices</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 92%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>Google Gemini AI</span><span>LLM Interactions</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 88%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>Socket.IO</span><span>WebSockets</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 86%;"></div></div>
              </div>
              <div class="inventory-slot">
                <div class="slot-name-row"><span>MongoDB / Cloudinary</span><span>Data & Media</span></div>
                <div class="slot-progress-bg"><div class="slot-progress-fill" style="width: 90%;"></div></div>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 16px;">
            <button class="rpg-btn" onclick="window.roadmapInstance.scrollToMilestone(1, true); window.roadmapInstance.closeModal();">◀ Back</button>
            <button class="rpg-btn primary" onclick="window.roadmapInstance.scrollToMilestone(3, true); window.roadmapInstance.closeModal();">Next: Projects ▶</button>
          </div>
        `;

      case 3:
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
            <button class="rpg-btn" onclick="window.roadmapInstance.scrollToMilestone(2, true); window.roadmapInstance.closeModal();">◀ Back</button>
            <button class="rpg-btn primary" onclick="window.roadmapInstance.scrollToMilestone(4, true); window.roadmapInstance.closeModal();">Next: Achievements ▶</button>
          </div>
        `;

      case 4:
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
              <a href="https://codeforces.com" target="_blank" rel="noopener noreferrer" class="rpg-btn primary" style="margin-top: 10px; width: 100%;">Profile ↗</a>
            </div>

            <div class="battle-trophy-card">
              <div class="battle-icon">🌐</div>
              <div class="battle-score">10 Merged PRs</div>
              <div class="battle-title">CNCF Open Source</div>
              <p class="battle-desc">
                <strong>7 Merged PRs</strong> in <em>Jaeger Tracing</em><br>
                <strong>3 Merged PRs</strong> in <em>OpenTelemetry</em>
              </p>
              <a href="https://github.com/padmasri-web" target="_blank" rel="noopener noreferrer" class="rpg-btn primary" style="margin-top: 10px; width: 100%;">GitHub Activity ↗</a>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 20px;">
            <button class="rpg-btn" onclick="window.roadmapInstance.scrollToMilestone(3, true); window.roadmapInstance.closeModal();">◀ Back</button>
            <button class="rpg-btn gold" onclick="window.roadmapInstance.scrollToMilestone(5, true); window.roadmapInstance.closeModal();">Reach The Summit 🏆</button>
          </div>
        `;

      case 5:
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
