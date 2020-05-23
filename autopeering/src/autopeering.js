/*
Permission is hereby granted, perpetual, worldwide, non-exclusive, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:



1. The Software cannot be used in any form or in any substantial portions for development, maintenance and for any other purposes, in the military sphere and in relation to military products, including, but not limited to:

a. any kind of armored force vehicles, missile weapons, warships, artillery weapons, air military vehicles (including military aircrafts, combat helicopters, military drones aircrafts), air defense systems, rifle armaments, small arms, firearms and side arms, melee weapons, chemical weapons, weapons of mass destruction;

b. any special software for development technical documentation for military purposes;

c. any special equipment for tests of prototypes of any subjects with military purpose of use;

d. any means of protection for conduction of acts of a military nature;

e. any software or hardware for determining strategies, reconnaissance, troop positioning, conducting military actions, conducting special operations;

f. any dual-use products with possibility to use the product in military purposes;

g. any other products, software or services connected to military activities;

h. any auxiliary means related to abovementioned spheres and products.



2. The Software cannot be used as described herein in any connection to the military activities. A person, a company, or any other entity, which wants to use the Software, shall take all reasonable actions to make sure that the purpose of use of the Software cannot be possibly connected to military purposes.



3. The Software cannot be used by a person, a company, or any other entity, activities of which are connected to military sphere in any means. If a person, a company, or any other entity, during the period of time for the usage of Software, would engage in activities, connected to military purposes, such person, company, or any other entity shall immediately stop the usage of Software and any its modifications or alterations.



4. Abovementioned restrictions should apply to all modification, alteration, merge, and to other actions, related to the Software, regardless of how the Software was changed due to the abovementioned actions.



The above copyright notice and this permission notice shall be included in all copies or substantial portions, modifications and alterations of the Software.



THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

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
