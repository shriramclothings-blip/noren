# NOREN Email Portal - Quick Start Guide (Online Backend)

## 🚀 Easy Startup Scripts

Using **Online Backend**: https://noren-iqk3.onrender.com

Three batch files have been created for easy startup and management:

### 1. `START_EMAIL_PORTAL.BAT` ⭐ (RECOMMENDED)
**Starts the email portal frontend with online backend**

```bash
# Double-click this file or run from command line
START_EMAIL_PORTAL.BAT
```

**What it does:**
- ✅ Checks if dependencies are installed (runs `npm install` if needed)
- ✅ Starts Email Portal frontend (Port 5177)
- ✅ Uses online backend automatically
- ✅ Opens browser automatically to http://localhost:5177

**Requirements:**
- Node.js installed
- Internet connection (for online backend)
- `email-portal/` directory present

---

### 2. `email-portal/RUN.BAT`
**Alternative startup method**

```bash
# Navigate to email-portal directory, then run:
cd email-portal
RUN.BAT
```

**What it does:**
- ✅ Installs dependencies if needed
- ✅ Starts Email Portal dev server (Port 5177)
- ✅ Uses online backend automatically

---

### 3. `STOP_EMAIL_PORTAL.BAT`
**Stops the frontend**

```bash
# Double-click this file or run from command line
STOP_EMAIL_PORTAL.BAT
```

**What it does:**
- ✅ Kills all Node.js processes (frontend only)
- ✅ Online backend continues running

---

## 📋 Manual Startup (Alternative)

If you prefer manual control:

```bash
cd email-portal
npm install          # First time only
npm run dev          # Starts on port 5177
```

---

## 🌐 Access URLs

After starting the frontend:

- **Email Portal (Frontend):** http://localhost:5177
- **Backend API (Online):** https://noren-iqk3.onrender.com
- **API Documentation:** https://noren-iqk3.onrender.com/api

---

## ✅ First Time Setup

### 1. Check Setup
```bash
# Run setup checker
CHECK_SETUP.BAT
```

This verifies Node.js, dependencies, and online backend connectivity.

### 2. Start Frontend
```bash
# From project root
START_EMAIL_PORTAL.BAT
```

### 3. Login to Email Portal
Navigate to: http://localhost:5177

**Login with your NOREN credentials**

---

## 🛠️ Troubleshooting

### Frontend Port Already in Use (5177)

```bash
# Windows
netstat -ano | findstr :5177
taskkill /PID <PID> /F
```

Or just run: `STOP_EMAIL_PORTAL.BAT`

---

### Dependencies Not Installing

**Clear npm cache:**
```bash
npm cache clean --force
```

**Delete node_modules and reinstall:**
```bash
cd email-portal
rmdir /s /q node_modules
npm install
```

---

### Backend Connection Failed

**Check online backend status:**
1. Visit https://noren-iqk3.onrender.com in browser
2. Check your internet connection
3. Verify `.env.local` configuration

**Email Portal `.env.local` should have:**
```env
VITE_API_URL=https://noren-iqk3.onrender.com/api
VITE_EMAIL_API_URL=https://noren-iqk3.onrender.com/api/email
```

---

### CORS Issues

If you see CORS errors in browser console:
1. Backend may need to add your localhost to allowed origins
2. Try clearing browser cache
3. Contact backend admin to verify CORS settings

---

## 📝 Development Workflow

### Daily Startup
1. Double-click `START_EMAIL_PORTAL.BAT`
2. Wait for frontend to start
3. Browser opens automatically
4. Start coding!

### Making Changes
- **Frontend changes:** Auto-reload (Hot Module Replacement)
- **Backend changes:** Handled on server (https://noren-iqk3.onrender.com)

### Stopping Service
1. Double-click `STOP_EMAIL_PORTAL.BAT`
2. Or press `Ctrl+C` in terminal window

---

## 🎯 Quick Commands Reference

### Email Portal (Frontend)
```bash
cd email-portal
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

## 📂 Project Structure

```
NOREN/
├── email-portal/              # Email Portal Frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── store/            # State management
│   │   └── utils/            # Utilities
│   ├── package.json
│   └── RUN.BAT               # Frontend startup script
│
├── START_EMAIL_PORTAL.BAT     # Main startup script
├── STOP_EMAIL_PORTAL.BAT      # Stop frontend
├── CHECK_SETUP.BAT            # Setup verification
└── EMAIL_PORTAL_QUICK_START.md # This file
```

---

## 🔐 Security Notes

- **Online backend:** https://noren-iqk3.onrender.com (SSL encrypted)
- **Development frontend:** http://localhost:5177
- **JWT tokens:** Stored in localStorage (browser)
- **API authentication:** Automatic token injection on all requests

---

## 📞 Support

If you encounter issues:

1. Run `CHECK_SETUP.BAT` to verify configuration
2. Check browser console (F12) for frontend errors
3. Check network connectivity to online backend
4. Verify you have valid NOREN login credentials
5. Run `STOP_EMAIL_PORTAL.BAT` and try starting again

---

## ✨ Features Available

After successful startup, you can:

✅ Login with NOREN credentials  
✅ Compose and send emails  
✅ View sent email history  
✅ Manage email templates  
✅ Create and manage campaigns  
✅ View contact database  
✅ See analytics dashboard  
✅ Configure sender identities  
✅ View audit logs  

---

## 🌐 Environment Configuration

### Development (.env.local)
```env
VITE_API_URL=https://noren-iqk3.onrender.com/api
VITE_EMAIL_API_URL=https://noren-iqk3.onrender.com/api/email
VITE_SITE_URL=http://localhost:5177
```

### Production (.env)
```env
VITE_API_URL=https://noren-iqk3.onrender.com/api
VITE_EMAIL_API_URL=https://noren-iqk3.onrender.com/api/email
VITE_SITE_URL=https://www.norenfastion.shop
```

---

**Happy Coding! 🚀**

**Using Online Backend: https://noren-iqk3.onrender.com**

For detailed documentation, see:
- `email-portal/README.md`
- `EMAIL_PORTAL_PHASE4_COMPLETE.md`
- `EMAIL_PORTAL_ARCHITECTURE_AUDIT.md`
