╔══════════════════════════════════════════════════════════════╗
║                   VENDEXA POS DESKTOP SHORTCUT               ║
║                        Quick Start Guide                     ║
╚══════════════════════════════════════════════════════════════╝

✓ Desktop shortcut created successfully!

LOCATION: C:\Users\MAYUR\Desktop\VENDEXA POS.lnk

═══════════════════════════════════════════════════════════════

HOW TO USE:
───────────
1. Go to your Desktop
2. Look for "VENDEXA POS" shortcut (shopping cart icon)
3. Double-click to start the POS system
4. Browser will open automatically to http://localhost:3000
5. Keep the terminal window open while using POS

═══════════════════════════════════════════════════════════════

FIRST TIME SETUP:
─────────────────
On first launch, the system will:
• Check Node.js installation
• Install required dependencies (this may take 2-3 minutes)
• Start the development server
• Open your browser

═══════════════════════════════════════════════════════════════

FILES CREATED:
──────────────
✓ start-pos.bat                    - Batch script to start POS
✓ create-desktop-shortcut.ps1      - Script to recreate shortcut
✓ DESKTOP_SHORTCUT_GUIDE.md        - Detailed guide
✓ C:\Users\MAYUR\Desktop\VENDEXA POS.lnk - Your desktop shortcut

═══════════════════════════════════════════════════════════════

QUICK TROUBLESHOOTING:
──────────────────────

Problem: Shortcut doesn't work
Solution: Make sure Node.js is installed
          Run: node --version
          If not found, install from https://nodejs.org

Problem: Port already in use
Solution: Close any other running POS instances
          Check terminal windows

Problem: Browser doesn't open
Solution: Wait 30 seconds, then manually go to:
          http://localhost:3000

═══════════════════════════════════════════════════════════════

RECREATE SHORTCUT:
──────────────────
If you accidentally delete the shortcut:

Method 1: Run this in PowerShell:
  cd "c:\Users\MAYUR\Downloads\Noren BY DGE\billing-pos-app"
  .\create-desktop-shortcut.ps1

Method 2: Manual
  Right-click start-pos.bat → Send to → Desktop

═══════════════════════════════════════════════════════════════

ADVANCED OPTIONS:
─────────────────

Pin to Taskbar:
  Right-click shortcut → Pin to taskbar

Custom Icon:
  Right-click shortcut → Properties → Change Icon

Auto-start on Windows boot:
  Copy shortcut to:
  C:\Users\MAYUR\AppData\Roaming\Microsoft\Windows\
  Start Menu\Programs\Startup

═══════════════════════════════════════════════════════════════

SUPPORT:
────────
For detailed documentation, see:
• DESKTOP_SHORTCUT_GUIDE.md
• DEPLOYMENT_GUIDE.md
• BUILD_SUCCESS.md

═══════════════════════════════════════════════════════════════

Status: ✓ READY TO USE
Created: Now
Type: Development server (local)

Double-click "VENDEXA POS" on your desktop to start!

═══════════════════════════════════════════════════════════════
