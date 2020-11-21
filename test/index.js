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

import { node } from '@web-ict/node'
import { WebRTC_Peer, signalingClient } from '@web-ict/autopeering'
import {
    TRANSACTION_LENGTH,
    NULL_HASH,
    TRUNK_TRANSACTION_OFFSET,
    BRANCH_TRANSACTION_OFFSET,
    TRANSACTION_NONCE_OFFSET,
    TRANSACTION_NONCE_LENGTH,
    HASH_LENGTH,
    TYPE_OFFSET,
    TAIL_FLAG_OFFSET,
    HEAD_FLAG_OFFSET,
    BUNDLE_NONCE_OFFSET,
    MESSAGE_OR_SIGNATURE_OFFSET,
    BUNDLE_NONCE_LENGTH,
} from '@web-ict/transaction'
import { integerValueToTrits, FALSE, TRUE } from '@web-ict/converter'

import('@web-ict/curl').then(({ Curl729_27 }) => {
    const test = node({
        autopeering: {
            peer: WebRTC_Peer({
                iceServers: [
                    {
                        urls: ['stun:stun3.l.google.com:19302'],
                    },
                ],
                signalingChannel: signalingClient({
                    signalingServers: ['ws://localhost:3030', 'ws://localhost:3030', 'ws://localhost:3030'],
                }),
            }),
            cooldownDuration: 10, // In seconds
            reconnectDelay: 1,
            tiebreakerIntervalDuration: 10,
            tiebreakerValue: Number.POSITIVE_INFINITY, // New transactions / second
        },
        dissemination: {
            A: 1, // In milliseconds
            B: 1000,
        },
        subtangle: {
            capacity: 1000000, // In transactions
            pruningScale: 10000,
            timestampLowerBoundDelta: 90, // In seconds
            timestampUpperBoundDelta: 90,
        },
        Curl729_27,
    })
    test.launch()

    setInterval(routine(test.ixi, Curl729_27), 1000)

    const step = () => {
        const info = test.info()

        info.peers.forEach((peer, i) => {
            logCount(`uptime-${i}`, formatDuration(peer.uptime))
            logCount(`number-of-inbound-transactions-${i}`, peer.numberOfInboundTransactions)
            logCount(`number-of-outbound-transactions-${i}`, peer.numberOfOutboundTransactions)
            logCount(`number-of-new-transactions-${i}`, peer.numberOfNewTransactions)
            logCount(`number-of-seen-transactions-${i}`, peer.numberOfSeenTransactions)
            logCount(`rate-of-new-transactions-${i}`, peer.rateOfNewTransactions)
        })

        logCount('number-of-inbound-transactions', info.numberOfInboundTransactions)
        logCount('number-of-outbound-transactions', info.numberOfOutboundTransactions)
        logCount('number-of-new-transactions', info.numberOfNewTransactions)
        logCount('number-of-seen-transactions', info.numberOfSeenTransactions)
        logCount('number-of-invalid-transactions', info.numberOfInvalidTransactions)
        logCount('number-of-ixi-transactions', info.numberOfIxiTransactions)
        logCount('number-of-transactions-to-propagate', info.numberOfTransactionsToPropagate)

        requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
})

function routine(ixi, Curl729_27) {
    let index = 0
    const hashes = [NULL_HASH.slice()]
    const maxNumberOfAttempts = 81

    return () => {
        const trits = new Int8Array(TRANSACTION_LENGTH)
        integerValueToTrits(index++, trits, MESSAGE_OR_SIGNATURE_OFFSET)
        for (let offset = 0; offset < BUNDLE_NONCE_LENGTH; offset++) {
            trits[BUNDLE_NONCE_OFFSET + offset] = Math.floor(Math.random() * 3 - 1)
        }
        trits.set(hashes[Math.floor(Math.random() * hashes.length)].slice(), TRUNK_TRANSACTION_OFFSET)
        trits.set(hashes[Math.floor(Math.random() * hashes.length)].slice(), BRANCH_TRANSACTION_OFFSET)

        const hashTrits = new Int8Array(HASH_LENGTH)
        let numberOfFailedAttempts = 0

        do {
            Curl729_27.get_digest(trits, 0, TRANSACTION_LENGTH, hashTrits, 0)
            if (
                hashTrits[TYPE_OFFSET] === TRUE &&
                hashTrits[TAIL_FLAG_OFFSET] !== FALSE &&
                hashTrits[HEAD_FLAG_OFFSET] > FALSE
            ) {
                break
            }
            for (let i = 0; i < TRANSACTION_NONCE_LENGTH; i++) {
                if (++trits[TRANSACTION_NONCE_OFFSET + i] > 1) {
                    trits[TRANSACTION_NONCE_OFFSET + i] = -1
                } else {
                    break
                }
            }
        } while (++numberOfFailedAttempts < maxNumberOfAttempts)

        hashes.push(hashTrits)
        ixi.entangle(trits)
    }
}

function logCount(id, count) {
    document.getElementById(id).innerText = count.toString()
}

function formatDuration(t) {
    let s = Math.floor((t / 1000) % 60)
    let m = Math.floor((t / (1000 * 60)) % 60)
    let h = Math.floor((t / (1000 * 60 * 60)) % 24)
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s)
}
