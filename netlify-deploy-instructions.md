# Manual Netlify Deployment Instructions

## Step 1: Download the Build Files
The `dist` folder contains all the files you need to deploy.

## Step 2: Deploy to Netlify
1. Go to [app.netlify.com](https://app.netlify.com)
2. Sign in to your Netlify account
3. Click "Add new site" → "Deploy manually"
4. Drag and drop the entire `dist` folder onto the deployment area
5. Wait for the deployment to complete

## Step 3: Add Your Custom Domain
Once deployed:
1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain name
4. Follow the DNS configuration steps

## Step 4: Configure DNS
Choose one option:

### Option A: Use Netlify DNS (Recommended)
1. Click "Set up Netlify DNS"
2. Update your domain's nameservers to the ones Netlify provides
3. Wait 24-48 hours for propagation

### Option B: Keep Your Current DNS Provider
Add these records to your DNS:
- A record: `@` pointing to `75.2.60.5`
- CNAME record: `www` pointing to your new Netlify subdomain

## Files Included
- All built React application files
- `_redirects` file for proper SPA routing
- Optimized assets and bundles

Your UnblockedHub site will be fully functional with all features including:
- Game management (admin mode with "admin123")
- Real-time sync if Supabase is connected
- Responsive design
- All keyboard shortcuts