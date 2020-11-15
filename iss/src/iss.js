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

import { add } from './add.js'
import { integerValueToTrits, TRYTE_WIDTH } from '@web-ict/converter'

export const MIN_TRYTE_VALUE = -13
export const MAX_TRYTE_VALUE = 13
export const NUMBER_OF_SECURITY_LEVELS = 3
export const HASH_LENGTH = 243
export const BUNDLE_FRAGMENT_LENGTH = HASH_LENGTH / NUMBER_OF_SECURITY_LEVELS
export const BUNDLE_FRAGMENT_TRYTE_LENGTH = BUNDLE_FRAGMENT_LENGTH / TRYTE_WIDTH
export const KEY_SIGNATURE_FRAGMENT_LENGTH = BUNDLE_FRAGMENT_TRYTE_LENGTH * HASH_LENGTH
export const SECURITY_LEVEL_TRITS = [2, 0, 1, -1]
export const SECURITY_LEVEL_OFFSET = 0

export const subseed = (Curl729_27) => (seed, index) => {
    if (!Number.isInteger(index) || index < 0) {
        throw new TypeError('Illegal subseed index.')
    }

    const subseedPreimage = add(seed, integerValueToTrits(index))
    const subseedTrits = new Int8Array(HASH_LENGTH)
    const curl = new Curl729_27(HASH_LENGTH)
    curl.absorb(subseedPreimage, 0, subseedPreimage.length)
    curl.squeeze(subseedTrits, 0, HASH_LENGTH)

    return subseedTrits
}

export const key = (Curl729_27) => (subseedTrits, security) => {
    if (subseedTrits.length !== HASH_LENGTH) {
        throw new RangeError(`Illegal subseed length. Expected ${HASH_LENGTH} trits.`)
    }

    if ([1, 2, 3].indexOf(security) === -1) {
        throw new RangeError('Illegal security level. Expected one of 1, 2 or 3.')
    }

    const keyTrits = new Int8Array(security * KEY_SIGNATURE_FRAGMENT_LENGTH)
    const curl = new Curl729_27(HASH_LENGTH)
    curl.absorb(subseedTrits, 0, HASH_LENGTH)
    curl.squeeze(keyTrits, 0, keyTrits.length)

    for (let offset = 0; offset < keyTrits.length; offset += HASH_LENGTH) {
        curl.reset(HASH_LENGTH)
        curl.absorb(keyTrits, offset, HASH_LENGTH)
        curl.squeeze(keyTrits, offset, HASH_LENGTH)
    }

    return keyTrits
}

export const digests = (Curl729_27) => (keyTrits) => {
    if (keyTrits.length === 0 || keyTrits.length % KEY_SIGNATURE_FRAGMENT_LENGTH !== 0) {
        throw new RangeError(`Illegal key length. Expected multiple of ${KEY_SIGNATURE_FRAGMENT_LENGTH}.`)
    }

    const digestsTrits = new Int8Array((keyTrits.length / KEY_SIGNATURE_FRAGMENT_LENGTH) * HASH_LENGTH)
    const curl = new Curl729_27(0)

    for (let i = 0; i < keyTrits.length / KEY_SIGNATURE_FRAGMENT_LENGTH; i++) {
        const buffer = keyTrits.slice(i * KEY_SIGNATURE_FRAGMENT_LENGTH, (i + 1) * KEY_SIGNATURE_FRAGMENT_LENGTH)

        for (let j = 0; j < KEY_SIGNATURE_FRAGMENT_LENGTH / HASH_LENGTH; j++) {
            for (let k = 0; k < MAX_TRYTE_VALUE - MIN_TRYTE_VALUE; k++) {
                curl.reset(HASH_LENGTH)
                curl.absorb(buffer, j * HASH_LENGTH, HASH_LENGTH)
                curl.squeeze(buffer, j * HASH_LENGTH, HASH_LENGTH)
            }
        }

        curl.reset(KEY_SIGNATURE_FRAGMENT_LENGTH)
        curl.absorb(buffer, 0, KEY_SIGNATURE_FRAGMENT_LENGTH)
        curl.squeeze(digestsTrits, i * HASH_LENGTH, HASH_LENGTH)
    }

    return digestsTrits
}

export const address = (Curl729_27, state) => {
    if (!Number.isInteger(state.index) || !Number.isSafeInteger(state.index) || state.index < 0) {
        throw new RangeError('Illegal state.')
    }

    return (seed, security, digestsTrits = new Int8Array(0)) => {
        if ([1, 2, 3].indexOf(security) === -1) {
            throw new RangeError('Illegal security level. Expected one of 1, 2 or 3.')
        }

        if (digestsTrits.length % HASH_LENGTH !== 0) {
            throw new RangeError(`Illegal digests length. Expected multiple of ${HASH_LENGTH}.`)
        }

        const outcome = {
            index: 0,
            security,
            key: new Int8Array(security * KEY_SIGNATURE_FRAGMENT_LENGTH),
            digests: new Int8Array(digestsTrits.length + security * HASH_LENGTH),
            address: new Int8Array(HASH_LENGTH),
        }
        const curl = new Curl729_27(outcome.digests.length)

        do {
            const index = state.index++

            outcome.index = index
            outcome.key.set(key(subseed(seed, index), security))
            outcome.digests.set(digests(outcome.key), digestsTrits.length)
            curl.reset(outcome.digests.length)
            curl.absorb(outcome.digests, 0, outcome.digests.length)
            curl.squeeze(outcome.address, 0, HASH_LENGTH)
        } while (outcome.address[SECURITY_LEVEL_OFFSET] !== SECURITY_LEVEL_TRITS[security])

        if (state.addresses === undefined) {
            state.addresses = {}
        }
        state.addresses.push(outcome)

        return outcome
    }
}

export const addressFromDigests = (Curl729_27) => (digestsTrits) => {
    const addressTrits = new Int8Array(HASH_LENGTH)
    const curl = new Curl729_27(digestsTrits.length)

    curl.absorb(digestsTrits, 0, digestsTrits.length)
    curl.squeeze(addressTrits, 0, HASH_LENGTH)

    return addressTrits
}

export const digest = (Curl729_27) => (bundleTryteFragment, signatureFragmentTrits) => {
    const buffer = signatureFragmentTrits.slice(0, KEY_SIGNATURE_FRAGMENT_LENGTH)
    const digestTrits = new Int8Array(HASH_LENGTH)
    const curl = new Curl729_27(0)

    for (let j = 0; j < KEY_SIGNATURE_FRAGMENT_LENGTH / HASH_LENGTH; j++) {
        for (let k = bundleTryteFragment[j] - MIN_TRYTE_VALUE; k-- > 0; ) {
            curl.reset(HASH_LENGTH)
            curl.absorb(buffer, j * HASH_LENGTH, HASH_LENGTH)
            curl.squeeze(buffer, j * HASH_LENGTH, HASH_LENGTH)
        }
    }

    curl.reset(KEY_SIGNATURE_FRAGMENT_LENGTH)
    curl.absorb(buffer, 0, KEY_SIGNATURE_FRAGMENT_LENGTH)
    curl.squeeze(digestTrits, 0, HASH_LENGTH)

    return digestTrits
}

export const signatureFragment = (Curl729_27) => (bundleTryteFragment, keyFragment) => {
    const signatureFragmentTrits = keyFragment.slice(0, KEY_SIGNATURE_FRAGMENT_LENGTH)
    const curl = new Curl729_27(0)

    for (let j = 0; j < KEY_SIGNATURE_FRAGMENT_LENGTH / HASH_LENGTH; j++) {
        for (let k = 0; k < MAX_TRYTE_VALUE - bundleTryteFragment[j]; k++) {
            curl.reset(HASH_LENGTH)
            curl.absorb(signatureFragmentTrits, j * HASH_LENGTH, HASH_LENGTH)
            curl.squeeze(signatureFragmentTrits, j * HASH_LENGTH, HASH_LENGTH)
        }
    }

    return signatureFragmentTrits
}

export const validateSignatures = (Curl729_27) => (expectedAddress, signatureFragments, bundleTryteFragments) => {
    const digestsTrits = new Int8Array(signatureFragments.length * HASH_LENGTH)

    for (let i = 0; i < signatureFragments.length; i++) {
        const buffer = digest(Curl729_27)(bundleTryteFragments[i % NUMBER_OF_SECURITY_LEVELS], signatureFragments[i])

        for (let j = 0; j < HASH_LENGTH; j++) {
            digestsTrits[i * HASH_LENGTH + j] = buffer[j]
        }
    }

    const actualAddress = addressFromDigests(Curl729_27)(digestsTrits)

    for (let i = 0; i < actualAddress.length; i++) {
        if (actualAddress[i] !== expectedAddress[i]) {
            return false
        }
    }
    return true
}

export const getMerkleRoot = (Curl729_27) => (hash, trits, index, depth) => {
    const curl = new Curl729_27(HASH_LENGTH)

    for (let i = 0; i < depth; i++) {
        curl.reset(HASH_LENGTH)
        if ((index & 1) == 0) {
            curl.absorb(hash, 0, HASH_LENGTH)
            curl.absorb(trits, i * HASH_LENGTH, HASH_LENGTH)
        } else {
            curl.absorb(trits, i * HASH_LENGTH, HASH_LENGTH)
            curl.absorb(hash, 0, HASH_LENGTH)
        }
        curl.squeeze(hash, 0, HASH_LENGTH)

        index >>= 1
    }

    if (index != 0) {
        return new Int8Array(HASH_LENGTH)
    }

    return hash
}

export const iss = (Curl729_27) => ({
    subseed: subseed(Curl729_27),
    key: key(Curl729_27),
    digests: digests(Curl729_27),
    address: address(Curl729_27),
    digest: digest(Curl729_27),
    signatureFragment: signatureFragment(Curl729_27),
    validateSignatures: validateSignatures(Curl729_27),
})
