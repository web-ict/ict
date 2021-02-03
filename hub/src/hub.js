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

import bigInt from 'big-integer'
import { ISS } from '@web-ict/iss'
import { persistence } from '@web-ict/persistence'
import { transactionTrits, updateBundleNonce, validateBundle } from '@web-ict/bundle'
import { ADDRESS_LENGTH, HASH_LENGTH, MESSAGE_OR_SIGNATURE_OFFSET } from '@web-ict/transaction'
import { BUNDLE_FRAGMENT_TRYTE_LENGTH, KEY_SIGNATURE_FRAGMENT_LENGTH } from '@web-ict/iss'
import { TRUE, trytes, UNKNOWN } from '@web-ict/converter'

export const HUB = ({
    seed,
    security,
    persistencePath,
    persistenceId,
    reattachIntervalDuration,
    acceptanceThreshold,
    ixi,
    Curl729_27,
}) => {
    const { increment, put, batch, createReadStream } = persistence({ path: persistencePath, id: persistenceId })
    const iss = ISS(Curl729_27, increment)
    const transfers = new Set()
    const inputs = new Set()
    let interval

    const prepareTransfers = async ({ transfers, inputs, timelockLowerBound, timelockUpperBound }) => {
        const transactions = []
        let remainder

        transfers.forEach(({ address, value }) => {
            transactions.push(
                transactionTrits({
                    type: TRUE,
                    address,
                    value,
                    timelockLowerBound,
                    timelockUpperBound,
                })
            )
        })

        inputs.forEach(({ address, security, balance }) => {
            for (let i = 0; i < security; i++) {
                transactions.push(
                    transactionTrits({
                        type: UNKNOWN,
                        address,
                        value: i == 0 ? balance.multiply(-1) : bigInt.zero,
                        timelockLowerBound,
                        timelockUpperBound,
                    })
                )
            }
        })

        const remainderValue = inputs
            .reduce((acc, { balance }) => acc.add(balance), bigInt.zero)
            .subtract(transfers.reduce((acc, { value }) => (acc = acc.add(value)), bigInt.zero))

        if (remainderValue.greater(0)) {
            remainder = await iss.address(seed, security)
            remainder.balance = remainderValue
            transactions.push(
                transactionTrits({
                    type: TRUE,
                    address: remainder.address,
                    value: remainderValue,
                    timelockLowerBound,
                    timelockUpperBound,
                })
            )
        }

        const bundleTrits = updateBundleNonce(Curl729_27)(transactions, security)
        const bundle = iss.bundleTrytes(bundleTrits, security)

        let offset = transfers.length
        inputs.forEach(({ index, security }) => {
            const key = iss.key(iss.subseed(seed, index), security)

            for (let i = 0; i < security; i++) {
                transactions[offset++].set(
                    iss.signatureFragment(
                        bundle.subarray(i * BUNDLE_FRAGMENT_TRYTE_LENGTH, (i + 1) * BUNDLE_FRAGMENT_TRYTE_LENGTH),
                        key.subarray(i * KEY_SIGNATURE_FRAGMENT_LENGTH, (i + 1) * KEY_SIGNATURE_FRAGMENT_LENGTH)
                    ),
                    MESSAGE_OR_SIGNATURE_OFFSET
                )
            }
        })

        return {
            bundle: trytes(bundleTrits, 0, HASH_LENGTH),
            transactions,
            remainder,
        }
    }

    const serializeInput = (input) => {
        input.address = Array.from(input.address)
        input.digests = Array.from(input.digests)
        input.balance = input.balance.toString()
        return input
    }

    const deserializeInput = (input) => {
        input.address = Int8Array.from(input.address)
        input.digests = Int8Array.from(input.digests)
        input.balance = bigInt(input.balance)
        return input
    }

    const serializeTransfer = (transfer) => {
        transfer.transactions = transfer.transactions.map((bundle) =>
            bundle.map((transaction) => Array.from(transaction))
        )
        transfer.input = serializeInput(transfer.input)
        return transfer
    }

    const deserializeTransfer = (transfer) => {
        transfer = JSON.parse(transfer)
        transfer.transactions = transfer.transactions.map((bundle) =>
            bundle.map((transaction) => Int8Array.from(transaction))
        )
        transfer.input = deserializeInput(transfer.input)
        return transfer
    }

    const deposit = async ({ value }) => {
        const input = await iss.address(seed, security)
        const output = await iss.address(seed, security)

        value = bigInt(value)
        input.balance = value
        output.balance = value

        const { bundle, transactions } = await prepareTransfers({
            transfers: [
                {
                    address: output.address,
                    value,
                },
            ],
            inputs: [input],
        })

        const transfer = {
            bundle,
            transactions: [transactions],
            input: output,
        }

        await put('transfer:'.concat(bundle), serializeTransfer(transfer), { valueEncoding: 'json' })
        transfers.add(transfer)

        transfer.attachments = [ixi.attachToTangle(transactions)]

        return trytes(output.address, 0, ADDRESS_LENGTH)
    }

    const getWithdrawalValue = (address) => {
        const bundleTransactions = ixi
            .getBundlesByAddress(address)
            .filter(
                (transactions) =>
                    transactions[0].value.greater(bigInt.zero) &&
                    transactions[1].value.multiply(-1).equals(transactions[0].value)
            )
            .filter((transactions) => validateBundle(transactions))[0]

        if (bundleTransactions !== undefined) {
            return bundleTransactions[0].value
        }
    }

    const withdraw = async ({ address, value }) => {
        const bundleTransactions = ixi
            .getBundlesByAddress(address)
            .filter(
                (transactions) =>
                    transactions[0].value.greater(bigInt.zero) &&
                    transactions[1].value.multiply(-1).equals(transactions[0].value)
            )
            .filter((transactions) => validateBundle(transactions))[0]

        if (bundleTransactions !== undefined) {
            if (!bigInt(value).equals(bundleTransactions[0].value)) {
                throw new Error('Invalid value.')
            }

            const buffer = []
            const iterator = inputs.values()
            let balance = bigInt.zero

            while (inputs.size > 0) {
                const input = iterator.next().value
                buffer.push(input)
                inputs.delete(input)
                balance = balance.add(input.balance)
                if (balance.greaterOrEquals(value)) {
                    break
                }
            }

            if (balance.lesser(value)) {
                buffer.forEach((input) => inputs.set(input))
                throw new Error('Insufficient balance.')
            }

            const { bundle, transactions, remainder } = await prepareTransfers({
                transfers: [
                    {
                        address: bundleTransactions[1].address,
                        value: bundleTransactions[0].value,
                    },
                ],
                inputs: buffer,
            })

            const transfer = {
                bundle,
                transactions,
                input: remainder,
            }

            put('transfer:'.concat(bundle), serializeTransfer(transfer), { valueEncoding: 'json' })
            transfers.add(transfer)

            transfer.attachments = [ixi.attachToTangle(transactions)]

            return transfer.attachments[0]
        }
    }

    const sweep = async (transfer) => {
        const output = await iss.address(seed, security)
        const { transactions } = await prepareTransfers({
            transfers: [
                {
                    address: output.address,
                    value: transfer.input.balance,
                },
            ],
            inputs: [transfer.input],
        })
        transfer.transactions.push(transactions)
        output.balance = transfer.input.balance
        transfer.input = output

        put('transfer:'.concat(transfer.bundle), serializeTransfer(transfer), { valueEncoding: 'json' })

        transfer.attachments = [ixi.attachToTangle(transactions)]
    }

    const getBalance = () => {
        let balance = bigInt.zero
        inputs.forEach((input) => (balance = balance.add(input.balance)))
        return balance
    }

    const reattach = (transfer) => {
        const attachment = transfer.transactions.map((transactions) => ixi.attachToTangle(transactions))[
            transfer.transactions.length - 1
        ]
        transfer.attachments.push(attachment)
    }

    const launch = () => {
        createReadStream({ gte: 'transfer', lte: 'transfer~' })
            .on('data', (data) => transfers.add(deserializeTransfer(data.value)))
            .on('end', () => {
                transfers.forEach((transfer) => {
                    sweep(transfer)
                })
            })

        createReadStream({ gte: 'input', lte: 'input~' }).on('data', (data) => inputs.add(deserializeInput(data.value)))

        interval = setInterval(() => {
            transfers.forEach((transfer) => {
                transfer.attachments.forEach(async (hash) => {
                    const transaction = ixi.getTransaction(hash)

                    if (transaction !== undefined && transaction.confidence >= acceptanceThreshold) {
                        const input = transfer.input
                        input.balance = transfer.value

                        await batch()
                            .del('transfer:'.concat(transfer.bundle))
                            .put('input:'.concat(trytes(input.address, 0, ADDRESS_LENGTH)), serializeInput(input), {
                                valueEncoding: 'json',
                            })

                        transfers.delete(transfer)
                        inputs.add(input)
                    } else {
                        reattach(transfer)
                    }
                })
            })
        }, reattachIntervalDuration)
    }

    const terminate = () => clearInterval(interval)

    return {
        launch,
        terminate,
        deposit,
        getWithdrawalValue,
        withdraw,
        getBalance,
    }
}

HUB.bigInt = bigInt
