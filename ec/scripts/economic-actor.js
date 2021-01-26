import { ICT } from '@web-ict/ict'
import { Curl729_27 } from '@web-ict/curl'
import { economicActor } from '../index.js'

const ict = ICT({
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
})

const actor = economicActor({
    persistencePath: './',
    persistenceId: 'milestone_index',
    merkleTreeFile: './merkleTree.json',
    seed: new Int8Array(243),
    depth: 12,
    security: 1,
    milestoneIntervalDuration: 20 * 1000,
    ixi: ict.ixi,
})

ict.launch()
actor.launch()
console.log(actor.address())
