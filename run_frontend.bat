@echo off
cd /d "%~dp0interface"
call npm install
call npm run dev
