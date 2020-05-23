'use strict'

import { node } from '../node'
import { WebRTC_Peer, signalingClient } from '../autopeering'
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
} from '../transaction'
import { integerValueToTrits, FALSE, TRUE } from '../converter'

import('../curl').then(({ Curl729_27 }) => {
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
            prunningScale: 10000,
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
