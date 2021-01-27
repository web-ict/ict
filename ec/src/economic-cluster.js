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

import { ISS, HASH_LENGTH, BUNDLE_FRAGMENT_TRYTE_LENGTH } from '@web-ict/iss'
import { integerValue, trytes, trytesToTrits } from '@web-ict/converter'
import { INDEX_OFFSET, INDEX_LENGTH, CONFIDENCE_OFFSET, CONFIDENCE_LENGTH, SIBLINGS_OFFSET } from './milestone.js'

export const economicCluster = ({ intervalDuration, ixi, Curl729_27 }) => {
    const iss = ISS(Curl729_27)
    const actors = new Set()
    const missingTransactions = new Map()
    let interval

    const updateConfidence = (actor, confidence, hash, ratedTransactions = new Set()) => {
        let N = 0
        actors.forEach(({ weight }) => (N += weight))

        const f = (hash) => {
            const vertex = ixi.get(hash)

            if (vertex) {
                if (vertex.transaction === undefined) {
                    missingTransactions.set(hash, { confidence, ratedTransactions })
                } else if (!ratedTransactions.has(vertex.hash)) {
                    let M = 0

                    if (vertex.weights === undefined) {
                        vertex.weights = new Map()
                    }

                    if (actor.removed) {
                        vertex.weights.delete(actor)
                    } else {
                        const a = vertex.weights.get(actor) || 0
                        const b = (confidence || actor.confidence) * actor.weight
                        if (a < b) {
                            vertex.weights.set(actor, b)
                        } else {
                            return
                        }
                    }

                    vertex.weights.forEach((weight) => (M += weight))
                    vertex.confidence = vertex.transaction.confidence = M / N

                    ratedTransactions.add(vertex.hash)

                    f(vertex.trunkVertex.hash)

                    if (vertex.branchVertex.hash !== vertex.trunkVertex.hash) {
                        f(vertex.branchVertex.hash)
                    }
                }
            }
        }

        f(hash || actor.latestMilestone)
    }

    const transactionListener = (transaction) => {
        if (missingTransactions.has(transaction.hash)) {
            const { confidence, ratedTransactions } = missingTransactions.get(transaction.hash)
            missingTransactions.delete(transaction.hash)
            actors.forEach((actor) => updateConfidence(actor, confidence, transaction.hash, ratedTransactions))
        }
    }

    const milestoneListener = () => {
        actors.forEach((actor) =>
            ixi
                .getBundlesByAddress(actor.address)
                .filter((bundle) => !bundle[0].processedMilestoneCandidate)
                .filter((bundle) => bundle.length >= actor.security + 1)
                .forEach((bundle) => {
                    bundle[0].processedMilestoneCandidate = true

                    const head = bundle[bundle.length - 1]
                    const index = integerValue(head.messageOrSignature, INDEX_OFFSET, INDEX_LENGTH)

                    if (index > actor.latestMilestoneIndex) {
                        const signedHashTrits = new Int8Array(HASH_LENGTH)
                        trytesToTrits(head.hash, signedHashTrits)
                        const signedHash = iss.bundleTrytes(signedHashTrits, actor.security)
                        const digests = new Int8Array(actor.security * HASH_LENGTH)

                        for (let i = 0; i < actor.security; i++) {
                            digests.set(
                                iss.digest(
                                    signedHash.slice(
                                        i * BUNDLE_FRAGMENT_TRYTE_LENGTH,
                                        (i + 1) * BUNDLE_FRAGMENT_TRYTE_LENGTH
                                    ),
                                    bundle[bundle.length - 2 - i].messageOrSignature
                                ),
                                i * HASH_LENGTH
                            )
                        }

                        const hash = iss.addressFromDigests(digests)
                        const siblings = head.messageOrSignature.slice(
                            SIBLINGS_OFFSET,
                            SIBLINGS_OFFSET + actor.depth * HASH_LENGTH
                        )

                        if (
                            trytes(iss.getMerkleRoot(hash, siblings, index, actor.depth), 0, HASH_LENGTH) ===
                            actor.address
                        ) {
                            actor.latestMilestoneIndex = index
                            actor.latestMilestone = bundle[0].hash
                            updateConfidence(
                                actor,
                                integerValue(head.messageOrSignature, CONFIDENCE_OFFSET, CONFIDENCE_LENGTH)
                            )
                        }
                    }
                })
        )
    }

    return {
        launch() {
            interval = setInterval(milestoneListener, intervalDuration)
            ixi.addListener(transactionListener)
        },
        terminate() {
            clearInterval(interval)
            ixi.removeListener(transactionListener)
        },
        addEconomicActor(actor) {
            actor.latestMilestoneIndex = -1
            actors.add({ ...actor })
        },
        removeEconomicActor(actor) {
            actors.delete(actor)
            actor.removed = true
            updateConfidence(actor)
        },
        info: () => {
            const actorsInfo = []
            actors.forEach((actor) => actorsInfo.push(actor))
            return actorsInfo
        },
    }
}
