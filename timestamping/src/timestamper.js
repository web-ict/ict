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

/*
A timestamper chooses 3 random secret seeds.
For each seed the timestamper generates a very long hash chain (e.g. Curl(Curl(Curl(seed))) = X0) and publishes X0, Y0, and Z0 obtained from all 3 seeds.
At timestamp 0 the timestamper releases either X0 and Y0, or X0 and Z0, or Y0 and Z0.
At timestamp 1 the timestamper releases, for example, X1 and Y1 such that Curl(X1) = X0 and Curl(Y1) = Y0.

We use granularity of N seconds, each timestamper decides himself what N to pick, smaller N will require to generate longer hash chains.
The timestamper can omit some timestamps, in this case the corresponding Xk, Yk, Zk are not published.
The gap won't lead to problem for timestamp verification, because instead of Curl(X) we'll just need to do something like Curl(Curl(Curl(X))).

We use 3 seeds but transactions include only derivatives of 2 of them. Each timestamper is supposed to run 3 independent servers.
At any moment one of the servers can go offline for maintenance or because of a fault.
A transaction with a timestamp looks like this:
[TimestamperId][TimestampValue][Y][Z] or 
[TimestamperId][X][TimestampValue][Z] or 
[TimestamperId][X][Y][TimestampValue], depending on if X, Y, or Z is omitted.

TimestampValue, X, Y, Z are all 81-trit long, so last 3 fields fit into 243 trits.
[TimestamperId] can be taken from another fragment of timestamping transaction or it can be derived logically.

Taking into account that signature verification is expensive resource-wise it's advized to verify timestamp validity first.
If timestamp is not very old and valid then we can do signature verification.npm
 */

'use strict'

import { MESSAGE_OR_SIGNATURE_END } from '@web-ict/transaction'
import { integerValueToTrits, trytesToTrits } from '@web-ict/converter'
import WebSocket from 'ws'
import url from 'url'

export const TIMESTAMP_LENGTH = 81
export const TIMESTAMP_OFFSET = MESSAGE_OR_SIGNATURE_END - 3 * TIMESTAMP_LENGTH

export const timestamper = ({ timestampingServers, reconnectTimeoutDuration, retrytIntervalDuration }) => {
    const transactions = new Map()
    const sockets = new Array(3)
    let index = 0
    let running = true

    const onmessage = (socket) => (event) => {
        let message
        try {
            message = JSON.parse(event.data)
        } catch {
            socket.close(3000, 'Invalid message.')
            return
        }

        console.log(message)

        const transaction = transactions.get(message.timestampValue)
        if (transaction) {
            const numberOfTimestamps = transaction.timestamps.filter((t) => t === true).length
            if (numberOfTimestamps < 2) {
                transaction.trits.set(
                    trytesToTrits(message.timestamp).slice(0, TIMESTAMP_LENGTH),
                    TIMESTAMP_OFFSET + message.timestampIndex * TIMESTAMP_LENGTH
                )
            } else if (numberOfTimestamps === 2) {
                integerValueToTrits(
                    message.timestampValue,
                    transaction.trits,
                    TIMESTAMP_OFFSET + transaction.timestamps.indexOf(false) * TIMESTAMP_LENGTH,
                    TIMESTAMP_LENGTH
                )
                transactions.delete(message.timestampValue)
                clearInterval(transaction.interval)
                transaction.resolve(transaction.trits)
            }
            transaction.timestamps[message.timestampIndex] = true
        }
    }

    const connect = (server, i) => {
        const { username, password } = new URL(server)
        const socket = (sockets[i] = new WebSocket(url.format(new URL(server), { auth: false }), {
            perMessageDeflate: false,
            headers: {
                Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
            },
        }))

        let resolveReady
        socket.ready = new Promise((resolve) => (resolveReady = resolve))

        socket.onopen = () => {
            console.log('open')
            resolveReady()
        }

        socket.onmessage = onmessage(socket)

        socket.onclose = () => {
            if (running) {
                setTimeout(() => connect(server, i), reconnectTimeoutDuration)
            }
        }

        socket.onerror = () => {
            socket.close()
        }
    }

    timestampingServers.forEach(connect)

    const requestTimestamps = (timestampValue) =>
        sockets.forEach((socket) => socket.ready.then(() => socket.send(JSON.stringify({ timestampValue }))))

    return {
        close() {
            running = false
            sockets.forEach((socket) => socket.close())
        },
        timestamp(trits) {
            const timestampValue = index
            index++

            return new Promise((resolve) => {
                transactions.set(timestampValue, {
                    resolve,
                    trits,
                    timestamps: Array(3).fill(false),
                    interval: setInterval(() => requestTimestamps(timestampValue), retrytIntervalDuration),
                })

                requestTimestamps(timestampValue)
            })
        },
    }
}
