#!/usr/bin/env bash
# Stop hook — never lose work.
#
# When the agent finishes a turn, make sure everything is safely on the remote
# so an interrupted or reclaimed ephemeral container never drops work:
#   - only ever acts on a `claude/*` feature branch (never main / detached)
#   - if the working tree is dirty, commits it as a clearly-labelled checkpoint
#   - pushes the branch (a no-op when already up to date)
#   - fully non-fatal: any failure (offline, nothing to do) still exits 0 so it
#     never blocks the session.
#
# Checkpoint commits are intentionally labelled so they're easy to squash into a
# real commit later (`git rebase -i`), or amend over.

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
case "$branch" in
  claude/*) : ;;                       # only autosave feature branches
  *) exit 0 ;;                         # main, detached HEAD, unknown -> do nothing
esac

# Commit pending work (tracked + untracked) only if there is any.
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  git add -A 2>/dev/null || true
  git commit -q -m "checkpoint: autosave uncommitted work (Stop hook)" \
    -m "Auto-saved so nothing is lost if the container is reclaimed. Safe to squash." \
    >/dev/null 2>&1 || true
fi

# Push the branch; non-fatal on network errors so the session never blocks.
git push -u origin "$branch" >/dev/null 2>&1 || true

exit 0
