import { trytes, integerValue, bigIntegerValue, FALSE, UNKNOWN } from '../../converter'

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

export const NULL_HASH = new Int8Array(HASH_LENGTH).fill(UNKNOWN)
export const NULL_TAG = new Int8Array(TAG_LENGTH).fill(UNKNOWN)

export const transaction = (Curl729_27, trits) => {
    // Branch transaction must be tail
    if (trits[BRANCH_TRANSACTION_OFFSET + TAIL_FLAG_OFFSET] === FALSE) {
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
    const tailFLAG = hashTrits[TAIL_FLAG_OFFSET]

    // Trunk transaction of a head must be tail
    if (headFlag !== FALSE && trits[TRUNK_TRANSACTION_OFFSET + TAIL_FLAG_OFFSET] === FALSE) {
        return FALSE
    }

    // Trunk transaction of a non-head must not be tail
    if (headFlag === FALSE && trits[TRUNK_TRANSACTION_OFFSET + TAIL_FLAG_OFFSET] !== FALSE) {
        return FALSE
    }

    return {
        hash: trytes(hashTrits, 0, HASH_LENGTH),
        type,
        headFlag,
        tailFLAG,
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
