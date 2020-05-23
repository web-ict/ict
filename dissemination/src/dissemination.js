'use strict'
import Worker from './dissemination.worker.js'
import { UNKNOWN } from '../../converter'

export const dissemination = function ({ A, B }) {
    const indexedMessages = new Map()
    let worker

    return {
        launch(send) {
            worker = new Worker()
            worker.postMessage([A, B].toString())
            worker.onmessage = ({ data }) => {
                const i = parseInt(data)
                const m = indexedMessages.get(i)
                if (m !== undefined) {
                    indexedMessages.delete(i)
                    send(m)
                }
            }
        },
        terminate() {
            worker.terminate()
            indexedMessages.clear()
        },
        postMessage(i, m) {
            if (i > UNKNOWN) {
                indexedMessages.set(i, m)
            } else {
                indexedMessages.delete(Math.abs(i))
            }
            worker.postMessage(i.toString())
        },
        info: () => indexedMessages.size,
    }
}
