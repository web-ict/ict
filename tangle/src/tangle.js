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

import { NULL_HASH, NULL_TAG } from '@web-ict/transaction'
import { trytes, FALSE, TRUE } from '@web-ict/converter'

const NULL_HASH_TRYTES = trytes(NULL_HASH)
const NULL_TAG_TRYTES = trytes(NULL_TAG)

const vertex = (hash, index) => ({
    hash,
    index,
    branchVertex: undefined,
    trunkVertex: undefined,
    referrers: new Set(),
    rating: 0,
})

export const tangle = ({ capacity, pruningScale }) => {
    let index = 0
    const verticesByHash = new Map()
    verticesByHash.set(NULL_HASH_TRYTES, vertex(NULL_HASH_TRYTES, index++))
    const verticesByAddress = new Map()
    const verticesByTag = new Map()

    // Updates ratings of (in)directly referenced transactions.
    const updateRating = (hash, weight = 1) => {
        const v = verticesByHash.get(hash)
        if (v !== undefined) {
            v.rating += weight

            updateRating(v.transaction.trunkTransaction, weight)

            if (v.transaction.branchTransaction !== v.transaction.trunkTransaction) {
                updateRating(v.transaction.branchTransaction, weight)
            }
        }
    }

    const remove = (hash) => {
        let v = verticesByHash.get(hash)
        if (v === undefined || v.transaction === undefined) {
            return FALSE
        }

        if (v.address !== NULL_HASH) {
            const vertices = verticesByAddress.get(v.transaction.address)
            vertices.delete(v)
            if (vertices.size === 0) {
                vertices.delete(v.transaction.address)
            }
        }

        if (v.tag !== NULL_TAG) {
            const vertices = verticesByTag.get(v.transaction.tag)
            vertices.delete(v)
            if (vertices.size === 0) {
                vertices.delete(v.transaction.tag)
            }
        }

        v.trunkVertex.referrers.delete(v)
        if (v.trunkVertex.referrers.size === 0 && v.trunkVertex.transaction === undefined) {
            verticesByHash.delete(v.trunkVertex.hash)
        }

        if (v.trunkVertex !== v.branchVertex) {
            v.branchVertex.referrers.delete(v)
            if (v.branchVertex.referrers.size === 0 && v.branchVertex.transaction === undefined) {
                verticesByHash.delete(v.branchVertex.hash)
            }
        }
    }

    // Removes older tx with lower rating.
    // It examines n = pruningScale * capacity transactions.
    const pruneIfNeccessary = () => {
        if (verticesByHash.size > capacity) {
            const vertices = verticesByHash.values()
            let min = vertices.next().value

            for (let i = 0; i < Math.min(pruningScale, 1) * capacity; i++) {
                const v = vertices.next().value
                if (v !== undefined && v.rating < min.rating) {
                    min = v
                }
            }

            remove(min.hash)
        }
    }

    return {
        get(hash) {
            return verticesByHash.get(hash)
        },

        put(transaction) {
            let v = verticesByHash.get(transaction.hash)

            if (v === undefined) {
                v = vertex(transaction.hash, ++index)
                verticesByHash.set(transaction.hash, v)
            }

            if (v.transaction !== undefined) {
                return FALSE * v.index // seen tx
            }

            v.transaction = transaction
            v.trunkVertex = verticesByHash.get(transaction.trunkTransaction)
            if (v.trunkVertex === undefined) {
                v.trunkVertex = vertex(transaction.trunkTransaction, ++index)
                verticesByHash.set(transaction.trunkTransaction, v.trunkVertex)
            }
            v.trunkVertex.referrers.add(v)

            if (transaction.trunkTransaction === transaction.branchTransaction) {
                v.branchVertex = v.trunkVertex
            } else {
                v.branchVertex = verticesByHash.get(transaction.branchTransaction)
                if (v.branchVertex === undefined) {
                    v.branchVertex = vertex(transaction.branchTransaction, ++index)
                    verticesByHash.set(transaction.branchTransaction, v.branchVertex)
                }
                v.branchVertex.referrers.add(v)
            }

            if (transaction.address !== NULL_HASH) {
                let vertices = verticesByAddress.get(transaction.address)
                if (vertices === undefined) {
                    vertices = new Set()
                    verticesByAddress.set(transaction.address, vertices)
                }
                vertices.add(v)
            }

            if (transaction.tag !== NULL_TAG_TRYTES) {
                let vertices = verticesByTag.get(transaction.tag)
                if (vertices === undefined) {
                    vertices = new Set()
                    verticesByTag.set(transaction.tag, vertices)
                }
                vertices.add(v)
            }

            pruneIfNeccessary()

            return TRUE * v.index // New tx
        },

        updateRating,

        remove,

        clear() {
            index = 0
            verticesByHash.clear()
            verticesByHash.set(NULL_HASH_TRYTES, vertex(NULL_HASH_TRYTES, index++))
            verticesByAddress.clear()
            verticesByTag.clear()
        },

        info: () => ({
            size: verticesByHash.size,
        }),
    }
}
