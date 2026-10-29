// Left-hand menu: "Site texts" is a single page (not a list), the rest are lists.
export const structure = (S) =>
  S.list()
    .title('Matt Schantz')
    .items([
      S.listItem()
        .title('Site texts and settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings').title('Site texts and settings')),
      S.divider(),
      S.documentTypeListItem('project').title('Photography projects'),
      S.documentTypeListItem('video').title('Videos'),
      S.documentTypeListItem('writing').title('Writing'),
    ])
