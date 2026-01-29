# Park Operations

Internal staff app for valve lookup and management. Built with Next.js App Router, TypeScript, and Tailwind CSS.

## Features

- 🔐 Google Workspace authentication with domain restriction
- 📊 Google Sheets integration for valve and zone data
- 🔍 Searchable valve list with filters
- 📱 Mobile-friendly responsive design
- 📲 Progressive Web App (PWA) support for Android
- ⚡ 10-minute caching to prevent API rate limits
- 🗺️ Google Maps integration for valve locations

## Local Setup

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Platform account
- Google Workspace account (for OAuth)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

3. Fill in all environment variables in `.env.local` (see configuration sections below)

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Google Sheets API (Service Account)
GOOGLE_SHEETS_ID=your-google-sheets-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"

# Google OAuth (Workspace)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth
AUTH_SECRET=generate-a-random-secret-here-use-openssl-rand-base64-32

# Domain Restriction
ALLOWED_DOMAIN=yourcompany.com
```

### Google Cloud Setup

#### 1. Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Sheets API"
5. Click **Enable**

#### 2. Create Service Account

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the service account details:
   - Name: `park-ops-sheets-reader` (or your preferred name)
   - Description: "Service account for reading valve data from Google Sheets"
4. Click **Create and Continue**
5. Skip role assignment (optional) and click **Done**

#### 3. Generate Service Account Key

1. Click on the newly created service account
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Download the key file
6. Extract the following from the JSON file:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY` (keep the `\n` sequences)

#### 4. Share Google Sheet with Service Account

1. Open your Google Sheet
2. Click **Share** button
3. Add the service account email (from `GOOGLE_SERVICE_ACCOUNT_EMAIL`)
4. Give it **Viewer** permissions
5. Copy the Sheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - Use `{SHEET_ID}` as `GOOGLE_SHEETS_ID`

### Google Sheets Format

Your Google Sheet must have exactly two tabs with these headers:

#### Tab 1: "Valve Sheet"
Headers (must match exactly):
- `Valve` (PRIMARY ID)
- `Location`
- `Location Notes`
- `Function`

#### Tab 2: "Zone Sheet"
Headers (must match exactly):
- `Zone`
- `Lot #`
- `Valve`

The app joins these sheets by matching the `Valve` column.

### Google Workspace OAuth Setup

#### 1. Create OAuth 2.0 Client

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - User Type: **Internal** (for Workspace users only)
   - App name: "Park Operations"
   - Support email: your email
   - Scopes: Add `https://www.googleapis.com/auth/userinfo.email` and `https://www.googleapis.com/auth/userinfo.profile`
4. Back to OAuth client creation:
   - Application type: **Web application**
   - Name: "Park Operations Web Client"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)
5. Click **Create**
6. Copy the **Client ID** → `GOOGLE_CLIENT_ID`
7. Copy the **Client secret** → `GOOGLE_CLIENT_SECRET`

#### 2. Generate AUTH_SECRET

Run this command to generate a secure random secret:

```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

Copy the result to `AUTH_SECRET` in your `.env.local`.

#### 3. Set ALLOWED_DOMAIN

Set `ALLOWED_DOMAIN` to your company's email domain (e.g., `yourcompany.com`). Only users with emails ending in `@yourcompany.com` will be able to sign in.

## Deployment to Vercel

### Prerequisites

- Vercel account (sign up at [vercel.com](https://vercel.com))
- GitHub repository (push your code to GitHub)

### Steps

1. **Push code to GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/park-ops.git
git push -u origin main
```

2. **Import project to Vercel**

   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**

   - In Vercel project settings, go to **Environment Variables**
   - Add all variables from your `.env.local`:
     - `GOOGLE_SHEETS_ID`
     - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
     - `GOOGLE_PRIVATE_KEY` (paste the full key with `\n` sequences)
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `AUTH_SECRET`
     - `ALLOWED_DOMAIN`

4. **Update OAuth Redirect URI**

   - In Google Cloud Console, add your Vercel domain to authorized redirect URIs:
     - `https://your-project.vercel.app/api/auth/callback/google`
   - If using a custom domain:
     - `https://yourdomain.com/api/auth/callback/google`

5. **Deploy**

   - Vercel will automatically deploy on push to main branch
   - Or click **Deploy** in the Vercel dashboard

6. **Update PWA Manifest** (optional)

   - If using a custom domain, update `start_url` in `public/manifest.webmanifest`

## Installing PWA on Android

### Method 1: Automatic Install Prompt

1. Open the app in Chrome on your Android device
2. If an "Install App" button appears at the bottom-right, tap it
3. Confirm the installation
4. The app icon will appear on your home screen

### Method 2: Manual Installation

1. Open the app in Chrome on your Android device
2. Tap the menu (three dots) in the top-right corner
3. Select **"Add to Home screen"** or **"Install app"**
4. Confirm the installation
5. The app icon will appear on your home screen

### Requirements

- Android device with Chrome browser
- App accessed over HTTPS (or localhost for development)
- Valid manifest file (already configured)

## Project Structure

```
park-ops/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts  # NextAuth handler
│   │   └── valves/
│   │       ├── route.ts                 # GET /api/valves
│   │       └── [valveId]/route.ts       # GET /api/valves/[id]
│   ├── components/
│   │   ├── Header.tsx                   # App header with auth
│   │   └── InstallButton.tsx            # PWA install button
│   ├── install/
│   │   └── page.tsx                     # Install instructions
│   ├── valves/
│   │   ├── page.tsx                     # Valve list page
│   │   └── [valveId]/page.tsx           # Valve detail page
│   ├── layout.tsx                       # Root layout
│   └── page.tsx                         # Home page
├── lib/
│   ├── auth.ts                          # NextAuth configuration
│   ├── data.ts                          # Data join & caching logic
│   └── sheets.ts                        # Google Sheets API client
├── middleware.ts                        # Auth middleware
├── public/
│   ├── manifest.webmanifest             # PWA manifest
│   └── icons/                           # PWA icons (generate these)
└── .env.example                         # Environment variable template
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Caching

The app uses in-memory caching with a 10-minute TTL:
- Data is fetched from Google Sheets on first request
- Subsequent requests within 10 minutes use cached data
- If a fetch fails, the last cached data is returned with a `stale: true` flag
- Cache is shared across all requests (server-side)

### Troubleshooting

**Authentication not working:**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check that redirect URI matches exactly in Google Cloud Console
- Ensure `AUTH_SECRET` is set and consistent

**Sheets API errors:**
- Verify service account email has access to the sheet
- Check that `GOOGLE_PRIVATE_KEY` has `\n` sequences preserved
- Ensure Google Sheets API is enabled in Google Cloud Console
- Verify sheet tab names match exactly: "Valve Sheet" and "Zone Sheet"

**PWA not installable:**
- Ensure app is served over HTTPS (or localhost)
- Check that `manifest.webmanifest` is accessible
- Verify icons exist in `public/icons/` directory
- Test on Android Chrome (iOS Safari has limited PWA support)

## License

Internal use only.
