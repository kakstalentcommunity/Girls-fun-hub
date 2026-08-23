# Girls Fun Hub JavaScript MVP

Girls Fun Hub is a polished JavaScript entertainment and community website for adult women 18 years or older. It includes games, quizzes, challenges, polls, lifestyle articles, entertainment content, community posts, profiles, notifications, search, moderation reports, and an admin panel.

This version intentionally uses JavaScript instead of PHP. It is built with:

- Vanilla Node.js HTTP server
- Vanilla browser JavaScript
- HTML5 and CSS3
- JSON file persistence in `data/db.json`


## Requirements

- Node.js 20 or newer
- A modern browser

## Installation

```bash
npm install
npm start
```


        |-- css/style.css
        |-- js/app.js
        `-- images/hero-visual.svg
```

## Security Notes

This is a local MVP, not a production security boundary. It includes hashed passwords, HTTP-only cookies, CSRF checks, input validation, output escaping in the client, no public email exposure, and admin authorization checks. Before production, add HTTPS, persistent server-side sessions, rate limiting backed by durable storage, file upload scanning, stronger logging, legal policies, backups, and a real database.

## Deploying

For shared hosting, use a provider that supports Node.js apps. Start with `node server.js` and point the web process at the configured `PORT`. For static-only hosting, the API-backed features will not work.

Vercel serverless deployments cannot write to files inside the deployed project directory. This app detects Vercel and writes the generated JSON database to temp storage so the app can boot, but temp storage is not durable and can reset between cold starts or instances. Use a real database before relying on production user-generated content.

## Changing Branding And Colors

Edit CSS custom properties at the top of `public/assets/css/style.css`. The main tokens are `--primary`, `--primary-strong`, `--secondary`, `--violet`, `--gold`, `--bg`, and `--panel`.

## Adding Content

Use the admin panel at `#/admin` after logging in as admin.

You can also edit `data/seed.json` before the first run:

- Add games in the `games` array.
- Add Truth or Dare prompts in `game_prompts`.
- Add quizzes in `quizzes`.
- Add articles in `articles`.
- Add polls in `polls`.
- Add challenges in `challenges`.

After editing seed data, delete `data/db.json` and restart the server.
