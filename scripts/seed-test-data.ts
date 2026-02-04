#!/usr/bin/env bun
/**
 * Seed script to populate Firebase emulator with test data
 */

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

const app = initializeApp({ projectId: "demo-uno-project" });
const auth = getAuth(app);
const db = getFirestore(app);

const testUsers = [
  {
    uid: "test-user-1",
    email: "alice@example.com",
    displayName: "Alice Champion",
    avatar: "🏆",
    stats: {
      gamesPlayed: 42,
      gamesWon: 28,
      gamesLost: 14,
      totalScore: 8432,
      winRate: 66.67,
      highestGameScore: 450,
      cardsPlayed: 2145,
      specialCardsPlayed: 487,
    },
  },
  {
    uid: "test-user-2",
    email: "bob@example.com",
    displayName: "Bob Challenger",
    avatar: "🎮",
    stats: {
      gamesPlayed: 35,
      gamesWon: 15,
      gamesLost: 20,
      totalScore: 3210,
      winRate: 42.86,
      highestGameScore: 280,
      cardsPlayed: 1823,
      specialCardsPlayed: 312,
    },
  },
  {
    uid: "test-user-3",
    email: "charlie@example.com",
    displayName: "Charlie Newbie",
    avatar: "🎯",
    stats: {
      gamesPlayed: 5,
      gamesWon: 2,
      gamesLost: 3,
      totalScore: 180,
      winRate: 40.0,
      highestGameScore: 95,
      cardsPlayed: 245,
      specialCardsPlayed: 48,
    },
  },
  {
    uid: "test-user-4",
    email: "dana@example.com",
    displayName: "Dana Pro",
    avatar: "⭐",
  },
];

async function seedData() {
  console.log("🌱 Seeding test data...\n");

  try {
    console.log("👤 Creating test users in Auth...");
    for (const user of testUsers) {
      try {
        await auth.createUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          password: "password123",
        });
        console.log(`   ✓ Created ${user.displayName}`);
      } catch (error: any) {
        if (error.code === "auth/uid-already-exists") {
          console.log(`   → ${user.displayName} already exists`);
        } else {
          throw error;
        }
      }
    }

    console.log("\n📝 Creating user profiles...");
    for (const user of testUsers) {
      const userData: any = {
        displayName: user.displayName,
        avatar: user.avatar,
      };
      if (user.stats) {
        userData.stats = user.stats;
      }
      await db.collection("users").doc(user.uid).set(userData);
      console.log(`   ✓ Profile for ${user.displayName}`);
    }

    console.log("\n🎮 Creating completed games...");
    await db
      .collection("games")
      .doc("test-game-1")
      .set({
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        startedAt: new Date(Date.now() - 3500000).toISOString(),
        lastActivityAt: new Date(Date.now() - 3000000).toISOString(),
        config: { isPrivate: false, maxPlayers: 4, houseRules: [] },
        players: ["test-user-1", "test-user-2"],
        state: {
          status: "completed",
          currentTurnPlayerId: null,
          direction: "clockwise",
          deckSeed: "seed-123",
          drawPileCount: 45,
          discardPile: [{ kind: "number", color: "red", value: 7 }],
          currentColor: null,
          mustDraw: 0,
        },
        finalScores: {
          winnerId: "test-user-1",
          winnerScore: 145,
          completedAt: new Date(Date.now() - 3000000).toISOString(),
          playerScores: [
            { playerId: "test-user-1", score: 145, cardCount: 0, rank: 1 },
            { playerId: "test-user-2", score: 0, cardCount: 5, rank: 2 },
          ],
        },
      });
    console.log("   ✓ Game 1: Alice defeated Bob (145 pts)");

    console.log("\n✅ Test data seeded successfully!");
    console.log("\n🔐 Test credentials:");
    console.log("   • alice@example.com / password123");
    console.log("   • bob@example.com / password123");
    console.log("\n💡 Tip: Log in as alice@example.com to see rich stats!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

seedData().then(() => process.exit(0));
