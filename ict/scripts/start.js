import { Curl729_27 } from '@web-ict/curl'
import { updateTransactionNonce, transactionTrits } from '@web-ict/bundle'
import { ICT } from '../index.js'

const properties = {
    autopeering: {
        signalingServers: (process.env.SIGNALING_SERVERS
            ? process.env.SIGNALING_SERVERS.split(',').map((url) => url.trim())
            : undefined) || ['ws://localhost:8080', 'ws://localhost:8080', 'ws://localhost:8080'],
        iceServers: [
            {
                urls: (process.env.ICE_SERVERS
                    ? process.env.ICE_SERVERS.split(',').map((url) => url.trim())
                    : undefined) || ['stun:stun3.l.google.com:19302'],
            },
        ],
        cooldownDuration: process.env.COOLDOWN_DURATION || 10, // s
        tiebreakerIntervalDuration: process.env.TIEBREAKER_INTERVAL_DURATION || 10, // s
        tiebreakerValue: process.env.TIEBREAKER_VALUE || Number.POSITIVE_INFINITY, // New transactions / second
    },
    dissemination: {
        A: process.env.A || 1, // ms
        B: process.env.B || 100,
    },
    subtangle: {
        capacity: process.env.SUBTANGLE_CAPACITY || 100, // In transactions
        pruningScale: process.env.PRUNING_SCALE || 0.1, // In proportion to capacity
        artificialLatency: process.env.ARTIFICIAL_LATENCY || 100, // ms
    },
    Curl729_27,
}

const ict = ICT(properties)
ict.launch()

const trits = transactionTrits({})
ict.ixi.getTransactionsToApprove(trits)
updateTransactionNonce(Curl729_27)(trits, 1, 1, 1, 1000)

ict.ixi.entangle(trits)

setInterval(() => {
    const info = ict.info()
    process.stdout.write(
        `Subtangle size: ${info.subtangle.size}, Tips: ${info.subtangle.numberOfTips}, Inbound: ${info.numberOfInboundTransactions}, Outbound: ${info.numberOfOutboundTransactions}, New: ${info.numberOfNewTransactions}, Seen: ${info.numberOfSeenTransactions}, Invalid: ${info.numberOfInvalidTransactions}, Enqueued: ${info.numberOfTransactionsToPropagate}\n`
    )
}, 3000)
