# Instagram OAuth Integration Setup

## What I've Created

✅ **API Routes:**
- `/api/auth/instagram` - Redirects to Instagram login
- `/api/auth/instagram/callback` - Handles OAuth callback

✅ **Database:**
- `instagram_connections` table - Stores user's Instagram account data
- RLS policies - Secure access control

✅ **Components:**
- `InstagramConnect.tsx` - Login/Disconnect button in Settings

✅ **Configuration:**
- `.env.local` - Placeholder for credentials

---

## Steps You Need to Do

### 1. Setup on Meta Developer Dashboard

**Go to:** https://developers.facebook.com/apps/

**Create or find your app:**
- Click your app name
- Go to **Settings** → **Basic**
- **Copy and save:**
  - App ID
  - App Secret

### 2. Add Instagram Product

**In your app:**
- Click **+ Add Product** (left sidebar)
- Search for **Instagram Graph API**
- Click **Set Up**

### 3. Configure Redirect URI

**In Instagram settings:**
- Go to **Settings** → **Basic**
- Scroll to "Instagram App Roles"
- Add **Redirect URI:**
```
http://localhost:3000/api/auth/instagram/callback
```

(For production: `https://yourdomain.com/api/auth/instagram/callback`)

### 4. Get Permissions

**Request these permissions:**
- `instagram_business_account`
- `user_profile`

### 5. Add Your Test Account

**Important for development:**
- Go to **Roles** → **Test Users**
- Click **+ Add Test Users**
- Add your Instagram business account email
- Accept the invitation from Instagram

### 6. Update .env.local

**Open:** `/Users/edyvanmix/Claude/viralstat-dashboard/.env.local`

**Replace:**
```
INSTAGRAM_APP_ID=YOUR_INSTAGRAM_APP_ID
INSTAGRAM_APP_SECRET=YOUR_INSTAGRAM_APP_SECRET
```

**With your actual credentials:**
```
INSTAGRAM_APP_ID=1234567890
INSTAGRAM_APP_SECRET=abc123def456xyz789
```

### 7. Run Database Migration

**In Supabase Dashboard:**
1. Go to **SQL Editor**
2. Click **New Query**
3. Copy content from: `instagram-setup.sql`
4. Click **Run**

(This creates the `instagram_connections` table)

### 8. Test It

1. Go to **Settings** page
2. Look for **Instagram Account** section
3. Click **Connect Instagram**
4. Login with your Instagram business account
5. Authorize the app
6. Should redirect back with username showing

---

## File Locations

```
/src/app/api/auth/instagram/route.ts          (login redirect)
/src/app/api/auth/instagram/callback/route.ts (oauth callback)
/src/components/settings/InstagramConnect.tsx (button component)
/instagram-setup.sql                          (database schema)
/.env.local                                   (credentials)
```

---

## Common Issues

**"Application is not active"**
- Your app isn't in Live mode yet
- Go to Settings → Basic → App Mode
- Change to Live (or use Test Users)

**"Invalid redirect URI"**
- Make sure redirect URI in Meta matches exactly
- Check for trailing slashes

**"Token failed"**
- App Secret is wrong
- App isn't in right status (Live or Test User added)

**Database error**
- Run the SQL migration in Supabase
- Make sure `instagram_connections` table exists

---

## Next Steps

Once setup is complete:
1. The InstagramConnect button appears in Settings
2. Users can connect/disconnect Instagram
3. Username displays when connected
4. Token is securely stored for API calls

Later enhancements:
- Display Instagram posts in dashboard
- Schedule content
- Get insights data
- Multi-account management
