# JOHN'S GUIDE — Hollies System Setup

> Read this guide once fully, then follow each step in order.
> If anything goes wrong, screenshot and WhatsApp to Biggie immediately.

---

## FILES IN THIS FOLDER

```
hollies-enterprise/
├── START-WINDOWS.bat    ← Double-click to start (Windows)
├── START-MAC.sh         ← Double-click to start (Mac)
├── UPDATE-WINDOWS.bat   ← Double-click when Biggie sends updates (Windows)
├── UPDATE-MAC.sh        ← Double-click for updates (Mac)
├── docker-compose.yml   ← Edit once in Step 2, never again
├── JOHN.md              ← This guide
├── src/                 ← Do NOT touch
└── frontend/            ← Do NOT touch
```

---

## STEP 1 — INSTALL DOCKER DESKTOP (15 minutes)

Docker is the only program you need. It runs everything else.

1. Go to: https://www.docker.com/products/docker-desktop
2. Click the Download button for Windows or Mac
3. Install it — click through all defaults
4. Start Docker Desktop from your Start Menu or Applications
5. Wait until you see the WHALE ICON in your taskbar or menu bar — this means it is ready

Verify it worked: open a terminal and type: docker --version
You should see a version number like: Docker version 26.0.0

---

## STEP 2 — CHANGE THE PASSWORDS (5 minutes)

1. Extract the ZIP to a folder e.g. C:\hollies\
2. Open docker-compose.yml in Notepad
3. Find and change these two lines:

   POSTGRES_PASSWORD: Holl1es@SecureDB!
   Change to your own password e.g.: MyHollies2025!

   Jwt__Secret: YourSuperSecretKeyHereMustBe32CharsMinimum!!
   Change to any text 32+ characters e.g.: HolliesSecretKey2025ZimbabweXYZ123

4. Write both passwords down somewhere safe
5. Save the file

---

## STEP 3 — START THE SYSTEM (10 minutes)

Windows: Double-click START-WINDOWS.bat
Mac: Right-click START-MAC.sh, Open With Terminal

A window opens with text scrolling — this is normal.
First time takes 5-10 minutes to download and build everything.
When done you will see: HOLLIES IS READY!
Your browser opens automatically.

If you see red ERROR text — screenshot it and WhatsApp Biggie.

---

## STEP 4 — COMPLETE SETUP IN BROWSER (10 minutes)

Your browser opens the Hollies First Time Setup page automatically.
This page only appears once. After setup it disappears permanently.

Fill in the form:
- Full Name: Biggie's name
- Email: Biggie's email e.g. biggie@hollies.co.zw
- Password: Choose a password for Biggie
- Confirm Password: Same password again

To add other staff (optional — you can do this later inside the app):
- Fill in their name, email, password
- Choose their role
- Click + Add This Staff Member
- Repeat for each person

Click: Complete Setup and Open Hollies

A green success message appears. Then click Open Hollies App.
Sign in with Biggie's email and password.

---

## STEP 5 — DEPLOY TO THE INTERNET (30 minutes)

This makes Hollies available to all 40 branches from anywhere.

A. Create Hetzner account:
   Go to: https://www.hetzner.com/cloud
   Sign up, verify email, add payment card

B. Create a server:
   Click New Server
   Location: Frankfurt or Helsinki
   Image: Ubuntu 24.04
   Type: CPX21 (3 vCPU, 4GB RAM — about 6 USD per month)
   Click Create and Buy Now
   Hetzner emails you the server IP e.g. 49.12.123.45 and a password

C. Upload files using FileZilla (free download: https://filezilla-project.org):
   Open FileZilla
   Host: your server IP  User: root  Password: from email  Port: 22
   Click Quickconnect
   Right side shows server files, left side shows your computer files
   Navigate left side to your hollies-enterprise folder
   Drag the hollies-enterprise folder to the right side
   Wait for upload

D. Connect to server and start:
   Windows: download PuTTY from https://putty.org
            open PuTTY, type server IP, click Open, type password
   Mac: open Terminal, type: ssh root@49.12.123.45 (use your IP)

   Type these commands one at a time, Enter after each:
   cd /root/hollies-enterprise
   apt-get update && apt-get install -y docker.io docker-compose
   docker-compose up --build -d

   Wait 10 minutes. When done, your app is live.

E. Complete setup on server:
   Open browser: http://49.12.123.45:5000/setup.html (use your IP)
   Fill in setup form same as Step 4

F. Share with branches:
   http://49.12.123.45:3000

---

## APPLYING UPDATES FROM BIGGIE

When Biggie sends new files:
1. Copy the new files into your hollies-enterprise folder (replace old files when asked)
2. Double-click UPDATE-WINDOWS.bat or UPDATE-MAC.sh
3. Wait for UPDATE COMPLETE message
4. Tell staff to refresh their browsers (Ctrl+Shift+R or Cmd+Shift+R)
Done. Takes under 10 minutes.

If Biggie sends a SQL database change:
1. Open terminal in hollies folder
2. Type: docker-compose exec postgres psql -U postgres -d hollies
3. A prompt appears: hollies=#
4. Paste the SQL Biggie sent, press Enter
5. Type: \q  and press Enter
No restart needed.

---

## TROUBLESHOOTING

Problem: Double-clicking .bat file does nothing
Solution: Right-click it, Run as administrator

Problem: Docker not found
Solution: Install Docker Desktop (Step 1)

Problem: Docker not running
Solution: Open Docker Desktop, wait for whale icon

Problem: Browser shows blank white page
Solution: Wait 30 seconds, refresh

Problem: Cannot connect in browser
Solution: System still starting, wait 1 minute

Problem: Setup page does not open automatically
Solution: Go to http://localhost:5000/setup.html manually

Problem: Setup already complete message
Solution: Good. Go to http://localhost:3000 to use the app

Problem: Changes not showing after update
Solution: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

Anything else: Screenshot the error and WhatsApp Biggie immediately.

---

## THINGS TO NEVER DO

- Never run: docker-compose down -v  (the -v deletes all data permanently)
- Never delete docker-compose.yml
- Never edit anything in src/ or frontend/ folders
- Never share your server password with anyone except Biggie

---

## DAILY ROUTINE

The system runs 24/7 automatically. John does nothing daily.

John only acts when:
- Biggie sends update files (run UPDATE script, 10 minutes)
- Server or computer restarts (run START script, 5 minutes)
- Something breaks (screenshot and WhatsApp Biggie)

---

This guide has everything you need. Nothing has been left out.
