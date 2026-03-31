# Quick Deployment via Vercel + Localtunnel

Since the Ngrok download servers are currently throwing a `500 Internal Server Error` globally, we're going to use an even simpler alternative called **Localtunnel**!

Localtunnel acts as a secure, temporary bridge between your local `localhost:5000` Node server and the rest of the world. It is a pure Node application, meaning it won't crash trying to download weird third-party binaries!

### Step 1: Fire up the Localtunnel
You already have your frontend and backend servers running in your terminals. Now, open a **Brand New Terminal** window on your computer and run this exact command to install and start the tunnel:

```bash
npx localtunnel --port 5000
```


### Step 2: Grab your Public URL
Look closely at the terminal screen. You will see a line that says `your url is:` followed by a web address that looks something like this:
`https://moody-llamas-sing.loca.lt`

Highlight and **COPY** that entire `https://...` URL. That is your computer's temporary public backend address!

### Step 3: Getting Your Code into GitHub & Deploying
Vercel needs to read your code from a GitHub repository to deploy it automatically!

1. Go to [GitHub.com](https://github.com) and click **"New Repository"**. Name it `SyllabusGen` and leave everything blank (don't add a README).
2. Open a new terminal inside your root `sylgen` directory and run these exact commands (replace `YOUR_USERNAME` with your actual GitHub name):
```bash
git init
git add .
git commit -m "First commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/SyllabusGen.git
git push -u origin main
```
3. Now go to [Vercel.com](https://vercel.com) and click **"Add New Project"**.
4. You will instantly see your `SyllabusGen` repository! Click **Import**.
5. **Framework Preset:** Vite (it should auto-detect this).
6. **Root Directory:** Make sure you click "Edit" and choose the `client` folder.
7. **Environment Variables:**
   - **Name:** `VITE_API_URL`
   - **Value:** *[Paste that newly copied Localtunnel URL here!]*
8. Click **Deploy!**

### Step 4: Keep Your Computer Awake!
For anyone on the internet to use your new Vercel website, you must leave the following three things open and running on your personal computer:
1. `npm run dev` (Frontend) -- *Technically optional because Vercel is hosting it now, but good for local testing.*
2. `npm start server` (Backend)
3. `lt --port 5000` (The Tunnel)

**Important note:** The *first time* a user loads your new Vercel website, Localtunnel might show them a "Click to Continue" security screen. They just need to click the blue button to access the API!
