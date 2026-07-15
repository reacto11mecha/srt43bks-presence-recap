#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "📦 Step 1: Building and tagging Docker image [srt43-prescap:latest]..."
docker build --no-cache -t "srt43-prescap:latest" .

echo "🗜️  Step 2: Saving and compressing image to [srt43-prescap-image.tar] on the fly..."
docker save "srt43-prescap:latest" | gzip > "srt43-prescap-image.tar"

echo "✅ Done! Your image is dumped at: $(pwd)/srt43-prescap-image.tar"
