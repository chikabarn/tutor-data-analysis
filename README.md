# Data Career Trainer

A 34-week self-study website for moving from data analyst to analytics engineer:

- **PL-300** (Power BI Data Analyst), 8 weeks
- **Python, machine learning and automation**, 12 weeks
- **DP-600** (Fabric Analytics Engineer), 12 weeks
- **Portfolio and job search**, 2 weeks

Every week has videos, reading links, key ideas, a hands-on task and **20 quiz questions** (680 in total). With an Anthropic API key connected, each week also gets a full written lesson with exercises and answers, 5 fresh exam-style questions on demand, and an AI tutor.

Progress, notes and generated lessons are saved in your browser. Use **AI settings → Download backup** to move them to another device.

## Deploy in 10 minutes

### 1. Put it on GitHub
1. Create a new repository on GitHub (for example `data-career-trainer`).
2. Click **uploading an existing file**, drag in everything from this folder (including the `api`, `css` and `js` folders), and commit.

### 2. Launch on Vercel
1. Sign in at vercel.com with GitHub and click **Add New → Project**.
2. Import your repository. Leave the framework preset as **Other**; no build command is needed.
3. Click **Deploy**. The site works straight away, without AI.

### 3. Turn on AI features (optional)
1. Get an API key from the Anthropic Console (console.anthropic.com). API usage is billed separately from a Claude.ai subscription.
2. In Vercel, open your project → **Settings → Environment Variables** and add:
   - `ANTHROPIC_API_KEY`: your key
   - `ACCESS_CODE`: any private code. **Strongly recommended**: without it, anyone who finds your site can use your API credit.
3. Go to **Deployments**, open the latest one, and choose **Redeploy** so the variables take effect.
4. On the site, open **AI settings** and enter your access code.

To use a different model, add `CLAUDE_MODEL` with a model name from Anthropic’s docs.

## Project structure

```
index.html        Page layout
css/styles.css    Styles (light and dark mode)
js/data.js        Weeks, videos, reading links and the 680-question bank
js/app.js         The app: roadmap, lessons, quizzes, tutor, backups
api/claude.js     Vercel function that calls the Anthropic API with your key
```

## Editing content

All weeks and questions live in `js/data.js`. Each question looks like:

```js
{ "q": "Question text", "o": ["Option A", "Option B", "Option C", "Option D"], "a": 1, "w": "Why B is right" }
```

`a` is the position of the correct option, starting from 0.

## Run locally

Open `index.html` through any static server (for example `npx serve .`). For AI features locally, install the Vercel CLI, copy `.env.example` to `.env.local`, fill it in, and run `vercel dev`.
