# Matt Schantz: content dashboard (Sanity)

This folder is the dashboard where Matt adds and changes the content of the site. The website itself (the files one level up)
reads whatever is published here.

---

## For Matt: how to use it

Open the dashboard (the address Sebastian gives you, something like `https://matt-schantz.sanity.studio`) and sign in with your Google account.

Nothing changes on the site until you press **Publish** (bottom right). The site shows the change within a minute or so.

- **Photography projects**: *Create new*, write the title and the date, choose the cover photo, then drag all the photos into **Photos**
  (you can drop many at once). Drag them up or down to change the order. Press **Publish**. Newest date goes first.
- **Videos**: *Create new*, paste the YouTube link and write the title. Publish.
- **Writing**: *Create new*, write the title and the date, then the text. Use the style menu for subheads and quotes. Publish.
- **Site texts and settings**: the line under your name, the About text, the moving words, the places, your email and links.
- To remove something: open it, press the three dots next to Publish, then **Delete**.

Tips: photos around 2000 pixels on the long side are plenty (the dashboard makes the smaller versions by itself). JPEG or PNG both work.

---

## For Sebastian: setting it up (once)

1. Create a project at https://www.sanity.io/manage (free plan is enough). Copy its **Project ID**.
2. Paste the ID in two places (the dataset stays `production`):
   - `studio/env.js`
   - `cms-config.js` in the site folder (one level up)
3. In this folder:
   ```
   npm install
   npx sanity login
   npm run dev          # the dashboard at http://localhost:3333, to try it
   npm run deploy       # puts it online at https://matt-schantz.sanity.studio (asks for a name the first time)
   ```
4. Optional, to fill the dashboard with the sample content that is built into the site:
   ```
   npm run import
   ```
   (uploads the photos, videos, texts and the three sample writings; it can be run again safely.)
5. Invite Matt: https://www.sanity.io/manage > the project > **Members** > Invite (role **Editor**).
6. Commit and push the changes to `cms-config.js`. The site starts reading from Sanity.

### How the site and the dashboard are connected

- `cms-config.js` holds the project ID. While it is empty the site uses the content that is built into the files
  (`data.js`, `assets/`, the texts in `index.html`), exactly as before.
- `cms.js` runs first, asks Sanity for everything in one request, turns it into the shape the site already uses, and then starts the site.
  If Sanity does not answer within 6 seconds, the built-in content is used.
- Photos come from Sanity's image service, which makes the 640, 1200 and 1920 pixel versions on demand, so nothing has to be resized by hand.
- Project order: by date, newest first. Videos: by date (or creation time). Writing: by date.
- The music file (`assets/audio/valley-sunset.mp3`) is not in the dashboard; it is part of the site.
- The dashboard only shows published content to the site. Drafts stay private until Publish.

### If something looks wrong

- The site shows the old content: hard refresh (Ctrl+F5); GitHub Pages and the browser keep files for a few minutes.
- The site shows the sample content instead of Matt's: check the Project ID in `cms-config.js` and that the documents are **published**,
  not only saved as drafts. The browser console prints a warning when Sanity cannot be reached.
- If the site is on a different domain than before and the console mentions CORS, add the site's address under
  manage > API > CORS origins (no credentials needed for reading).
