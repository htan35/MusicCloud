# MusicCloud Deployment Guide 🚀

This guide explains how to deploy your MusicCloud application to a live environment (e.g., Render, Railway, DigitalOcean).

## 1. Unified Deployment Strategy
The app is configured as a **Unified Build**. The Node.js/Express backend serves the React frontend as static files. This means you only need to deploy **one** service.

## 2. Prerequisites
- A **MongoDB Atlas** account (free tier works great).
- A **Cloudinary** account (for media storage).
- An **AssemblyAI** API key (optional, for AI synced lyrics).
- A hosting provider account.

## 3. Environment Variables
You must set these in your hosting provider's dashboard (NOT in a `.env` file for production):

| Variable | Description |
| :--- | :--- |
| `NODE_ENV` | Set to `production` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `JWT_SECRET` | A long, random string for security |
| `ASSEMBLYAI_API_KEY` | (Optional) For AI lyrics sync |

## 4. Deployment Steps

### Method A: Vercel (Recommended)
1.  **New Project**: Select your repository.
2.  **Monorepo Settings**: Vercel will auto-detect the configuration from the root `vercel.json`.
3.  **Environment Variables**: Add all variables from the table above.
4.  **Deploy**: Hit deploy. Ensure that the Root Directory is set to `./`.

### Method B: Render.com

### Method B: Railway.app
1.  **New Project**: Connect GitHub.
2.  **Root Directory**: Leave as default or point to `/backend` if it doesn't auto-detect.
3.  **Custom Build**: You may need a `railway.json` or simply use the same build/start commands as Render.

## 5. Post-Deployment Verification
Once your site is live:
1.  Check the logs to ensure MongoDB connected successfully.
2.  Try uploading a small song to verify Cloudinary integration.
3.  Verify that lyrics search and sync work correctly.

> [!TIP]
> Make sure your MongoDB Atlas "Network Access" is set to allow access from `0.0.0.0/0` (all IPs) so your hosting provider can connect.
