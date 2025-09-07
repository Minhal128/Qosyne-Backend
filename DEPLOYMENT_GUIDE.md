# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally
   ```bash
   npm i -g vercel
   ```

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Vercel
```bash
vercel
```

### 4. Set Environment Variables

In your Vercel dashboard, go to **Settings > Environment Variables** and add:

#### **Required Environment Variables:**
```env
DATABASE_URL=your_production_database_url
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
```

#### **Optional Environment Variables:**
```env
# Rapyd API (for cross-wallet transfers)
RAPYD_ACCESS_KEY=your_rapyd_access_key
RAPYD_SECRET_KEY=your_rapyd_secret_key
RAPYD_BASE_URL=https://sandboxapi.rapyd.net

# Payment Gateways
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
BRAINTREE_MERCHANT_ID=your_braintree_merchant_id
BRAINTREE_PUBLIC_KEY=your_braintree_public_key
BRAINTREE_PRIVATE_KEY=your_braintree_private_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
WISE_API_KEY=your_wise_api_key
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_APPLICATION_ID=your_square_application_id

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Database Setup

### Option 1: PlanetScale (Recommended)
1. Sign up at [planetscale.com](https://planetscale.com)
2. Create a new database
3. Get your connection string
4. Set as `DATABASE_URL` in Vercel

### Option 2: Railway
1. Sign up at [railway.app](https://railway.app)
2. Create a MySQL database
3. Get your connection string
4. Set as `DATABASE_URL` in Vercel

### Option 3: Supabase
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your PostgreSQL connection string
4. Update `prisma/schema.prisma` to use PostgreSQL
5. Set as `DATABASE_URL` in Vercel

## Database Migration

After setting up your production database:

1. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Run Migrations**:
   ```bash
   npx prisma db push
   ```

## Deployment Files

### `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "installCommand": "npm install",
        "buildCommand": "npm run build"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### `package.json` Scripts
```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "build": "prisma generate",
    "postinstall": "prisma generate"
  }
}
```

## Troubleshooting

### Prisma Client Error
If you see: `PrismaClientInitializationError: Prisma has detected that this project was built on Vercel`

**Solution**: The `build` script in `package.json` and `buildCommand` in `vercel.json` should fix this.

### Database Connection Error
If you see: `P1001: Can't reach database server`

**Solution**: 
1. Check your `DATABASE_URL` in Vercel environment variables
2. Ensure your database is accessible from Vercel's servers
3. Use a cloud database service (PlanetScale, Railway, Supabase)

### Environment Variables Not Working
**Solution**:
1. Redeploy after adding environment variables
2. Check variable names match exactly
3. Ensure no spaces in values

## API Endpoints

After deployment, your API will be available at:
```
https://your-project-name.vercel.app/api/auth/register
https://your-project-name.vercel.app/api/auth/login
https://your-project-name.vercel.app/api/wallet-integration/wallets
https://your-project-name.vercel.app/api/wallet-integration/transactions/transfer
```

## Monitoring

1. **Vercel Dashboard**: Monitor deployments and logs
2. **Function Logs**: Check serverless function logs
3. **Database Monitoring**: Monitor your database performance

## Security Notes

1. **Never commit `.env` files**
2. **Use strong JWT secrets**
3. **Enable HTTPS** (automatic with Vercel)
4. **Set up CORS** for your frontend domain
5. **Use environment variables** for all secrets

## Next Steps

1. **Test all endpoints** after deployment
2. **Set up custom domain** (optional)
3. **Configure webhooks** for payment providers
4. **Set up monitoring** and alerts
5. **Configure CI/CD** for automatic deployments


