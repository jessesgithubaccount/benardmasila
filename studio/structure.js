// Customizes the left-hand navigation of the Studio.
// Docs: https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Blog Posts')
        .schemaType('post')
        .child(
          S.documentList()
            .title('Blog Posts')
            .schemaType('post')
            .filter('_type == "post"')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
        ),
      S.listItem()
        .title('Categories')
        .schemaType('category')
        .child(S.documentTypeList('category').title('Categories')),
      S.divider(),
      S.listItem()
        .title('Featured Post')
        .child(
          S.documentList()
            .title('Featured Post')
            .schemaType('post')
            .filter('_type == "post" && featured == true')
        ),
    ])
