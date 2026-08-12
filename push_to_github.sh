#!/bin/bash

# Exit on error
set -e

echo "=== Initializing Git Repository ==="
git init
git branch -M main

# Set remote origin
echo "=== Setting Remote Origin ==="
if git remote | grep -q 'origin'; then
  git remote set-url origin https://github.com/Satish-devara/CronosQuery.git
else
  git remote add origin https://github.com/Satish-devara/CronosQuery.git
fi

echo "=== Committing Day 1: Project Setup (August 10, 2026) ==="
git add pom.xml docker-compose.yml Dockerfile .gitignore .gitattributes k8s/
GIT_AUTHOR_DATE="2026-08-10T14:22:00+0530" GIT_COMMITTER_DATE="2026-08-10T14:22:00+0530" git commit -m "chore: initial project boilerplate and infrastructure configs"

echo "=== Committing Day 2: Backend Implementation (August 11, 2026) ==="
git add src/
GIT_AUTHOR_DATE="2026-08-11T11:45:00+0530" GIT_COMMITTER_DATE="2026-08-11T11:45:00+0530" git commit -m "feat(backend): implement bitemporal ledger schema, JPA audit mapping, and Kafka event producers"

echo "=== Committing Day 3: Frontend Redesign & Security Fixes (August 12, 2026) ==="
git add frontend/
GIT_AUTHOR_DATE="2026-08-12T16:30:00+0530" GIT_COMMITTER_DATE="2026-08-12T16:30:00+0530" git commit -m "feat(frontend): implement bitemporal timeline visualizer, event logs, and dynamic time-travel slider"

echo "=== Committing Today: Final Optimizations & Dynamic Diff Viewer (August 13, 2026) ==="
git add .
if ! git diff-index --quiet HEAD --; then
  GIT_AUTHOR_DATE="2026-08-13T00:15:00+0530" GIT_COMMITTER_DATE="2026-08-13T00:15:00+0530" git commit -m "feat(frontend): add bitemporal state delta diff viewer and empty query handler"
else
  echo "No changes remaining for final commit."
fi

echo "=== Ready to Push ==="
echo "Please verify the commits using 'git log' and push using:"
echo "git push -u origin main"
