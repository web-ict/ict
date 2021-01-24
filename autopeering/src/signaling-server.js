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

import EventEmitter from 'events'
import WebSocket from 'ws'
import { delayQueue } from '@web-ict/dissemination'

export const signalingServer = ({ host, port, minDelay, maxDelay, heartbeatDelay }) => {
    const server = new WebSocket.Server({ host, port })
    const queue = delayQueue(minDelay, maxDelay)
    const buffer = []
    let heartbeatInterval

    const match = (a) => {
        a.peer = new Promise((resolve) => (a.resolvePeer = resolve))
        a.timeoutID = queue.schedule(() => {
            for (let i = 0; i < buffer.length; i++) {
                let b = buffer[i]
                if (b.closed) {
                    buffer.splice(i, 1)
                } /*if (b.remoteAddress !== a.remoteAddress)*/ else {
                    buffer.splice(i, 1)
                    // Assign roles
                    a.caller = true // Caller issues SDP offer
                    b.caller = false // Callee answers SDP offer
                    // Match
                    a.resolvePeer(b)
                    b.resolvePeer(a)
                    return
                }
            }
            buffer.push(a)
        })
    }

    const forward = (signal) => (socket) => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(signal))
        }
    }

    const heartbeatIntervalFunction = () =>
        server.clients.forEach((socket) => {
            if (socket.responded) {
                socket.responded = false
                socket.ping(() => {})
            } else {
                socket.terminate()
            }
        })

    const heartbeat = function () {
        this.responded = true
    }

    const onMessage = function (message) {
        let signal

        try {
            signal = JSON.parse(message)
        } catch (error) {
            this.close(1003 /* = Unsupported data */, `Nonsesnse signal. ${error.message}`)
            return
        }

        heartbeat.call(this)

        if (signal.candidate || signal.description) {
            // Forward any ICE candidate or session description to peer
            this.peer.then(forward(signal))
        }
    }

    const terminateSocketIfExists = (socket) => {
        if (socket) {
            socket.terminate()
        }
    }

    const onSocketClose = function () {
        queue.cancel(this.timeoutID)
        this.closed = true
        this.resolvePeer()
        this.peer.then(terminateSocketIfExists)
    }

    const onListening = () => {
        if (heartbeatDelay) {
            heartbeatInterval = setInterval(heartbeatIntervalFunction, heartbeatDelay)
        }
    }

    const onConnection = (socket, req) => {
        socket.remoteAddress = req.headers['x-forwarded-for']
            ? req.headers['x-forwarded-for'].split(/\s*,\s*/)[0]
            : req.connection.remoteAddress
        socket.on('message', onMessage)
        socket.on('close', onSocketClose)
        match(socket)
        socket.peer.then(() =>
            socket.send(
                JSON.stringify({
                    caller: socket.caller,
                })
            )
        )
    }

    const onClose = () => clearInterval(heartbeatInterval)

    return function () {
        server.on('listening', () => {
            onListening()
            this.emit('listening')
        })
        server.on('connection', (socket, req) => {
            onConnection(socket, req)
            this.emit('connection', socket, req)
        })
        server.on('close', () => {
            onClose()
            this.emit('close')
        })

        return Object.assign(
            this,
            {
                close: (callback) => server.close(callback),
                address: () => server.address(),
            },
            EventEmitter.prototype
        )
    }.call({})
}
