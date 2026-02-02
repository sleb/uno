# Uno - Project Roadmap

## Current Status

**MVP Game Setup: ✅ Complete**  
**Core Gameplay: ✅ Complete**  
**Game Completion: ✅ Complete**

Players can create, join, and start games. **All core gameplay is now functional** - players can play cards, draw cards, call UNO, and finish games. The game enforces turn order, validates card plays, handles special cards (Skip, Reverse, Draw Two, Wild cards), manages deck exhaustion with reshuffling, and declares winners. **Game completion features are fully implemented** - final scores calculated with official UNO rules, user statistics tracked, winner celebration with confetti, profile stats display, and dashboard filtering.

---

## Implementation Status

### ✅ Completed Features

**Cloud Functions:**
- `createGame` - Create new games with configuration (private/public, max players, house rules)
- `joinGame` - Join existing games  
- `startGame` - Start game when all players are ready
- `playCard` - Validate and execute card plays with full rules enforcement
- `drawCard` - Draw cards from deck with reshuffle support
- `callUno` - Handle UNO declarations and penalties

**Pages & Routes:**
- `/` - Home page with welcome and login/signup
- `/login` - Authentication page
- `/dashboard` - Main hub showing active games
- `/game/:gameId` - Game room (UI only, no gameplay actions)
- `/profile` - Player profile page

**Infrastructure:**
- Deck generation with deterministic seed-based shuffling
- Initial hand dealing (7 cards per player)
- Game state management (waiting → in-progress → completed transitions)
- Real-time Firestore listeners for game updates
- Player data management (profiles, avatars, card counts)
- Turn tracking and direction (clockwise/counter-clockwise)
- Firestore security rules for private player hands
- Gameplay schemas and validation helpers
- Complete gameplay state management (currentColor, mustDraw, mustCallUno)
- Card validation logic with comprehensive tests (17 passing tests)
- Deck management with exhaustion and reshuffle
- Winner determination

---

## Roadmap Phases

### ✅ **Phase 1: Core Gameplay** (COMPLETE)

**Goal:** Enable players to actually play a complete game of Uno.

**Cloud Functions:**
- [x] `playCard(gameId, cardIndex, selectedColor?)` - Validate and execute card plays
  - [x] Validate auth and turn order
  - [x] Check card playability (color, number, or symbol match)
  - [x] Handle special cards (Skip, Reverse, Draw Two)
  - [x] Handle wild cards with color selection
  - [x] Update game state, discard pile, and player hand atomically
  - [x] Advance turn to next player
  - [x] Check win condition (cardCount === 0)
- [x] `drawCard(gameId)` - Draw cards from deck
  - [x] Validate auth and turn order
  - [x] Compute available cards (108 - discard - all hands)
  - [x] Use deckSeed for deterministic shuffle
  - [x] Handle deck exhaustion (reshuffle discard pile, new seed)
  - [x] Update player hand and cardCount
  - [x] Option to play drawn card if playable
- [x] `callUno()` - Handle UNO declarations
  - [x] Validate player has exactly 1 card
  - [x] Set `hasCalledUno` flag
  - [x] Implement penalty for not calling UNO (draw 2 cards)

**Game Logic & Validation:**
- [x] Card playability rules
  - [x] Match by color, number, or symbol
  - [x] Wild cards playable anytime
  - [x] Wild Draw Four restrictions (only when no color match)
- [x] Special card effects
  - [x] Skip: Next player loses turn
  - [x] Reverse: Change direction
  - [x] Draw Two: Next player draws 2 and loses turn
  - [x] Wild Draw Four: Next player draws 4 and loses turn
- [x] Deck management
  - [x] Reshuffle discard pile when draw pile exhausted
  - [x] Keep top card of discard pile active
  - [x] Generate new deckSeed on reshuffle
- [x] Turn advancement logic
  - [x] Normal: currentTurnPlayerId = next player
  - [x] Skip: currentTurnPlayerId = player after next
  - [x] Reverse: change direction, then advance

**Frontend Gameplay UI:**
- [x] Wire up playCard/drawCard/callUno handlers to game board
- [x] Card selection interaction (click or drag-to-play)
- [x] Wild card color picker modal
- [x] Visual indicators for:
  - [x] Current turn (highlight active player)
  - [x] Playable cards (highlight in hand)
  - [x] Required actions (must draw, must call UNO)
- [x] "UNO" button with penalty enforcement
- [x] Disabled state for actions when not player's turn

**Testing:**
- [x] Unit tests for card validation logic (17 passing tests)
- [x] Unit tests for deck management (shuffling, exhaustion, reshuffle)
- [x] Unit tests for score calculation (12 passing tests)
- [x] Integration tests for game finalization with Firestore emulator (2 tests)
- [x] Test coverage analysis documented
- [ ] Full E2E tests for complete game flow (deferred)
- [ ] Frontend component tests (deferred)

---

### ✅ **Phase 2: Game Completion** (COMPLETE)

**Goal:** Handle game endings, track statistics, and improve player experience.

**Game Completion:**
- [x] Winner determination (first player to cardCount === 0)
- [x] Game state transition to 'completed'
- [x] Winner celebration UI with confetti animation
- [x] Final scores calculation (per official UNO rules)
- [x] Return to dashboard button
- [x] Clean up completed games from dashboard "Your Games" view

**Player Statistics:**
- [x] Track wins/losses in `/users/{userId}` document
- [x] Track games played, win rate
- [x] Update stats on game completion
- [x] Display stats on profile page (8 comprehensive metrics)
- [x] Track lifetime cards played and special cards
- [x] Track highest game score
- [ ] Leaderboard (deferred to Phase 4)

**Game History:**
- [x] Store completed games with winner, players, final scores, rankings
- [x] Dashboard toggle to view completed games
- [ ] Dedicated game history page on profile (deferred to Phase 3+)
- [ ] Replay/review past games (deferred to Phase 5+)

**Pages:**
- [x] `/rules` page - Display GAME_RULES.md content with formatting
- [ ] Enhanced `/lobby` page - Browse public games with filters (deferred to Phase 3+)

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

**Immediate Priority:** Begin **Phase 3: House Rules**. The core game is fully functional with scoring and stats. Now we can add optional gameplay variants.

**Recommended Next Features:**
1. **Player Management** (Phase 2 leftovers):
   - Leave game functionality (before game starts)
   - Forfeit game functionality (during game)
   - Handle forfeited players gracefully
   
2. **House Rules Implementation** (Phase 3):
   - Start with Stacking (most popular)
   - Then Jump-In
   - Seven Swap and Zero Rotation later
   
3. **Social Features** (Phase 4):
   - Enhanced lobby page with public game browsing
   - Friend system
   - Game invitations

**Quick Wins:**
- Implement forfeit/leave game functionality
- Add "Play Again" / rematch functionality
- Build enhanced `/lobby` page for browsing public games

**For Questions/Planning:**
- Refer to [DESIGN.md](DESIGN.md) for architecture details
- Refer to [GAME_RULES.md](GAME_RULES.md) for official rules
- Refer to [.github/copilot-instructions.md](.github/copilot-instructions.md) for development conventions

---

**Last Updated:** 2026-02-02 (Phase 2 Complete)
