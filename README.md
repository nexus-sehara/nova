# Nova App

A smartnova project for intelligent e-commerce recommendations.

## Getting Started

1. Clone the repository
   ```
   git clone https://github.com/smartnovaapp/nova.git
   cd nova
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Run the development server
   ```
   npm run dev
   ```

## Deployment to Render

This project is configured for deployment on Render.com using the `render.yaml` configuration file.

### Deployment Steps

1. Create a new account on [Render](https://render.com) if you don't have one.
2. Connect your GitHub repository to Render.
3. Render will automatically detect the `render.yaml` configuration.
4. Configure any environment variables needed in the Render dashboard.
5. Deploy your application.

### Environment Variables

Make sure to set up the following environment variables in your Render dashboard:

- `NODE_ENV`: Set to `production` for production deployments
- Add any other environment variables your application needs

### Continuous Deployment

Render supports continuous deployment. When you push to your GitHub repository, Render will automatically rebuild and deploy your application. 
