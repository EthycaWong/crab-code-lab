#!/bin/zsh
cd "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  print "Node.js 22 or newer is required. Install it from https://nodejs.org, then run this again."
  read "?Press Enter to close."
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm ci || exit 1
fi
npm run lab
