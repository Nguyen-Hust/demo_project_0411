@echo off
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  node "%~dp0board\board.mjs" --ui
) else (
  start "" "%~dp0board\BOARD.html"
)
