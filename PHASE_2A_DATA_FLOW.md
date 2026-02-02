# Phase 2A: Game Completion Data Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Player Plays Last Card                         │
│                              (UNO!)                                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   playCard Function    │
                    │   (game-service.ts)    │
                    └────────────┬───────────┘
                                 │
                   Detects: isWinner = true
                   (newHand.length === 0)
                                 │
                                 ▼
            ┌────────────────────────────────────────┐
            │  TRANSACTION BEGINS (Atomic Updates)   │
            └────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
         ┌──────────────┐  ┌─────────┐  ┌──────────────┐
         │  Update Game │  │ Update  │  │   Update     │
         │    Status    │  │ Winner  │  │  Winner's    │
         │              │  │ Status  │  │     Hand     │
         │ completed    │  │ "winner"│  │   (empty)    │
         └──────────────┘  └─────────┘  └──────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  finalizeGame Called   │
                    │  (within transaction)  │
                    └────────────┬───────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
         ┌──────────────┐  ┌─────────────┐  ┌─────────────┐
         │ Fetch Player │  │ Fetch Game  │  │Fetch Player │
         │    Hands     │  │   Players   │  │   Docs      │
         │ (all players)│  │(displayName)│  │  (stats)    │
         └──────────────┘  └─────────────┘  └─────────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────────┐
              │    SCORE CALCULATION LOGIC           │
              │                                      │
              │  For each player:                    │
              │    - Calculate card point values     │
              │    - Sum opponent cards for winner   │
              │    - Assign rankings                 │
              └──────────────┬───────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
    ┌────────────────┐ ┌────────────┐ ┌────────────────┐
    │Player B's Hand │ │Player C's  │ │ Winner's Score │
    │                │ │   Hand     │ │                │
    │ Red 5:    5pts │ │ Green 7: 7 │ │ Total: 102 pts │
    │ Skip:    20pts │ │ Draw2: 20  │ │                │
    │ Wild:    50pts │ │ Total: 27  │ │ (75 + 27)      │
    │ Total:   75pts │ └────────────┘ └────────────────┘
    └────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │   CREATE finalScores OBJECT          │
              │                                      │
              │   {                                  │
              │     winnerId: "playerA",             │
              │     winnerScore: 102,                │
              │     completedAt: "2024-02-01...",    │
              │     playerScores: [                  │
              │       {playerId: "A", rank: 1, ...}, │
              │       {playerId: "C", rank: 2, ...}, │
              │       {playerId: "B", rank: 3, ...}  │
              │     ]                                │
              │   }                                  │
              └──────────────┬───────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │   UPDATE GAME DOCUMENT               │
              │   /games/{gameId}                    │
              │                                      │
              │   SET: finalScores = {...}           │
              └──────────────┬───────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │   UPDATE USER STATISTICS             │
              │   (for ALL players)                  │
              └──────────────┬───────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
    ┌────────────────┐ ┌────────────┐ ┌────────────────┐
    │   WINNER       │ │  LOSER 1   │ │   LOSER 2      │
    │  (Player A)    │ │ (Player C) │ │  (Player B)    │
    │                │ │            │ │                │
    │ gamesPlayed +1 │ │ played +1  │ │  played +1     │
    │ gamesWon +1    │ │ lost +1    │ │  lost +1       │
    │ totalScore+102 │ │ (no pts)   │ │  (no pts)      │
    │ highestScore?  │ │ lifetime   │ │  lifetime      │
    │ winRate recalc │ │ cards +n   │ │  cards +n      │
    │ lifetime +n    │ │            │ │                │
    └────────────────┘ └────────────┘ └────────────────┘
                             │
                             ▼
            ┌────────────────────────────────────────┐
            │    TRANSACTION COMMITS (Success!)      │
            │                                        │
            │  ALL updates applied atomically        │
            │  Database consistency guaranteed       │
            └────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Firestore     │
                    │  Listeners     │
                    │  Triggered     │
                    └────────┬───────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │   React UI       │
                   │   Re-renders     │
                   │                  │
                   │ • Shows winner   │
                   │ • Shows scores   │
                   │ • Shows rankings │
                   │ • (Phase 2B)     │
                   └──────────────────┘
```

## Score Calculation Example

### Input (3-Player Game)

**Player A (Winner):**
- Hand: [] (0 cards)
- Status: "winner"

**Player B:**
- Hand: [Red 5, Blue Skip, Wild]
- Card Count: 3

**Player C:**
- Hand: [Green 7, Yellow Draw Two]
- Card Count: 2

### Calculation Steps

1. **Calculate each player's hand value:**
   ```javascript
   Player B: 5 + 20 + 50 = 75 points
   Player C: 7 + 20 = 27 points
   Player A: 0 points (no cards)
   ```

2. **Winner gets sum of opponents' scores:**
   ```javascript
   Winner Score = 75 + 27 = 102 points
   ```

3. **Assign rankings (winner first, then by cardCount):**
   ```javascript
   Rank 1: Player A (winner, 0 cards)
   Rank 2: Player C (2 cards)
   Rank 3: Player B (3 cards)
   ```

4. **Update user stats:**
   ```javascript
   Player A:
     gamesPlayed: 10 → 11
     gamesWon: 5 → 6
     totalScore: 500 → 602
     highestGameScore: max(120, 102) = 120
     winRate: 6/11 = 0.545
     
   Player B:
     gamesPlayed: 8 → 9
     gamesLost: 3 → 4
     (totalScore unchanged - losers don't gain points)
     
   Player C:
     gamesPlayed: 12 → 13
     gamesLost: 6 → 7
   ```

## Data Structures

### Before Game Completion
```typescript
// /games/{gameId}
{
  state: {
    status: "in-progress",
    currentTurnPlayerId: "playerA",
    // ... other game state
  },
  // NO finalScores field
}

// /users/{playerId}
{
  displayName: "Alice",
  avatar: "avatar1",
  // NO stats field (or has stats from previous games)
}
```

### After Game Completion
```typescript
// /games/{gameId}
{
  state: {
    status: "completed",
    currentTurnPlayerId: null,
    // ... other game state
  },
  finalScores: {
    winnerId: "playerA",
    winnerScore: 102,
    completedAt: "2024-02-01T12:00:00Z",
    playerScores: [
      {
        playerId: "playerA",
        displayName: "Alice",
        score: 102,
        cardCount: 0,
        rank: 1
      },
      {
        playerId: "playerC",
        displayName: "Charlie",
        score: 0,
        cardCount: 2,
        rank: 2
      },
      {
        playerId: "playerB",
        displayName: "Bob",
        score: 0,
        cardCount: 3,
        rank: 3
      }
    ]
  }
}

// /users/{playerA}
{
  displayName: "Alice",
  avatar: "avatar1",
  stats: {
    gamesPlayed: 11,
    gamesWon: 6,
    gamesLost: 5,
    totalScore: 602,
    highestGameScore: 120,
    winRate: 0.545,
    cardsPlayed: 255,
    specialCardsPlayed: 75
  }
}
```

## Transaction Guarantees

**Atomicity:**
- ALL updates succeed together
- OR none of them happen
- No partial state possible

**What's protected:**
- Game status update
- Winner status update
- Final scores creation
- All player stats updates
- Lifetime card counters

**Failure scenarios:**
- Network interruption → Transaction rolls back completely
- Concurrent updates → Firestore retries automatically
- Invalid data → Error thrown, transaction aborted

**Result:** Database always in consistent state ✅

---

Built with ❤️ following modern TypeScript and React best practices
