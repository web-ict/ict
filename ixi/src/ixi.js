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

import { TRUNK_TRANSACTION_OFFSET, BRANCH_TRANSACTION_OFFSET } from '@web-ict/transaction'
import { TRUE } from '@web-ict/converter'

export const IXI = (attachToTangle) => ({
    subtangle,
    entangle,
    request,
    listeners,
    Curl729_27,
    updateTransactionNonce,
}) => {
    const collectBundle = (transaction, bundle = []) => {
        if (bundle.length === 0 && transaction.tailFlag !== TRUE) {
            throw new Error('Expected tail transaction.')
        }

        bundle.push(transaction)

        if (transaction.headFlag === TRUE) {
            return bundle
        } else {
            const trunkTransaction = subtangle.getTransaction(transaction.trunkTransaction)
            if (trunkTransaction !== undefined) {
                return collectBundle(trunkTransaction, bundle)
            } else {
                return []
            }
        }
    }

    return {
        addListener: (fn) => {
            listeners.add(fn)
        },
        removeListener: (fn) => {
            listeners.delete(fn)
        },
        get: subtangle.get,
        getTransaction: subtangle.getTransaction,
        getTransactionsByAddress: subtangle.getTransactionsByAddress,
        getTransactionsByTag: subtangle.getTransactionsByTag,
        collectBundle,
        getBundlesByAddress: (address) => {
            return subtangle
                .getTransactionsByAddress(address)
                .filter(({ tailFlag }) => tailFlag === TRUE)
                .map((transaction) => collectBundle(transaction))
                .filter((bundle) => bundle.length > 0)
        },
        getTransactionsToApprove: (trits) => {
            trits.set(subtangle.bestReferrerHash(), TRUNK_TRANSACTION_OFFSET)
            trits.set(subtangle.bestReferrerHash(), BRANCH_TRANSACTION_OFFSET)
        },
        attachToTangle: attachToTangle({ entangle, subtangle, Curl729_27, updateTransactionNonce }),
        bestReferrerHash: subtangle.bestReferrerHash,
        entangle,
        request,
    }
}
