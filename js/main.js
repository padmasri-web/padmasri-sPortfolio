import { RoadmapGame } from './roadmap.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Roadmap Game
  const game = new RoadmapGame();
  window.roadmapInstance = game;

  // Header quick chip click -> open About modal
  const playerChip = document.getElementById('player-hud-chip');
  if (playerChip) {
    playerChip.addEventListener('click', () => {
      game.moveToMilestone(0, true);
    });
  }

  // Keyboard shortcut hints
  console.log("🎮 Padmasri's Gamified Roadmap Portfolio initialized!");
  console.log("Controls: [W/S] or [Arrow keys] to travel, [Space] to inspect milestone.");
});
