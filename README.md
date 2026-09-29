# Benard Masila blog, Studio at /masila

```
index.html, styles.css, script.js   the site (posts load from Sanity)
studio/                             Sanity Studio, built into ./masila
import/posts.tar.gz                 your 3 existing posts, now with images
_redirects | vercel.json | netlify.toml   hosting config (use the one for your host)
```

After setup, `yourdomain.com/masila` is the admin. Log in, create a post,
press Publish, and it shows on the site on the next page load.

## 1. Project ID

You need a Sanity project ID (sanity.io/manage). If you have none yet:
`cd studio && npm install && npx sanity login && npx sanity projects create`
(or create it on sanity.io/manage and add a `production` dataset).

Put the ID in two places:

- `script.js`: `SANITY_PROJECT_ID = "..."`
- `studio/.env`: copy `.env.example` to `.env` and fill it in

## 2. Build the Studio into /masila

```bash
cd studio
npm install
npm run build        # writes the Studio to ../masila
```

Deploy the whole folder as usual (the new `masila/` folder goes with it).
If your host builds for you (Netlify, Vercel), set
`SANITY_STUDIO_PROJECT_ID` as an environment variable there and it runs the
same build automatically.

## 3. Two settings on sanity.io/manage > API > CORS origins

| Origin | Allow credentials |
|---|---|
| `https://yourdomain.com` | **Yes** (lets you log in to /masila) |
| `http://localhost:3333` | Yes (only for `npm run dev`) |

The public site only reads published posts, which needs no token.

## 4. Import the existing posts (once)

```bash
cd studio
npx sanity login
npm run import       # replaces the 3 seed posts by ID, images included
```

Run this once only. Re-running overwrites those three posts.

## Notes

- Deep links to the Studio (for example refreshing on `/masila/structure/post`)
  need the rewrite in `_redirects` / `vercel.json`. On hosts without
  rewrites (plain GitHub Pages), open `/masila` and navigate from there.
- Local preview of the admin: `cd studio && npm run dev`, then open
  `http://localhost:3333/masila`.
- Unpublished drafts never appear on the site. Only Publish does.
