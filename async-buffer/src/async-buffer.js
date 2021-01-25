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

export const asyncBuffer = (length = Number.POSITIVE_INFINITY) => {
    if (length !== Number.POSITIVE_INFINITY && !Number.isInteger(length)) {
        throw new TypeError('Illegal buffer length.')
    }

    if (length <= 0) {
        throw new RangeError('Illegal buffer length.')
    }

    // A buffer consists of 2 asynchrounous queues.
    // Writer resolves future values of the outbound queue.
    // Reader resolves past values of the inbound queue.
    // This means that we can start reading values from async buffers before those are written to it.
    const inboundQueue = []
    const outboundQueue = []

    return {
        write: (value) => {
            if (outboundQueue.length !== 0) {
                outboundQueue.shift()(value)
            }
            // A buffer has length indicating how many values can be queued.
            // If buffer is to exceed specified length, an error is thrown.
            else if (inboundQueue.length < length) {
                inboundQueue.push(value)
            } else {
                throw new RangeError(`Buffer can not exceed specified length of ${length} items.`)
            }
        },

        read: () => {
            if (outboundQueue.length === length) {
                throw new RangeError(`Buffer can not exceed specified length of ${length} items.`)
            }
            return new Promise((resolve) => {
                if (inboundQueue.length !== 0) {
                    resolve(inboundQueue.shift())
                } else {
                    outboundQueue.push(resolve)
                }
            })
        },
    }
}
