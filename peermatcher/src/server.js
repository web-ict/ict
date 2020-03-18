'use strict'

const EventEmitter = require('events')
const WebSocket = require('ws')

module.exports = ({ host, port, heartbeatIntervalDelay }) => {
    const server = new WebSocket.Server({ host, port })
    const buffer = []
    let heartbeatInterval

    const hasDifferentSocketThan = peerChannel => channel =>
        peerChannel.socket != channel.socket

    const match = channel => {
        for (const [index, peerChannel] of buffer.entries()) {
            if (peerChannel.closed) {
                // Don't match with disconnected nodes
                buffer.splice(index, 1)
            } else if (
                // Match with distinct nodes
                channel.socket.channels.every(
                    hasDifferentSocketThan(peerChannel)
                ) &&
                channel.socket.peerChannels.every(
                    hasDifferentSocketThan(peerChannel)
                )
            ) {
                buffer.splice(index, 1) // Be matched once
                // Assign roles
                channel.caller = true // Caller issues SDP offer
                peerChannel.caller = false // Callee answers SDP offer
                // Match
                channel.socket.peerChannels.push(peerChannel)
                peerChannel.socket.peerChannels.push(channel)
                channel.peerChannel = Promise.resolve(peerChannel)
                peerChannel.resolvePeerChannel(channel)
                return
            }
        }

        // Wait to be matched
        channel.peerChannel = new Promise(
            resolve => (channel.resolvePeerChannel = resolve)
        )
        buffer.push(channel)
    }

    const forward = signal => channel =>
        channel.socket.send(
            JSON.stringify({
                id: channel.id,
                candidate: signal.candidate,
                description: signal.description,
            })
        )

    const heartbeat = function() {
        this.responded = true
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

    const onMessage = function(message) {
        const socket = this
        let signal

        try {
            signal = JSON.parse(message)
        } catch ({ message }) {
            socket.close(
                1003 /* = Unsupported data */,
                `Nonsesnse signal. ${message}`
            )
            return
        }

        if (signal.id === undefined) {
            socket.close(1003, 'Nonsense signal.')
            return
        }

        let channel = socket.channels.find(({ id }) => id === signal.id)
        if (channel === undefined) {
            channel = {
                id: signal.id,
                socket,
            }
            socket.channels.push(channel)
            match(channel)
        }

        if (signal.candidate || signal.description) {
            // Forward any ICE candidate or session description to peer
            channel.peerChannel.then(forward(signal))
        } else {
            // Announce roles
            channel.peerChannel.then(() =>
                socket.send(
                    JSON.stringify({
                        id: channel.id,
                        caller: channel.caller,
                    })
                )
            )
        }
    }

    const onSocketClose = function() {
        for (const channel of this.channels) {
            channel.closed = true
            channel.peerChannel.then(peerChannel => {
                if (!peerChannel.closed) {
                    // Remove closed channels from socket object
                    const i = peerChannel.socket.channels.findIndex(
                        c => c === peerChannel
                    )
                    if (i > -1) {
                        peerChannel.socket.channels.splice(i, 1)
                    }
                    const j = peerChannel.socket.peerChannels.findIndex(
                        c => c === channel
                    )
                    if (j > -1) {
                        peerChannel.socket.peerChannels.splice(j, 1)
                    }
                    // Send replacement signal to peer
                    peerChannel.socket.send(
                        JSON.stringify({
                            id: peerChannel.id,
                            replacement: 'true',
                        })
                    )
                }
            })
        }
    }

    const onListening = () => {
        if (heartbeatIntervalDelay) {
            heartbeatInterval = setInterval(
                heartbeatIntervalFunction,
                heartbeatIntervalDelay
            )
        }
    }

    const onConnection = socket => {
        socket.channels = []
        socket.peerChannels = []
        socket.on('pong', heartbeat)
        socket.on('message', onMessage)
        socket.on('close', onSocketClose)
    }

    const onClose = () => clearInterval(heartbeatInterval)

    return function() {
        server.on('listening', () => {
            onListening.call(server)
            this.emit('listening')
        })
        server.on('connection', (socket, request) => {
            onConnection.call(server, socket)
            this.emit('connection', socket, request)
        })
        server.on('close', () => {
            onClose.call(server)
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
