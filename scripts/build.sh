#!/bin/bash
set -e

echo "Building DocuFlow AI..."

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build all packages
echo "Building packages..."
pnpm build

# Link CLI for local development
echo "Linking CLI..."
cd packages/cli && pnpm link --global && cd ../..

echo "Build complete!"
echo "Run 'docuflow --help' to get started."
