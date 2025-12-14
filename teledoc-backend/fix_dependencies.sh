#!/bin/bash
echo "Uninstalling potential conflict packages..."
pip uninstall -y crewai chromadb opentelemetry-api opentelemetry-sdk fastapi uvicorn

echo "Installing CrewAI separately..."
pip install "crewai>=0.28.0"

echo "Installing remaining requirements..."
pip install -r requirements.txt

echo "Done!"
