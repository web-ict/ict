import tap from 'tap'
import { Curl729_27 } from '@web-ict/curl'
import { updateTransactionNonce, transactionTrits } from '@web-ict/bundle'
import { ICT } from '../index.js'

const properties = {
    autopeering: {
        signalingServers: ['ws://localhost:8080', 'ws://localhost:8080', 'ws://localhost:8080'],
        iceServers: [
            {
                urls: ['stun:stun3.l.google.com:19302'],
            },
        ],
        cooldownDuration: 10, // s
        tiebreakerIntervalDuration: 10, // s
        tiebreakerValue: Number.POSITIVE_INFINITY, // New transactions / second
    },
    dissemination: {
        A: 1, // ms
        B: 100,
    },
    subtangle: {
        capacity: 100, // In transactions
        pruningScale: 0.1, // In proportion to capacity
        artificialLatency: 100, // ms
    },
    Curl729_27,
}

const nodeA = ICT(properties)
const nodeB = ICT(properties)

nodeA.launch()
nodeB.launch()

const info = (node, delay) =>
    new Promise((resolve) => {
        setTimeout(() => resolve(node.info()), delay)
    })

const delay = (f, ms) =>
    new Promise((resolve) => {
        setTimeout(() => {
            f()
            resolve()
        }, ms)
    })

tap.test('ict', async (t) => {
    const trits = transactionTrits({})
    nodeA.ixi.getTransactionsToApprove(trits)
    updateTransactionNonce(Curl729_27)(trits, 1, 1, 1, 1000)

    await delay(() => nodeA.ixi.entangle(trits), 1000)

    t.equal(nodeA.info().numberOfNewTransactions, 1)
    t.equal(nodeA.info().numberOfIxiTransactions, 1)
    t.equal(nodeA.info().numberOfInboundTransactions, 1)

    t.equal((await info(nodeA, 1000)).numberOfOutboundTransactions, 3)
    t.equal((await info(nodeB, 1000)).numberOfInboundTransactions, 3)

    t.end()
    nodeA.terminate()
    nodeB.terminate()
})
