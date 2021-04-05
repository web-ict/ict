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

import { integerValueToTrits, trytes, TRUE, FALSE } from '@web-ict/converter'
import {
    BRANCH_TRANSACTION_OFFSET,
    TRUNK_TRANSACTION_OFFSET,
    TRUNK_TRANSACTION_LENGTH,
    ATTACHMENT_TIMESTAMP_OFFSET,
    ATTACHMENT_TIMESTAMP_LOWER_BOUND_OFFSET,
    ATTACHMENT_TIMESTAMP_UPPER_BOUND_OFFSET,
} from '@web-ict/transaction'
import Worker from './attach-to-tangle.worker.js'

export const attachToTangle = ({ entangle, subtangle }) => async (transactions, attachmentTimestampDelta) => {
    const branchTransaction = subtangle.bestReferrerHash()
    let trunkTransaction = subtangle.bestReferrerHash()

    for (let i = transactions.length - 1; i >= 0; i--) {
        transactions[i].set(branchTransaction, BRANCH_TRANSACTION_OFFSET)
        transactions[i].set(trunkTransaction, TRUNK_TRANSACTION_OFFSET)

        const attachmentTimestamp = Math.floor(Date.now() / 1000)
        integerValueToTrits(attachmentTimestamp, transactions[i], ATTACHMENT_TIMESTAMP_OFFSET)
        integerValueToTrits(
            attachmentTimestamp - attachmentTimestampDelta,
            transactions[i],
            ATTACHMENT_TIMESTAMP_LOWER_BOUND_OFFSET
        )
        integerValueToTrits(
            attachmentTimestamp + attachmentTimestampDelta,
            transactions[i],
            ATTACHMENT_TIMESTAMP_UPPER_BOUND_OFFSET
        )

        const result = await new Promise((resolve) => {
            const worker = new Worker()

            worker.postMessage(
                JSON.stringify({
                    type: transactions[i].type,
                    transaction: Array.from(transactions[i]),
                    headFlag: i === transactions.length - 1 ? TRUE : FALSE,
                    tailFlag: i === 0 ? TRUE : FALSE,
                })
            )

            worker.onmessage = ({ data }) => {
                worker.terminate()
                resolve(JSON.parse(data))
            }
        })

        trunkTransaction = Int8Array.from(result.trunkTransaction)
        transactions[i] = Int8Array.from(result.transaction)

        entangle(transactions[i])
    }

    return trytes(trunkTransaction, 0, TRUNK_TRANSACTION_LENGTH)
}
