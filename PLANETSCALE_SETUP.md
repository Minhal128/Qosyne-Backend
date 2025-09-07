# PlanetScale Database Setup for Vercel

## Step 1: Create PlanetScale Account
1. Go to [planetscale.com](https://planetscale.com)
2. Sign up for free account
3. Create a new database

## Step 2: Get Database URL
1. In PlanetScale dashboard, go to your database
2. Click "Connect"
3. Select "Prisma" from the connection options
4. Copy the connection string

## Step 3: Set Environment Variable in Vercel
1. Go to your Vercel project dashboard
2. Navigate to **Settings > Environment Variables**
3. Add new variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your PlanetScale connection string
   - **Environment**: Production (and Preview if needed)

## Step 4: Deploy Database Schema
1. Update your local `.env` file with PlanetScale URL
2. Run database migration:
   ```bash
   npx prisma db push
   ```
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

## Step 5: Redeploy to Vercel
1. Push your changes to GitHub
2. Vercel will automatically redeploy
3. Check the deployment logs for success

## Alternative: Railway Database
If you prefer Railway:
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add MySQL database
4. Get connection string
5. Set as `DATABASE_URL` in Vercel

## Alternative: Supabase (PostgreSQL)
If you prefer PostgreSQL:
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get connection string
4. Update `prisma/schema.prisma` to use PostgreSQL
5. Set as `DATABASE_URL` in Vercel


