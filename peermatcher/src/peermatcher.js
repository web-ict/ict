'use strict'

const EventEmitter = require('events')
const WebSocket = require('ws')

const peermatcher = module.exports

peermatcher.server = function(options) {
    const server = new WebSocket.Server(options)

    const buffer = []
    const match = channel => {
        for (let i = 0; i < buffer.length; i++) {
            const peerChannel = buffer[i]
            if (peerChannel.closed) {
                buffer.splice(i, 1)
            } else if (
                // Do not match channels originating from same node
                // Match with each node once
                !(
                    channel.socket.channels.some(
                        c => c.socket === peerChannel.socket
                    ) ||
                    channel.socket.peerSockets.some(
                        s => s === peerChannel.socket
                    )
                )
            ) {
                // Caller issues SDP offer
                channel.caller = true
                // Callee answers SDP offer
                peerChannel.caller = false
                // Match channels originating from different nodes
                channel.peerChannel = Promise.resolve(peerChannel)
                peerChannel.resolvePeerChannel(channel)
                channel.socket.peerSockets.push(peerChannel.socket)
                peerChannel.socket.peerSockets.push(channel.socket)
                buffer.splice(i, 1)
                return
            }
        }

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
        let signal
        try {
            signal = JSON.parse(message)
        } catch (error) {
            this.terminate()
            return
        }

        if (signal.id === undefined) {
            this.terminate()
            return
        }

        let channel = this.channels.find(c => c.id === signal.id)
        if (channel === undefined) {
            channel = {
                id: signal.id,
                socket: this,
            }
            this.channels.push(channel)
            match(channel)
        }

        if (signal.candidate || signal.description) {
            // Forward any ICE candidate or session description to peer
            channel.peerChannel.then(forward(signal))
        } else {
            // Announce roles after matching is done
            channel.peerChannel.then(() =>
                this.send(
                    JSON.stringify({
                        id: channel.id,
                        caller: channel.caller,
                    })
                )
            )
        }
    }

    const onSocketClose = function() {
        this.channels.forEach(channel => {
            channel.closed = true
            // TODO: send signal to reset local state
            channel.peerChannel.then(match)
        })
    }

    let heartbeatInterval
    const onListening = () => {
        if (options.heartbeatIntervalDelay) {
            heartbeatInterval = setInterval(
                heartbeatIntervalFunction,
                Math.max(options.heartbeatIntervalDelay, 30 * 1000)
            )
        }
    }

    const onConnection = socket => {
        socket.channels = []
        socket.peerSockets = []
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
