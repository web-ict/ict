import t from 'tap'
import rimraf from 'rimraf'

import { ISS, KEY_SIGNATURE_FRAGMENT_LENGTH, BUNDLE_FRAGMENT_TRYTE_LENGTH } from '../index.js'
import { Curl729_27 } from '@web-ict/curl'
import { persistence } from '@web-ict/persistence'
import { trytes } from '@web-ict/converter'

const HASH_LENGTH = 243

const { increment } = persistence({ path: './test', id: 'test' })
const iss = ISS(Curl729_27, increment)

const seed = new Int8Array(HASH_LENGTH).fill(0)

rimraf.sync('./test/test')

t.test('address & signature', async (t) => {
    const security = 2

    t.equal((await iss.address(seed, security)).index, 0)
    t.equal((await iss.address(seed, security)).index, 1)
    t.equal((await iss.address(seed, security)).index, 2)
    t.equal((await iss.address(seed, security)).index, 8)
    t.equal(
        trytes((await iss.address(seed, security)).address, 0, HASH_LENGTH),
        'JIFVLGP9UUWEPUXQXMSYXHLFKOEVAYFISSDHNWSDHVBIGNLGVHALTPW99JCJSGMDJ9LTN9RBQPUNKWIUY'
    )

    const outcome = await iss.address(seed, security)
    const keyTrits = iss.key(iss.subseed(seed, outcome.index), security)
    const bundle = new Int8Array(81).map(() => Math.floor(Math.random() * 3 - 1))
    const signatureFragments = []

    for (let i = 0; i < security; i++) {
        const keyFragment = keyTrits.slice(i * KEY_SIGNATURE_FRAGMENT_LENGTH, (i + 1) * KEY_SIGNATURE_FRAGMENT_LENGTH)
        const bundleFragment = bundle.slice(i * 27, (i + 1) * 27)
        signatureFragments.push(iss.signatureFragment(bundleFragment, keyFragment))
    }

    t.equal(iss.validateSignatures(outcome.address, signatureFragments, bundle), true)
})

t.test('MSS', async (t) => {
    const security = 2
    const depth = 2
    const root = await iss.merkleTree(seed, depth, security)

    t.equal(
        trytes(root.address, 0, HASH_LENGTH),
        'OMRCJDZDKHAVHLQWKIZTQVSPUUMTNFYUUTMADRPJFKZGAHWLWZIGMOOQAWSDUDKA99LKBB9GREQQ9W9OT'
    )

    const index = 0
    const { leafIndex, siblings } = iss.getMerkleProof(root, index)
    const hashToSign = new Int8Array(81).map(() => Math.floor(Math.random() * 3 - 1))
    const key = iss.key(iss.subseed(seed, leafIndex), security)
    const signatureFragments = []
    for (let i = 0; i < security; i++) {
        const keyFragment = key.slice(i * KEY_SIGNATURE_FRAGMENT_LENGTH, (i + 1) * KEY_SIGNATURE_FRAGMENT_LENGTH)
        const hashToSignFragment = hashToSign.slice(
            i * BUNDLE_FRAGMENT_TRYTE_LENGTH,
            (i + 1) * BUNDLE_FRAGMENT_TRYTE_LENGTH
        )
        signatureFragments.push(iss.signatureFragment(hashToSignFragment, keyFragment))
    }

    const digests = new Int8Array(security * HASH_LENGTH)
    for (let i = 0; i < security; i++) {
        digests.set(
            iss.digest(
                hashToSign.slice(i * BUNDLE_FRAGMENT_TRYTE_LENGTH, (i + 1) * BUNDLE_FRAGMENT_TRYTE_LENGTH),
                signatureFragments[i]
            ),
            i * HASH_LENGTH
        )
    }
    const hash = iss.addressFromDigests(digests)
    const address = trytes(iss.getMerkleRoot(hash, siblings, index, depth), 0, HASH_LENGTH)

    t.equal(address, trytes(root.address, 0, HASH_LENGTH))
})
