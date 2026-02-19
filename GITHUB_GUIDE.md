# 🕌 Quran Checker — GitHub Setup Guide
## No Node.js Needed on Your PC!

GitHub will automatically build and host your app for FREE.

---

## 🎯 What You'll Get

✅ Free hosting at `https://YOUR_USERNAME.github.io/quran-checker`
✅ GitHub builds the app automatically (no Node.js on your PC needed)
✅ Every time you change a file → GitHub rebuilds automatically
✅ Free HTTPS (microphone works!)
✅ 100% free forever

---

## 📋 STEP-BY-STEP GUIDE

### STEP 1 — Create a Free GitHub Account

1. Go to **https://github.com**
2. Click **Sign up**
3. Enter your email, password, username
4. Verify your email
5. Done ✅

---

### STEP 2 — Create a New Repository

1. Click the **green "New"** button (top left on github.com)
   - OR go to: https://github.com/new

2. Fill in:
   ```
   Repository name:  quran-checker
   Description:      AI Quran Recitation Checker with Tajweed Analysis
   Visibility:       ✅ Public  (required for free GitHub Pages)
   ```

3. **DO NOT** check "Add a README file" (we already have one)

4. Click **"Create repository"** (green button)

5. You'll see a page with setup instructions — **leave it open**

---

### STEP 3 — Upload Your Files to GitHub

#### METHOD A — Upload via GitHub Website (Easiest, No Git needed!)

1. On your new repository page, click **"uploading an existing file"** link
   - OR click **"Add file"** → **"Upload files"**

2. **Drag and drop** your entire project folder contents into the upload area
   (all files and folders — see list below)

3. Files to upload:
   ```
   📁 .github/           ← IMPORTANT! Contains auto-build workflow
   📁 src/               ← React source code
   📁 public/            ← Static files
   📁 wordpress/         ← WordPress plugin
   📄 index.html
   📄 package.json
   📄 vite.config.ts
   📄 tsconfig.json
   📄 GITHUB_GUIDE.md
   📄 DEPLOYMENT.md
   📄 WORDPRESS_SETUP.md
   ```

4. At the bottom, type a commit message:
   ```
   Initial commit — Quran Recitation Checker
   ```

5. Click **"Commit changes"** (green button)

> ⚠️ **IMPORTANT**: Make sure the `.github` folder uploads correctly!
> It contains the auto-build workflow.
> On Windows, hidden folders (starting with `.`) may need to be shown.
> Press `Ctrl + H` in File Explorer to show hidden files.

---

#### METHOD B — Using GitHub Desktop App (Easy, No Terminal)

1. Download **GitHub Desktop**: https://desktop.github.com
2. Install and sign in with your GitHub account
3. Click **"Add"** → **"Add Existing Repository"**
4. Select your project folder
5. Click **"Publish repository"** → name it `quran-checker`
6. Done! GitHub Desktop handles everything.

---

#### METHOD C — Using Git Command Line (If you have Git installed)

Open Command Prompt (cmd) in your project folder and run:

```bash
git init
git add .
git commit -m "Initial commit — Quran Recitation Checker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/quran-checker.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

> 💡 To install Git (small download, 50MB): https://git-scm.com/download/win
> No Node.js needed — just Git!

---

### STEP 4 — Enable GitHub Pages (Free Hosting)

After uploading files:

1. Go to your repository on GitHub
2. Click **"Settings"** tab (top menu)
3. In the left sidebar, click **"Pages"**
4. Under **"Source"**, select:
   ```
   Source: GitHub Actions
   ```
5. Click **Save**

That's it! GitHub will now automatically build and host your app.

---

### STEP 5 — Wait for Auto-Build (2-3 minutes)

1. Click the **"Actions"** tab in your repository
2. You'll see **"🕌 Build & Deploy Quran Checker"** running
3. Wait for the ✅ green checkmark
4. Click on the workflow to see build progress

**Build stages:**
```
📥 Checkout code        → ✅ (5 seconds)
⚙️  Setup Node.js 20    → ✅ (30 seconds)
📦  npm install         → ✅ (1-2 minutes)
🔨  npm run build       → ✅ (1-2 minutes)
🚀  Deploy to Pages     → ✅ (30 seconds)
```

---

### STEP 6 — Access Your Live App! 🎉

After the build completes:

```
Your app URL: https://YOUR_USERNAME.github.io/quran-checker
```

Replace `YOUR_USERNAME` with your actual GitHub username.

**Examples:**
- `https://ahmad.github.io/quran-checker`
- `https://mohammed123.github.io/quran-checker`

---

## 🔄 How to Update Your App Later

### Updating via GitHub Website:

1. Go to your repository
2. Click on any file you want to change
3. Click the **pencil icon ✏️** to edit
4. Make your changes
5. Click **"Commit changes"**
6. GitHub automatically rebuilds! Wait 2-3 minutes.

### Uploading new files:

1. Click **"Add file"** → **"Upload files"**
2. Upload the changed files
3. Click **"Commit changes"**
4. Auto-rebuild starts! ✅

---

## ⚙️ Fix: Base URL for GitHub Pages

Since your app runs at `/quran-checker/` (not `/`), you need to tell Vite about this.

**Option 1 — Automatic (Already configured in our workflow)**
The build workflow sets `base` automatically.

**Option 2 — Manual fix if needed:**
The `vite.config.ts` needs `base: '/quran-checker/'` for GitHub Pages.
Our workflow handles this automatically via environment variable.

---

## 🔧 Troubleshooting

### ❌ Build fails with red ✗ in Actions tab

**Solution:**
1. Click on the failed workflow
2. Click on the failed step (red ✗)
3. Read the error message
4. Common fixes:
   - Missing `package.json` → upload it
   - Wrong Node version → our workflow uses Node 20 (correct)
   - TypeScript error → the code is pre-tested and should work

### ❌ App shows 404 after deployment

**Solution:**
1. Go to Settings → Pages
2. Make sure "GitHub Actions" is selected as source
3. Wait 5 minutes and try again
4. Check the Actions tab for any errors

### ❌ Microphone doesn't work

**Solution:**
GitHub Pages uses HTTPS automatically → microphone SHOULD work.
Make sure you're using **Chrome** or **Edge** browser.
Safari has limited speech recognition support.

### ❌ .github folder not uploading

**Solution:**
On Windows, hidden files/folders (starting with `.`) are hidden by default.

To show them:
1. Open File Explorer
2. Click **View** → **Show** → **Hidden items** (Windows 11)
   OR press **Alt** → **Tools** → **Folder Options** → **Show hidden files**

Then upload the `.github` folder to GitHub.

### ❌ Actions tab doesn't show the workflow

**Solution:**
The `.github/workflows/deploy.yml` file must be uploaded correctly.
Check: In your repo, go to `.github` → `workflows` → `deploy.yml` should exist.

---

## 📱 Share Your App

Once live, share these links:

**Direct link:**
```
https://YOUR_USERNAME.github.io/quran-checker
```

**WhatsApp/Telegram message:**
```
🕌 Check your Quran recitation with AI!
Free tool — works in browser, no download needed.
Detects Tajweed mistakes, compares with 12 famous reciters.
All 114 Surahs available.

👉 https://YOUR_USERNAME.github.io/quran-checker
```

**SEO tip:** After launch, submit your URL to:
- Google Search Console: https://search.google.com/search-console
- Bing Webmaster Tools: https://www.bing.com/webmasters

---

## 💰 Monetization (Optional)

### Google AdSense
1. Apply at https://www.google.com/adsense
2. After approval, edit `index.html` on GitHub:
   - Uncomment the AdSense script
   - Replace `ca-pub-XXXXXXXX` with your Publisher ID
   - Commit → auto-rebuild!

### Google Analytics
1. Go to https://analytics.google.com
2. Get your Measurement ID (G-XXXXXXXXXX)
3. Edit `index.html` on GitHub, uncomment the GA4 script
4. Replace `G-XXXXXXXXXX` with your ID
5. Commit → done!

---

## 🌐 Custom Domain (Optional)

To use `quran.yourdomain.com` instead of `github.io`:

1. In your domain registrar (GoDaddy, Namecheap, etc.)
   Add a CNAME record:
   ```
   Type:  CNAME
   Host:  quran (or @)
   Value: YOUR_USERNAME.github.io
   ```

2. In GitHub → Settings → Pages → Custom domain:
   Enter `quran.yourdomain.com`

3. Check **"Enforce HTTPS"**

4. Wait 24-48 hours for DNS propagation

---

## 📊 Summary — What GitHub Does For You

| Task | Manual | GitHub Actions |
|------|--------|----------------|
| Install Node.js | ❌ You need to install | ✅ Auto |
| npm install | ❌ Run command | ✅ Auto |
| npm run build | ❌ Run command | ✅ Auto |
| Upload to server | ❌ Manual FTP | ✅ Auto |
| HTTPS certificate | ❌ Manual setup | ✅ Free auto |
| CDN delivery | ❌ Need to configure | ✅ Built-in |
| **Total cost** | Server fees | **FREE** |

---

## 📞 Quick Reference

| What | Where |
|------|-------|
| Your repo | `https://github.com/YOUR_USERNAME/quran-checker` |
| Your live app | `https://YOUR_USERNAME.github.io/quran-checker` |
| Build status | `https://github.com/YOUR_USERNAME/quran-checker/actions` |
| GitHub Pages settings | `https://github.com/YOUR_USERNAME/quran-checker/settings/pages` |

---

*Quran Recitation Checker — Powered by React + Vite + Tailwind CSS*
*Hosted FREE on GitHub Pages with automatic CI/CD*
