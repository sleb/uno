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

### 2. Authentication Page (`/auth`)

**Purpose**: User login and registration

**Features**:

- Email/password authentication
- Google sign-in option
- Anonymous guest play option
- Account creation form
- Password recovery

---

### 3. Dashboard (`/dashboard`)

**Purpose**: Main hub after authentication

**Features**:

- Active games list (games waiting for player's turn)
- Pending invitations
- Create new game button
- Join existing game button
- User stats summary (wins, losses, games played)
- Friend list / recent players

---

### 4. Game Lobby (`/lobby`)

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

### 5. Game Room (`/game/:gameId`)

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

### 6. Profile Page (`/profile/:userId`)

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

### 7. Rules Page (`/rules`)

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
/games/{gameId}/cards/{cardId}
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
    drawPileCount: number,     // Cards remaining in draw pile
    lastPlayedCard: {          // Top card of discard pile
      color: string,           // 'red' | 'blue' | 'green' | 'yellow' | 'wild'
      value: string,           // '0'-'9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4'
      playedBy: string,        // userId who played it
      playedAt: timestamp,
    },
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
    cardId: string,            // Unique card identifier
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

### 4. Game Cards Subcollection (`/games/{gameId}/cards/{cardId}`)

**Document ID**: Auto-generated card ID

**Schema**:

```javascript
{
  cardId: string,              // Unique identifier
  color: string,               // 'red' | 'blue' | 'green' | 'yellow' | 'wild'
  value: string,               // '0'-'9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4'

  // Card location
  location: string,            // 'draw_pile' | 'discard_pile' | 'player_hand'
  ownerId: string | null,      // userId if in player's hand, null otherwise

  // Card history
  playedBy: string | null,     // Last userId who played this card
  playedAt: timestamp | null,  // When last played
  position: number,            // Position in pile/hand (for ordering)
}
```

**Note**: This subcollection may be optional - cards could be managed entirely in Cloud Functions and only the relevant game state exposed in the main game document and player documents.

---

### Alternative: Simplified Card Management

Instead of a separate cards subcollection, cards could be managed as arrays within the game and player documents:

- **Draw pile**: Array of card objects in `/games/{gameId}` (shuffled, not exposed to clients)
- **Discard pile**: Array of card objects in `/games/{gameId}` (or just the last card)
- **Player hands**: Array of card objects in `/games/{gameId}/players/{playerId}`

This approach would be simpler but less flexible for analytics and game history.

---

## Data Flow Examples

### Starting a New Game

1. User clicks "Create Game" on dashboard
2. Cloud Function creates new document in `/games`
3. Cloud Function creates player document in `/games/{gameId}/players/{userId}`
4. Cloud Function initializes draw pile and deals cards
5. Cloud Function updates `/users/{userId}/activeGames`

### Playing a Turn

1. Player selects card from hand
2. Client validates card is playable (local check)
3. Client calls Cloud Function `playCard(gameId, cardId, selectedColor?)`
4. Cloud Function validates move (authoritative check)
5. Cloud Function updates:
   - `/games/{gameId}` (state, lastPlayedCard, currentTurn)
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
