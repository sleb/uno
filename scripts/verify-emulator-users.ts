#!/usr/bin/env bun

/**
 * Verify Emulator Test Users Script
 *
 * This script checks that the Firebase Auth emulator export contains
 * the required test users for e2e testing.
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface EmulatorUser {
  localId: string;
  email: string;
  displayName: string;
}

interface EmulatorAccountsData {
  users?: EmulatorUser[];
}

const REQUIRED_USERS = [
  {
    email: "user.one@example.com",
    displayName: "User One",
  },
  {
    email: "user.two@example.com",
    displayName: "User Two",
  },
];

async function verifyEmulatorUsers() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const emulatorPath = join(
    __dirname,
    "..",
    ".emulator",
    "auth_export",
    "accounts.json",
  );

  try {
    const data = await readFile(emulatorPath, "utf-8");
    const accountsData: EmulatorAccountsData = JSON.parse(data);

    if (!accountsData.users || accountsData.users.length === 0) {
      console.error("❌ No users found in emulator export");
      process.exit(1);
    }

    console.log(
      `✅ Found ${accountsData.users.length} user(s) in emulator export\n`,
    );

    let allFound = true;

    for (const required of REQUIRED_USERS) {
      const found = accountsData.users.find(
        (user) => user.email === required.email,
      );

      if (found) {
        console.log(`✅ ${required.email}`);
        console.log(`   Display Name: ${found.displayName}`);
        console.log(`   UID: ${found.localId}\n`);
      } else {
        console.error(`❌ Missing required user: ${required.email}\n`);
        allFound = false;
      }
    }

    if (!allFound) {
      console.error(
        "\n❌ Some required users are missing from emulator export",
      );
      console.error("\nTo fix this:");
      console.error("1. Start Firebase emulators: firebase emulators:start");
      console.error(
        "2. Sign in as user.one@example.com and user.two@example.com",
      );
      console.error("3. Export data: firebase emulators:export .emulator");
      process.exit(1);
    }

    console.log("✅ All required test users are present!\n");
    console.log("You can now run e2e tests with:");
    console.log("  bun run test:e2e\n");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error("❌ Emulator export not found at:", emulatorPath);
      console.error("\nTo create emulator export:");
      console.error("1. Start Firebase emulators: firebase emulators:start");
      console.error("2. Sign in as test users");
      console.error("3. Export data: firebase emulators:export .emulator");
    } else {
      console.error("❌ Error reading emulator export:", error);
    }
    process.exit(1);
  }
}

verifyEmulatorUsers();
