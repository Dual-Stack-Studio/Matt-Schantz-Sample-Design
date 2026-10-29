import {defineType, defineField, defineArrayMember} from 'sanity'

// One photography project: it becomes a card in the carousel and a full page of photos.
export const project = defineType({
  name: 'project',
  title: 'Photography project',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', description: 'For example: Yellowstone National Park', validation: (r) => r.required()}),
    defineField({name: 'subtitle', title: 'Small line under the title', type: 'string', description: 'For example: Winter 24/25 or 10/27/24'}),
    defineField({name: 'date', title: 'Date', type: 'date', description: 'Used to order the projects: the newest goes first.', validation: (r) => r.required()}),
    defineField({
      name: 'cover',
      title: 'Cover photo',
      type: 'image',
      description: 'The card in the carousel and the big image at the top of the project. A wide photo works best.',
      options: {hotspot: false},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'blurb',
      title: 'Short text (optional)',
      type: 'text',
      rows: 3,
      description: 'A sentence or two shown at the top of the project. If you leave it empty, the site writes a simple one for you.',
    }),
    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      description: 'Drag the photos here (you can drop many at once) and drag them up or down to change the order.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'photo',
          title: 'Photo',
          fields: [
            defineField({name: 'image', title: 'Photo', type: 'image', validation: (r) => r.required()}),
            defineField({name: 'caption', title: 'Caption (optional)', type: 'string'}),
          ],
          preview: {select: {title: 'caption', media: 'image'}, prepare: ({title, media}) => ({title: title || 'Photo', media})},
        }),
      ],
      options: {layout: 'grid'},
    }),
  ],
  orderings: [{title: 'Newest first', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', subtitle: 'subtitle', media: 'cover'},
  },
})
