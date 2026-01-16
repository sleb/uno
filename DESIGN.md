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

## Next Steps
- Define Firebase data models (Game, Player, Card, etc.)
- Design game state management and turn logic
- Define Firebase security rules
- Plan notification system for turn alerts
- Create wireframes for each page
