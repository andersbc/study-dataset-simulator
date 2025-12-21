import { $ } from "dax";

// Use dax for shell commands - it's much easier than Deno.Command for this
// We rely on the user having 'gh' installed.

async function deploy() {
  console.log("🚀 Starting deployment automation...");

  if (!(await $.commandExists("gh"))) {
    console.error("❌ GitHub CLI (gh) is not installed.");
    console.error("👉 Please install it: https://cli.github.com/manual/installation");
    Deno.exit(1);
  }

  // Check for uncommitted changes
  const gitStatus = await $`git status --porcelain`.text();
  if (gitStatus.trim().length > 0) {
    console.warn("⚠️  You have uncommitted changes in your repository:");
    console.log(gitStatus);
    console.warn("These changes will NOT be included in the deployment.");
    if (!confirm("Do you want to continue anyway?")) {
      console.log("Aborted deployment.");
      Deno.exit(0);
    }
  }

  // 1. Sync Environment Config (REQUIRED)
  console.log("📂 Syncing .env.prod to GitHub Secrets...");
  try {
    const envProdPath = $.path(".env.prod");

    if (!await envProdPath.exists()) {
      console.error("❌ Error: Missing '.env.prod' file.");
      console.error("👉 This file is required. Create it with your production secrets.");
      Deno.exit(1);
    }

    // Sync content to GitHub Secret 'PROD_ENV_FILE'
    // This allows the Git Workflow to write the file to the server without us needing the IP locally.
    console.log("Found .env.prod, updating GitHub secret 'PROD_ENV_FILE'...");
    await $`gh secret set PROD_ENV_FILE < .env.prod`;
    console.log("✅ GitHub Secret updated successfully.");

  } catch (e) {
    console.error("❌ Failed to update GitHub secret:", e);
    console.error("👉 Deployment stopped because config sync failed. Ensure you are logged in via 'gh auth login'.");
    Deno.exit(1);
  }

  // 2. Check for existing PR
  console.log("🔍 Checking for existing PR...");
  const prList = await $`gh pr list --base main --head dev --json number`.json();

  if (prList.length > 0) {
    console.log(`ℹ️  Found existing PR #${prList[0].number}. Proceeding to merge...`);
  } else {
    console.log("✨ Creating new PR...");
    try {
      await $`gh pr create --base main --head dev --title "Deploy: Automated Update" --body "Automated deployment trigger via deno task deploy"`;
    } catch (e: unknown) {
      // Fallback in case list was empty but create fails (race condition or other error)
      const message = e instanceof Error ? e.message : String(e);
      console.warn("⚠️  PR creation failed (might already exist or no changes). Trying to proceed...", message);
      if (message.includes("No commits between")) {
        console.warn("💡 Tip: Did you forget to git push your changes to 'dev'?");
      }
    }
  }

  // 3. Merge
  console.log("🔀 Merging PR...");
  try {
    // --admin flag might be needed if branch protection is on, but standard repo is fine
    await $`gh pr merge dev --merge --auto`.quiet();
  } catch (e: unknown) {
    // dax error parsing
    const err = e as { message: string; stdout?: string; stderr?: string };
    const message = err.message || "";
    // Sometimes the output is in stdout/stderr properties of the error object if dax captures it
    const combinedOutput = (err.stdout || "") + (err.stderr || "") + message;

    // Handle "clean status" error
    if (combinedOutput.includes("clean status")) {
      console.log("ℹ️  PR is ready to merge immediately. Merging now...");
      try {
        await $`gh pr merge dev --merge`;
      } catch (innerE: unknown) {
        const innerErr = innerE as Error;
        console.error("❌ Fallback merge failed.", innerErr.message);
        Deno.exit(1);
      }
    } else {
      console.error("❌ Merge failed. Please check manual status.", message);
      Deno.exit(1);
    }
  }

  // 4. Watch
  console.log("👀 Waiting for deployment workflow to start...");
  // Give GitHub a moment to trigger the workflow
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    const runId = await $`gh run list --workflow deploy.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId'`.text();

    if (runId.trim()) {
      console.log(`🚀 Watching workflow run #${runId.trim()}...`);
      await $`gh run watch ${runId.trim()} --exit-status`;
    } else {
      console.log("⚠️  Could not find a running workflow. It might be queued.");
    }
  } catch (_e: unknown) {
    console.log("Done. (Monitor exited)");
  }
}

if (import.meta.main) {
  deploy();
}
