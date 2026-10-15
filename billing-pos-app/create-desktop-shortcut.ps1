# Create Desktop Shortcut for VENDEXA POS
Write-Host "Creating desktop shortcut for VENDEXA POS..." -ForegroundColor Cyan

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "VENDEXA POS.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

# Get current directory (where the batch file is)
$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BatchFile = Join-Path $CurrentDir "start-pos.bat"

# Configure shortcut
$Shortcut.TargetPath = $BatchFile
$Shortcut.WorkingDirectory = $CurrentDir
$Shortcut.Description = "VENDEXA RetailOS POS - Double click to start"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,111"

# Save the shortcut
$Shortcut.Save()

Write-Host ""
Write-Host "SUCCESS: Desktop shortcut created!" -ForegroundColor Green
Write-Host ""
Write-Host "Shortcut location: $ShortcutPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "Double-click VENDEXA POS on your desktop to start the application." -ForegroundColor White
Write-Host ""
