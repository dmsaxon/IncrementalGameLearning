# Incremental Clicker Game

A small browser-based incremental clicker game built with vanilla HTML, CSS, and JavaScript.

## Features

- 10 clickable circles
- Dollar-based currency
- Upgradeable click value per circle
- Stackable managers per circle for autoclicking
- Manager speed increases as you hire more
- Local save/load with browser localStorage

## Run

1. Open `index.html` in your browser.
2. Click circles to earn money.
3. Buy upgrades and managers to automate progress.

## Files

- `index.html` - page structure
- `styles.css` - visual styling and circle fill animation
- `script.js` - game state, economy, upgrades, managers, persistence

## Roadmap

### Balance tuning

- Revisit upgrade and manager cost growth curves to smooth early/mid-game pacing.
- Tune manager speed scaling to keep automation strong but not runaway.
- Add simple balancing checkpoints (time-to-first-manager, time-to-unlock-next-item).
