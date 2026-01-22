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
```

---

### 1. Users Collection (`/users/{userId}`)

**Document ID**: Firebase Auth UID

**Schema**:

```javascript
{
  userId: string,              // Firebase Auth UID
  displayName: string,         // Player's display name
  email: string,               // Email address
  photoURL: string | null,     // Profile picture URL
  createdAt: timestamp,        // Account creation date
  lastActive: timestamp,       // Last activity timestamp

  // Statistics
  stats: {
    gamesPlayed: number,       // Total games participated
    gamesWon: number,          // Total wins
    gamesLost: number,         // Total losses
    gamesAbandoned: number,    // Games forfeited
    winRate: number,           // Calculated win percentage
  },

  // Preferences
  preferences: {
    notifications: boolean,    // Enable/disable notifications
    soundEffects: boolean,     // Enable/disable sounds
    theme: string,             // UI theme preference
  },

  // Active games reference
  activeGames: string[],       // Array of gameId where player is active
  pendingInvites: string[],    // Array of gameId with pending invitations
}
```

**Indexes**:

- `lastActive` (descending) - for finding active players
- `stats.gamesPlayed` (descending) - for leaderboards

---

### 2. Games Collection (`/games/{gameId}`)

**Document ID**: Auto-generated

**Schema**:

```javascript
{
  gameId: string,              // Auto-generated ID
  createdAt: timestamp,        // Game creation time
  updatedAt: timestamp,        // Last move/activity time
  startedAt: timestamp | null, // When game actually started
  completedAt: timestamp | null, // When game ended

  // Game Configuration
  config: {
    maxPlayers: number,        // 2-4 players
    isPublic: boolean,         // Public or private game
    gameCode: string | null,   // 6-digit code for private games
    houseRules: {
      drawToMatch: boolean,    // Must draw until playable card
      stacking: boolean,       // Stack +2 and +4 cards
      sevenSwap: boolean,      // Playing 7 swaps hands
      zeroRotation: boolean,   // Playing 0 rotates hands
      jumpIn: boolean,         // Jump in with identical card
    },
  },

  // Game State
  state: {
    status: string,            // 'waiting' | 'active' | 'completed' | 'abandoned'
    currentTurn: string,       // userId of current player
    turnOrder: string[],       // Array of userIds in turn order
    direction: number,         // 1 for clockwise, -1 for counter-clockwise
    deckSeed: string,          // Random seed for deck generation (updated on reshuffle)
    drawPileCount: number,     // Cards remaining in draw pile (computed)
    discardPile: [{            // Full discard pile history (last played at end)
      color: string,           // 'red' | 'blue' | 'green' | 'yellow' | 'wild'
      value: string,           // '0'-'9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4'
    }],
    currentColor: string,      // Active color (important for wild cards)
    mustDraw: number,          // Pending draw count (for stacking +2/+4)
    turnStartedAt: timestamp,  // When current turn began
    consecutivePasses: number, // Track if game is stuck
  },

  // Players in game
  playerIds: string[],         // Array of userIds
  playerCount: number,         // Current number of players

  // Winner (null if game not completed)
  winner: {
    userId: string,
    displayName: string,
    completedAt: timestamp,
  } | null,

  // Activity log (last 50 actions)
  recentActivity: [{
    type: string,              // 'card_played' | 'card_drawn' | 'turn_passed' | 'uno_called' | 'player_joined' | 'game_started' | 'game_ended'
    userId: string,
    timestamp: timestamp,
    details: object,           // Action-specific details
  }],
}
```

**Indexes**:

- `state.status`, `config.isPublic`, `updatedAt` - for finding open public games
- `playerIds` (array-contains), `state.status` - for finding user's active games
- `updatedAt` (descending) - for sorting by activity

---

### 3. Game Players Subcollection (`/games/{gameId}/players/{playerId}`)

**Document ID**: userId

**Schema**:

```javascript
{
  userId: string,              // Reference to user
  displayName: string,         // Cached display name
  photoURL: string | null,     // Cached photo URL

  // Player state in this game
  joinedAt: timestamp,         // When player joined
  position: number,            // Seat position (0-3)
  cardCount: number,           // Number of cards in hand
  hasCalledUno: boolean,       // Whether UNO was called with 1 card

  // Game status for this player
  status: string,              // 'waiting' | 'active' | 'winner' | 'forfeited'
  lastActionAt: timestamp,     // Last time player took action

  // Cards in hand (visible only to owner via security rules)
  hand: [{
    color: string,             // 'red' | 'blue' | 'green' | 'yellow' | 'wild'
    value: string,             // '0'-'9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4'
  }],

  // Player statistics for this game
  gameStats: {
    cardsPlayed: number,       // Total cards played
    cardsDrawn: number,        // Total cards drawn
    turnsPlayed: number,       // Number of turns taken
    specialCardsPlayed: number, // Count of action/wild cards played
  },
}
```

**Security Note**: The `hand` array should only be readable by the player who owns it.

---

### 4. Card Management

**No separate cards subcollection** - cards are stored directly as data objects within game and player documents.

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

**Player hands**: Stored as arrays of card objects in each player document's `hand` field, visible only to that player via security rules.

---

## Data Flow Examples

### Starting a New Game

1. User clicks "Create Game" on dashboard
2. Cloud Function creates new document in `/games`
3. Cloud Function creates player document in `/games/{gameId}/players/{userId}`
4. Cloud Function deals initial cards to each player's `hand` array
5. Cloud Function sets first discard pile card
6. Cloud Function updates `/users/{userId}/activeGames`

### Playing a Turn

1. Player selects card from hand
2. Client validates card is playable (local check)
3. Client calls Cloud Function `playCard(gameId, cardIndex, selectedColor?)`
4. Cloud Function validates move (authoritative check)
5. Cloud Function updates:
   - `/games/{gameId}` (state.discardPile, currentTurn)
   - `/games/{gameId}/players/{userId}` (hand, cardCount, stats)
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
