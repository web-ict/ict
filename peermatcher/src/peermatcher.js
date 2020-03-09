'use strict'

const EventEmitter = require('events')
const WebSocket = require('ws')

const peermatcher = module.exports

peermatcher.server = function(options) {
    const server = new WebSocket.Server(options)
    let heartbeatInterval

    const match = (buffer => channel => {
        if (buffer.length > 0) {
            const peerChannel = buffer.pop()
            if (!peerChannel.closed) {
                channel.caller = true
                channel.peerChannel = Promise.resolve(peerChannel)
                peerChannel.resolvePeerChannel(channel)
                return
            }
        }
        channel.caller = false
        channel.peerChannel = new Promise(
            resolve => (channel.resolvePeerChannel = resolve)
        )
        buffer.push(channel)
    })([])

    const forward = signal => peerChannel =>
        peerChannel.socket.send(
            JSON.stringify({
                id: peerChannel.id,
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

        const { id } = signal

        if (id === undefined) {
            this.terminate()
            return
        }

        heartbeat.call(this)

        let channel = this.channels.get(id)

        if (channel === undefined) {
            channel = {
                id,
                socket: this,
            }
            this.channels.set(id, channel)
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
            // channel.peerChannel.then(match)
        })
    }

    const onListening = () => {
        if (options.heartbeatIntervalDelay) {
            heartbeatInterval = setInterval(
                heartbeatIntervalFunction,
                Math.max(options.heartbeatIntervalDelay, 30 * 1000)
            )
        }
    }

    const onConnection = socket => {
        socket.channels = new Map()
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
