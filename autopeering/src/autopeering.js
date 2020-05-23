'use strict'

export const NUMBER_OF_PEERS = 3

export const autopeering = properties => {
    const { cooldownDuration, reconnectDelay, tiebreakerValue, tiebreakerIntervalDuration } = properties
    const peers = Array(NUMBER_OF_PEERS)
    for (let i = 0; i < NUMBER_OF_PEERS; i++) {
        peers[i] = {}
    }

    return {
        peers,
        launch(receive) {
            const tiebreaker = (() => {
                const numberOfNewTransactions = Array(NUMBER_OF_PEERS).fill(0)
                return setInterval(() => {
                    peers.forEach((peer, i) => {
                        peer.rateOfNewTransactions =
                            (peer.numberOfNewTransactions - numberOfNewTransactions[i]) /
                            tiebreakerIntervalDuration
                        numberOfNewTransactions[i] = peer.numberOfNewTransactions
                    })

                    const [a, b] = peers
                        .slice()
                        .sort((a, b) => b.rateOfNewTransactions - a.rateOfNewTransactions)

                    if (a.rateOfNewTransactions - b.rateOfNewTransactions >= tiebreakerValue) {
                        a.skip()
                    }
                }, tiebreakerIntervalDuration * 1000)
            })()

            const discover = peer => {
                Object.assign(peer, {
                    uptime: 0,
                    numberOfInboundTransactions: 0,
                    numberOfOutboundTransactions: 0,
                    numberOfNewTransactions: 0,
                    rateOfNewTransactions: 0,
                })

                let heartbeat
                let alive = false
                const onopen = () => {
                    peer.startTime = Date.now()
                    heartbeat = setInterval(
                        () => (alive ? (alive = false) : peer.skip()),
                        cooldownDuration * 1000
                    )
                }

                const onpacket = packet => {
                    alive = true
                    peer.latestActivityTime = Date.now()
                    if (peer.startTime === undefined) {
                        peer.startTime = peer.latestActivityTime
                    }
                    peer.uptime = peer.latestActivityTime - peer.startTime
                    receive(packet, peer)
                }

                let reconnect
                const skip = () => {
                    if (reconnect === undefined) {
                        peer.terminate()
                        reconnect = setTimeout(() => discover(peer), reconnectDelay)
                    }
                }

                const specialPeer = properties.peer(onopen, onpacket, skip)

                const terminate = () => {
                    if (typeof specialPeer.terminate === 'function') {
                        specialPeer.terminate()
                    }
                    clearTimeout(reconnect)
                    clearInterval(heartbeat)
                    clearInterval(tiebreaker)
                }

                Object.assign(peer, specialPeer, {
                    terminate,
                    skip,
                })
            }

            peers.forEach(peer => discover(peer))
        },
        terminate() {
            peers.forEach(peer => peer.terminate())
        },
    }
}
