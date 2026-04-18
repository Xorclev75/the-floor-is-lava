# The Floor Is Lava

A fast-paced mobile-friendly browser game where every step matters.

Players race across a collapsing grid, collecting coins and trying to reach the exit before the floor drops away into lava. As levels increase, the grid gets larger, the pressure rises, and survival gets harder.

## How It Works

- Players begin on an **orange start tile**
- The goal is to reach the **green exit tile**
- Movement is done by clicking or tapping an **adjacent tile**
- As the player moves, the floor falls away behind them and becomes **lava**
- If the **collapse timer** runs out, the player loses a life and falls
- Coins can be collected and spent between levels in the **shop**

## Features

- Mobile-friendly tap-to-move gameplay
- Increasing difficulty through larger grid sizes
- Random exit placement each level
- Coin collection and score tracking
- Shop system between levels
- Buyable **extra lives**
- Buyable **freeze charges**
- Freeze ability to temporarily extend the timer
- High score and best level tracking
- Game over and life-loss overlays
- Custom title screen and instructions overlay

## Shop Items

### Extra Life
Spend coins to gain another chance after falling into lava.

### Freeze Charge
Spend coins to buy a freeze use, which helps when the collapse timer is running low.

## Controls

### Mobile
- Tap an adjacent tile to move

### Desktop
- Arrow keys or WASD to move
- Spacebar to use Freeze

## Objective

Survive as long as possible by:

- reaching the exit
- collecting coins
- buying helpful upgrades
- managing lives carefully
- reacting quickly before the timer runs out

Your final performance is based on:

- **score**
- **coins collected**
- **levels completed**

## Built With

- **React**
- **Vite**
- Inline styling for fast UI iteration and mobile-focused layout adjustments

## Updates

- Added permanent upgrades to the Shop
- Players do not lose their coins if game over
- Added themes to the game and ability to buy themes in the shop

## Running Locally

Clone the repo, install dependencies, and start the local dev server:

```bash
npm install
npm run dev


