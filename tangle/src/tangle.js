import { NULL_HASH, NULL_TAG } from '../../transaction'
import { trytes } from '../../converter'

const NULL_HASH_TRYTES = trytes(NULL_HASH)
const NULL_TAG_TRYTES = trytes(NULL_TAG)

const vertex = (hash, index) => ({
    hash,
    index,
    branchVerter: undefined,
    trunkVertex: undefined,
    referrers: new Set(),
})

export const tangle = ({ capacity, prunningScale }) => {
    let index = 0
    const verticesByHash = new Map()
    verticesByHash.set(NULL_HASH_TRYTES, vertex(NULL_HASH_TRYTES, index++))
    const verticesByAddress = new Map()
    const verticesByTag = new Map()

    const pruneIfNeccessary = () => {
        if (verticesByHash.size > capacity) {
            for (let i = 0; i < prunningScale; i++) {
                // TODO: Implement pruning
            }
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

            if (v.transaction === undefined) {
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

                return v.index // New tx
            }

            pruneIfNeccessary()

            return -v.index // Seen tx
        },
        remove(hash) {
            let v = verticesByHash.get(hash)
            if (v === undefined || v.transaction === undefined) {
                return -1
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
        },
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
