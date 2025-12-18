#!/bin/bash
# Cleanup script to remove temporary/sensitive files before git push

echo "🧹 Cleaning up TeleDoc/Healio.AI project for Git..."

# Root directory
echo "Cleaning root directory..."
rm -f .DS_Store
rm -f api_testing.ipynb
rm -rf Evalutation  # Typo folder

# Backend
echo "Cleaning backend..."
rm -f teledoc-backend/.env
rm -f teledoc-backend/api_testing.ipynb
rm -f teledoc-backend/test_report_v*.pdf
rm -f teledoc-backend/.DS_Store

# Evaluation
echo "Cleaning evaluation folder..."
rm -f Evaluation/.env
rm -rf Evaluation/venv
rm -f Evaluation/.DS_Store

# Frontend
echo "Cleaning frontend..."
rm -f teledoc-health-hub/.DS_Store
rm -f teledoc-health-hub/.env

# Temp experiments
echo "Removing temp experiments..."
rm -rf temp_experiments

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Review changes: git status"
echo "2. Stage changes: git add ."
echo "3. Commit: git commit -m 'Clean up project for production'"
echo "4. Push: git push origin main"
