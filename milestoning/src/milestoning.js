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

import { iss, KEY_SIGNATURE_FRAGMENT_LENGTH } from '@web-ict/iss'
import { transactionTrits, updateTransactionNonce } from '@web-ict/bundle'
import { NUMBER_OF_TIMESTAMPS, TIMESTAMP_LENGTH, TIMESTAMP_OFFSET } from '@web-ict/timestamping'
import { MESSAGE_OR_SIGNATURE_LENGTH, HASH_LENGTH } from '@web-ict/transaction'
import { integerValue, integerValueToTrits, trytes, TRUE, FALSE, UNKNOWN } from '@web-ict/converter'

// reserves 243 trits for EC timestamps
export const MILESTONE_INDEX_OFFSET = TIMESTAMP_OFFSET + TIMESTAMP_LENGTH * NUMBER_OF_TIMESTAMPS
export const MILESTONE_INDEX_LENGTH = 81

export const milestoning = (Curl729_27, state, ixi, seed, depth, security) => {
    if (depth > 25) {
        throw new RangeError('Illegal depth, too large to fit siblings in 1 transaction.')
    }

    const { getMerkleRoot, merkleTree, signatureFragment, digest, addressFromDigests } = iss(Curl729_27, state)
    let tree

    const initialize = () => {
        // TODO: persist state
        if (state.milestoneIndex === undefined || state.milestoneIndex === 2 ** depth) {
            const index = state.index
            state.index += 2 ** depth
            state.milestoneMerkleTreeStartIndex = index
            state.milestoneIndex = 0
            tree = merkleTree(seed, state.milestoneMerkleTreeStartIndex, depth, security)
        } else if (tree === undefined) {
            tree = merkleTree(seed, state.milestoneMerkleTreeStartIndex, depth, security)
        }
    }

    return {
        root: () => trytes(tree.root, 0, HASH_LENGTH),

        async milestone(trunkTransaction, branchTransaction, timestamp) {
            initialize()

            const root = tree.root
            const milestoneIndex = state.milestoneIndex
            state.milestoneIndex++ // TODO: persist state

            const { key, siblings } = tree.get(milestoneIndex)
            let messageOrSignature = new Int8Array(MESSAGE_OR_SIGNATURE_LENGTH)

            integerValueToTrits(milestoneIndex, messageOrSignature, MILESTONE_INDEX_OFFSET)

            messageOrSignature.set(siblings, MILESTONE_INDEX_OFFSET + MILESTONE_INDEX_LENGTH)

            const siblingsTransaction = transactionTrits({
                messageOrSignature,
                address: root,
                trunkTransaction,
                branchTransaction,
            })

            return (timestamp ? timestamp(siblingsTransaction) : Promise.resolve()).then(() => {
                const maxNumberOfAttempts = Number.POSITIVE_INFINITY
                const hashToSign = updateTransactionNonce(Curl729_27)(
                    siblingsTransaction,
                    UNKNOWN,
                    TRUE,
                    FALSE,
                    maxNumberOfAttempts,
                    security
                ).hash
                trunkTransaction = hashToSign

                ixi.entangle(siblingsTransaction)

                for (let i = 0; i < security; i++) {
                    const signatureTransaction = transactionTrits({
                        messageOrSignature: signatureFragment(
                            hashToSign,
                            key.slice(i * KEY_SIGNATURE_FRAGMENT_LENGTH, (i + 1) * KEY_SIGNATURE_FRAGMENT_LENGTH)
                        ),
                        address: root,
                        trunkTransaction: trunkTransaction.slice(),
                        branchTransaction,
                    })

                    trunkTransaction = updateTransactionNonce(Curl729_27)(
                        signatureTransaction,
                        UNKNOWN,
                        FALSE,
                        i === security - 1 ? TRUE : FALSE,
                        maxNumberOfAttempts
                    ).hash

                    ixi.entangle(signatureTransaction)
                }
            })
        },

        milestoneListener() {
            const listener = (actor) => () => {
                const candidates = ixi
                    .getTransactionsByAddress(actor.address)
                    .filter(({ tailFlag, processedMilestone }) => tailFlag == TRUE && processedMilestone === undefined)

                const collectIfPossible = (transaction, bundle = []) => {
                    bundle.push(transaction)
                    if (transaction.headFlag === TRUE) {
                        return bundle
                    } else {
                        const trunkTransaction = ixi.getTransaction(transaction.trunkTransaction)
                        if (trunkTransaction) {
                            return collectIfPossible(trunkTransaction, bundle)
                        } else {
                            return []
                        }
                    }
                }

                for (let i = 0; i < candidates.length; i++) {
                    const bundle = collectIfPossible(candidates[i])

                    console.log(bundle)

                    if (bundle.length) {
                        // validate signature
                        const signedHash = bundle[2].hash
                        const digests = new Int8Array(actor.security * HASH_LENGTH)

                        for (let j = 0; j < actor.security; j++) {
                            digests.set(digest(signedHash, bundle[j].messageOrSignature), j * HASH_LENGTH)
                        }

                        const hash = addressFromDigests(digests)
                        const milestoneIndex = integerValue(
                            bundle[2].messageOrSignature,
                            MILESTONE_INDEX_OFFSET,
                            MILESTONE_INDEX_LENGTH
                        )
                        const siblings = bundle[2].messageOrSignature.slice(
                            MILESTONE_INDEX_OFFSET + MILESTONE_INDEX_LENGTH
                        )
                        const root = trytes(getMerkleRoot(hash, siblings, milestoneIndex, depth), 0, HASH_LENGTH)
                        candidates[i].processedMilestone = true

                        if (root === actor.address) {
                            ixi.updateSubtangleRating(bundle[2].hash)
                        }
                    }
                }
            }

            const intervals = []
            return {
                launch({ actors, delay }) {
                    actors.forEach((actor) => {
                        intervals.push(setInterval(listener(actor), delay))
                    })
                },
                terminate() {
                    intervals.forEach(clearInterval)
                },
            }
        },
    }
}
