# 🕌 Quran Recitation Checker — Complete Setup Guide
## GitHub · Localhost · WordPress · cPanel

---

## 📋 SECTION 1 — Build the App (Do This First)

### Prerequisites
- **Node.js** (v18+) — download from https://nodejs.org
- **npm** (comes with Node.js)
- A terminal / command prompt

### Step 1 — Install Dependencies
```bash
npm install
```

### Step 2 — Build for Production
```bash
npm run build
```

After building, you'll see a `dist/` folder:
```
dist/
└── index.html    ← Single file with ALL JS + CSS inlined (415 KB)
```

> ✅ **The entire app is ONE file** (`index.html`) because we use `vite-plugin-singlefile`.
> No separate `assets/` folder needed — just upload `index.html` and `.htaccess`.

---

## 📋 SECTION 2 — GitHub Setup

### Create a Repository

1. Go to **github.com** → Sign In → click **"New"** (green button)
2. Repository name: `quran-checker`
3. Set to **Public**
4. Click **"Create repository"**

### Push Your Code to GitHub

Open terminal in your project folder and run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit — Quran Recitation Checker"

# Connect to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/quran-checker.git

# Push to main branch
git branch -M main
git push -u origin main
```

### After Changes — Push Updates

```bash
git add .
git commit -m "Update: describe what you changed"
git push
```

### Deploy FREE on GitHub Pages

1. Run `npm run build` → get `dist/index.html`
2. In GitHub repo → **Settings** → **Pages**
3. Source: **"Deploy from a branch"**
4. Branch: `main` / folder: `/dist`
5. Click **Save**
6. Your site will be at: `https://YOUR_USERNAME.github.io/quran-checker`

> ⚠️ **Important:** GitHub Pages uses HTTPS automatically — microphone will work!

---

## 📋 SECTION 3 — Run on Localhost

```bash
# 1. Install Node.js from nodejs.org (LTS version)

# 2. Clone your repo (or open the folder you already have)
git clone https://github.com/YOUR_USERNAME/quran-checker.git
cd quran-checker

# 3. Install packages
npm install

# 4. Start development server
npm run dev
```

Open your browser at: **http://localhost:5173**

- ✅ Hot reload enabled (changes reflect instantly)
- ✅ Microphone works on localhost
- ✅ All 114 Surahs load from alquran.cloud API

### Build for Production
```bash
npm run build
# Output: dist/index.html
```

---

## 📋 SECTION 4 — cPanel / Shared Hosting Deployment

This is the simplest deployment method. No server-side code needed.

### Method A — Root Domain (yourdomain.com)

1. **Login** to your cPanel → **File Manager**
2. Navigate to `public_html/`
3. **Upload** these files from your `dist/` folder:
   - `index.html`
   - `.htaccess` ← **important!** (enable "Show Hidden Files" in File Manager)
4. Visit `https://yourdomain.com` ✅

### Method B — Subdirectory (yourdomain.com/quran)

1. In File Manager, create folder: `public_html/quran/`
2. Upload `dist/` contents to `public_html/quran/`
3. Edit `.htaccess` — change `RewriteBase /` to `RewriteBase /quran/`
4. Visit `https://yourdomain.com/quran` ✅

### Method C — Subdomain (quran.yourdomain.com)

1. cPanel → **Subdomains** → create `quran.yourdomain.com`
2. Set document root: `public_html/quran/`
3. Upload `dist/` contents to `public_html/quran/`
4. Visit `https://quran.yourdomain.com` ✅

### Using FTP (FileZilla)

```
Host:     ftp.yourdomain.com
Username: your_cpanel_username
Password: your_cpanel_password
Port:     21  (or 22 for SFTP)
```

Upload all `dist/` contents to `/public_html/`

> ⚠️ **HTTPS Required for Microphone!** Get free SSL:
> cPanel → SSL/TLS → Let's Encrypt SSL → Install

---

## 📋 SECTION 5 — WordPress Plugin Installation

### STEP-BY-STEP GUIDE

#### Step 1 — Build the App
```bash
npm run build
```
This creates `dist/index.html` (the single-file app).

---

#### Step 2 — Prepare the Plugin Folder

Create this folder structure on your computer:
```
quran-checker/
├── quran-checker-plugin.php    ← from wordpress/ folder in this project
└── app/
    └── index.html              ← from dist/ folder
```

**How to do it:**
1. Create a new folder called `quran-checker` on your Desktop
2. Copy `wordpress/quran-checker-plugin.php` into it
3. Inside `quran-checker/`, create a subfolder called `app/`
4. Copy `dist/index.html` into the `app/` folder

---

#### Step 3 — Zip the Plugin

**On Windows:**
- Right-click the `quran-checker` folder → "Send to" → "Compressed (zipped) folder"
- You'll get `quran-checker.zip`

**On Mac:**
- Right-click the `quran-checker` folder → "Compress quran-checker"
- You'll get `quran-checker.zip`

**On Linux/Terminal:**
```bash
zip -r quran-checker.zip quran-checker/
```

---

#### Step 4 — Upload Plugin to WordPress

1. Login to your WordPress Admin: `yourdomain.com/wp-admin`
2. Go to **Plugins** → **Add New**
3. Click **"Upload Plugin"** (top of page)
4. Click **"Choose File"** → select `quran-checker.zip`
5. Click **"Install Now"**
6. Click **"Activate Plugin"**

---

#### Step 5 — Add to a Page

**Using Shortcode (Classic Editor or any page):**
1. Create or edit any WordPress page
2. Add this shortcode in the content:
   ```
   [quran_checker]
   ```
3. Click **Publish / Update**
4. Visit your page — the app will appear! ✅

**Using Gutenberg Block Editor:**
1. Edit any page in Gutenberg
2. Click the **+** button to add a block
3. Search for **"Shortcode"**
4. Add `[quran_checker]` in the shortcode block
5. Publish ✅

---

#### Step 6 — Plugin Settings (Optional)

Go to **WordPress Admin → Settings → 🕌 Quran Checker** for:
- Usage instructions
- Setup checklist
- Link to the app

---

### WordPress Shortcode Options

| Shortcode | Description |
|-----------|-------------|
| `[quran_checker]` | Default embed, 100% width, full height |
| `[quran_checker mode="iframe"]` | Loads in an iframe |
| `[quran_checker height="800px"]` | Custom height |
| `[quran_checker width="90%" height="90vh"]` | Custom size |

---

### WordPress Microphone Fix

If the microphone doesn't work on WordPress, add this to your `.htaccess` file:

```apache
Header always set Permissions-Policy "microphone=(self)"
Header always set Feature-Policy "microphone 'self'"
```

Find `.htaccess` in your WordPress root (`public_html/`) via File Manager.

---

## 📋 SECTION 6 — cPanel Upload via File Manager (Detailed)

### Step 1 — Login to cPanel
Go to: `yourdomain.com/cpanel` or `yourdomain.com:2083`

### Step 2 — Open File Manager
Click **File Manager** icon

### Step 3 — Show Hidden Files
- Click **Settings** (top right)
- Check **"Show Hidden Files (dotfiles)"**
- Click **Save**

### Step 4 — Navigate to public_html
In the left panel, click `public_html`

### Step 5 — Upload Files
- Click **Upload** button in toolbar
- Select `dist/index.html` and upload
- Go back, click **Upload** again
- Select `dist/.htaccess` and upload

> If `.htaccess` already exists (WordPress uses it), do NOT replace it.
> Instead, use the **WordPress subdirectory method** or **WordPress plugin method**.

### Step 6 — Verify
Visit `https://yourdomain.com` in your browser.
The Quran Checker should load! ✅

---

## 📋 SECTION 7 — .htaccess Conflict with WordPress

If WordPress is already installed and uses `.htaccess`, add these lines
**BEFORE** the `# BEGIN WordPress` line in your existing `.htaccess`:

```apache
# Quran Checker — add BEFORE WordPress rules
Header always set Permissions-Policy "microphone=(self)"
```

And if you installed the Quran Checker in a subdirectory like `/quran/`:

```apache
# Quran Checker subdirectory — add BEFORE WordPress rules
RewriteCond %{REQUEST_URI} ^/quran/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^quran/(.*)$ /quran/index.html [L]
```

---

## 📋 SECTION 8 — Enable HTTPS / SSL (Required for Microphone)

### Free SSL via cPanel (Let's Encrypt)
1. cPanel → **SSL/TLS** → **Let's Encrypt™ SSL**
2. Select your domain → **Issue**
3. Wait 1-2 minutes

### Free SSL via Cloudflare
1. Sign up at cloudflare.com
2. Add your site → change nameservers at your domain registrar
3. SSL Mode: **Full (Strict)**
4. Enable **"Always Use HTTPS"**

---

## 📋 SECTION 9 — Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank white page | Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) |
| Microphone not working | Must use HTTPS or localhost. Get free SSL via Let's Encrypt |
| Quran text not loading | Check internet connection. The app fetches from alquran.cloud API |
| Audio not playing | Must use HTTPS. Audio from everyayah.com requires secure connection |
| 404 on refresh | `.htaccess` not uploaded or mod_rewrite not enabled |
| WordPress CSS conflicts | Use `[quran_checker mode="iframe"]` instead |
| "Not allowed" mic error | Click 🔒 lock icon → Microphone → Allow → Refresh |

---

## 📋 SECTION 10 — AdSense & Analytics

### Google Analytics 4
1. Go to analytics.google.com → Create account
2. Get your **Measurement ID** (format: `G-XXXXXXXXXX`)
3. Uncomment in `index.html`:
   ```html
   <!-- GA4 -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   ```
4. Replace `G-XXXXXXXXXX` with your ID
5. Rebuild: `npm run build` and re-upload

### Google AdSense
1. Apply at google.com/adsense
2. After approval, uncomment in `index.html`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX" crossorigin="anonymous"></script>
   ```
3. Replace `ca-pub-XXXXXXXX` with your Publisher ID
4. Rebuild and re-upload

---

## ✅ Deployment Checklist

- [ ] `npm install` completed
- [ ] `npm run build` completed → `dist/index.html` exists
- [ ] SSL/HTTPS active on domain
- [ ] `.htaccess` uploaded
- [ ] Microphone permission header added
- [ ] App loads in browser
- [ ] Quran text loads (internet connection working)
- [ ] Microphone works (using Chrome/Edge on HTTPS)
- [ ] Audio playback works for reciters
- [ ] Google Analytics ID added (optional)
- [ ] AdSense Publisher ID added (optional, after approval)

---

*Quran Recitation Checker — Built with React + Vite + Tailwind CSS*
*Deploys as a static single HTML file — no server-side code required*
