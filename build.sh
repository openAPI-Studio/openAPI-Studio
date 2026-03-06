#!/bin/bash
set -e
cd "$(dirname "$0")"
npm run build
npx vsce package
echo "✅ $(ls -t *.vsix | head -1) ready"
