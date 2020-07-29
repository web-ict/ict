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
    for (let i = 0; i < str.length; i++) {
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
