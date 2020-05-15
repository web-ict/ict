'use strict'

import { peer } from './peer.js'

export const NUMBER_OF_PEERS = 3

export const autopeering = properties => {
    let token = 0
    const step = () => token++
    const peers = Array(NUMBER_OF_PEERS).fill({})
    const signalingServersCopy = properties.signalingServers.slice()
    const signalingServersBuffer = []

    return {
        peers,
        launch(receiver) {
            for (let i = 0; i < NUMBER_OF_PEERS; i++) {
                peer(
                    properties,
                    signalingServersCopy,
                    signalingServersBuffer,
                    peers,
                    i,
                    step,
                    receiver
                )
            }
        },
        terminate() {
            for (let i = 0; i < NUMBER_OF_PEERS; i++) {
                peers[i].terminate()
            }
        },
        info: () =>
            peers.map(peer => ({
                startTime: peer.startTime,
                uptime: peer.uptime,
                numberOfInboundTransactions: peer.numberOfInboundTransactions,
                numberOfOutboundTransactions: peer.numberOfOutboundTransactions,
                numberOfNewTransactions: peer.numberOfNewTransactions,
                numberOfSeenTransactions:
                    peer.numberOfInboundTransactions -
                    peer.numberOfNewTransactions,
                rateOfNewTransactions: peer.rateOfNewTransactions,
            })),
    }
}
