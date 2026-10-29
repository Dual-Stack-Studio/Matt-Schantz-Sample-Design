import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {PROJECT_ID, DATASET} from './env'

export default defineConfig({
  name: 'default',
  title: 'Matt Schantz',
  projectId: PROJECT_ID,
  dataset: DATASET,
  plugins: [structureTool({structure}), visionTool()],
  schema: {types: schemaTypes},
})
