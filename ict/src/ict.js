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

import { autopeering } from '@web-ict/autopeering'
import { dissemination } from '@web-ict/dissemination'
import { IXI } from '@web-ict/ixi'
import { tangle } from '@web-ict/tangle'
import {
    transaction,
    TRANSACTION_LENGTH,
    HASH_LENGTH,
    TRUNK_TRANSACTION_OFFSET,
    TAIL_FLAG_OFFSET,
    BRANCH_TRANSACTION_OFFSET,
} from '@web-ict/transaction'
import {
    sizeInBytes,
    lengthInTrits,
    bytesToTrits,
    tritsToBytes,
    trytes,
    FALSE,
    TRUE,
    UNKNOWN,
    TRITS_PER_ELEMENT,
    trytesToTrits,
} from '@web-ict/converter'
import { updateTransactionNonce } from '@web-ict/bundle'

export const ICT = function (properties) {
    const { Curl729_27 } = properties
    const peering = autopeering(properties.autopeering)
    const { peers } = peering
    const disseminator = dissemination(properties.dissemination)
    const subtangle = tangle(properties.subtangle)
    const listeners = new Set()
    let numberOfInboundTransactions
    let numberOfOutboundTransactions
    let numberOfNewTransactions
    let numberOfInvalidTransactions

    const requestedTransactions = new Set()

    const request = (hash) => {
        const packetTrits = new Int8Array(HASH_LENGTH + TRITS_PER_ELEMENT)
        trytesToTrits(hash, packetTrits, TRITS_PER_ELEMENT, HASH_LENGTH)
        const packet = new ArrayBuffer(sizeInBytes(packetTrits.length))
        tritsToBytes(packetTrits, 0, packetTrits.length, packet, 0)
        requestedTransactions.add(hash)
        peers.forEach((peer) => peer.send(packet))
    }

    const requestIfNeeded = (hash) => {
        if (subtangle.getTransaction(hash) === undefined && !requestedTransactions.has(hash)) {
            setTimeout(() => {
                if (subtangle.getTransaction(hash) === undefined) {
                    request(hash)
                }
            }, properties.dissemination.B)
        }
    }

    const entangle = (trits) => {
        const tx = transaction(Curl729_27, trits)
        requestedTransactions.delete(tx.hash)

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
            listeners.forEach((fn) => fn(tx))

            requestIfNeeded(tx.trunkTransaction)
            requestIfNeeded(tx.branchTransaction)
        } else {
            // Seen tx
            numberOfInboundTransactions++
            disseminator.postMessage(i)
        }

        return i
    }

    const send = (trits, peer) => {
        let firstNonZeroTritOffset = 0
        for (; firstNonZeroTritOffset < TRANSACTION_LENGTH; firstNonZeroTritOffset++) {
            if (trits[firstNonZeroTritOffset] !== UNKNOWN) {
                break
            }
        }
        const numberOfSkippedTrits = Math.floor(firstNonZeroTritOffset / HASH_LENGTH) * HASH_LENGTH
        const packet = new ArrayBuffer(sizeInBytes(TRANSACTION_LENGTH - numberOfSkippedTrits))
        tritsToBytes(trits, numberOfSkippedTrits, TRANSACTION_LENGTH - numberOfSkippedTrits, packet, 0)

        if (peer) {
            if (peer.send(packet)) {
                numberOfOutboundTransactions++
                peer.numberOfOutboundTransactions++
            }
        } else {
            peers.forEach((peer) => {
                if (peer.send(packet)) {
                    numberOfOutboundTransactions++
                    peer.numberOfOutboundTransactions++
                }
            })
        }
    }

    const receive = (packet, peer) => {
        const tritsLength = lengthInTrits(packet.byteLength)
        if (tritsLength === HASH_LENGTH + TRITS_PER_ELEMENT) {
            const trits = new Int8Array(HASH_LENGTH + TRITS_PER_ELEMENT)
            bytesToTrits(packet, 0, packet.byteLength, trits, 0)

            const requestedTransaction = subtangle.getTransaction(
                trytes(trits.slice(TRITS_PER_ELEMENT), 0, HASH_LENGTH)
            )
            if (requestedTransaction === undefined) {
                peers.forEach((peer2) => {
                    if (peer2 !== peer) {
                        //peer2.send(packet)
                    }
                })
            } else {
                send(requestedTransaction.trits, peer)
            }
        } else if (tritsLength % HASH_LENGTH === 0) {
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

            const trits = new Int8Array(TRANSACTION_LENGTH)
            trits[TRUNK_TRANSACTION_OFFSET + TAIL_FLAG_OFFSET] = TRUE
            trits[BRANCH_TRANSACTION_OFFSET + TAIL_FLAG_OFFSET] = TRUE
            updateTransactionNonce(Curl729_27)(trits, FALSE, TRUE, TRUE)
            subtangle.put(transaction(Curl729_27, trits))

            disseminator.launch(send)
            peering.launch(receive)
        },
        ixi: IXI({ subtangle, entangle, request, listeners, Curl729_27 }),
        terminate() {
            peering.terminate()
            disseminator.terminate()
            subtangle.clear()
        },
    }
}
