'use strict'

import { delayQueue } from './delay-queue.js'
import { UNKNOWN } from '../../converter'

const indexedTimers = new Map()
let queue

onmessage = (event) => {
    const data = event.data.split(',')
    if (data.length > 1 /* init */) {
        const A = parseFloat(data[0])
        const B = parseFloat(data[1])
        queue = delayQueue(A, B)
    } else {
        const i = parseInt(data[0])
        if (i > UNKNOWN /* new tx */) {
            indexedTimers.set(
                i,
                queue.schedule(() => {
                    postMessage(i.toString())
                    indexedTimers.delete(i)
                })
            )
        } /* seen tx */ else {
            const abs = Math.abs(i)
            queue.cancel(indexedTimers.get(abs))
            indexedTimers.delete(abs)
        }
    }
}
