#!/bin/bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${LITTERBOX_BRANCH:-main}"
REMOTE="${LITTERBOX_REMOTE:-origin}"
VERSION_FILE="$REPO_ROOT/version.json"
LOG_FILE="$REPO_ROOT/autopull.log"

log() {
    printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$LOG_FILE"
}

write_version_file() {
    local head
    local tmp_file

    head="$(git -C "$REPO_ROOT" rev-parse HEAD)"
    tmp_file="$(mktemp)"

    cat > "$tmp_file" <<EOF
{"commit":"$head","updatedAt":"$(date -u '+%Y-%m-%dT%H:%M:%SZ')"}
EOF

    mv "$tmp_file" "$VERSION_FILE"
}

if ! git -C "$REPO_ROOT" rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    log "Skipping sync because $REPO_ROOT is not a git repository."
    exit 0
fi

write_version_file

git -C "$REPO_ROOT" fetch --quiet "$REMOTE" "$BRANCH"

local_head="$(git -C "$REPO_ROOT" rev-parse HEAD)"
remote_head="$(git -C "$REPO_ROOT" rev-parse "$REMOTE/$BRANCH")"
merge_base="$(git -C "$REPO_ROOT" merge-base HEAD "$REMOTE/$BRANCH")"

if [[ "$local_head" == "$remote_head" ]]; then
    exit 0
fi

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
    log "Skipped sync because the worktree has local changes."
    exit 0
fi

if [[ "$local_head" != "$merge_base" ]]; then
    log "Skipped sync because local $BRANCH has diverged from $REMOTE/$BRANCH."
    exit 0
fi

git -C "$REPO_ROOT" merge --ff-only "$REMOTE/$BRANCH" >> "$LOG_FILE" 2>&1
write_version_file
log "Fast-forwarded to $remote_head."
