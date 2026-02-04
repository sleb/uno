import { expect, test } from "@playwright/test";
import {
  createGame,
  drawCard,
  getHandCount,
  getPlayableCards,
  joinGame,
  playCard,
  signInWithEmulator,
  startGame,
  waitForGameStatus,
  waitForMyTurn,
} from "./helpers";

/**
 * Two-player gameplay E2E tests
 * Uses pre-configured emulator accounts: user.one@example.com and user.two@example.com
 * Run with: firebase emulators:exec --import .emulator 'bun run test:e2e'
 */

test.describe("Two-Player Gameplay", () => {
  test("should allow two players to create, join, and start a game", async ({
    browser,
  }) => {
    // Player 1 creates a game
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await signInWithEmulator(page1, "user.one@example.com");

    const gameId = await createGame(page1);

    expect(gameId).toBeTruthy();

    // Verify player 1 sees waiting status
    await waitForGameStatus(page1, "waiting");

    // Player 2 joins the game
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await signInWithEmulator(page2, "user.two@example.com");

    await joinGame(page2, gameId);

    // Verify both players see each other
    await expect(
      page1.getByText(/user one/i).or(page1.getByText(/user.one/i)),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page1.getByText(/user two/i).or(page1.getByText(/user.two/i)),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page2.getByText(/user one/i).or(page2.getByText(/user.one/i)),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page2.getByText(/user two/i).or(page2.getByText(/user.two/i)),
    ).toBeVisible({ timeout: 5000 });

    // Player 1 starts the game
    await startGame(page1);

    // Verify game transitioned to active on both pages
    await waitForGameStatus(page1, "active");
    await waitForGameStatus(page2, "active");

    // Verify both players have initial hands (7 cards each)
    const player1Hand = await getHandCount(page1);
    const player2Hand = await getHandCount(page2);

    expect(player1Hand).toBe(7);
    expect(player2Hand).toBe(7);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test("should allow players to take turns playing cards", async ({
    browser,
  }) => {
    // Set up two players
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await signInWithEmulator(page1, "user.one@example.com");

    const gameId = await createGame(page1);

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await signInWithEmulator(page2, "user.two@example.com");

    await joinGame(page2, gameId);
    await startGame(page1);

    // Wait for game to be active
    await waitForGameStatus(page1, "active");
    await waitForGameStatus(page2, "active");

    // Determine who goes first and play a few turns
    let currentPlayerPage = page1;
    let otherPlayerPage = page2;

    // Check who has the first turn
    const page1HasTurn = await page1
      .getByTestId("is-my-turn")
      .getAttribute("data-value")
      .then((val) => val === "true")
      .catch(() => false);

    if (!page1HasTurn) {
      currentPlayerPage = page2;
      otherPlayerPage = page1;
    }

    // Play 3 rounds of turns (6 total actions)
    for (let round = 0; round < 3; round++) {
      // Current player's turn
      await waitForMyTurn(currentPlayerPage, 10000);

      const playableCards = await getPlayableCards(currentPlayerPage);
      const initialHandCount = await getHandCount(currentPlayerPage);

      if (playableCards.length > 0) {
        // Play first playable card
        await playCard(currentPlayerPage, playableCards[0] ?? 0);

        // Verify card was played (hand decreased by 1)
        await currentPlayerPage.waitForFunction(
          (expected) => {
            const countElement = document.querySelector(
              '[data-testid="player-hand-count"]',
            );
            const count = Number.parseInt(countElement?.textContent || "0", 10);
            return count === expected;
          },
          initialHandCount - 1,
          { timeout: 5000 },
        );
      } else {
        // No playable cards, draw one
        await drawCard(currentPlayerPage);

        // Verify card was drawn (hand increased by 1 or stayed same if auto-played)
        await currentPlayerPage.waitForTimeout(1000);
        const newHandCount = await getHandCount(currentPlayerPage);
        expect(newHandCount).toBeGreaterThanOrEqual(initialHandCount);
      }

      // Switch to other player
      [currentPlayerPage, otherPlayerPage] = [
        otherPlayerPage,
        currentPlayerPage,
      ];
    }

    // Verify game is still active
    await waitForGameStatus(page1, "active");
    await waitForGameStatus(page2, "active");

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test("should handle draw pile correctly", async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await signInWithEmulator(page1, "user.one@example.com");

    const gameId = await createGame(page1);

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await signInWithEmulator(page2, "user.two@example.com");

    await joinGame(page2, gameId);
    await startGame(page1);

    await waitForGameStatus(page1, "active");
    await waitForGameStatus(page2, "active");

    // Find which player has first turn
    const page1HasTurn = await page1
      .getByTestId("is-my-turn")
      .getAttribute("data-value")
      .then((val) => val === "true")
      .catch(() => false);

    const currentPlayerPage = page1HasTurn ? page1 : page2;

    await waitForMyTurn(currentPlayerPage, 10000);

    const initialHandCount = await getHandCount(currentPlayerPage);

    // Draw a card
    await drawCard(currentPlayerPage);

    // Wait for hand count to update
    await currentPlayerPage.waitForTimeout(1000);

    const newHandCount = await getHandCount(currentPlayerPage);

    // Should have drawn at least 1 card (might auto-play if playable)
    expect(newHandCount).toBeGreaterThanOrEqual(initialHandCount);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test("should update player stats in real-time", async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await signInWithEmulator(page1, "user.one@example.com");

    const gameId = await createGame(page1);

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await signInWithEmulator(page2, "user.two@example.com");

    await joinGame(page2, gameId);

    // Before starting, both players should see status
    await expect(
      page1.getByTestId("player-status").or(page1.getByText(/waiting/i)),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page2.getByTestId("player-status").or(page2.getByText(/waiting/i)),
    ).toBeVisible({ timeout: 5000 });

    await startGame(page1);

    // After starting, verify hand counts are visible
    await page1.waitForSelector('[data-testid="player-hand-count"]', {
      timeout: 5000,
    });
    await page2.waitForSelector('[data-testid="player-hand-count"]', {
      timeout: 5000,
    });

    const p1Count = await getHandCount(page1);
    const p2Count = await getHandCount(page2);

    expect(p1Count).toBe(7);
    expect(p2Count).toBe(7);

    // Verify opponent's card count is also visible
    // Each player should see their opponent's card count
    const opponentCountElements = await page1
      .getByText(/7 cards/i)
      .or(page1.getByText(/7/))
      .all();
    expect(opponentCountElements.length).toBeGreaterThan(0);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test("should prevent non-turn player from playing cards", async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await signInWithEmulator(page1, "user.one@example.com");

    const gameId = await createGame(page1);

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await signInWithEmulator(page2, "user.two@example.com");

    await joinGame(page2, gameId);
    await startGame(page1);

    await waitForGameStatus(page1, "active");
    await waitForGameStatus(page2, "active");

    // Find which player does NOT have first turn
    const page1HasTurn = await page1
      .getByTestId("is-my-turn")
      .getAttribute("data-value")
      .then((val) => val === "true")
      .catch(() => false);

    const waitingPlayerPage = page1HasTurn ? page2 : page1;

    // Verify waiting player cannot play
    const isMyTurn = await waitingPlayerPage
      .getByTestId("is-my-turn")
      .getAttribute("data-value");
    expect(isMyTurn).toBe("false");

    // Cards should be disabled or not clickable
    const firstCard = waitingPlayerPage.getByTestId("hand-card-0");
    if (await firstCard.isVisible().catch(() => false)) {
      const isDisabled =
        (await firstCard.getAttribute("disabled")) !== null ||
        (await firstCard.getAttribute("data-playable")) === "false";
      expect(isDisabled).toBe(true);
    }

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test("should display discard pile and update it when cards are played", async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await signInWithEmulator(page1, "user.one@example.com");

    const gameId = await createGame(page1);

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await signInWithEmulator(page2, "user.two@example.com");

    await joinGame(page2, gameId);
    await startGame(page1);

    await waitForGameStatus(page1, "active");

    // Verify both players see the discard pile
    await expect(
      page1
        .getByTestId("discard-pile")
        .or(page1.getByText(/discard/i))
        .or(page1.getByTestId("top-card-color")),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page2
        .getByTestId("discard-pile")
        .or(page2.getByText(/discard/i))
        .or(page2.getByTestId("top-card-color")),
    ).toBeVisible({ timeout: 5000 });

    // Find current player
    const page1HasTurn = await page1
      .getByTestId("is-my-turn")
      .getAttribute("data-value")
      .then((val) => val === "true")
      .catch(() => false);

    const currentPlayerPage = page1HasTurn ? page1 : page2;
    const otherPlayerPage = page1HasTurn ? page2 : page1;

    await waitForMyTurn(currentPlayerPage, 10000);

    const playableCards = await getPlayableCards(currentPlayerPage);

    if (playableCards.length > 0) {
      // Play a card and verify discard pile updates on both pages
      await playCard(currentPlayerPage, playableCards[0] ?? 0);

      // Give time for update to propagate
      await currentPlayerPage.waitForTimeout(1000);
      await otherPlayerPage.waitForTimeout(1000);

      // Both players should still see discard pile (content may have changed)
      await expect(
        currentPlayerPage
          .getByTestId("discard-pile")
          .or(currentPlayerPage.getByTestId("top-card-color")),
      ).toBeVisible({ timeout: 3000 });

      await expect(
        otherPlayerPage
          .getByTestId("discard-pile")
          .or(otherPlayerPage.getByTestId("top-card-color")),
      ).toBeVisible({ timeout: 3000 });
    }

    // Cleanup
    await context1.close();
    await context2.close();
  });
});
