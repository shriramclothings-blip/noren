; VENDEXA RetailOS™ — NSIS installer script by Dinesh Global Enterprises Pvt Ltd
!macro customHeader
  !system "echo Building VENDEXA RetailOS Installer..."
!macroend

!macro customInit
  ; Check for previous installation and offer to uninstall
!macroend

!macro customInstall
  ; Create data directory for app data
  CreateDirectory "$APPDATA\VendexaRetailOS"
!macroend

!macro customUnInstall
  ; Optional: ask user if they want to delete data
!macroend
