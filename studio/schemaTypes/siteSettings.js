import {defineType, defineField, defineArrayMember} from 'sanity'

// The texts and small things that are not a project, a video or a piece of writing. There is only one of these.
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site texts and settings',
  type: 'document',
  groups: [
    {name: 'home', title: 'Home page', default: true},
    {name: 'about', title: 'About'},
    {name: 'contact', title: 'Contact and links'},
  ],
  fields: [
    defineField({
      name: 'heroImage',
      title: 'Main photo (top of the home page)',
      type: 'image',
      group: 'home',
      description: 'The big photo under your name. A wide photo where the face or the subject sits in the middle works best.',
    }),
    defineField({
      name: 'heroTagline',
      title: 'Line under your name',
      type: 'text',
      rows: 3,
      group: 'home',
      description: 'Press Enter to start a new line.',
    }),
    defineField({
      name: 'subjects',
      title: 'Subjects (the moving words)',
      type: 'array',
      group: 'home',
      of: [defineArrayMember({type: 'string'})],
      description: 'Short words or phrases that scroll across the page, for example Landscape Photography or Wildlife.',
    }),
    defineField({
      name: 'places',
      title: 'Places',
      type: 'array',
      group: 'home',
      of: [defineArrayMember({type: 'string'})],
      description: 'Place names shown in a grid. Twelve is a good number.',
    }),
    defineField({name: 'aboutHeading', title: 'Big sentence', type: 'text', rows: 2, group: 'about', description: 'Press Enter to start a new line.'}),
    defineField({name: 'aboutText', title: 'About text', type: 'text', rows: 8, group: 'about'}),
    defineField({name: 'email', title: 'Email address', type: 'string', group: 'contact', description: 'Shown in the contact window.'}),
    defineField({
      name: 'formEndpoint',
      title: 'Contact form address',
      type: 'url',
      group: 'contact',
      description: 'The web address of the service that forwards the messages to your email (Formspree, Getform, Web3Forms). Leave empty and the form only pretends to send.',
    }),
    defineField({name: 'instagramUrl', title: 'Instagram link', type: 'url', group: 'contact'}),
    defineField({name: 'youtubeUrl', title: 'YouTube channel link', type: 'url', group: 'contact'}),
  ],
  preview: {prepare: () => ({title: 'Site texts and settings'})},
})
