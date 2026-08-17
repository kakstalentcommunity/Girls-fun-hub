# Girls Fun Hub JavaScript MVP

Girls Fun Hub is a polished JavaScript entertainment and community website for adult women 18 years or older. It includes games, quizzes, challenges, polls, lifestyle articles, entertainment content, community posts, profiles, notifications, search, moderation reports, and an admin panel.

This version intentionally uses JavaScript instead of PHP. It is built with:

- Vanilla Node.js HTTP server
- Vanilla browser JavaScript
- HTML5 and CSS3
- JSON file persistence in `data/db.json`
- No external dependencies
- No emoji content

## Requirements

- Node.js 20 or newer
- A modern browser

## Installation

```bash
npm install
npm start
```

There are no package dependencies, so `npm install` is optional. The site runs at:

```text
http://localhost:3000
```

Change the port with:

```bash
$env:PORT=4000; npm start
```

## Database Setup

The runnable app uses a local JSON database:

- `data/seed.json` contains demo content.
- `data/db.json` is generated automatically on first run.

To reset local data, stop the server, delete `data/db.json`, and start the server again.

`database.sql` is included as a reference schema for teams that want to migrate the JavaScript MVP to MySQL later. It is not required to run this project.

## Demo Accounts

Admin:

```text
Username: admin
Email: admin@girlsfunhub.local
Password: ChangeMe-Admin-2026
```

Demo members:

```text
Mira / mira@example.com
Jade / jade@example.com
Nina / nina@example.com
Password for all demo members: ChangeMe-User-2026
```

Set safer initial passwords before first run:

```bash
$env:GFH_ADMIN_PASSWORD="replace-this-admin-password"
$env:GFH_DEMO_PASSWORD="replace-this-demo-password"
npm start
```

If `data/db.json` already exists, delete it before changing these setup passwords.

## Features Implemented

- Responsive navigation with mobile menu
- Dark mode stored in `localStorage`
- Registration with adult confirmation and date-of-birth age check
- Login, logout, HTTP-only session cookie, password hashing with Node `crypto.scrypt`
- CSRF token checks on protected write actions
- Home page with featured games, quizzes, daily challenge, feed, and polls
- Interactive Would You Rather voting
- Truth or Dare prompt generation
- Never Have I Ever responses
- Spin the Wheel interaction
- Clue Challenge without emojis
- Quiz system with result saving
- Poll voting with duplicate prevention
- Challenge participation
- Lifestyle article listing and article pages
- Entertainment sample content
- Community posts, comments, likes, delete-own-post, and reports
- Public and editable profiles
- Notifications for likes, comments, and challenge joins
- Global search across games, quizzes, articles, polls, and posts
- Admin dashboard for users, reports, posts, games, quizzes, articles, polls, and challenges
- Friendly 404, 403, and 500 pages
- `robots.txt` and `sitemap.xml`

## Folder Structure

```text
girls-fun-hub-js/
|-- server.js
|-- package.json
|-- README.md
|-- database.sql
|-- data/
|   |-- seed.json
|   `-- db.json
`-- public/
    |-- index.html
    |-- 403.html
    |-- 404.html
    |-- 500.html
    |-- robots.txt
    |-- sitemap.xml
    `-- assets/
        |-- css/style.css
        |-- js/app.js
        `-- images/hero-visual.svg
```

## Security Notes

This is a local MVP, not a production security boundary. It includes hashed passwords, HTTP-only cookies, CSRF checks, input validation, output escaping in the client, no public email exposure, and admin authorization checks. Before production, add HTTPS, persistent server-side sessions, rate limiting backed by durable storage, file upload scanning, stronger logging, legal policies, backups, and a real database.

## Deploying

For shared hosting, use a provider that supports Node.js apps. Start with `node server.js` and point the web process at the configured `PORT`. For static-only hosting, the API-backed features will not work.

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
