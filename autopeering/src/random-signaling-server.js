'use strict'

export const randomSignalingServer = (signalingServers, buffer) => {
    if (signalingServers.length === 0) {
        buffer.forEach(s => signalingServers.push(s))
        buffer.length = 0
    }
    const server = signalingServers.splice(
        Math.floor(Math.random() * signalingServers.length),
        1
    )[0]
    buffer.push(server)
    return server
}
