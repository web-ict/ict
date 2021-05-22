import wrtc from 'wrtc'
import { autopeering as createAutopeering } from './src/autopeering.js'

export { signalingServer } from './src/signaling-server.js'
export const autopeering = createAutopeering(wrtc)
export { createAutopeering }
