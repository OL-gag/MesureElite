# 🚀 MesureMG MVP - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd D:\01.Dev\MGSpeedyTrip\MesureMG
npm install
```
⏱️ Takes ~3-5 minutes (first time only)

### Step 2: Start Dev Server
```bash
npm run dev
```
Output will show:
```
Local:        http://localhost:3000
```

### Step 3: Test in Browser
1. Open http://localhost:3000
2. You should see the address input form

---

## 🧪 Test the MVP

### Simple Test (2 addresses)
Enter these Portland, OR addresses:
```
Address 1: 123 Main St, Portland OR
Address 2: 456 Oak Ave, Portland OR
```

Click **"Optimize Route"**

### What Should Happen:
1. ✅ Both addresses geocoded (Nominatim)
2. ✅ Route calculated (OSRM)
3. ✅ Redirected to results page
4. ✅ See:
   - Total distance
   - Total duration
   - Optimization gain %
   - Itinerary with waypoints

---

## 📍 Test Addresses (Portland, Oregon)

Use these real addresses to test:
```
1. Pioneer Courthouse Square, Portland OR
2. Oregon Museum of Science and Industry, Portland OR
3. Powell's City of Books, Portland OR
4. Portland Art Museum, Portland OR
5. South Waterfront Park, Portland OR
```

All are in Portland and should geocode successfully.

---

## ⚠️ Common Issues & Fixes

### "npm: not found"
**Fix**: Install Node.js from https://nodejs.org/ (LTS 18+)

### "Address not found" error
**Cause**: Address spelling error or too vague
**Fix**: Use full address with city/state
**Example**: ❌ "Main St" → ✅ "123 Main St, Portland OR"

### "Routing failed"
**Cause**: Address is unreachable by car (rare)
**Fix**: Try different addresses

### Port 3000 in use
**Fix**: Run on different port:
```bash
npm run dev -- -p 3001
```

### Slow first request
**Normal**: First Nominatim request takes ~1-2 sec
**Then**: Cached for 24 hours

---

## 🔍 Debug Mode

### Check browser console:
```bash
F12 → Console tab
# Look for any error messages
```

### Check server logs:
```bash
# Terminal running npm run dev
# Shows all API requests and errors
```

### Test API manually:
```bash
# Terminal 2 (while dev server running)

# Test geocoding:
curl -X POST http://localhost:3000/api/geocode \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      {"id": "1", "text": "123 Main St, Portland OR", "order": 1}
    ]
  }'

# Should return: lat, lon, displayName
```

---

## ✅ MVP Features to Test

- [x] Input 2+ addresses
- [x] Geocoding (Nominatim)
- [x] Route calculation (OSRM)
- [x] Results display
- [x] Error handling
- [x] Responsive design
- [x] Mobile friendly

---

## 🚢 Ready to Deploy?

```bash
# After testing locally and it works:

# 1. Commit changes
git add .
git commit -m "MVP complete - route optimizer working"

# 2. Push to main (auto-deploys to Vercel)
git push origin main

# 3. Live at: https://measuremg.vercel.app
```

---

## 📞 Still Having Issues?

Check:
1. ✅ Node.js installed: `node --version` (should be 18+)
2. ✅ npm installed: `npm --version` (should be 9+)
3. ✅ Port 3000 free: `netstat -ano | findstr :3000` (Windows)
4. ✅ Dependencies installed: Look for `node_modules/` folder
5. ✅ No errors in console (F12)

---

**Happy testing! 🎉**

Questions? Check README.md for full docs.
