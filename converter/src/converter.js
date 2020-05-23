import * as bigInt from 'big-integer'

const RADIX = 3
const MAX_TRIT_VALUE = (RADIX - 1) / 2
const MIN_TRIT_VALUE = -MAX_TRIT_VALUE
const TRITS_PER_TRYTE = MAX_TRIT_VALUE - MIN_TRIT_VALUE + 1
const BYTES_PER_ELEMENT = 2
const TRITS_PER_ELEMENT = 9

const TRYTES = '9ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const TRYTES_TRITS = [
    [0, 0, 0],
    [1, 0, 0],
    [-1, 1, 0],
    [0, 1, 0],
    [1, 1, 0],
    [-1, -1, 1],
    [0, -1, 1],
    [1, -1, 1],
    [-1, 0, 1],
    [0, 0, 1],
    [1, 0, 1],
    [-1, 1, 1],
    [0, 1, 1],
    [1, 1, 1],
    [-1, -1, -1],
    [0, -1, -1],
    [1, -1, -1],
    [-1, 0, -1],
    [0, 0, -1],
    [1, 0, -1],
    [-1, 1, -1],
    [0, 1, -1],
    [1, 1, -1],
    [-1, -1, 0],
    [0, -1, 0],
    [1, -1, 0],
    [-1, 0, 0],
]

export const UNKNOWN = 0
export const TRUE = 1
export const FALSE = -1

export const integerValueToTrits = (
    value,
    trits,
    offset = 0,
    length = value ? 1 + Math.floor(Math.log(2 * Math.max(1, Math.abs(value))) / Math.log(RADIX)) : 0
) => {
    let absoluteValue = Math.abs(value)
    while (length-- > 0) {
        let remainder = Math.floor(absoluteValue % 3)
        absoluteValue /= RADIX
        if (remainder > MAX_TRIT_VALUE) {
            remainder = MIN_TRIT_VALUE
            absoluteValue++
        }
        trits[offset++] = value < 0 ? -remainder : remainder
    }
}

export const integerValue = (trits, offset, length) => {
    let value = 0
    for (let i = length; i-- > 0; ) {
        value = value * RADIX + trits[offset + i]
    }
    if (!Number.isSafeInteger(value)) {
        throw new Error('Expected value to be a safe integer.')
    }
    return value
}

export const bigIntegerValueToTrits = (value, trits, offset, length) => {
    let absoluteValue = bigInt.zero.greater(value) ? value.multiply(-1) : value
    while (length-- > 0) {
        const { quotient, remainder } = absoluteValue.divmod(RADIX)
        if (remainder.greater(MAX_TRIT_VALUE)) {
            trits[offset++] = bigInt.zero.greater(value) ? MAX_TRIT_VALUE : MIN_TRIT_VALUE
            absoluteValue = quotient.add(bigInt.one)
        } else {
            trits[offset++] = bigInt.zero.greater(value) ? -remainder.toJSNumber() : remainder.toJSNumber()
            absoluteValue = quotient
        }
    }
}

export const bigIntegerValue = (trits, offset, length) => {
    let value = bigInt.zero
    for (let i = length; i-- > 0; ) {
        value = value.multiply(RADIX).add(trits[offset + i])
    }
    return value
}

export const trytesToTrits = (str) => {
    const trits = new Int8Array(str.length * TRITS_PER_TRYTE)
    for (let i = 0; i < trytes.length; i++) {
        const j = TRYTES.indexOf(str.charAt(i))
        for (let k = 0; k < TRITS_PER_TRYTE; k++) {
            trits[i * TRITS_PER_TRYTE + k] = TRYTES_TRITS[j][k]
        }
    }
    return trits
}

export const trytes = (trits, offset, length) => {
    let str = ''
    for (let i = 0; i < length / TRITS_PER_TRYTE; i++) {
        let j = 0
        for (let k = 0; k < TRITS_PER_TRYTE; k++) {
            j += trits[offset + i * TRITS_PER_TRYTE + k] * TRITS_PER_TRYTE ** k
        }
        if (j < 0) {
            j += TRYTES.length
        }
        str += TRYTES.charAt(j)
    }
    return str
}

export const tritsToBytes = (trits, tritsOffset, tritsLength, bytes, bytesOffset) => {
    do {
        let value = 0
        for (let i = TRITS_PER_ELEMENT; i-- > 0; ) {
            value = value * RADIX + trits[tritsOffset + i]
        }
        tritsOffset += TRITS_PER_ELEMENT
        new DataView(bytes).setInt16(bytesOffset, value, true)
        bytesOffset += BYTES_PER_ELEMENT
    } while ((tritsLength -= TRITS_PER_ELEMENT) > 0)
}

export const bytesToTrits = (buffer, bytesOffset, bytesLength, trits, tritsOffset) => {
    do {
        const value = new DataView(buffer).getInt16(bytesOffset, true)
        bytesOffset += BYTES_PER_ELEMENT
        let absoluteValue = Math.abs(value)
        for (let i = 0; i < TRITS_PER_ELEMENT; i++) {
            let remainder = parseInt(absoluteValue % RADIX)
            absoluteValue /= RADIX
            if (remainder > MAX_TRIT_VALUE) {
                remainder = MIN_TRIT_VALUE
                absoluteValue++
            }
            trits[tritsOffset++] = value < 0 ? -remainder : remainder
        }
    } while ((bytesLength -= BYTES_PER_ELEMENT) > 0)
}

export function sizeInBytes(length) {
    return (length / TRITS_PER_ELEMENT) * BYTES_PER_ELEMENT
}

export function lengthInTrits(size) {
    return (size / BYTES_PER_ELEMENT) * TRITS_PER_ELEMENT
}
