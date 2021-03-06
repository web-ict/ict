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

import { ICT } from '@web-ict/ict'
import { MESSAGE_OR_SIGNATURE_LENGTH } from '@web-ict/transaction'
import { transactionTrits, updateTransactionNonce } from '@web-ict/bundle'
import { integerValueToTrits, TRUE } from '@web-ict/converter'
import { economicCluster } from '@web-ict/ec'

import('@web-ict/curl').then(({ Curl729_27 }) => {
    const ict = ICT({
        autopeering: {
            iceServers: [
                {
                    urls: ['stun:stun3.l.google.com:19302'],
                },
            ],
            signalingServers: ['ws://localhost:8080', 'ws://localhost:8080', 'ws://localhost:8080'],
            cooldownDuration: 10, // In seconds
            reconnectDelay: 1,
            tiebreakerIntervalDuration: 10,
            tiebreakerValue: Number.POSITIVE_INFINITY, // New transactions / second
        },
        dissemination: {
            A: 1, // In milliseconds
            B: 100,
        },
        subtangle: {
            capacity: 100000, // In transactions
            pruningScale: 0.1, // In proportion to capacity
            artificialLatency: 100, // Artificial latency in ms
        },
        Curl729_27,
    })

    const cluster = economicCluster({
        intervalDuration: 2 * 1000,
        ixi: ict.ixi,
        Curl729_27,
    })

    cluster.addEconomicActor({
        address: 'XTTLDRSNRPBPGESXAVBKKS9PMNCY9ZRTIZOZJUIYMGEBFRCQPOHCCONRX9JMBPCSYYKTOYIIEVYGGCTMR',
        depth: 12,
        security: 1,
        weight: 1,
    })

    ict.launch()
    cluster.launch()

    let spamming = false
    let interval

    document.getElementById('spam').addEventListener('click', () => {
        if (!spamming) {
            interval = setInterval(routine(ict.ixi, Curl729_27), 1000)
            spamming = true
        } else {
            clearInterval(interval)
            spamming = false
        }
    })

    const step = () => {
        const info = ict.info()
        const { latestMilestoneIndex, latestSolidSubtangleMilestoneIndex } = cluster.info()[0]

        logMilestone(latestMilestoneIndex, latestSolidSubtangleMilestoneIndex)

        info.peers.forEach((peer, i) => {
            logCount(`uptime-${i}`, formatDuration(peer.uptime))
            logCount(`number-of-inbound-transactions-${i}`, peer.numberOfInboundTransactions)
            logCount(`number-of-outbound-transactions-${i}`, peer.numberOfOutboundTransactions)
            logCount(`number-of-new-transactions-${i}`, peer.numberOfNewTransactions)
            logCount(`number-of-seen-transactions-${i}`, peer.numberOfSeenTransactions)
            logCount(`rate-of-new-transactions-${i}`, peer.rateOfNewTransactions)
        })

        logCount('subtangle-size', info.subtangle.size)
        logCount('number-of-tips', info.subtangle.numberOfTips)
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

function routine(ixi, Curl729_27) {
    let index = 0

    return () => {
        const signatureOrMessage = new Int8Array(MESSAGE_OR_SIGNATURE_LENGTH)
        integerValueToTrits(index++, signatureOrMessage, 0)

        const trits = transactionTrits({
            signatureOrMessage,
        })

        ixi.getTransactionsToApprove(trits)
        updateTransactionNonce(Curl729_27)(trits, 1, TRUE, TRUE)
        ixi.entangle(trits)
    }
}

function logCount(id, count) {
    document.getElementById(id).innerText = count.toString()
}

function logMilestone(latestMilestoneIndex, latestSolidSubtangleMilestoneIndex) {
    document.getElementById('latest-milestone').innerText = latestMilestoneIndex
    document.getElementById('latest-solid-subtangle-milestone').innerText = latestSolidSubtangleMilestoneIndex
}

function formatDuration(t) {
    let s = Math.floor((t / 1000) % 60)
    let m = Math.floor((t / (1000 * 60)) % 60)
    let h = Math.floor((t / (1000 * 60 * 60)) % 24)
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s)
}
