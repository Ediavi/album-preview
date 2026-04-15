@echo off
title Album Preview - Serveur local
color 0B
echo.
echo  ============================================
echo    Album Preview - Serveur local
echo  ============================================
echo.
echo  Demarrage du serveur sur http://localhost:8080
echo  (L'upload de lien fonctionne uniquement depuis ici)
echo.

:: Try Python 3 first, then Python 2
where python >/dev/null 2>&1
if %errorlevel% == 0 (
    start "" "http://localhost:8080/CanvasPreview.html"
    python -m http.server 8080
    goto end
)
where py >/dev/null 2>&1
if %errorlevel% == 0 (
    start "" "http://localhost:8080/CanvasPreview.html"
    py -m http.server 8080
    goto end
)
echo  Python non trouve. Installe Python depuis https://python.org
pause
:end
