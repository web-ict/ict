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

import { hashChain } from './hashchain.js'
import { TIMESTAMP_LENGTH } from './timestamper.js'
import { trytes } from '@web-ict/converter'
import WebSocket from 'ws'

export const timestampingServer = ({ Curl729_27, seed, length, timestampIndex, host, port, user, password }) => {
    if (!Number.isInteger(length) || length <= 0) {
        throw new Error('Illegal length.')
    }

    const j = timestampIndex
    if (!(j === 0 || j === 1 || j === 2)) {
        throw new Error('Illegal index: j.')
    }

    const buffer = hashChain(Curl729_27)(seed, length, TIMESTAMP_LENGTH)
    const server = new WebSocket.Server({ host, port })

    const onmessage = (socket) => (data) => {
        try {
            const { i } = JSON.parse(data)
            socket.send(
                JSON.stringify({
                    timestamp: trytes(buffer, i * TIMESTAMP_LENGTH, TIMESTAMP_LENGTH),
                    i,
                    j,
                })
            )
        } catch ({ message }) {
            socket.close(3000, message)
        }
    }

    const onconnection = (socket, req) => {
        if (req.headers.authorization && user && password) {
            const [userB, passwordB] = new Buffer(req.headers.authorization.split(' ')[1], 'base64')
                .toString()
                .split(':')
            if (user !== userB || password !== passwordB) {
                socket.close(3001, 'Unauthorized.')
                return
            }
        }

        socket.on('message', onmessage(socket))
    }

    server.on('connection', onconnection)

    return {
        getHash(i = 0) {
            return buffer.slice(i * TIMESTAMP_LENGTH, TIMESTAMP_LENGTH)
        },
        close(callback) {
            server.close(callback)
        },
    }
}
