@echo off
echo Initializing Git repository...
git init
echo node_modules/ > .gitignore
echo .env >> .gitignore
git add .
git commit -m "Initial commit - Bajaj Finserv Health Challenge"
echo.
echo Git repository initialized and files committed locally!
echo.
set /p repo_url="Enter your GitHub Repository URL (e.g., https://github.com/username/repo-name.git): "
if "%repo_url%"=="" goto error
git remote add origin %repo_url%
git branch -M main
echo Pushing code to GitHub...
git push -u origin main
echo Done!
pause
exit
:error
echo No URL entered. You can link it manually later.
pause
