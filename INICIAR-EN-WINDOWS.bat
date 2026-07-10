@echo off
cd /d "%~dp0"
title Menu de cafeteria

echo ==========================================
echo   MENU DE CAFETERIA - INICIO LOCAL
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Instala Node.js y vuelve a intentarlo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias por primera vez...
  call npm config set registry https://registry.npmjs.org/
  call npm install
  if errorlevel 1 (
    echo.
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Menu:  http://localhost:3000
echo Admin: http://localhost:3000/admin
echo Contrasena inicial: demo1234
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000/admin"
call npm start
pause
