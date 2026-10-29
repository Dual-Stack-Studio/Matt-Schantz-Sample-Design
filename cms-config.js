// Connection to the Sanity dashboard. While projectId is empty the site shows the content that is built into the files
// (data.js, the texts in index.html and assets/writings), exactly as before.
// Paste the project id from https://www.sanity.io/manage (the same one as in studio/env.js) and the site starts reading from Sanity.
window.SANITY = { projectId: 'db7bbxau', dataset: 'production' };
