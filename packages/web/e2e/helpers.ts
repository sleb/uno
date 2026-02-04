import type { Page } from "@playwright/test";

/**
 * E2E test helper functions for Firebase Auth emulator
 */

/**
 * Signs in a user using Firebase Auth emulator's auto-approved accounts
 * The emulator has pre-configured users: user.one@example.com and user.two@example.com
 */
export async function signInWithEmulator(
  page: Page,
  email: string,
): Promise<void> {
  // Navigate to login page
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Click the Google sign-in button which triggers signInWithPopup
  await page.getByRole("button", { name: /sign in with google/i }).click();

  // Wait for the emulator's popup window
  const popupPromise = page.waitForEvent("popup");
  const popup = await popupPromise;

  // Wait for popup to load
  await popup.waitForLoadState("networkidle");

  // Select the account in the emulator popup
  // The emulator shows a list of available accounts
  await popup.getByText(email).click();

  // Wait for redirect after successful auth
  await page.waitForURL("/");
}

/**
 * Creates a new browser context with independent auth state
 * This allows testing multi-player scenarios with different users
 */
export async function createAuthenticatedContext(
  browser: unknown,
  email: string,
): Promise<unknown> {
  const context = await (
    browser as { newContext: () => Promise<{ newPage: () => Promise<Page> }> }
  ).newContext();
  const page = await context.newPage();
  await signInWithEmulator(page, email);
  return { context, page };
}

/**
 * Waits for a game to reach a specific status
 */
export async function waitForGameStatus(
  page: Page,
  expectedStatus: string,
  timeout = 10000,
): Promise<void> {
  await page.waitForFunction(
    (status) => {
      const element = document.querySelector('[data-testid="game-status"]');
      return element?.textContent?.toLowerCase().includes(status.toLowerCase());
    },
    expectedStatus,
    { timeout },
  );
}

/**
 * Gets the current player's hand count from the UI
 */
export async function getHandCount(page: Page): Promise<number> {
  const element = await page
    .getByTestId("player-hand-count")
    .textContent({ timeout: 5000 });
  const match = element?.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

/**
 * Gets the top card of the discard pile
 */
export async function getTopCard(page: Page): Promise<{
  color: string;
  value: string;
}> {
  const colorElement = await page.getByTestId("top-card-color");
  const valueElement = await page.getByTestId("top-card-value");

  const color = (await colorElement.textContent()) || "";
  const value = (await valueElement.textContent()) || "";

  return { color, value };
}

/**
 * Plays a card from hand by index
 */
export async function playCard(page: Page, cardIndex: number): Promise<void> {
  await page.getByTestId(`hand-card-${cardIndex}`).click();
}

/**
 * Draws a card from the draw pile
 */
export async function drawCard(page: Page): Promise<void> {
  await page.getByTestId("draw-pile-button").click();
}

/**
 * Waits for it to be the current player's turn
 */
export async function waitForMyTurn(
  page: Page,
  timeout = 30000,
): Promise<void> {
  await page.waitForFunction(
    () => {
      const turnIndicator = document.querySelector(
        '[data-testid="is-my-turn"]',
      );
      return turnIndicator?.getAttribute("data-value") === "true";
    },
    { timeout },
  );
}

/**
 * Gets all playable cards from the current hand
 */
export async function getPlayableCards(page: Page): Promise<number[]> {
  const cards = await page.getByTestId(/^hand-card-\d+$/).all();
  const playableIndices: number[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (!card) continue;
    const isPlayable = await card.getAttribute("data-playable");
    if (isPlayable === "true") {
      playableIndices.push(i);
    }
  }

  return playableIndices;
}

/**
 * Creates a game with default settings
 */
export async function createGame(page: Page): Promise<string> {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Click create game button
  await page.getByRole("button", { name: /create game/i }).click();

  // Wait for form to appear
  await page.waitForTimeout(500);

  // Submit the form with default settings
  await page.getByRole("button", { name: /create/i }).click();

  // Wait for redirect to game page
  await page.waitForURL(/\/game\/.+/, { timeout: 10000 });

  // Extract game ID from URL
  const url = page.url();
  const gameId = url.split("/game/")[1];

  if (!gameId) {
    throw new Error("Failed to extract game ID from URL");
  }

  return gameId;
}

/**
 * Joins an existing game
 */
export async function joinGame(page: Page, gameId: string): Promise<void> {
  await page.goto(`/game/${gameId}`);
  await page.waitForLoadState("networkidle");

  // If there's a join button, click it
  const joinButton = page.getByRole("button", { name: /join game/i });
  if (await joinButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await joinButton.click();
  }

  // Wait for player to be added to game
  await page.waitForFunction(
    () => {
      const status = document.querySelector('[data-testid="player-status"]');
      return status?.textContent !== "spectator";
    },
    { timeout: 5000 },
  );
}

/**
 * Starts the game (host only)
 */
export async function startGame(page: Page): Promise<void> {
  await page.getByRole("button", { name: /start game/i }).click();

  // Wait for game to transition to active status
  await waitForGameStatus(page, "active");
}
