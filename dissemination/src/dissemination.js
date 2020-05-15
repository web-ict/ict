'use strict'
import Worker from './dissemination.worker.js'

export const dissemination = function ({ A, B }) {
    const indexedMessages = new Map()
    let worker

    return {
        launch(sender) {
            worker = new Worker()
            worker.postMessage([A, B].toString())
            worker.onmessage = ({ data }) => {
                const i = parseInt(data)
                const m = indexedMessages.get(i)
                if (m !== undefined) {
                    indexedMessages.delete(i)
                    sender(m)
                }
            }
        },
        terminate() {
            worker.terminate()
            indexedMessages.clear()
        },
        postMessage(i, m) {
            if (i > 0) {
                indexedMessages.set(i, m)
            } else {
                indexedMessages.delete(Math.abs(i))
            }
            worker.postMessage(i.toString())
        },
        info: () => indexedMessages.size,
    }
}
