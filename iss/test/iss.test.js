import t from 'tap'
import rimraf from 'rimraf'

import { iss, KEY_SIGNATURE_FRAGMENT_LENGTH } from '../index.js'
import { Curl729_27 } from '@web-ict/curl'
import { persistence } from '@web-ict/persistence'
import { trytes } from '@web-ict/converter'

const HASH_LENGTH = 243

const { increment } = persistence({ path: './test', id: 'test' })
const { address, subseed, key, signatureFragment, validateSignatures } = iss(Curl729_27, increment)

const seed = new Int8Array(HASH_LENGTH).fill(0)

rimraf.sync('./test/test')

t.test('address & signature', async (t) => {
    const security = 2

    t.equal((await address(seed, security)).index, 0)
    t.equal((await address(seed, security)).index, 1)
    t.equal((await address(seed, security)).index, 2)
    t.equal((await address(seed, security)).index, 8)
    t.equal(
        trytes((await address(seed, security)).address, 0, HASH_LENGTH),
        'JIFVLGP9UUWEPUXQXMSYXHLFKOEVAYFISSDHNWSDHVBIGNLGVHALTPW99JCJSGMDJ9LTN9RBQPUNKWIUY'
    )

    const outcome = await address(seed, security)
    const keyTrits = key(subseed(seed, outcome.index), security)
    const bundle = new Int8Array(81).fill(3).map(() => Math.floor(Math.random() * 3 - 1))
    const signatureFragments = []

    for (let i = 0; i < security; i++) {
        const keyFragment = keyTrits.slice(i * KEY_SIGNATURE_FRAGMENT_LENGTH, (i + 1) * KEY_SIGNATURE_FRAGMENT_LENGTH)
        const bundleFragment = bundle.slice(i * 27, (i + 1) * 27)
        signatureFragments.push(signatureFragment(bundleFragment, keyFragment))
    }

    t.equal(validateSignatures(outcome.address, signatureFragments, bundle), true)
})
