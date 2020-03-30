'use strict'

import { delayQueue } from '../disseminator'

const broadcastChannel = new BroadcastChannel('ict')
const seenTransactions = new Set()
const enqueuedTransactions = new Map()
let queue

const init = ({ A, B, delayQueueWatermark }) => {
    queue = delayQueue(A, B)
    queue.watermark = delayQueueWatermark
    setInterval(
        () =>
            postMessage({
                type: 'info',
                numberOfSeenTransactions: seenTransactions.size,
                numberOfEnqueuedTransactions: enqueuedTransactions.size,
            }),
        1000
    )
}

const transaction = index => {
    if (seenTransactions.has(index)) {
        queue.cancel(enqueuedTransactions.get(index))
        enqueuedTransactions.delete(index)
    } else if (
        enqueuedTransactions.size <
        (queue.watermark || Number.POSITIVE_INFINITY)
    ) {
        seenTransactions.add(index)
        enqueuedTransactions.set(
            index,
            queue.schedule(() => {
                postMessage(index)
                broadcastChannel.postMessage(index)
                enqueuedTransactions.delete(index)
            })
        )
    }
}

broadcastChannel.onmessage = ({ data }) => transaction(data)

onmessage = ({ data: { command, ...params } }) => {
    switch (command) {
        case 'init':
            init(params)
        case 'transaction':
            transaction(params.index)
    }
}
