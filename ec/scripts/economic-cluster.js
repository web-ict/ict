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

import { ICT } from '@web-ict/ict'
import { Curl729_27 } from '@web-ict/curl'
import { transactionTrits, updateTransactionNonce } from '@web-ict/bundle'
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
        capacity: process.env.SUBTANGLE_CAPACITY || 100000, // In transactions
        pruningScale: process.env.PRUNING_SCALE || 0.1, // In proportion to capacity
        artificialLatency: process.env.ARTIFICIAL_LATENCY || 100, // ms
    },
    Curl729_27,
})

const cluster = economicCluster({
    intervalDuration: 5 * 1000,
    ixi: ict.ixi,
    Curl729_27,
})

cluster.addEconomicActor({
    address: trytes(JSON.parse(fs.readFileSync('./merkleTree.json')).address, 0, 243),
    depth: 12,
    security: 1,
    weight: 1,
})

ict.launch()
cluster.launch()

setInterval(() => {
    const trits = transactionTrits({})
    ict.ixi.getTransactionsToApprove(trits)
    updateTransactionNonce(Curl729_27)(trits, 1, 1, 1)

    ict.ixi.entangle(trits)
}, 1000)

setInterval(() => {
    const info = ict.info()
    info.peers.forEach((peer, i) => {
        process.stdout.write(
            `Peer #${i + 1} - Inbound: ${peer.numberOfInboundTransactions}, Outbound: ${
                peer.numberOfOutboundTransactions
            }, New: ${peer.numberOfNewTransactions}, Seen: ${peer.numberOfSeenTransactions}, Rate: ${
                peer.rateOfNewTransactions
            }\n`
        )
    })
    process.stdout.write(
        `Subtangle size: ${info.subtangle.size}, Tips: ${info.subtangle.numberOfTips}, Inbound: ${info.numberOfInboundTransactions}, Outbound: ${info.numberOfOutboundTransactions}, New: ${info.numberOfNewTransactions}, Seen: ${info.numberOfSeenTransactions}, Invalid: ${info.numberOfInvalidTransactions}, Enqueued: ${info.numberOfTransactionsToPropagate}\n`
    )
}, 3000)

setInterval(() => {
    const info = cluster.info()
    info.forEach((actor) => {
        process.stdout.write(
            `latestMilestoneIndex: ${actor.latestMilestoneIndex}, latestSolidSubtangleMilestoneIndex: ${actor.latestSolidSubtangleMilestoneIndex} \n`
        )
    })
}, 20 * 1000)
