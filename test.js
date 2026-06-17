import readline from "readline";
import { ClaudeService, CodexService, GeminiService, KiroService, GithubService } from "./src/index.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function run() {
  console.log("====================================================");
  console.log("    9router-oauth-client Interactive Test Runner    ");
  console.log("====================================================");
  console.log("1. Test Claude Code Login (SSO)");
  console.log("2. Test Codex (ChatGPT) Login (SSO)");
  console.log("3. Test Gemini CLI (Google Assist) Login (SSO)");
  console.log("4. Test Kiro AI (AWS Builder ID Device Flow)");
  console.log("5. Test GitHub Copilot (Device Flow)");
  console.log("6. Exit");
  console.log("====================================================");

  const choice = await ask("Choose an option to test (1-6): ");
  
  if (choice === "6" || !choice) {
    rl.close();
    process.exit(0);
  }

  try {
    switch (choice.trim()) {
      case "1": {
        console.log("\nStarting Claude Login flow...");
        const service = new ClaudeService();
        const tokens = await service.connect();
        console.log("\nSuccess! Received tokens:", tokens);
        break;
      }
      case "2": {
        console.log("\nStarting Codex (ChatGPT) Login flow on port 1455...");
        const service = new CodexService();
        const tokens = await service.connect();
        console.log("\nSuccess! Received tokens:", tokens);
        break;
      }
      case "3": {
        console.log("\nStarting Gemini CLI Login flow...");
        const service = new GeminiService();
        const result = await service.connect();
        console.log("\nSuccess! Received result:", result);
        break;
      }
      case "4": {
        console.log("\nStarting Kiro AI AWS Builder ID flow...");
        const service = new KiroService();
        const result = await service.connectDeviceFlow({
          region: "us-east-1"
        });
        console.log("\nSuccess! Received result:", result);
        break;
      }
      case "5": {
        console.log("\nStarting GitHub Copilot Device flow...");
        const service = new GithubService();
        const result = await service.connect();
        console.log("\nSuccess! Received result:", result);
        break;
      }
      default:
        console.log("\nInvalid choice.");
    }
  } catch (error) {
    console.error("\nTest failed with error:", error.message);
  }

  rl.close();
}

run();
