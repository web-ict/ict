import wrtc from 'wrtc'
import { autopeering as Autopeering } from './src/autopeering.js'

export { signalingServer } from './src/signaling-server.js'
export const autopeering = Autopeering(wrtc)
