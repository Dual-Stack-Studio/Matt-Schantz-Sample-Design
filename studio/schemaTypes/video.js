import {defineType, defineField} from 'sanity'

// The videos live on YouTube; the site only needs the link and a title.
export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube link',
      type: 'url',
      description: 'Paste the link of the video, for example https://www.youtube.com/watch?v=XXXXXXXXXXX',
      validation: (r) =>
        r.required().custom((value) =>
          !value || /(youtu\.be\/|youtube\.com\/(watch\?v=|embed\/|shorts\/))[\w-]{11}/.test(value) ? true : 'This does not look like a YouTube video link.',
        ),
    }),
    defineField({name: 'date', title: 'Date (optional)', type: 'date', description: 'Newest videos are shown first.'}),
  ],
  preview: {select: {title: 'title', subtitle: 'youtubeUrl'}},
})
