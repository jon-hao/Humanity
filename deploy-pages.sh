#!/bin/bash
# 本地发布到 GitHub Pages：推送 gh-pages，不依赖 Actions（避开计费锁定）。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
  echo "switch to main first"
  exit 1
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "commit local changes on main first"
  exit 1
fi

WT="$(mktemp -d)/gh-pages"
trap 'git worktree remove --force "$WT" 2>/dev/null || true; rm -rf "$(dirname "$WT")"' EXIT

git fetch origin main 2>/dev/null || true
git worktree add -B gh-pages "$WT" origin/gh-pages 2>/dev/null \
  || git worktree add -B gh-pages "$WT"

# 只同步站点静态文件
find "$WT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R index.html player.html styles.css js icons icon.svg favicon.png manifest.webmanifest .nojekyll "$WT/"

(
  cd "$WT"
  git add -A
  if git diff --cached --quiet; then
    echo "gh-pages already up to date"
    exit 0
  fi
  git commit -m "deploy: sync static site from main"
  HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:8118}" \
  HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:8118}" \
    git -c http.version=HTTP/1.1 push -u origin HEAD:gh-pages
  echo "live: https://jon-hao.github.io/Humanity/"
)
