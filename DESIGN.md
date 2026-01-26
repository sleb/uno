# Uno Game - Design Document

## Overview

A web-based, asynchronous, multiplayer Uno card game using Firebase as the backend. Players can join games and play at their own pace without needing to be online simultaneously.

## Technology Stack

- **Frontend**: Web-based (HTML/CSS/JavaScript)
- **Backend**: Firebase
  - Firestore (database)
  - Firebase Authentication
  - Firebase Cloud Functions (game logic)
  - Firebase Cloud Messaging (notifications)

---

## Web Pages

### 1. Home Page (`/`)

**Purpose**: Landing page and entry point to the application

**Features**:

- Welcome message and game description
- Login/Sign-up buttons
- Quick start option for authenticated users
- Link to game rules

---

### 2. Dashboard (`/dashboard`)

**Purpose**: Main hub after authentication

**Features**:

- Active games list (games waiting for player's turn)
- Pending invitations
- Create new game button
- Join existing game button
- User stats summary (wins, losses, games played)
- Friend list / recent players

---

### 3. Game Lobby (`/lobby`)

**Purpose**: Browse and join available games

**Features**:

- List of open games (public games looking for players)
- Filter options (number of players, game status)
- Create new game modal with options:
  - Public vs. Private game
  - Number of players (2-4)
  - Game rules/house rules toggles
- Join game with code input

---

### 4. Game Room (`/game/:gameId`)

**Purpose**: The main game interface where Uno is played

**Features**:

- Game board display:
  - Discard pile (top card visible)
  - Draw pile
  - Player's hand
  - Other players' card counts and names
  - Current turn indicator
- Game controls:
  - Play card action
  - Draw card action
  - UNO button
  - Color selector (for wild cards)
- Game state information:
  - Turn order
  - Direction of play
  - Game log/activity feed
- Chat/comments section
- Leave game / forfeit option

---

### 5. Profile Page (`/profile/:userId`)

**Purpose**: View player statistics and game history

**Features**:

- Player information (name, avatar)
- Game statistics:
  - Total games played
  - Wins/losses
  - Win rate
  - Favorite opponent
- Game history (past games with results)
- Edit profile option (own profile only)

---

### 6. Rules Page (`/rules`)

**Purpose**: Explain Uno game rules

**Features**:

- Official Uno rules
- Explanation of special cards
- House rules that can be enabled
- How asynchronous play works

---

## Firestore Data Design

### Collections Structure

```
/users/{userId}
/games/{gameId}
/games/{gameId}/players/{playerId}
/games/{gameId}/playerHands/{playerId}
```

---

### 1. Users Collection (`/users/{userId}`)

**Document ID**: Firebase Auth UID

**Schema**:

```javascript
{
  displayName: string,         // Player's display name
  avatar: string,              // Emoji or avatar identifier
}
```

**MVP Implementation**: Current schema includes only essential fields. Future additions:

- `stats` (gamesPlayed, gamesWon, gamesLost, winRate)
- `preferences` (notifications, soundEffects, theme)
- `activeGames`, `pendingInvites` arrays

**Indexes**: None required for MVP.

---

### 2. Games Collection (`/games/{gameId}`)

**Document ID**: Auto-generated

**Schema**:

```javascript
{
  createdAt: string,           // ISO timestamp - game creation time
  startedAt: string | null,    // ISO timestamp - when game started (null for waiting)
  lastActivityAt: string,      // ISO timestamp - last activity time

  // Game Configuration
  config: {
    isPrivate: boolean,        // Private or public game
    maxPlayers: number,        // 2-10 players
    houseRules: string[],      // Array of HouseRule enums: 'stacking' | 'jumpIn' | 'sevenSwap' | 'drawToMatch' | 'zeroRotation'
  },

  // Players in game
  players: string[],           // Array of userIds

  // Game State
  state: {
    status: string,            // 'waiting' | 'in-progress' | 'completed'
    currentTurnPlayerId: string | null, // userId of current player (null if waiting)
    direction: string,         // 'clockwise' | 'counter-clockwise'
    deckSeed: string,          // Random seed for deck generation (updated on reshuffle)
    drawPileCount: number,     // Cards remaining in draw pile
    discardPile: [{            // Discard pile (most recent card at end)
      color: string,           // 'red' | 'yellow' | 'green' | 'blue' (wild cards have no color)
      value: string,           // '0'-'9' | 'skip' | 'reverse' | 'draw-two' | 'wild' | 'wild-draw-four'
    }],
  },
}
```

**Post-MVP fields** (planned for future phases):

- `completedAt` - timestamp when game ended
- `state.currentColor` - active color for wild cards
- `state.mustDraw` - pending draw count for stacking
- `state.turnStartedAt` - when current turn began
- `state.consecutivePasses` - track stuck games
- `winner` - object with userId, displayName, completedAt
- `recentActivity` - array of action logs

**Indexes**: To be defined. Current queries use `players` (array-contains) to find user's active games.

---

### 3. Game Players Subcollection (`/games/{gameId}/players/{playerId}`)

**Document ID**: userId

**Schema** (public profile data—readable by all game participants):

```javascript
{
  userId: string,              // Reference to user
  displayName: string,         // Cached display name
  avatar: string,              // Cached avatar
  joinedAt: string,            // ISO timestamp - when player joined
  cardCount: number,           // Number of cards in hand
  hasCalledUno: boolean,       // Whether UNO was called with 1 card
  status: string,              // 'waiting' | 'active' | 'winner' | 'forfeited'
  lastActionAt: string,        // ISO timestamp - last time player took action
  gameStats: {
    cardsPlayed: number,       // Total cards played
    cardsDrawn: number,        // Total cards drawn
    turnsPlayed: number,       // Number of turns taken
    specialCardsPlayed: number, // Count of action/wild cards played
  },
}
```

**Security**: Readable by all players in a non-waiting game; when game is waiting, any authenticated user can read.

**Post-MVP fields**:

- `position` - seat position (0-9)

---

### 4. Player Hands Subcollection (`/games/{gameId}/playerHands/{playerId}`)

**Document ID**: userId

**Schema** (private hand data—readable only by owner):

```javascript
{
  // Cards in hand (visible only to the owner via Firestore security rules)
  hand: [{
    color: string,             // 'red' | 'yellow' | 'green' | 'blue' (wild cards have no color)
    value: string,             // '0'-'9' | 'skip' | 'reverse' | 'draw-two' | 'wild' | 'wild-draw-four'
  }],
}
```

**Security**: Only readable by `playerId` (the owner). Cloud Functions update this collection with proper authentication.

---

### 5. Card Management

**Card object structure**:

```javascript
{
  color: string,               // 'red' | 'blue' | 'green' | 'yellow' | 'wild'
  value: string,               // '0'-'9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4'
}
```

**Draw pile representation**: The draw pile is computed implicitly rather than stored. When a player draws:

1. Build the canonical 108-card Uno deck in memory.
2. Remove all cards present in `state.discardPile` across all game documents.
3. Remove all cards in every player's `hand` array.
4. Use `state.deckSeed` to deterministically shuffle the remaining available cards.
5. Select the first card from the shuffled result.
6. Add the selected card to the player's hand and update `cardCount`.

**Reshuffling**: When the draw pile is exhausted (no cards available):

1. Keep only the top card of `state.discardPile` (the currently active discard).
2. Move all other discard pile cards back into the available pool.
3. Generate a new random `deckSeed` and update `state.deckSeed`.
4. Continue drawing from the newly available cards.

This approach:

- Avoids persisting and shuffling a deck upfront
- Guarantees card uniqueness across the game
- Provides deterministic randomization via seed (useful for debugging/replay)
- Handles deck exhaustion gracefully with automatic reshuffling
- Simplifies game state (no separate card tracking)
- Makes it impossible for cards to be duplicated or lost

**Discard pile**: Stored as an ordered array in `state.discardPile` with the most recently played card at the end of the array. The top card is `discardPile[discardPile.length - 1]`.

**Player hands**: Stored as card arrays in each player's private `/games/{gameId}/playerHands/{playerId}` document, visible only to that player via security rules.

---

## Data Flow Examples

### Starting a New Game

1. User clicks "Create Game" on dashboard
2. Cloud Function creates new document in `/games`
3. Cloud Function creates player document in `/games/{gameId}/players/{userId}` (public profile)
4. Cloud Function creates playerHands document in `/games/{gameId}/playerHands/{userId}` with initial cards
5. Cloud Function sets first discard pile card
6. Cloud Function updates `/users/{userId}/activeGames`

### Playing a Turn

1. Player selects card from hand
2. Client validates card is playable (local check)
3. Client calls Cloud Function `playCard(gameId, cardIndex, selectedColor?)`
4. Cloud Function validates move (authoritative check)
5. Cloud Function updates:
   - `/games/{gameId}` (state.discardPile, currentTurn)
   - `/games/{gameId}/players/{userId}` (cardCount, stats)
   - `/games/{gameId}/playerHands/{userId}` (hand)
   - `/users/{nextPlayerId}` (trigger notification)
6. Other players receive real-time updates via Firestore listeners

### Checking for Winner

1. After each card played, Cloud Function checks if player's cardCount === 0
2. If true, updates game state to 'completed'
3. Updates winner object in game document
4. Updates stats in all player documents
5. Sends notifications to all players

---

## Next Steps

- Define Firebase security rules
- Plan notification system for turn alerts
- Create wireframes for each page
- Implement Cloud Functions for game logic
- Design real-time listeners and data synchronization
