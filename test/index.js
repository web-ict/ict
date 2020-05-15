'use strict'

import { node } from '../node'
import {
    TRANSACTION_LENGTH,
    NULL_HASH,
    TRUNK_TRANSACTION_BEGIN,
    BRANCH_TRANSACTION_BEGIN,
    TRANSACTION_NONCE_BEGIN,
    TRANSACTION_NONCE_END,
    HASH_LENGTH,
    TYPE_BEGIN,
    TAIL_FLAG_BEGIN,
    HEAD_FLAG_BEGIN,
} from '../transaction'
import { integerValueToTrits, trytes, bytesToTrits, tritsToBytes, sizeInBytes } from '../converter'

const logCount = (id, count) => (document.getElementById(id).innerText = count.toString())

import('../curl').then(({ Curl729_27 }) => {
    const test = node({
        autopeering: {
            signalingServers: ['ws://localhost:3030', 'ws://localhost:3030', 'ws://localhost:3030'],
            iceServers: [
                {
                    urls: ['stun:stun3.l.google.com:19302'],
                },
            ],
            skippingDelay: 100,
            maxDowntime: 10000,
        },
        dissemination: {
            A: 1,
            B: 1000,
        },
        subtangle: {
            capacity: Number.POSITIVE_INFINITY,
            prunningScale: 0,
        },
        tiebreakerValue: Number.POSITIVE_INFINITY,
        Curl729_27,
    })
    test.launch()

    const maxNumberOfAttempts = 81
    let index = 0
    let hashes = [NULL_HASH]

    setInterval(() => {
        const trits = new Int8Array(TRANSACTION_LENGTH)
        const hashTrits = new Int8Array(HASH_LENGTH)
        const trunkTransaction = hashes[Math.floor(Math.random() * hashes.length)].slice()
        const branchTransaction = hashes[Math.floor(Math.random() * hashes.length)].slice()

        integerValueToTrits(index++, trits)
        trits.set(trunkTransaction, TRUNK_TRANSACTION_BEGIN)
        trits.set(branchTransaction, BRANCH_TRANSACTION_BEGIN)

        let numberOfFailedAttempts = 0
        do {
            Curl729_27.get_digest(trits, 0, TRANSACTION_LENGTH, hashTrits, 0)
            if (hashTrits[TYPE_BEGIN] === 1 && hashTrits[TAIL_FLAG_BEGIN] > -1 && hashTrits[HEAD_FLAG_BEGIN] > -1) {
                break
            }
            for (let i = 0; i < TRANSACTION_NONCE_END - TRANSACTION_NONCE_BEGIN; i++) {
                if (++trits[TRANSACTION_NONCE_BEGIN + i] > 1) {
                    trits[TRANSACTION_NONCE_BEGIN + i] = -1
                } else {
                    break
                }
            }
        } while (++numberOfFailedAttempts < maxNumberOfAttempts)

        hashes.push(hashTrits)
        test.entangle(trits)
    }, 1000)

    const step = () => {
        const info = test.info()

        info.peering.forEach((peer, i) => {
            logCount(`start-time-${i}`, peer.startTime)
            logCount(`uptime-${i}`, peer.uptime)
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
        logCount('number-of-transactions-to-propagate', info.numberOfTransactionsToPropagate)

        requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
})
