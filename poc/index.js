'use strict'

import { node } from './node'

const log = message => {
    const el = document.createElement('div')
    el.innerHTML = message
    document.getElementById('log').appendChild(el)
}
const logCount = (id, count) =>
    (document.getElementById(id).innerText = count.toString())

const test = node({
    numberOfPeers: 3,
    signalingServers: [
        'ws://localhost:3030',
        'ws://localhost:3030',
        'ws://localhost:3030',
    ],
    iceServers: [
        {
            urls: ['stun:stun3.l.google.com:19302'],
        },
    ],
    heartbeatDelay: 10000,
    A: 1,
    B: 1000,
})

const peers = []
test.launch((error, peer, i) => {
    if (error) {
        log(`Channel #${i} error: ${error.message}`)
        return
    }
    peer.dataChannel.onopen = () => log(`Data channel #${i} is open.`)
    peer.dataChannel.onclose = () => log(`Data channel #${i} is closed.`)
    peers[i] = peer
})

const broadcastChannel = new BroadcastChannel('ict')
let numberOfBroadcastChannelMessages = 0
broadcastChannel.onmessage = () => numberOfBroadcastChannelMessages++

let index = 0
setInterval(() => {
    for (let i = 0; i < 100; i++) {
        test.broadcast(index++)
    }
}, 1000)

const step = () => {
    peers.forEach((peer, i) => {
        if (peer) {
            logCount(`received${i}`, peer.numberOfReceivedTransactions)
            logCount(`sent${i}`, peer.numberOfSentTransactions)
        } else {
            logCount(`received${i}`, 0)
            logCount(`sent${i}`, 0)
        }
    })
    logCount('received-bc', numberOfBroadcastChannelMessages)
    logCount('sent-bc', numberOfBroadcastChannelMessages)
    const info = test.getNodeInfo()
    logCount('number-of-seen-transactions', info.numberOfSeenTransactions)
    logCount(
        'number-of-enqueued-transactions',
        info.numberOfEnqueuedTransactions
    )
    requestAnimationFrame(step)
}

requestAnimationFrame(step)
