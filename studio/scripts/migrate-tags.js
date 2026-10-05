// One-off: turns each post's old text tags into Category documents and links them.
// Run:  cd studio && npx sanity exec scripts/migrate-tags.js --with-user-token
import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2024-01-01' })
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const posts = await client.fetch('*[_type == "post" && count(tags) > 0 && count(categories) == 0]{_id, tags}')
const names = [...new Set(posts.flatMap((p) => p.tags))]

for (const name of names) {
  await client.createIfNotExists({ _id: `category-${slugify(name)}`, _type: 'category', title: name })
}
for (const p of posts) {
  await client
    .patch(p._id)
    .set({ categories: p.tags.map((t) => ({ _type: 'reference', _key: slugify(t), _ref: `category-${slugify(t)}` })) })
    .commit()
}
console.log(`Created ${names.length} categories, updated ${posts.length} posts.`)
