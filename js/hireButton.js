// ==========================================================================
// HIRE BUTTON COMPONENT
// Persistent call-to-action with anchored popover for direct contact options
// ==========================================================================

// Contact details reused from Summit / Portfolio
const CONTACT_EMAIL = "padmasrichikle@gmail.com";
const LINKEDIN_URL = "https://www.linkedin.com/in/padmasri-chikle/";
const GITHUB_URL = "https://github.com/padmasri-web";

export class HireButton {
  constructor(containerId = 'hire-button-mount') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`HireButton: Container #${containerId} not found.`);
      return;
    }
    this.isOpen = false;
    this.render();
    this.bindEvents();
  }

  render() {
    const emailSubject = encodeURIComponent("Opportunity from your portfolio");
    const emailBody = encodeURIComponent("Hi Padmasri, I came across your portfolio and would like to talk about...");
    const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${emailSubject}&body=${emailBody}`;

    this.container.innerHTML = `
      <div class="hire-me-wrapper">
        <button 
          id="btn-hire-me" 
          class="hire-me-btn" 
          aria-haspopup="dialog" 
          aria-expanded="false" 
          aria-controls="hire-me-popover" 
          title="Hire Padmasri - Open to internships & freelance"
        >
          <span class="hire-pulse-dot" aria-hidden="true"></span>
          <span class="hire-btn-content">
            <span class="hire-btn-title">Hire me</span>
            <span class="hire-btn-subtitle">Open to internships & freelance</span>
          </span>
          <span class="hire-arrow-indicator" aria-hidden="true">▾</span>
        </button>

        <div 
          id="hire-me-popover" 
          class="hire-popover" 
          role="dialog" 
          aria-label="Contact and hire options" 
          aria-hidden="true"
        >
          <div class="hire-popover-header">
            <span class="hire-popover-badge">GET IN TOUCH</span>
            <button class="hire-popover-close-btn" id="btn-close-hire-popover" aria-label="Close contact menu">✕</button>
          </div>
          <div class="hire-popover-options">
            <!-- 1. Email (Visually Primary Option) -->
            <a 
              href="${mailtoUrl}" 
              class="hire-option-item primary" 
              id="hire-opt-email"
            >
              <span class="hire-option-icon">✉️</span>
              <span class="hire-option-text">
                <strong class="hire-option-label">Email me</strong>
                <small class="hire-option-sub">Direct transmission</small>
              </span>
              <span class="hire-option-arrow">➔</span>
            </a>

            <!-- 2. LinkedIn -->
            <a 
              href="${LINKEDIN_URL}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="hire-option-item" 
              id="hire-opt-linkedin"
            >
              <span class="hire-option-icon">💼</span>
              <span class="hire-option-text">
                <strong class="hire-option-label">LinkedIn</strong>
                <small class="hire-option-sub">Professional profile</small>
              </span>
              <span class="hire-option-arrow">↗</span>
            </a>

            <!-- 3. GitHub -->
            <a 
              href="${GITHUB_URL}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="hire-option-item" 
              id="hire-opt-github"
            >
              <span class="hire-option-icon">🐙</span>
              <span class="hire-option-text">
                <strong class="hire-option-label">GitHub</strong>
                <small class="hire-option-sub">Code repositories</small>
              </span>
              <span class="hire-option-arrow">↗</span>
            </a>
          </div>
        </div>
      </div>
    `;

    this.button = this.container.querySelector('#btn-hire-me');
    this.popover = this.container.querySelector('#hire-me-popover');
    this.closeBtn = this.container.querySelector('#btn-close-hire-popover');
  }

  bindEvents() {
    if (!this.button || !this.popover) return;

    // Toggle popover on button click
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Close on close button click
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    // Close when selecting any option link
    this.popover.querySelectorAll('.hire-option-item').forEach(link => {
      link.addEventListener('click', () => {
        this.close();
      });
    });

    // Outside click closes popover
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.container.contains(e.target)) {
        this.close();
      }
    });

    // Keyboard handling & Isolation of game shortcuts while popover is open
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      // Close on Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
        return;
      }

      // Block character movement and roadmap shortcuts while popover is open
      const blockedCodes = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'KeyW', 'KeyA', 'KeyS', 'KeyD',
        'KeyP', 'KeyC'
      ];
      if (blockedCodes.includes(e.code) || blockedCodes.includes(e.key)) {
        e.stopPropagation();
      }
    }, true); // Capture phase ensures roadmap keydown handler doesn't run while popover is open
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.popover.classList.add('open');
    this.popover.setAttribute('aria-hidden', 'false');
    this.button.setAttribute('aria-expanded', 'true');
    this.button.classList.add('active');

    // Focus first interactive option
    const firstOption = this.popover.querySelector('.hire-option-item');
    if (firstOption) {
      setTimeout(() => firstOption.focus(), 50);
    }
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.popover.classList.remove('open');
    this.popover.setAttribute('aria-hidden', 'true');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.classList.remove('active');

    // Return focus to button
    if (this.button) {
      this.button.focus();
    }
  }
}

