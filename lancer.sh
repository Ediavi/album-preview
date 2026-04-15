#!/bin/bash
echo ""
echo " ============================================"
echo "   Album Preview - Serveur local"
echo " ============================================"
echo ""
echo " Démarrage sur http://localhost:8080"
echo ""

# Open browser (Mac / Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sleep 1 && open "http://localhost:8080/CanvasPreview.html" &
else
    sleep 1 && xdg-open "http://localhost:8080/CanvasPreview.html" &
fi

# Start server
python3 -m http.server 8080
