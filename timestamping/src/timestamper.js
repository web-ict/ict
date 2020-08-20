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

import { MESSAGE_OR_SIGNATURE_END } from '@web-ict/transaction'
import { integerValueToTrits, trytesToTrits } from '@web-ict/converter'
import WebSocket from 'ws'
import url from 'url'

export const TIMESTAMP_LENGTH = 81
export const TIMESTAMP_OFFSET = MESSAGE_OR_SIGNATURE_END - 3 * TIMESTAMP_LENGTH

export const timestamper = ({ timestampingServers, reconnectTimeoutDuration, retryIntervalDuration }) => {
    const sockets = new Array(3)
    const requests = new Map()
    let timestampValue = 0
    let running = true

    const onmessage = (socket) => (event) => {
        try {
            const { timestamp, i, j } = JSON.parse(event.data)
            const request = requests.get(i)

            if (request !== undefined) {
                const { timestamps, retryInterval, resolve } = request

                if (timestamps.filter((timestamp) => timestamp !== undefined).length === 2) {
                    requests.delete(i)
                    clearInterval(retryInterval)
                    resolve(timestamps)
                } else {
                    timestamps[j] = timestamp
                }
            }
        } catch ({ message }) {
            socket.close(3000, message)
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

        socket.ready = new Promise(
            (resolve) =>
                (socket.onopen = () => {
                    resolve()
                })
        )

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

    const send = (i) => sockets.forEach((socket) => socket.ready.then(() => socket.send(JSON.stringify({ i }))))

    const retry = (i) => () => send(i)

    const request = (i) =>
        new Promise((resolve) => {
            requests.set(i, {
                timestamps: Array(3),
                retryInterval: setInterval(retry(i), retryIntervalDuration),
                resolve,
            })
            send(i)
        })

    timestampingServers.forEach(connect)

    return {
        close() {
            running = false
            sockets.forEach((socket) => socket.close())
        },
        timestamp(trits) {
            const i = timestampValue
            timestampValue++

            return request(i).then((timestamps) => {
                timestamps.forEach((timestamp, j) =>
                    timestamp === undefined
                        ? integerValueToTrits(i, trits, TIMESTAMP_OFFSET + j * TIMESTAMP_LENGTH, TIMESTAMP_LENGTH)
                        : trytesToTrits(timestamp, trits, TIMESTAMP_OFFSET + j * TIMESTAMP_LENGTH, TIMESTAMP_LENGTH)
                )
            })
        },
    }
}
