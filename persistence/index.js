import level from 'level'
import { createPersistence } from './src/persistence.js'

export const persistence = createPersistence(level)
