export default {
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Name',
      type: 'string',
      description: 'Shown as a filter button on the site, e.g. Battery Engineering',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'order',
      title: 'Sort order',
      type: 'number',
      description: 'Optional. Lower numbers appear first in the filter bar. Leave empty to sort A to Z.',
    },
  ],
  orderings: [
    { title: 'Sort order', name: 'order', by: [{ field: 'order', direction: 'asc' }, { field: 'title', direction: 'asc' }] },
    { title: 'Name A to Z', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
  ],
  preview: { select: { title: 'title' } },
}
