import level from 'level'
import { createPersistence } from './src/persistence.js'

export { createPersistence }
export const persistence = createPersistence(level)
