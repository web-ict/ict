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

import { integerValueToTrits, bigIntegerValueToTrits } from '@web-ict/converter'
import {
    TRANSACTION_LENGTH,
    MESSAGE_OR_SIGNATURE_OFFSET,
    MESSAGE_OR_SIGNATURE_LENGTH,
    EXTRA_DATA_DIGEST_OFFSET,
    EXTRA_DATA_DIGEST_LENGTH,
    ADDRESS_OFFSET,
    ADDRESS_LENGTH,
    VALUE_OFFSET,
    VALUE_LENGTH,
    ISSUANCE_TIMESTAMP_OFFSET,
    ISSUANCE_TIMESTAMP_LENGTH,
    TIMELOCK_LOWER_BOUND_OFFSET,
    TIMELOCK_LOWER_BOUND_LENGTH,
    TIMELOCK_UPPER_BOUND_OFFSET,
    TIMELOCK_UPPER_BOUND_LENGTH,
    BUNDLE_NONCE_OFFSET,
    BUNDLE_NONCE_END,
    BUNDLE_NONCE_LENGTH,
    BUNDLE_ESSENCE_OFFSET,
    BUNDLE_ESSENCE_END,
    BUNDLE_ESSENCE_LENGTH,
    TRUNK_TRANSACTION_OFFSET,
    TRUNK_TRANSACTION_LENGTH,
    BRANCH_TRANSACTION_OFFSET,
    BRANCH_TRANSACTION_LENGTH,
    TAG_OFFSET,
    TAG_LENGTH,
    ATTACHMENT_TIMESTAMP_OFFSET,
    ATTACHMENT_TIMESTAMP_LENGTH,
    ATTACHMENT_TIMESTAMP_LOWER_BOUND_OFFSET,
    ATTACHMENT_TIMESTAMP_LOWER_BOUND_LENGTH,
    ATTACHMENT_TIMESTAMP_UPPER_BOUND_OFFSET,
    ATTACHMENT_TIMESTAMP_UPPER_BOUND_LENGTH,
    TRANSACTION_NONCE_OFFSET,
    TRANSACTION_NONCE_END,
    TRANSACTION_NONCE_LENGTH,
    HASH_LENGTH,
    TYPE_OFFSET,
    TAIL_FLAG_OFFSET,
    HEAD_FLAG_OFFSET,
} from '@web-ict/transaction'

import { BUNDLE_FRAGMENT_LENGTH } from '@web-ict/iss'

export const transactionTrits = ({
    type,
    messageOrSignature,
    extraDataDigest,
    address,
    value,
    issuanceTimestamp,
    timelockLowerBound,
    timelockUpperBound,
    bundleNonce,
    trunkTransaction,
    branchTransaction,
    tag,
    attachmentTimestamp,
    attachmentTimestampLowerBound,
    attachmentTimestampUpperBound,
    transactionNonce,
}) => {
    const trits = new Int8Array(TRANSACTION_LENGTH)
    trits.type = type

    if (messageOrSignature !== undefined) {
        trits.set(messageOrSignature.slice(0, MESSAGE_OR_SIGNATURE_LENGTH), MESSAGE_OR_SIGNATURE_OFFSET)
    }

    if (extraDataDigest !== undefined) {
        trits.set(extraDataDigest.slice(0, EXTRA_DATA_DIGEST_LENGTH), EXTRA_DATA_DIGEST_OFFSET)
    }
    if (address !== undefined) {
        trits.set(address.slice(0, ADDRESS_LENGTH), ADDRESS_OFFSET)
    }
    if (value) {
        bigIntegerValueToTrits(value, trits, VALUE_OFFSET, VALUE_LENGTH)
    }
    if (issuanceTimestamp) {
        integerValueToTrits(issuanceTimestamp, trits, ISSUANCE_TIMESTAMP_OFFSET, ISSUANCE_TIMESTAMP_LENGTH)
    }
    if (timelockLowerBound) {
        integerValueToTrits(timelockLowerBound, trits, TIMELOCK_LOWER_BOUND_OFFSET, TIMELOCK_LOWER_BOUND_LENGTH)
    }
    if (timelockUpperBound) {
        integerValueToTrits(timelockUpperBound, trits, TIMELOCK_UPPER_BOUND_OFFSET, TIMELOCK_UPPER_BOUND_LENGTH)
    }
    if (bundleNonce === undefined) {
        for (let offset = BUNDLE_NONCE_OFFSET; offset < BUNDLE_NONCE_END; offset++) {
            trits[offset] = Math.floor(Math.random() * 3 - 1) // To enable steganography
        }
    } else {
        trits.set(bundleNonce.slice(0, BUNDLE_NONCE_LENGTH), BUNDLE_NONCE_OFFSET)
    }

    if (trunkTransaction !== undefined) {
        trits.set(trunkTransaction.slice(0, TRUNK_TRANSACTION_LENGTH), TRUNK_TRANSACTION_OFFSET)
    }
    if (branchTransaction !== undefined) {
        trits.set(branchTransaction.slice(0, BRANCH_TRANSACTION_LENGTH), BRANCH_TRANSACTION_OFFSET)
    }
    if (tag !== undefined) {
        trits.set(tag.slice(0, TAG_LENGTH), TAG_OFFSET)
    }
    if (attachmentTimestamp) {
        integerValueToTrits(attachmentTimestamp, trits, ATTACHMENT_TIMESTAMP_OFFSET, ATTACHMENT_TIMESTAMP_LENGTH)
    }
    if (attachmentTimestampLowerBound) {
        integerValueToTrits(
            attachmentTimestampLowerBound,
            trits,
            ATTACHMENT_TIMESTAMP_LOWER_BOUND_OFFSET,
            ATTACHMENT_TIMESTAMP_LOWER_BOUND_LENGTH
        )
    }
    if (attachmentTimestampUpperBound) {
        integerValueToTrits(
            attachmentTimestampUpperBound,
            trits,
            ATTACHMENT_TIMESTAMP_UPPER_BOUND_OFFSET,
            ATTACHMENT_TIMESTAMP_UPPER_BOUND_LENGTH
        )
    }
    if (transactionNonce === undefined) {
        for (let offset = TRANSACTION_NONCE_OFFSET; offset < TRANSACTION_NONCE_END; offset++) {
            trits[offset] = Math.floor(Math.random() * 3 - 1) // To enable steganography
        }
    } else {
        trits.set(transactionNonce.slice(0, TRANSACTION_NONCE_LENGTH), TRANSACTION_NONCE_OFFSET)
    }

    return trits
}

export const updateTransactionNonce = (Curl729_27) => (trits, type, headFlag, tailFlag, security) => {
    if ([-1, 0, 1].indexOf(type) === -1) {
        throw new RangeError('Illegal type. Expected one of -1, 0 or 1.')
    }

    if ([-1, 0, 1].indexOf(headFlag) === -1) {
        throw new RangeError('Illegal head flag. Expected one of -1, 0 or 1.')
    }

    if ([-1, 0, 1].indexOf(tailFlag) === -1) {
        throw new RangeError('Illegal tail flag. Expected one of -1, 0 or 1.')
    }

    const hash = new Int8Array(HASH_LENGTH)

    do {
        Curl729_27.get_digest(trits, 0, TRANSACTION_LENGTH, hash, 0)

        let weightValidityFlag = true
        if (security) {
            for (let i = 0; i < security; i++) {
                if (hammingWeight(hash, i * BUNDLE_FRAGMENT_LENGTH) !== 0) {
                    weightValidityFlag = false
                    break
                }
            }
        }

        if (
            weightValidityFlag &&
            hash[TYPE_OFFSET] === type &&
            hash[HEAD_FLAG_OFFSET] === headFlag &&
            hash[TAIL_FLAG_OFFSET] === tailFlag
        ) {
            break
        }

        for (let i = TRANSACTION_NONCE_OFFSET; i < TRANSACTION_NONCE_END; i++) {
            if (++trits[i] > 1) {
                trits[i] = -1
            } else {
                break
            }
        }
    } while (true) // eslint-disable-line no-constant-condition

    return hash
}

export const essence = (transactions) => {
    const essenceTrits = new Int8Array(transactions.length * BUNDLE_ESSENCE_LENGTH)

    for (let i = 0; i < transactions.length; i++) {
        essenceTrits.set(transactions[i].slice(BUNDLE_ESSENCE_OFFSET, BUNDLE_ESSENCE_END), i * BUNDLE_ESSENCE_LENGTH)
    }

    return essenceTrits
}

export const hammingWeight = (bundle, offset) => {
    let w = 0
    for (let i = 0; i < BUNDLE_FRAGMENT_LENGTH; i++) {
        w += bundle[offset + i]
    }
    return w
}

export const updateBundleNonce = (Curl729_27) => (transactions, security) => {
    if ([1, 2, 3].indexOf(security) === -1) {
        throw new RangeError('Illegal security level. Expected one of 1, 2 or 3.')
    }

    const essenceTrits = essence(transactions)
    const bundle = new Int8Array(HASH_LENGTH)
    const curl = new Curl729_27(essenceTrits.length)

    do {
        curl.absorb(essenceTrits, 0, essenceTrits.length)
        curl.squeeze(bundle, 0, bundle.length)

        let weightValidityFlag = true
        for (let i = 0; i < security; i++) {
            if (hammingWeight(bundle, i * BUNDLE_FRAGMENT_LENGTH) !== 0) {
                weightValidityFlag = false
                break
            }
        }

        if (weightValidityFlag) {
            break
        }

        for (let i = 0; i < BUNDLE_NONCE_LENGTH; i++) {
            if (++essenceTrits[BUNDLE_NONCE_OFFSET - BUNDLE_ESSENCE_OFFSET + i] > 1) {
                essenceTrits[BUNDLE_NONCE_OFFSET - BUNDLE_ESSENCE_OFFSET + i] = -1
            } else {
                break
            }
        }

        curl.reset(essenceTrits.length)
    } while (true) // eslint-disable-line no-constant-condition

    transactions[0].set(essenceTrits.slice(-BUNDLE_NONCE_LENGTH), BUNDLE_NONCE_OFFSET)

    return bundle
}
