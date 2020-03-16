'use strict'

const SignalingChannel = require('./signaling-channel')

const client = WebSocket => ({ url, reconnectTimeoutDelay }) => {
    let id = 0
    let socket
    let reconnectTimeout

    const connect = callback => {
        socket = new WebSocket(url)
        socket.onopen = () => callback(socket)
        socket.onerror = () => {
            socket = undefined
            if (reconnectTimeoutDelay) {
                reconnectTimeout = setTimeout(
                    () => connect(callback),
                    reconnectTimeoutDelay
                )
            }
        }
    }

    return {
        connect(callback) {
            connect(callback)
        },
        disconnect(errorCode, reason) {
            clearTimeout(reconnectTimeout)
            socket.close(errorCode, reason)
        },
        signaling() {
            return new SignalingChannel(socket, id++)
        },
    }
}

module.exports = client
