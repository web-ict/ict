'use strict'

import { autopeering } from '../../autopeering'
import { dissemination } from '../../dissemination'
import { tangle } from '../../tangle'
import { transaction, TRANSACTION_LENGTH, HASH_LENGTH } from '../../transaction'
import { sizeInBytes, lengthInTrits, bytesToTrits, tritsToBytes } from '../../converter'

export const node = function (properties) {
    let numberOfInboundTransactions
    let numberOfOutboundTransactions
    let numberOfInvalidTransactions
    let numberOfNewTransactions
    const peering = autopeering(properties.autopeering)
    const disseminator = dissemination(properties.dissemination)
    const subtangle = tangle(properties.subtangle)
    const { Curl729_27, tiebreakerValue } = properties

    const entangle = (trits) => {
        const i = subtangle.put(transaction(Curl729_27, trits))
        if (i === 0) {
            // Invalid tx
            numberOfInvalidTransactions++
        } else if (i > 0) {
            // New tx
            numberOfNewTransactions++
            numberOfInboundTransactions++
            disseminator.postMessage(i, trits)
        } else {
            // Seen tx
            numberOfInboundTransactions++
            disseminator.postMessage(i)
        }
        return i
    }

    const sender = (trits) => {
        let numberOfSkippedTrits = 0
        for (; numberOfSkippedTrits < TRANSACTION_LENGTH; numberOfSkippedTrits++) {
            if (trits[numberOfSkippedTrits] !== 0) {
                while (numberOfSkippedTrits % HASH_LENGTH !== 0) {
                    numberOfSkippedTrits--
                }
                break
            }
        }

        const packet = new ArrayBuffer(sizeInBytes(TRANSACTION_LENGTH - numberOfSkippedTrits))
        tritsToBytes(packet, numberOfSkippedTrits, TRANSACTION_LENGTH - numberOfSkippedTrits, packet, 0)

        peering.peers.forEach((peer) =>
            peer.send(packet, () => {
                numberOfOutboundTransactions++
                peer.numberOfOutboundTransactions++
            })
        )
    }

    const receiver = (packet, peer) => {
        const trits = new Int8Array(TRANSACTION_LENGTH).fill(0)
        bytesToTrits(packet, 0, packet.byteLength, trits, TRANSACTION_LENGTH - lengthInTrits(packet.byteLength))

        const i = entangle(trits)
        if (i === 0) {
            peer.skip()
        } else if (i > 0) {
            peer.numberOfInboundTransactions++
            peer.numberOfNewTransactions++
            peer.uptime = Date.now() - peer.startTime
            peer.rateOfNewTransactions = numberOfNewTransactions / Math.max(peer.uptime, 1)

            const [a, b] = peers.slice().sort((a, b) => b.rateOfNewTransactions - a.rateOfNewTransactions)
            if (a === peer && a.rateOfNewTransactions - b.rateOfNewTransactions >= tiebreakerValue) {
                peer.skip()
            }
        } else {
            peer.numberOfInboundTransactions++
        }
    }

    return {
        info() {
            const numberOfTransactionsToPropagate = disseminator.info()

            return {
                numberOfInboundTransactions,
                numberOfOutboundTransactions,
                numberOfNewTransactions,
                numberOfSeenTransactions: numberOfInboundTransactions - numberOfNewTransactions,
                numberOfInvalidTransactions,
                numberOfTransactionsToPropagate,
                peering: peering.info(),
            }
        },
        launch() {
            numberOfInboundTransactions = 0
            numberOfOutboundTransactions = 0
            numberOfInvalidTransactions = 0
            numberOfNewTransactions = 0
            disseminator.launch(sender)
            peering.launch(receiver)
        },
        entangle: (trits) => entangle(trits),
        terminate() {
            peering.terminate()
            disseminator.terminate()
            tangle.clear()
        },
    }
}
