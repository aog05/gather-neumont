#!/bin/bash
# Development server with auto-rebuild

cd "$(dirname "$0")"

# Initial build
echo "Building project..."
bun build ./src/index.html --outdir=./dist --minify

# Start server in background
echo "Starting server..."
bun src/index.ts &
SERVER_PID=$!

# Watch for changes and rebuild
echo "Watching for changes (Ctrl+C to stop)..."
while true; do
  inotifywait -r -e modify ./src/ 2>/dev/null && {
    echo "Changes detected, rebuilding..."
    bun build ./src/index.html --outdir=./dist --minify
    echo "Rebuild complete!"
  }
done

# Cleanup on exit
trap "kill $SERVER_PID" EXIT
