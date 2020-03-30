'use strict'

import { autopeering } from '../autopeering'

export const node = function({
    numberOfPeers,
    A,
    B,
    ...autopeeringProperties
}) {
    const peers = []
    const info = {
        numberOfSeenTransactions: 0,
        numberOfEnqueuedTransactions: 0,
    }
    const discover = autopeering(autopeeringProperties)
    let running = false
    let worker

    const onInboundMessage = ({ data }) =>
        worker.postMessage({ command: 'transaction', index: data })

    const onOutboundMessage = ({ data }) => {
        if (data) {
            if (data.type === 'info') {
                info.numberOfSeenTransactions = data.numberOfSeenTransactions
                info.numberOfEnqueuedTransactions =
                    data.numberOfEnqueuedTransactions
                return
            }
            peers.forEach(peer => {
                if (peer.dataChannel.readyState === 'open') {
                    peer.dataChannel.send(data)
                    peer.numberOfSentTransactions++
                }
            })
        }
    }

    const launch = callback => {
        if (!running) {
            running = true
            worker = new Worker('./worker.js')
            worker.postMessage({ command: 'init', A, B })
            worker.addEventListener('message', onOutboundMessage)

            const onPeer = i => (error, peer) => {
                if (peer) {
                    peer.numberOfSentTransactions = 0
                    peer.numberOfReceivedTransactions = 0
                    peer.dataChannel.addEventListener('message', data => {
                        onInboundMessage(data)
                        peer.numberOfReceivedTransactions++
                    })
                    peers[i] = peer
                }
                return callback(error, peer, i)
            }

            for (let i = 0; i < numberOfPeers; i++) {
                discover(onPeer(i))
            }
        }
    }

    const shutdown = () => {
        if (running) {
            running = false
            worker.terminate()
            peers.forEach(peer => peer.close())
            peers.length = 0
        }
    }

    const broadcast = index => onInboundMessage({ data: index })

    const getNodeInfo = () => info

    return {
        launch,
        shutdown,
        broadcast,
        getNodeInfo,
    }
}
