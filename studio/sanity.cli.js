import {defineCliConfig} from 'sanity/cli'
import {PROJECT_ID, DATASET} from './env'

export default defineCliConfig({
  api: {projectId: PROJECT_ID, dataset: DATASET},
  studioHost: 'matt-schantz', // the dashboard will live at https://matt-schantz.sanity.studio
  deployment: {appId: 't303myqosd9yoneomw9klzp9'},
})
