import { trytes, integerValue, bigIntegerValue } from '../../converter'

export const MESSAGE_OR_SIGNATURE_BEGIN = 0
export const MESSAGE_OR_SIGNATURE_END = 6561
export const EXTRA_DATA_DIGEST_BEGIN = MESSAGE_OR_SIGNATURE_END
export const EXTRA_DATA_DIGEST_END = EXTRA_DATA_DIGEST_BEGIN + 243
export const BUNDLE_ESSENCE_BEGIN = EXTRA_DATA_DIGEST_BEGIN
export const ADDRESS_BEGIN = EXTRA_DATA_DIGEST_END
export const ADDRESS_END = ADDRESS_BEGIN + 243
export const VALUE_BEGIN = ADDRESS_END
export const VALUE_END = VALUE_BEGIN + 81
export const ISSUANCE_TIMESTAMP_BEGIN = VALUE_END
export const ISSUANCE_TIMESTAMP_END = ISSUANCE_TIMESTAMP_BEGIN + 27
export const TIMELOCK_LOWER_BOUND_BEGIN = ISSUANCE_TIMESTAMP_END
export const TIMELOCK_LOWER_BOUND_END = TIMELOCK_LOWER_BOUND_BEGIN + 27
export const TIMELOCK_UPPER_BOUND_BEGIN = TIMELOCK_LOWER_BOUND_END
export const TIMELOCK_UPPER_BOUND_END = TIMELOCK_UPPER_BOUND_BEGIN + 27
export const BUNDLE_NONCE_BEGIN = TIMELOCK_UPPER_BOUND_END
export const BUNDLE_NONCE_END = BUNDLE_NONCE_BEGIN + 81
export const BUNDLE_ESSENCE_END = BUNDLE_NONCE_END
export const TRUNK_TRANSACTION_BEGIN = BUNDLE_NONCE_END
export const TRUNK_TRANSACTION_END = TRUNK_TRANSACTION_BEGIN + 243
export const BRANCH_TRANSACTION_BEGIN = TRUNK_TRANSACTION_END
export const BRANCH_TRANSACTION_END = BRANCH_TRANSACTION_BEGIN + 243
export const TAG_BEGIN = BRANCH_TRANSACTION_END
export const TAG_END = TAG_BEGIN + 81
export const ATTACHMENT_TIMESTAMP_BEGIN = TAG_END
export const ATTACHMENT_TIMESTAMP_END = ATTACHMENT_TIMESTAMP_BEGIN + 27
export const ATTACHMENT_TIMESTAMP_LOWER_BOUND_BEGIN = ATTACHMENT_TIMESTAMP_END
export const ATTACHMENT_TIMESTAMP_LOWER_BOUND_END = ATTACHMENT_TIMESTAMP_LOWER_BOUND_BEGIN + 27
export const ATTACHMENT_TIMESTAMP_UPPER_BOUND_BEGIN = ATTACHMENT_TIMESTAMP_LOWER_BOUND_END
export const ATTACHMENT_TIMESTAMP_UPPER_BOUND_END = ATTACHMENT_TIMESTAMP_UPPER_BOUND_BEGIN + 27
export const TRANSACTION_NONCE_BEGIN = ATTACHMENT_TIMESTAMP_UPPER_BOUND_END
export const TRANSACTION_NONCE_END = TRANSACTION_NONCE_BEGIN + 81
export const TRANSACTION_LENGTH = TRANSACTION_NONCE_END

export const TYPE_BEGIN = 0
export const HEAD_FLAG_BEGIN = 1
export const TAIL_FLAG_BEGIN = 2
export const HASH_LENGTH = 243

export const NULL_HASH = new Int8Array(HASH_LENGTH).fill(0)
export const NULL_TAG = new Int8Array(TAG_END - TAG_BEGIN).fill(0)

export const transaction = (Curl729_27, trits) => {
    // Branch transaction must be tail
    if (trits[BRANCH_TRANSACTION_BEGIN + TAIL_FLAG_BEGIN] === -1) {
        console.log('Branch must be tail')
        return undefined
    }

    const attachmentTimestamp = integerValue(trits.slice(ATTACHMENT_TIMESTAMP_BEGIN, ATTACHMENT_TIMESTAMP_END))
    const attachmentTimestampLowerBound = integerValue(
        trits.slice(ATTACHMENT_TIMESTAMP_LOWER_BOUND_BEGIN, ATTACHMENT_TIMESTAMP_LOWER_BOUND_END)
    )
    if (attachmentTimestamp < attachmentTimestampLowerBound) {
        return undefined
    }
    const attachmentTimestampUpperBound = integerValue(
        trits.slice(ATTACHMENT_TIMESTAMP_UPPER_BOUND_BEGIN, ATTACHMENT_TIMESTAMP_UPPER_BOUND_END)
    )
    if (attachmentTimestamp > attachmentTimestampUpperBound) {
        return undefined
    }

    const timelockLowerBound = integerValue(trits.slice(TIMELOCK_LOWER_BOUND_BEGIN, TIMELOCK_LOWER_BOUND_END))
    const timelockUpperBound = integerValue(trits.slice(TIMELOCK_UPPER_BOUND_BEGIN, TIMELOCK_UPPER_BOUND_END))
    if (timelockLowerBound > timelockUpperBound) {
        return undefined
    }

    const hashTrits = new Int8Array(HASH_LENGTH)
    Curl729_27.get_digest(trits, 0, TRANSACTION_LENGTH, hashTrits, 0)
    const type = hashTrits[TYPE_BEGIN]
    const headFlag = hashTrits[HEAD_FLAG_BEGIN]
    const tailFLAG = hashTrits[TAIL_FLAG_BEGIN]

    // Trunk transaction of a head must be tail
    if (headFlag > -1 && trits[TRUNK_TRANSACTION_BEGIN + TAIL_FLAG_BEGIN] === -1) {
        return undefined
    }

    // Trunk transaction of a non-head must not be tail
    if (headFlag === -1 && trits[TRUNK_TRANSACTION_BEGIN + TAIL_FLAG_BEGIN] > -1) {
        return undefined
    }

    return {
        hash: trytes(hashTrits, 0, HASH_LENGTH),
        type,
        headFlag,
        tailFLAG,
        messageOrSignature: trits.slice(MESSAGE_OR_SIGNATURE_BEGIN, MESSAGE_OR_SIGNATURE_END),
        extraDataDigest: trytes(trits.slice(EXTRA_DATA_DIGEST_BEGIN, EXTRA_DATA_DIGEST_END)),
        address: trytes(trits.slice(ADDRESS_BEGIN, ADDRESS_END)),
        value: bigIntegerValue(trits.slice(VALUE_BEGIN, VALUE_END)),
        issuanceTimestamp: integerValue(trits.slice(ISSUANCE_TIMESTAMP_BEGIN, ISSUANCE_TIMESTAMP_END)),
        timelockLowerBound,
        timelockUpperBound,
        bundleNonce: trits.slice(BUNDLE_NONCE_BEGIN, BUNDLE_ESSENCE_END),
        trunkTransaction: trytes(trits.slice(TRUNK_TRANSACTION_BEGIN, TRUNK_TRANSACTION_END)),
        branchTransaction: trytes(trits.slice(BRANCH_TRANSACTION_BEGIN, BRANCH_TRANSACTION_END)),
        tag: trytes(trits.slice(TAG_BEGIN, TAG_END)),
        attachmentTimestamp,
        attachmentTimestampLowerBound,
        attachmentTimestampUpperBound,
        nonce: trits.slice(BUNDLE_NONCE_BEGIN, BUNDLE_NONCE_END),
        dump: (target, offset) => target.set(trits, offset),
    }
}
