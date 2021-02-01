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

import { ISS, BUNDLE_FRAGMENT_TRYTE_LENGTH, KEY_SIGNATURE_FRAGMENT_LENGTH } from '@web-ict/iss'
import { Curl729_27 } from '@web-ict/curl'
import { transactionTrits, updateTransactionNonce } from '@web-ict/bundle'
import { INDEX_OFFSET, CONFIDENCE_OFFSET, SIBLINGS_OFFSET } from './milestone.js'
import { ADDRESS_LENGTH, MESSAGE_OR_SIGNATURE_LENGTH } from '@web-ict/transaction'
import { integerValueToTrits, trytes, TRUE, FALSE, UNKNOWN } from '@web-ict/converter'
import { persistence } from '@web-ict/persistence'
import fs from 'fs'

export const economicActor = ({
    persistencePath,
    persistenceId,
    merkleTreeFile,
    seed,
    depth,
    security,
    milestoneIntervalDuration,
    ixi,
}) => {
    const { increment } = persistence({ path: persistencePath, id: persistenceId })
    const root = JSON.parse(fs.readFileSync(merkleTreeFile))
    const addressTrytes = trytes(root.address, 0, ADDRESS_LENGTH)
    const iss = ISS(Curl729_27)
    let interval
    let index = -1

    const milestoneIssuanceRoutine = async () => {
        let trunkTransaction = ixi.bestReferrerHash()
        const branchTransaction = ixi.bestReferrerHash()
        const confidence = 100

        index = await increment()

        if (index >= 2 ** depth) {
            clearInterval(interval)
            return
        }

        let messageOrSignature = new Int8Array(MESSAGE_OR_SIGNATURE_LENGTH)
        integerValueToTrits(index, messageOrSignature, INDEX_OFFSET)
        integerValueToTrits(confidence, messageOrSignature, CONFIDENCE_OFFSET)

        const { leafIndex, siblings } = iss.getMerkleProof(root, index)
        messageOrSignature.set(siblings, SIBLINGS_OFFSET)

        const siblingsTransaction = transactionTrits({
            messageOrSignature,
            address: root.address,
            trunkTransaction,
            branchTransaction,
        })

        const hashToSign = updateTransactionNonce(Curl729_27)(siblingsTransaction, UNKNOWN, TRUE, FALSE, security)
        trunkTransaction = hashToSign

        ixi.entangle(siblingsTransaction)

        const key = iss.key(iss.subseed(seed, leafIndex), security)
        const hashToSignTrytes = iss.bundleTrytes(hashToSign, security)

        for (let i = 0; i < security; i++) {
            const signatureTransaction = transactionTrits({
                messageOrSignature: iss.signatureFragment(
                    hashToSignTrytes.slice(i * BUNDLE_FRAGMENT_TRYTE_LENGTH, (i + 1) * BUNDLE_FRAGMENT_TRYTE_LENGTH),
                    key.slice(i * KEY_SIGNATURE_FRAGMENT_LENGTH, (i + 1) * KEY_SIGNATURE_FRAGMENT_LENGTH)
                ),
                address: root.address,
                trunkTransaction: trunkTransaction.slice(),
                branchTransaction,
            })

            trunkTransaction = updateTransactionNonce(Curl729_27)(
                signatureTransaction,
                UNKNOWN,
                FALSE,
                i === security - 1 ? TRUE : FALSE
            )

            ixi.entangle(signatureTransaction)
        }
    }

    return {
        launch() {
            setInterval(milestoneIssuanceRoutine, milestoneIntervalDuration)
        },
        terminate() {
            clearInterval(interval)
        },
        address() {
            return addressTrytes
        },
        info() {
            return {
                address: addressTrytes,
                latestMilestoneIndex: index,
            }
        },
    }
}
