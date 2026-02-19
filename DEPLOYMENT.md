# 🚀 Quran Recitation Checker — Deployment Guide
## cPanel Shared Hosting & WordPress

---

## 📋 Table of Contents

1. [Build the App](#1-build-the-app)
2. [Deploy to cPanel / Shared Hosting](#2-deploy-to-cpanel--shared-hosting)
3. [Deploy to WordPress](#3-deploy-to-wordpress)
4. [Configure DNS & Domain](#4-configure-dns--domain)
5. [Enable HTTPS / SSL](#5-enable-https--ssl)
6. [Google AdSense Setup](#6-google-adsense-setup)
7. [Google Analytics Setup](#7-google-analytics-setup)
8. [SEO Verification](#8-seo-verification)
9. [Performance Optimization](#9-performance-optimization)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Build the App

```bash
# Install dependencies (if not already done)
npm install

# Build for production
npm run build

# The output will be in the dist/ folder
```

After building, you'll have:
```
dist/
├── index.html        ← Main app file (all JS/CSS inlined via vite-plugin-singlefile)
├── .htaccess         ← Apache config (copied from public/)
├── robots.txt        ← SEO robots file
└── manifest.json     ← PWA manifest
```

> **Note:** Since the project uses `vite-plugin-singlefile`, all JavaScript and CSS
> are bundled INTO `index.html` as a single self-contained file. No separate `assets/` folder needed!

---

## 2. Deploy to cPanel / Shared Hosting

### Option A: Root Domain (yourdomain.com)

1. **Log in to cPanel** → File Manager
2. Navigate to `public_html/`
3. **Upload all files from `dist/`** to `public_html/`
4. Your structure should be:
   ```
   public_html/
   ├── index.html
   ├── .htaccess
   ├── robots.txt
   └── manifest.json
   ```
5. Visit `https://yourdomain.com` — done! ✅

### Option B: Subdirectory (yourdomain.com/quran-checker)

1. Create folder: `public_html/quran-checker/`
2. Upload all `dist/` contents into it
3. Edit `.htaccess` — change `RewriteBase /` to `RewriteBase /quran-checker/`
4. Visit `https://yourdomain.com/quran-checker`

### Option C: Subdomain (quran.yourdomain.com)

1. In cPanel → **Subdomains** → create `quran.yourdomain.com`
2. Set document root to `public_html/quran/`
3. Upload `dist/` contents into `public_html/quran/`
4. Visit `https://quran.yourdomain.com`

### Using cPanel File Manager (Step-by-Step)

1. Login to `yourdomain.com/cpanel`
2. Click **File Manager**
3. Navigate to `public_html`
4. Click **Upload** → upload all files from `dist/`
5. Make sure `.htaccess` is visible (click Settings → "Show Hidden Files")
6. Done!

### Using FTP (FileZilla)

```
Host:     ftp.yourdomain.com  (or your server IP)
Username: your_cpanel_username
Password: your_cpanel_password
Port:     21 (FTP) or 22 (SFTP)
```

Upload all `dist/` contents to `/public_html/`

---

## 3. Deploy to WordPress

### Method A: As a WordPress Plugin (Recommended)

1. Build the app: `npm run build`

2. Create plugin folder structure:
   ```
   quran-checker/
   ├── quran-checker-plugin.php   ← from wordpress/ folder
   └── app/                       ← contents of dist/
       ├── index.html
       ├── .htaccess
       ├── robots.txt
       └── manifest.json
   ```

3. Zip the `quran-checker/` folder → `quran-checker.zip`

4. In WordPress Admin:
   - Go to **Plugins → Add New → Upload Plugin**
   - Upload `quran-checker.zip`
   - Click **Activate**

5. Add to any page:
   ```
   [quran_checker]
   ```

6. Or in Gutenberg, search for **"Quran Checker"** block

### Method B: Embed via iframe

Upload `dist/` to a subdirectory, then embed anywhere in WordPress:

```html
<iframe
  src="https://yourdomain.com/quran-checker/index.html"
  width="100%"
  height="100vh"
  style="border:none; border-radius:12px;"
  allow="microphone; autoplay"
  title="Quran Recitation Checker">
</iframe>
```

Or use shortcode: `[quran_checker mode="iframe" height="900px"]`

### Method C: Standalone page alongside WordPress

1. Upload `dist/` to `public_html/quran-checker/`
2. Link from WordPress menu:
   - Appearance → Menus → Custom Link
   - URL: `https://yourdomain.com/quran-checker/`
   - Label: `Quran Checker`

### WordPress .htaccess Conflict Fix

If WordPress `.htaccess` is at root and conflicts, add this to WordPress's `.htaccess`
**before** the WordPress rules:

```apache
# Quran Checker app — handle separately
RewriteCond %{REQUEST_URI} ^/quran-checker/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^quran-checker/(.*)$ /quran-checker/index.html [L]
```

---

## 4. Configure DNS & Domain

Update your domain's DNS settings:

| Type  | Host | Value              | TTL  |
|-------|------|--------------------|------|
| A     | @    | YOUR.SERVER.IP     | 3600 |
| A     | www  | YOUR.SERVER.IP     | 3600 |
| CNAME | quran| yourdomain.com     | 3600 |

Replace `YOUR.SERVER.IP` with your cPanel hosting IP (found in cPanel → Server Information).

---

## 5. Enable HTTPS / SSL

### Free SSL via cPanel (Let's Encrypt)

1. cPanel → **SSL/TLS** → **Let's Encrypt SSL**
2. Select your domain → **Install**
3. Uncomment HTTPS redirect in `.htaccess`:
   ```apache
   RewriteCond %{HTTPS} off
   RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

### Cloudflare SSL (Free)

1. Sign up at cloudflare.com → Add your site
2. Set SSL mode to **"Full (Strict)"**
3. Enable **"Always Use HTTPS"**
4. Add Cloudflare nameservers to your domain registrar

---

## 6. Google AdSense Setup

1. Sign up at **google.com/adsense**
2. Add your site and verify ownership (add verification meta tag to `index.html`)
3. Wait for AdSense approval (usually 1–7 days)
4. Once approved, uncomment in `index.html`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
   ```
5. Replace `ca-pub-XXXXXXXXXXXXXXXX` with your Publisher ID
6. Uncomment ad units in the HTML where marked with `<!-- ADSENSE AD UNIT -->`
7. Rebuild and redeploy

### Ad Placement Strategy

| Position          | Format           | Expected RPM |
|-------------------|------------------|--------------|
| Top banner        | 728×90 leaderboard | High       |
| After results     | 300×250 rectangle  | Very High  |
| Sidebar           | 300×600 half-page  | High       |
| Bottom sticky     | 728×90 leaderboard | Medium     |

---

## 7. Google Analytics Setup

1. Go to **analytics.google.com** → Create Account
2. Create a Property → Web → enter your domain
3. Get your **Measurement ID** (format: `G-XXXXXXXXXX`)
4. Uncomment in `index.html`:
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```
5. Replace `G-XXXXXXXXXX` with your Measurement ID

---

## 8. SEO Verification

### Google Search Console

1. Go to **search.google.com/search-console**
2. Add Property → enter your domain
3. Choose **HTML Tag** verification method
4. Copy the verification code and replace in `index.html`:
   ```html
   <meta name="google-site-verification" content="YOUR_GOOGLE_VERIFICATION_TOKEN" />
   ```
5. Rebuild and redeploy → Click Verify

### Bing Webmaster Tools

1. Go to **bing.com/webmasters**
2. Add your site → get verification token
3. Replace in `index.html`:
   ```html
   <meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_TOKEN" />
   ```

### Submit Sitemap

1. Create `public/sitemap.xml`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://yourdomain.com/</loc>
       <lastmod>2024-01-01</lastmod>
       <changefreq>weekly</changefreq>
       <priority>1.0</priority>
     </url>
   </urlset>
   ```
2. Submit to Google Search Console → Sitemaps

### Update Canonical URLs

Replace all instances of `https://yourdomain.com` in `index.html` with your actual domain before deploying.

---

## 9. Performance Optimization

### Cloudflare CDN (Free)

1. Add site to Cloudflare
2. Enable **Caching** → Cache Level: Standard
3. Enable **Minify** → JS, CSS, HTML
4. Enable **Brotli** compression
5. Enable **HTTP/2** and **HTTP/3**

### cPanel Performance Settings

In cPanel → **Optimize Website**:
- Enable compression for all content types

### Speed Test

After deployment, test at:
- **PageSpeed Insights**: pagespeed.web.dev
- **GTmetrix**: gtmetrix.com
- **WebPageTest**: webpagetest.org

---

## 10. Troubleshooting

### ❌ Blank page after upload

**Cause:** Browser caching old files
**Fix:** Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### ❌ "404 Not Found" on refresh

**Cause:** `.htaccess` not uploaded or mod_rewrite not enabled
**Fix:**
1. Check `.htaccess` is in `public_html/`
2. Enable mod_rewrite in cPanel → Apache Handlers
3. Contact hosting support to enable AllowOverride All

### ❌ Microphone not working

**Cause:** HTTP (not HTTPS) or missing permission headers
**Fix:**
1. Install SSL certificate (HTTPS required for microphone)
2. Add to `.htaccess`:
   ```apache
   Header always set Permissions-Policy "microphone=(self)"
   ```

### ❌ Arabic audio not playing

**Cause:** CORS blocked by browser on HTTP
**Fix:** Must use HTTPS. The audio comes from `everyayah.com` which requires secure context.

### ❌ API errors (Quran text not loading)

**Cause:** Hosting firewall blocking outbound requests to `api.alquran.cloud`
**Fix:** Contact hosting support and ask them to whitelist outbound connections to:
- `api.alquran.cloud`
- `everyayah.com`

### ❌ WordPress theme CSS conflicts

**Cause:** WordPress theme CSS overriding app styles
**Fix:** Use iframe mode: `[quran_checker mode="iframe"]`

### ❌ Speech recognition not working

**Cause:** Browser not supported (Firefox, IE)
**Fix:** Use Google Chrome or Microsoft Edge. The Web Speech API requires these browsers.

---

## 📞 Quick Deployment Checklist

- [ ] `npm run build` completed successfully
- [ ] `dist/` contents uploaded to server
- [ ] `.htaccess` file uploaded (check "Show Hidden Files" in File Manager)
- [ ] SSL/HTTPS active on domain
- [ ] Google Analytics ID added
- [ ] AdSense Publisher ID added (after approval)
- [ ] Google Search Console verified
- [ ] Sitemap submitted
- [ ] `yourdomain.com` replaced in `index.html` meta tags
- [ ] Microphone permission header added in `.htaccess`
- [ ] Test recording works in Chrome
- [ ] Test audio playback works for reciters

---

*Built with React + Vite + Tailwind CSS. Deploys as static HTML — no server-side code required.*
