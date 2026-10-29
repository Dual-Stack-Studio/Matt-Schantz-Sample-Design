# Matt Schantz, redesign sample

Sample redesign of mattschantz.com, designed and built by Dual-Stack Studio.

Plain HTML, CSS and JavaScript, no build step. Serve the folder with any static server, for example:

    npx http-server -c-1

The photos and video frames are temporary material taken from Matt's public site, and the texts in Writing are placeholders. Music: "Valley Sunset" from Mixkit.

## Dark / light

The pill in the top bar (and next to Close inside the project and reading pages) switches the look. The dark look is `style.css`, the light look is `light.css`; the switch swaps the stylesheet in place with a circular reveal and remembers the choice in the browser. `?theme=light` in the address opens the light look directly. The footer photo changes with the look (two images, each look hides the other). `light.css` is a full copy, so a change to the design has to be made in both sheets.
