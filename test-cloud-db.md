# Testing Cloud Database Locally

## Step 1: Get Your Railway Database URL
1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project
4. Add MySQL database
5. Copy the Prisma connection string

## Step 2: Test Locally
1. Create a temporary `.env` file with your Railway URL:
   ```
   DATABASE_URL="your_railway_database_url_here"
   ```

2. Run these commands:
   ```bash
   npx prisma db push
   npx prisma generate
   npm start
   ```

3. If it works locally, then add the URL to Vercel

## Step 3: Add to Vercel
1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Add DATABASE_URL with your Railway URL

## Step 4: Redeploy
1. Go to Vercel dashboard
2. Click "Redeploy"
3. Check if it works

## Alternative: Use PlanetScale
If Railway is confusing:
1. Go to https://planetscale.com
2. Sign up for free
3. Create database
4. Get connection string
5. Add to Vercel

