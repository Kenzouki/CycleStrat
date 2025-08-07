# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `npm run build` - Build production bundle using webpack
- `npm run dev` - Start development server with hot reload on port 3000
- `npm start` - Start development server (alias for dev)

### Dependencies
- `npm install` - Install all dependencies

## Architecture Overview

This is a TypeScript-based web application implementing CycleStrat, an advanced betting system inspired by the Labouchere method but enhanced with multi-cycle management and sophisticated features. The app is built as a single-page application using vanilla TypeScript with webpack bundling.

### Core Architecture
- **Entry Point**: `src/app.ts` - Main application class and initialization
- **Build System**: Webpack with TypeScript compilation, CSS processing, and HTML templating
- **Styling**: CSS with custom properties for theming and dark mode support
- **State Management**: In-memory session state with localStorage persistence

### Key Components

**CycleStratApp Class** (`src/app.ts`):
- Main application controller managing all functionality
- Handles session lifecycle, betting logic, and UI updates
- Implements complete CycleStrat betting system with advanced multi-cycle management
- Supports both even-money and non-even-money betting scenarios

**Data Structures**:
- `SessionMetadata` - Session configuration and statistics
- `SessionData` - Current session state (balance, sequences, cycles)
- `HistoryEntry` - Individual bet records
- `SessionFile` - Complete session data for persistence

### Core Features

**Session Management**:
- Create/load/save/delete named sessions
- Persistent storage using localStorage
- Session timer and duration tracking
- Pause/resume functionality

**Betting System**:
- Advanced multi-cycle sequence management (CycleStrat's key innovation)
- Risk management with stop-loss protection
- Split functionality for large sequence values
- Support for non-even money bets (2:1, 3:1, etc.)
- Automatic bet size calculation based on sequence
- Cycle reshuffling and rebalancing capabilities

**UI Management**:
- Dynamic panel visibility based on session state
- Real-time updates of all displays
- Modal confirmations for destructive actions
- Toast notifications for user feedback
- Collapsible configuration panel

### Key Methods

**Session Control**:
- `startSession()` - Initialize and begin betting session
- `processBet()` - Handle win/loss outcomes and update state
- `splitLastEntry()` - Split large sequence values across cycles

**Calculations**:
- `calculateBetSize()` - Determine next bet amount
- `calculateDesiredProfit()` - Sum of first and last sequence values
- `roundToMinimumBet()` - Ensure values comply with minimum bet rules

**State Management**:
- `reconstructStateFromHistory()` - Rebuild session state from bet history
- `updateAllDisplays()` - Refresh all UI elements with current data

### Development Notes

**Configuration**:
- TypeScript target: ES2020 with DOM support
- Webpack dev server runs on port 3000 with hot reload
- CSS uses CSS custom properties for consistent theming
- Supports system dark mode preference

**File Structure**:
- `src/app.ts` - Main application logic (~1600 lines)
- `src/index.html` - HTML template with complete UI structure
- `src/styles.css` - Comprehensive CSS with theming support
- `webpack.config.js` - Webpack configuration for development and production
- `tsconfig.json` - TypeScript compiler configuration

**Browser Features Used**:
- localStorage for session persistence
- Clipboard API for bet size copying
- CSS custom properties for theming
- Font Awesome icons via CDN

The application is designed for professional betting system management with comprehensive session tracking, risk management, and statistical analysis capabilities.