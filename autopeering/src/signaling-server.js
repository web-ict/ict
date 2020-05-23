'use strict'

import EventEmitter from 'events'
import WebSocket from 'ws'
import { delayQueue } from '../../dissemination/src/delay-queue.js'

export const signalingServer = ({ host, port, minDelay, maxDelay, heartbeatDelay }) => {
    const server = new WebSocket.Server({ host, port })
    const queue = delayQueue(minDelay, maxDelay)
    const buffer = []
    let heartbeatInterval

    const match = a => {
        a.peer = new Promise(resolve => (a.resolvePeer = resolve))
        a.timeoutID = queue.schedule(() => {
            for (let i = 0; i < buffer.length; i++) {
                let b = buffer[i]
                if (b.closed) {
                    buffer.splice(i, 1)
                } else if (b.remoteAddress !== a.remoteAddress) {
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

    const forward = signal => socket => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(signal))
        }
    }

    const heartbeatIntervalFunction = () =>
        server.clients.forEach(socket => {
            if (socket.responded) {
                socket.responded = false
                socket.ping(() => {})
            } else {
                socket.terminate()
            }
        })

    const heartbeat = function() {
        this.responded = true
    }

    const onMessage = function(message) {
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

    const terminateSocketIfExists = socket => {
        if (socket) {
            socket.terminate()
        }
    }

    const onSocketClose = function() {
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

    return function() {
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
                close: callback => server.close(callback),
                address: () => server.address(),
            },
            EventEmitter.prototype
        )
    }.call({})
}
