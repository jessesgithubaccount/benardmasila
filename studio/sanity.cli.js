import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'YOUR_PROJECT_ID',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // The Studio is served from /masila, so its JS/CSS must load from there too.
  project: { basePath: '/masila' },
})
