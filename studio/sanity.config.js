import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'
import { structure } from './structure'

export default defineConfig({
  name: 'default',
  title: 'Benard Masila | Blog Admin',

  // Set in studio/.env (see .env.example) or as a build environment variable.
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'YOUR_PROJECT_ID',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  // The Studio lives at yourdomain.com/masila
  basePath: '/masila',

  plugins: [
    structureTool({ structure }),
    visionTool(), // test GROQ queries inside the Studio, safe to remove
  ],

  schema: {
    types: schemaTypes,
  },
})
