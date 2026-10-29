import {defineType, defineField, defineArrayMember} from 'sanity'

// A piece of writing. The text editor offers only what the site can show: paragraphs, subheads, quotes, bold and italic.
export const writing = defineType({
  name: 'writing',
  title: 'Writing',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'date', title: 'Date', type: 'date', validation: (r) => r.required()}),
    defineField({name: 'tag', title: 'Tag (optional)', type: 'string', description: 'A small word above the title, for example Essay, Notes or Road.'}),
    defineField({
      name: 'excerpt',
      title: 'Short preview (optional)',
      type: 'text',
      rows: 3,
      description: 'Shown in the list. If you leave it empty, the first lines of the text are used.',
    }),
    defineField({
      name: 'body',
      title: 'Text',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Paragraph', value: 'normal'},
            {title: 'Subhead', value: 'h2'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
            ],
            annotations: [],
          },
        }),
        defineArrayMember({
          type: 'image',
          fields: [defineField({name: 'caption', title: 'Caption', type: 'string'})],
        }),
      ],
      validation: (r) => r.required(),
    }),
  ],
  orderings: [{title: 'Newest first', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {select: {title: 'title', subtitle: 'date'}},
})
