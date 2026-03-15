#!/bin/bash
set -e
cd "$(dirname "$0")"
npm run build
npx vsce package
VSIX=$(ls -t *.vsix | head -1)
mv "$VSIX" releases/
echo "✅ releases/$VSIX ready"
