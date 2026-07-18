#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "📦 Step 1: Building and tagging Docker image [asri:latest]..."
docker build -t "asri:latest" .

echo "🗜️  Step 2: Saving and compressing image to [asri-image.tar] on the fly..."
docker save "asri:latest" | gzip > "asri-image.tar"

echo "✅ Done! Your image is dumped at: $(pwd)/asri-image.tar"
