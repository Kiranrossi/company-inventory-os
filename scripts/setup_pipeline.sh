#!/bin/bash
set -e

# Change directory to the inventory-app root
cd "$(dirname "$0")/.."

echo "=== Initializing Python Virtual Environment ==="
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Virtual environment 'venv' created."
else
    echo "Virtual environment 'venv' already exists."
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "=== Upgrading pip ==="
pip install --upgrade pip

# Install dependencies
echo "=== Installing Python dependencies (Docling, RapidFuzz, etc.) ==="
pip install docling rapidfuzz pandas anthropic python-dotenv

echo "=== Python Pipeline Setup Completed Successfully ==="
