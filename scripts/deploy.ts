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

  // 1. Check if we are on dev (optional, but good safety)
  // Skipped for now, assume user knows they are deploying dev->main content

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
    await $`gh pr merge dev --merge --auto`;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("❌ Merge failed. Please check manual status.", message);
    Deno.exit(1);
  }

  // 4. Watch
  console.log("👀 Watching deployment...");
  try {
    await $`gh run watch`;
  } catch (_e: unknown) {
    console.log("Done. (Monitor exited, likely no active runs)");
  }
}

if (import.meta.main) {
  deploy();
}
