# 🏁 MusicCloud Deployment Checklist (Vercel)

Follow these steps to get your website live.

## 1. Prepare your GitHub Repository
Vercel works best when connected to GitHub. You need to push these specific files and folders to a new repository:

### ✅ Essential Folders to include:
- `backend/` (The entire folder)
- `frontend/` (The entire folder)
- `api/` (Contains the `index.js` file I created)

### ✅ Essential Files to include:
- `vercel.json` (Root configuration)
- `package.json` (Root package file)
- `package-lock.json`
- `.gitignore`

---

## 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New** > **Project**.
3. Import your GitHub repository.
4. **Project Settings**:
   - **Framework Preset**: Vercel should auto-detect "Other" or "Vite".
   - **Root Directory**: Ensure this is set to `./` (the root).
5. **Environment Variables**:
   Open the **Environment Variables** tab and add the following keys from your local `.env`:
   - `MONGODB_URI`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `JWT_SECRET` (Use a different, strong random string for production)
   - `ASSEMBLYAI_API_KEY`

6. Click **Deploy**!

---

## 3. Verify the Deployment
Once finished, Vercel will give you a URL (e.g., `musiccloud.vercel.app`).
1. Open the URL.
2. Try to log in or create an account.
3. Check the **Network** tab in your browser (F12) to ensure requests to `/api/...` are returning `200 OK`.

---

## 🛠 Troubleshooting
- **Database Connection Error**: In your MongoDB Atlas dashboard, go to **Network Access** and ensure your IP Whitelist includes `0.0.0.0/0` (Allow Access from Anywhere) so Vercel can connect.
- **Build Errors**: Check the build logs in Vercel to see if any Node.js dependencies are missing.
