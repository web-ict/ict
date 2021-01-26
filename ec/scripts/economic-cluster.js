import { ICT } from '@web-ict/ict'
import { Curl729_27 } from '@web-ict/curl'
import { trytes } from '@web-ict/converter'
import { economicCluster } from '../index.js'
import fs from 'fs'

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

const cluster = economicCluster({
    intervalDuration: 2 * 1000,
    ixi: ict.ixi,
})

cluster.addEconomicActor({
    address: trytes(JSON.parse(fs.readFileSync('./merkleTree.json')).address, 0, 243),
    depth: 9,
    security: 1,
})

ict.launch()
cluster.launch()

setInterval(() => {
    const info = cluster.info()
    info.forEach((actor) => {
        process.stdout.write(
            `latestMilestone: ${actor.latestMilestone}, latestMilestoneIndex: ${actor.latestMilestoneIndex}, confidence: ${actor.confidence}\n`
        )
    })
}, 20 * 1000)
