# Uno - Project Roadmap

## Current Status

**MVP Game Setup: ✅ Complete**  
**Core Gameplay: 🚧 In Progress (Scaffolding complete)**

Players can create, join, and start games. Gameplay schemas, validation helpers, and state fields are in place, but players cannot yet play cards, draw cards, or finish games. Core gameplay functions remain the primary blocker.

---

## Implementation Status

### ✅ Completed Features

**Cloud Functions:**
- `createGame` - Create new games with configuration (private/public, max players, house rules)
- `joinGame` - Join existing games  
- `startGame` - Start game when all players are ready

**Pages & Routes:**
- `/` - Home page with welcome and login/signup
- `/login` - Authentication page
- `/dashboard` - Main hub showing active games
- `/game/:gameId` - Game room (UI only, no gameplay actions)
- `/profile` - Player profile page

**Infrastructure:**
- Deck generation with deterministic seed-based shuffling
- Initial hand dealing (7 cards per player)
- Game state management (waiting → in-progress transitions)
- Real-time Firestore listeners for game updates
- Player data management (profiles, avatars, card counts)
- Turn tracking and direction (clockwise/counter-clockwise)
- Firestore security rules for private player hands
- Gameplay schemas and validation helpers
- Initial gameplay state fields (currentColor, mustDraw, mustCallUno)

---

## Roadmap Phases

### 🔴 **Phase 1: Core Gameplay** (Critical Priority)

**Goal:** Enable players to actually play a complete game of Uno.

**Cloud Functions:**
- [ ] `playCard(gameId, cardIndex, selectedColor?)` - Validate and execute card plays
  - Validate auth and turn order
  - Check card playability (color, number, or symbol match)
  - Handle special cards (Skip, Reverse, Draw Two)
  - Handle wild cards with color selection
  - Update game state, discard pile, and player hand atomically
  - Advance turn to next player
  - Check win condition (cardCount === 0)
- [ ] `drawCard(gameId)` - Draw cards from deck
  - Validate auth and turn order
  - Compute available cards (108 - discard - all hands)
  - Use deckSeed for deterministic shuffle
  - Handle deck exhaustion (reshuffle discard pile, new seed)
  - Update player hand and cardCount
  - Option to play drawn card if playable
- [ ] `callUno()` - Handle UNO declarations
  - Validate player has exactly 1 card
  - Set `hasCalledUno` flag
  - Implement penalty for not calling UNO (draw 2 cards)

**Game Logic & Validation:**
- [ ] Card playability rules
  - Match by color, number, or symbol
  - Wild cards playable anytime
  - Wild Draw Four restrictions (only when no color match)
- [ ] Special card effects
  - Skip: Next player loses turn
  - Reverse: Change direction
  - Draw Two: Next player draws 2 and loses turn
  - Wild Draw Four: Next player draws 4 and loses turn
- [ ] Deck management
  - Reshuffle discard pile when draw pile exhausted
  - Keep top card of discard pile active
  - Generate new deckSeed on reshuffle
- [ ] Turn advancement logic
  - Normal: currentTurnPlayerId = next player
  - Skip: currentTurnPlayerId = player after next
  - Reverse: change direction, then advance

**Frontend Gameplay UI:**
- [ ] Wire up playCard/drawCard/callUno handlers to game board
- [ ] Card selection interaction (click or drag-to-play)
- [ ] Wild card color picker modal
- [ ] Visual indicators for:
  - Current turn (highlight active player)
  - Playable cards (highlight in hand)
  - Required actions (must draw, must call UNO)
- [ ] "UNO" button with penalty enforcement
- [ ] Disabled state for actions when not player's turn

**Testing:**
- [ ] Integration tests for game flow (create → join → start → play → win)
- [ ] Unit tests for card validation logic
- [ ] Unit tests for deck management (shuffling, exhaustion, reshuffle)
- [ ] Frontend tests for gameplay interactions

---

### 🟡 **Phase 2: Game Completion** (High Priority)

**Goal:** Handle game endings, track statistics, and improve player experience.

**Game Completion:**
- [ ] Winner determination (first player to cardCount === 0)
- [ ] Game state transition to 'completed'
- [ ] Winner celebration UI
- [ ] Final scores calculation (per official UNO rules)
- [ ] Option to play another round or return to dashboard

**Player Statistics:**
- [ ] Track wins/losses in `/users/{userId}` document
- [ ] Track games played, win rate
- [ ] Update stats on game completion
- [ ] Display stats on profile page
- [ ] Leaderboard (optional)

**Game History:**
- [ ] Store completed games with winner, players, final scores
- [ ] Game history view on profile page
- [ ] Replay/review past games (optional)

**Missing Pages:**
- [ ] `/rules` page - Display GAME_RULES.md content with formatting
- [ ] Enhanced `/lobby` page - Browse public games with filters

**Player Management:**
- [ ] Leave game functionality (before game starts)
- [ ] Forfeit game functionality (during game)
- [ ] Handle forfeited players (remove from turn rotation)
- [ ] Kick player option (host only, before game starts)
- [ ] Auto-forfeit inactive players (timeout mechanism)

---

### 🟢 **Phase 3: House Rules** (Medium Priority)

**Goal:** Implement optional house rules variants from GAME_RULES.md.

**House Rules to Implement:**
- [ ] **Stacking** - Stack Draw Two or Wild Draw Four cards
  - Modify `playCard` to allow stacking
  - Track accumulated draw count in game state
  - Last player in chain draws all accumulated cards
- [ ] **Jump-In** - Play identical card out of turn
  - New Cloud Function: `jumpIn(gameId, cardIndex)`
  - Validate exact card match (color + value)
  - Insert player into turn order after jump-in
- [ ] **Seven Swap** - Trade hands when playing a 7
  - UI to select target player
  - Atomic swap of player hands
  - Update cardCounts for both players
- [ ] **Draw to Match** - Keep drawing until playable card found
  - Modify `drawCard` logic
  - Auto-play when match is drawn (optional)
- [ ] **Zero Rotation** - Rotate all hands when 0 is played
  - Atomic rotation of all player hands
  - Update cardCounts for all players

**UI for House Rules:**
- [ ] House rules configuration in Create Game modal
- [ ] Visual indicators when house rules are active
- [ ] Tooltips/help text explaining each rule
- [ ] Display active house rules in game room

---

### 🟢 **Phase 4: Social Features** (Low Priority)

**Goal:** Enhance multiplayer interaction and engagement.

**Friend System:**
- [ ] Friend list in user profile
- [ ] Send/accept friend requests
- [ ] Invite friends to games
- [ ] See friends' online status (optional)

**Invitations:**
- [ ] Private game invitation links
- [ ] Email invitations (Firebase Cloud Messaging)
- [ ] Pending invitations on dashboard
- [ ] Accept/decline invitation actions

**In-Game Communication:**
- [ ] Chat/comments in game room
- [ ] Real-time message sync via Firestore
- [ ] Emoji reactions (quick communication)
- [ ] Mute/block players (optional)

**Notifications:**
- [ ] Firebase Cloud Messaging setup
- [ ] "Your turn" notifications
- [ ] Game invitation notifications
- [ ] Game completed notifications
- [ ] Notification preferences in profile settings

**Recent Players:**
- [ ] Track recent opponents
- [ ] Quick rematch option
- [ ] Add recent player as friend

---

### 🎨 **Phase 5: Polish & UX** (Ongoing)

**Goal:** Improve user experience and visual appeal.

**Game Activity Feed:**
- [ ] Log of recent actions in game room
- [ ] "Player X played Red 7"
- [ ] "Player Y drew 2 cards"
- [ ] "Player Z called UNO!"

**Animations & Visual Feedback:**
- [ ] Card play animations (slide to discard pile)
- [ ] Card draw animations (from deck to hand)
- [ ] Shuffle animation when deck is reshuffled
- [ ] Turn indicator animation
- [ ] Winner celebration animation

**Sound Effects:**
- [ ] Card play sound
- [ ] Card draw sound
- [ ] Special card sound (Skip, Reverse, Draw Two)
- [ ] UNO call sound
- [ ] Win sound
- [ ] Toggle for sound effects in settings

**Theme & Customization:**
- [ ] Dark mode toggle
- [ ] Custom card back designs
- [ ] Custom avatar options (beyond emoji)
- [ ] Color-blind friendly mode

**Mobile Responsiveness:**
- [ ] Optimize game board for mobile screens
- [ ] Touch-friendly card interactions
- [ ] Responsive dashboard and lobby layouts
- [ ] PWA support (installable app)

**Performance:**
- [ ] Optimize Firestore queries (indexes)
- [ ] Lazy load game history
- [ ] Paginate active games list
- [ ] Client-side caching with TanStack Query

---

## Post-MVP Considerations

### Scalability
- [ ] Firestore composite indexes for complex queries
- [ ] Cloud Function optimization (reduce cold starts)
- [ ] CDN for static assets (Firebase Hosting)
- [ ] Database denormalization for frequently accessed data

### Security
- [ ] Review and harden Firestore security rules
- [ ] Rate limiting on Cloud Functions
- [ ] Input sanitization for user-generated content (chat, names)
- [ ] Prevent cheating (card visibility, turn manipulation)

### Monitoring & Analytics
- [ ] Firebase Analytics for user behavior
- [ ] Cloud Function performance monitoring
- [ ] Error tracking (Sentry or Firebase Crashlytics)
- [ ] Game completion metrics (average game length, dropout rate)

### Documentation
- [ ] API documentation for Cloud Functions
- [ ] Component documentation (Storybook or similar)
- [ ] Contribution guide for open-source contributors
- [ ] Deployment guide for production

---

## Out of Scope (Future Ideas)

These ideas are not currently planned but could be considered in the future:

- **Tournaments:** Bracket-style tournament system
- **Teams:** 2v2 or team-based gameplay modes
- **Custom Decks:** Allow custom card designs or special editions
- **Achievements:** Badges for milestones (10 wins, perfect game, etc.)
- **Spectator Mode:** Watch games in progress without playing
- **AI Opponents:** Single-player mode against bots
- **Video Chat:** Integrated video calls during games
- **Betting/Wagering:** Virtual currency or points betting (requires careful design)

---

## Next Steps

**Immediate Priority:** Implement **Phase 1: Core Gameplay**. Start with `playCard` Cloud Function and card validation logic, as this is the foundation for all gameplay.

**Quick Wins:**
- Build `/rules` page (simple content display from GAME_RULES.md)
- Implement forfeit/leave game functionality

**For Questions/Planning:**
- Refer to [DESIGN.md](DESIGN.md) for architecture details
- Refer to [GAME_RULES.md](GAME_RULES.md) for official rules
- Refer to [.github/copilot-instructions.md](.github/copilot-instructions.md) for development conventions

---

**Last Updated:** 2026-02-01
