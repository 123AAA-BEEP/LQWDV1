#!/usr/bin/env bash
# SessionStart guard — keep the working branch ON TOP OF the latest default
# branch so we never build a parallel/stale version. Runs automatically at the
# start of every Claude Code session (see .claude/settings.json).
#
# Behaviour:
#   - fetches origin/main
#   - if the current branch is behind, attempts a clean merge of origin/main
#   - on conflicts: aborts the merge and prints a loud warning so the agent
#     resolves BEFORE doing any new work
#   - never fails the session (always exits 0)

DEFAULT_BRANCH="main"

current="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"

if ! git fetch origin "$DEFAULT_BRANCH" --quiet 2>/dev/null; then
  echo "[sync-latest] Could not fetch origin/$DEFAULT_BRANCH (offline?). Skipping."
  exit 0
fi

# Nothing to do when already on the default branch (or detached/unknown).
if [ -z "$current" ] || [ "$current" = "$DEFAULT_BRANCH" ]; then
  exit 0
fi

behind="$(git rev-list --count "HEAD..origin/$DEFAULT_BRANCH" 2>/dev/null || echo 0)"
if [ "$behind" = "0" ]; then
  echo "[sync-latest] '$current' is up to date with origin/$DEFAULT_BRANCH."
  exit 0
fi

echo "[sync-latest] '$current' is $behind commit(s) behind origin/$DEFAULT_BRANCH — syncing…"
if git merge --no-edit origin/"$DEFAULT_BRANCH" >/dev/null 2>&1; then
  echo "[sync-latest] ✅ Merged latest origin/$DEFAULT_BRANCH into '$current'. Build on top of this."
else
  git merge --abort 2>/dev/null || true
  echo "[sync-latest] ⚠️  AUTO-MERGE HIT CONFLICTS — DO NOT start new work yet."
  echo "[sync-latest]     Resolve first:  git merge origin/$DEFAULT_BRANCH  (fix conflicts, commit)"
  echo "[sync-latest]     The branch must sit ON TOP OF origin/$DEFAULT_BRANCH, never beside it."
fi
exit 0
