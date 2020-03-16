'use strict'

const node = require('./node')

const log = message => {
    const el = document.createElement('div')
    el.innerHTML = message
    document.getElementById('log').appendChild(el)
}
const logCount = (id, count) =>
    (document.getElementById(id).innerText = count.toString())

const test = node({
    numberOfPeers: 3,
    peermatcherConfiguration: {
        url: 'ws://localhost:3030',
        reconnectTimeoutDelay: 1000,
    },
    peerConnectionConfiguration: {
        iceServers: [
            {
                urls: ['stun:stun3.l.google.com:19302'],
            },
        ],
        heartbeatIntervalDelay: 3000,
    },
})

test.launch(socket => {
    const onSocketOpen = () => log('Peermatcher socket is open.')
    const onSocketClose = ({ code, reason }) =>
        log(
            `Peermatcher socket closed with error code ${code}.${
                reason ? ` Reason: ${reason}` : ``
            }`
        )
    socket.addEventListener('open', onSocketOpen)
    socket.addEventListener('close', onSocketClose)

    return (error, peer, i) => {
        if (error) {
            log(`Channel #${i} error: ${error.message}`)
            return
        }

        let receivedCount = 0
        let sentCount = 0
        peer.dataChannel.onopen = () => {
            log(`Data channel #${i} is open.`)
            peer.setInterval(() => {
                if (peer.dataChannel.readyState === 'open') {
                    peer.dataChannel.send('ping')
                }
                logCount(`sent${i}`, ++sentCount)
            }, 1)
        }
        peer.dataChannel.onmessage = () =>
            logCount(`received${i}`, ++receivedCount)
        peer.dataChannel.onclose = () => log(`Data channel #${i} is closed.`)
    }
})
