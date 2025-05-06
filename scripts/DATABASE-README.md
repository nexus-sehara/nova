# Nova App Database Setup

This guide will help you set up your database for the Nova App.

## Option 1: Using Docker (Recommended)

The easiest way to set up the database is using Docker with our provided script:

```bash
./scripts/setup-database.sh
```

This script will:
1. Start a PostgreSQL container
2. Configure the database settings
3. Update your `.env` file with the proper `DATABASE_URL`
4. Run Prisma migrations to set up your database schema

## Option 2: Manual Setup

If you prefer to use an existing PostgreSQL installation:

1. Create a new PostgreSQL database:
   ```sql
   CREATE DATABASE nova_db;
   ```

2. Set up your `.env` file using our script:
   ```bash
   ./scripts/setup-env.sh
   ```
   When prompted, enter your database connection URL in the format:
   ```
   postgresql://USER:PASSWORD@HOST:PORT/DATABASE
   ```

3. Run Prisma migrations to set up your database schema:
   ```bash
   npx prisma migrate dev --name initial
   ```

## Database Structure

The Nova App uses the following main tables:

- `PixelEvent`: Stores web pixel tracking events from Shopify stores
- `ShopifyEvent`: A more detailed version of pixel events with additional metadata
- `PixelSession`: Tracks user sessions across multiple pages/events
- `ProductView`: Records when a product is viewed
- `CartEvent`: Records cart operations (add, remove, update)
- `Order`: Stores completed order information
- `ProductRecommendation`: Stores generated product recommendations

## Troubleshooting

If you encounter issues with database setup:

1. Ensure PostgreSQL is running
2. Check your `.env` file has the correct `DATABASE_URL`
3. Verify you have the right permissions to access the database
4. Make sure Prisma is installed: `npm install @prisma/client prisma`

For Docker-specific issues:
- Check Docker is running: `docker ps`
- Check the status of your container: `docker logs nova-postgres` 