'use strict'

import { autopeering } from '../../autopeering'
import { dissemination } from '../../dissemination'
import { tangle } from '../../tangle'
import { transaction, TRANSACTION_LENGTH, HASH_LENGTH } from '../../transaction'
import { sizeInBytes, lengthInTrits, bytesToTrits, tritsToBytes, FALSE, UNKNOWN } from '../../converter'

export const node = function (properties) {
    const { Curl729_27 } = properties
    const peering = autopeering(properties.autopeering)
    const { peers } = peering
    const disseminator = dissemination(properties.dissemination)
    const subtangle = tangle(properties.subtangle)
    let numberOfInboundTransactions
    let numberOfOutboundTransactions
    let numberOfNewTransactions
    let numberOfInvalidTransactions
    let numberOfIxiTransactions

    const entangle = (trits) => {
        const tx = transaction(Curl729_27, trits)

        if (tx === FALSE) {
            // Invalid tx
            numberOfInvalidTransactions++
            return UNKNOWN
        }

        const i = subtangle.put(tx)

        if (i > UNKNOWN) {
            // New tx
            numberOfInboundTransactions++
            numberOfNewTransactions++
            disseminator.postMessage(i, trits)
        } else {
            // Seen tx
            numberOfInboundTransactions++
            disseminator.postMessage(i)
        }

        return i
    }

    const send = (trits) => {
        let firstNonZeroTritOffset = 0
        for (; firstNonZeroTritOffset < TRANSACTION_LENGTH; firstNonZeroTritOffset++) {
            if (trits[firstNonZeroTritOffset] !== UNKNOWN) {
                break
            }
        }
        const numberOfSkippedTrits = Math.floor(firstNonZeroTritOffset / HASH_LENGTH) * HASH_LENGTH
        const packet = new ArrayBuffer(sizeInBytes(TRANSACTION_LENGTH - numberOfSkippedTrits))
        tritsToBytes(trits, numberOfSkippedTrits, TRANSACTION_LENGTH - numberOfSkippedTrits, packet, 0)

        peers.forEach((peer) => {
            if (peer.send(packet)) {
                numberOfOutboundTransactions++
                peer.numberOfOutboundTransactions++
            }
        })
        numberOfOutboundTransactions++
    }

    const receive = (packet, peer) => {
        if (lengthInTrits(packet.byteLength) % HASH_LENGTH === 0) {
            const trits = new Int8Array(TRANSACTION_LENGTH).fill(0)
            bytesToTrits(packet, 0, packet.byteLength, trits, TRANSACTION_LENGTH - lengthInTrits(packet.byteLength))

            const i = entangle(trits, packet)

            if (i === UNKNOWN) {
                peer.skip()
            } else {
                if (i > UNKNOWN) {
                    peer.numberOfNewTransactions++
                }
                peer.numberOfInboundTransactions++
            }
        } else {
            // TODO: debug issue of extra packets in firefox
            // peer.skip()
        }
    }

    return {
        info: () => ({
            numberOfInboundTransactions,
            numberOfOutboundTransactions,
            numberOfNewTransactions,
            numberOfSeenTransactions: numberOfInboundTransactions - numberOfNewTransactions,
            numberOfInvalidTransactions,
            numberOfIxiTransactions,
            numberOfTransactionsToPropagate: disseminator.info(),
            subtangle: subtangle.info(),
            peers: peers.map((peer) => ({
                startTime: peer.startTime,
                latestActivityTime: peer.latestActivityTime,
                uptime: peer.uptime,
                numberOfInboundTransactions: peer.numberOfInboundTransactions,
                numberOfOutboundTransactions: peer.numberOfOutboundTransactions,
                numberOfNewTransactions: peer.numberOfNewTransactions,
                numberOfSeenTransactions: peer.numberOfInboundTransactions - peer.numberOfNewTransactions,
                rateOfNewTransactions: peer.rateOfNewTransactions,
            })),
        }),
        launch() {
            numberOfInboundTransactions = 0
            numberOfOutboundTransactions = 0
            numberOfNewTransactions = 0
            numberOfInvalidTransactions = 0
            numberOfIxiTransactions = 0
            disseminator.launch(send)
            peering.launch(receive)
        },
        ixi: {
            entangle: (trits) => {
                numberOfIxiTransactions++
                entangle(trits)
            },
        },
        terminate() {
            peering.terminate()
            disseminator.terminate()
            tangle.clear()
        },
    }
}
