#!/bin/bash
set -e

echo "Testing DocuFlow AI..."

# Run tests
pnpm test

# Test CLI on sample app
echo "Testing CLI on sample Express app..."
cd tests/sample-express-app
npm install
docuflow scan
docuflow generate
docuflow diff

echo "All tests passed!"
