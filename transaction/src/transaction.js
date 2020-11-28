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

'use-strict'

import { trytes, trytesToTrits, integerValue, bigIntegerValue, TRUE, FALSE, TRYTE_WIDTH } from '@web-ict/converter'

export const HASH_LENGTH = 243

export const MESSAGE_OR_SIGNATURE_OFFSET = 0
export const MESSAGE_OR_SIGNATURE_LENGTH = 6561
export const MESSAGE_OR_SIGNATURE_END = MESSAGE_OR_SIGNATURE_OFFSET + MESSAGE_OR_SIGNATURE_LENGTH

export const BUNDLE_ESSENCE_OFFSET = MESSAGE_OR_SIGNATURE_END
export const EXTRA_DATA_DIGEST_OFFSET = MESSAGE_OR_SIGNATURE_END
export const EXTRA_DATA_DIGEST_LENGTH = HASH_LENGTH
export const EXTRA_DATA_DIGEST_END = EXTRA_DATA_DIGEST_OFFSET + EXTRA_DATA_DIGEST_LENGTH
export const ADDRESS_OFFSET = EXTRA_DATA_DIGEST_END
export const ADDRESS_LENGTH = HASH_LENGTH
export const ADDRESS_END = ADDRESS_OFFSET + ADDRESS_LENGTH
export const VALUE_OFFSET = ADDRESS_END
export const VALUE_LENGTH = 81
export const VALUE_END = VALUE_OFFSET + VALUE_LENGTH
export const ISSUANCE_TIMESTAMP_OFFSET = VALUE_END
export const ISSUANCE_TIMESTAMP_LENGTH = 27
export const ISSUANCE_TIMESTAMP_END = ISSUANCE_TIMESTAMP_OFFSET + ISSUANCE_TIMESTAMP_LENGTH
export const TIMELOCK_LOWER_BOUND_OFFSET = ISSUANCE_TIMESTAMP_END
export const TIMELOCK_LOWER_BOUND_LENGTH = 27
export const TIMELOCK_LOWER_BOUND_END = TIMELOCK_LOWER_BOUND_OFFSET + TIMELOCK_LOWER_BOUND_LENGTH
export const TIMELOCK_UPPER_BOUND_OFFSET = TIMELOCK_LOWER_BOUND_END
export const TIMELOCK_UPPER_BOUND_LENGTH = 27
export const TIMELOCK_UPPER_BOUND_END = TIMELOCK_UPPER_BOUND_OFFSET + TIMELOCK_UPPER_BOUND_LENGTH
export const BUNDLE_NONCE_OFFSET = TIMELOCK_UPPER_BOUND_END
export const BUNDLE_NONCE_LENGTH = 81
export const BUNDLE_NONCE_END = BUNDLE_NONCE_OFFSET + BUNDLE_NONCE_LENGTH
export const BUNDLE_ESSENCE_LENGTH = BUNDLE_NONCE_END - BUNDLE_ESSENCE_OFFSET
export const BUNDLE_ESSENCE_END = BUNDLE_NONCE_END

export const TRUNK_TRANSACTION_OFFSET = BUNDLE_NONCE_END
export const TRUNK_TRANSACTION_LENGTH = HASH_LENGTH
export const TRUNK_TRANSACTION_END = TRUNK_TRANSACTION_OFFSET + TRUNK_TRANSACTION_LENGTH
export const BRANCH_TRANSACTION_OFFSET = TRUNK_TRANSACTION_END
export const BRANCH_TRANSACTION_LENGTH = HASH_LENGTH
export const BRANCH_TRANSACTION_END = BRANCH_TRANSACTION_OFFSET + BRANCH_TRANSACTION_LENGTH
export const TAG_OFFSET = BRANCH_TRANSACTION_END
export const TAG_LENGTH = 81
export const TAG_END = TAG_OFFSET + TAG_LENGTH
export const ATTACHMENT_TIMESTAMP_OFFSET = TAG_END
export const ATTACHMENT_TIMESTAMP_LENGTH = 27
export const ATTACHMENT_TIMESTAMP_END = ATTACHMENT_TIMESTAMP_OFFSET + ATTACHMENT_TIMESTAMP_LENGTH
export const ATTACHMENT_TIMESTAMP_LOWER_BOUND_OFFSET = ATTACHMENT_TIMESTAMP_END
export const ATTACHMENT_TIMESTAMP_LOWER_BOUND_LENGTH = 27
export const ATTACHMENT_TIMESTAMP_LOWER_BOUND_END =
    ATTACHMENT_TIMESTAMP_LOWER_BOUND_OFFSET + ATTACHMENT_TIMESTAMP_LOWER_BOUND_LENGTH
export const ATTACHMENT_TIMESTAMP_UPPER_BOUND_OFFSET = ATTACHMENT_TIMESTAMP_LOWER_BOUND_END
export const ATTACHMENT_TIMESTAMP_UPPER_BOUND_LENGTH = 27
export const ATTACHMENT_TIMESTAMP_UPPER_BOUND_END =
    ATTACHMENT_TIMESTAMP_UPPER_BOUND_OFFSET + ATTACHMENT_TIMESTAMP_UPPER_BOUND_LENGTH
export const TRANSACTION_NONCE_OFFSET = ATTACHMENT_TIMESTAMP_UPPER_BOUND_END
export const TRANSACTION_NONCE_LENGTH = 81
export const TRANSACTION_NONCE_END = TRANSACTION_NONCE_OFFSET + TRANSACTION_NONCE_LENGTH

export const TRANSACTION_LENGTH = TRANSACTION_NONCE_END

export const TYPE_OFFSET = 0
export const HEAD_FLAG_OFFSET = 1
export const TAIL_FLAG_OFFSET = 2

export const NULL_HASH_TRYTES = '9'.repeat(HASH_LENGTH / TRYTE_WIDTH)
export const NULL_TAG_TRYTES = '9'.repeat(TAG_LENGTH / TRYTE_WIDTH)
export const NULL_TRANSACTION_HASH_TRYTES =
    'LOOTDIYCRPJG9UCFENYMNXS9QYKSLDQCDGWFIQLEGGJXPYVCNSRAESGALYYGBPAKULJAA9CPFIBLFVTFW'

export const NULL_TRANSACTION_HASH = new Int8Array(HASH_LENGTH)
trytesToTrits(NULL_TRANSACTION_HASH_TRYTES, NULL_TRANSACTION_HASH, 0, HASH_LENGTH)

export const transaction = (Curl729_27, trits) => {
    // Branch transaction must be tail
    if (trits[BRANCH_TRANSACTION_OFFSET + TAIL_FLAG_OFFSET] !== TRUE) {
        return FALSE
    }

    const attachmentTimestamp = integerValue(trits, ATTACHMENT_TIMESTAMP_OFFSET, ATTACHMENT_TIMESTAMP_LENGTH)
    const attachmentTimestampLowerBound = integerValue(
        trits,
        ATTACHMENT_TIMESTAMP_LOWER_BOUND_OFFSET,
        ATTACHMENT_TIMESTAMP_LOWER_BOUND_LENGTH
    )
    if (attachmentTimestamp < attachmentTimestampLowerBound) {
        return FALSE
    }
    const attachmentTimestampUpperBound = integerValue(
        trits,
        ATTACHMENT_TIMESTAMP_UPPER_BOUND_OFFSET,
        ATTACHMENT_TIMESTAMP_UPPER_BOUND_LENGTH
    )
    if (attachmentTimestamp > attachmentTimestampUpperBound) {
        return FALSE
    }

    const timelockLowerBound = integerValue(trits, TIMELOCK_LOWER_BOUND_OFFSET, TIMELOCK_LOWER_BOUND_LENGTH)
    const timelockUpperBound = integerValue(trits, TIMELOCK_UPPER_BOUND_OFFSET, TIMELOCK_UPPER_BOUND_LENGTH)
    if (timelockLowerBound > timelockUpperBound) {
        return FALSE
    }

    const hashTrits = new Int8Array(HASH_LENGTH)
    Curl729_27.get_digest(trits, 0, TRANSACTION_LENGTH, hashTrits, 0)
    const type = hashTrits[TYPE_OFFSET]
    const headFlag = hashTrits[HEAD_FLAG_OFFSET]
    const tailFlag = hashTrits[TAIL_FLAG_OFFSET]

    // Trunk transaction of a head must be tail
    if (headFlag === TRUE && trits[TRUNK_TRANSACTION_OFFSET + TAIL_FLAG_OFFSET] !== TRUE) {
        return FALSE
    }

    // Trunk transaction of a non-head must not be tail
    if (headFlag === FALSE && trits[TRUNK_TRANSACTION_OFFSET + TAIL_FLAG_OFFSET] === TRUE) {
        return FALSE
    }

    return {
        hash: trytes(hashTrits, 0, HASH_LENGTH),
        type,
        headFlag,
        tailFlag,
        messageOrSignature: trits.slice(MESSAGE_OR_SIGNATURE_OFFSET, MESSAGE_OR_SIGNATURE_END),
        extraDataDigest: trytes(trits, EXTRA_DATA_DIGEST_OFFSET, EXTRA_DATA_DIGEST_LENGTH),
        address: trytes(trits, ADDRESS_OFFSET, ADDRESS_LENGTH),
        value: bigIntegerValue(trits, VALUE_OFFSET, VALUE_LENGTH),
        issuanceTimestamp: integerValue(trits, ISSUANCE_TIMESTAMP_OFFSET, ISSUANCE_TIMESTAMP_LENGTH),
        timelockLowerBound,
        timelockUpperBound,
        bundleNonce: trits.slice(BUNDLE_NONCE_OFFSET, BUNDLE_ESSENCE_END),
        trunkTransaction: trytes(trits, TRUNK_TRANSACTION_OFFSET, TRUNK_TRANSACTION_LENGTH),
        branchTransaction: trytes(trits, BRANCH_TRANSACTION_OFFSET, BRANCH_TRANSACTION_LENGTH),
        tag: trytes(trits, TAG_OFFSET, TAG_LENGTH),
        attachmentTimestamp,
        attachmentTimestampLowerBound,
        attachmentTimestampUpperBound,
        nonce: trits.slice(BUNDLE_NONCE_OFFSET, BUNDLE_NONCE_END),
        dump: (target, offset) => target.set(trits, offset),
    }
}
