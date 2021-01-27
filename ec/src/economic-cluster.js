import { Curl729_27 } from '@web-ict/curl'
import { ISS, HASH_LENGTH, BUNDLE_FRAGMENT_TRYTE_LENGTH } from '@web-ict/iss'
import { integerValue, trytes, trytesToTrits } from '@web-ict/converter'
import { INDEX_OFFSET, INDEX_LENGTH, CONFIDENCE_OFFSET, CONFIDENCE_LENGTH, SIBLINGS_OFFSET } from '../index.js'

export const economicCluster = ({ intervalDuration, ixi }) => {
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
