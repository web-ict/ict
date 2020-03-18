'use strict'

const peermatcher = require('../peermatcher')
const autopeering = require('./autopeering')

const node = function({
    numberOfPeers,
    peermatcherConfiguration,
    peerConnectionConfiguration,
}) {
    const peermatcherClient = peermatcher.client(peermatcherConfiguration)
    const peers = []

    const launch = callback => {
        peermatcherClient.connect(socket => {
            const discover = autopeering(
                peermatcherClient.signaling,
                peerConnectionConfiguration
            )
            const peerCallback = callback(socket)
            const peerConnection = i => (error, peer) => {
                if (peer) {
                    peers[i] = peer
                }
                return peerCallback(error, peer, i)
            }

            for (let i = 0; i < numberOfPeers; i++) {
                discover(peerConnection(i))
            }
        })
    }

    const shutdown = () => {
        peermatcherClient.disconnect(3001 /* Going away... */)
        peers.forEach(peer => peer.close())
        peers.length = 0
    }

    return {
        peermatcherClient,
        launch,
        shutdown,
    }
}

module.exports = node
