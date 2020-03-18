'use strict'

const autopeering = (signaling, { iceServers, heartbeatIntervalDelay }) => {
    const discover = callback => {
        const signalingChannel = signaling()
        const intervals = new Set()
        let replacementTimeout
        let responded

        const heartbeat = () => (responded = true)

        const peer = {
            close() {
                intervals.forEach(interval => clearInterval(interval))
                clearTimeout(replacementTimeout)
                signalingChannel.close()
                if (peer.dataChannel) {
                    peer.dataChannel.removeEventListener('message', heartbeat)
                    peer.dataChannel.close()
                    peer.dataChannel = undefined
                }
                if (peer.connection) {
                    peer.connection.close()
                    peer.connection = undefined
                }
            },
            replace() {
                peer.close()
                replacementTimeout = setTimeout(() => discover(callback), 0)
            },
            setInterval(intervalFunction, delay) {
                const interval = setInterval(intervalFunction, delay)
                intervals.add(interval)
                return interval
            },
            clearInterval(interval) {
                clearInterval(interval)
                intervals.delete(interval)
            },
        }

        const createDataChannel = receivedDataChannel => {
            peer.dataChannel =
                receivedDataChannel ||
                peer.connection.createDataChannel('ict', {
                    // udp semantics
                    ordered: false,
                    maxRetransmits: 0,
                })
            // Track activity
            peer.dataChannel.addEventListener('message', heartbeat)
            callback(undefined, peer)
        }

        const heartbeatIntervalFunction = () =>
            // Replace inactive channels
            responded ? (responded = false) : peer.replace()

        const createPeerConnection = () => {
            peer.connection = new RTCPeerConnection({ iceServers })
            peer.connection.oniceconnectionstatechange = () => {
                if (
                    peer.connection &&
                    (peer.connection.iceConnectionState === 'failed' ||
                        peer.connection.iceConnectionState === 'disconnected' ||
                        peer.connection.iceConnectionState === 'closed')
                ) {
                    peer.replace()
                }
            }
            // Callee receives data channel
            peer.connection.ondatachannel = ({ channel }) =>
                createDataChannel(channel)
            peer.connection.onicecandidate = ({ candidate }) =>
                !candidate || signalingChannel.send({ candidate })
            peer.connection.onnegotiationneeded = () =>
                // Caller issues SDP offer
                peer.connection
                    .createOffer()
                    .then(offer => peer.connection.setLocalDescription(offer))
                    .then(() =>
                        signalingChannel.send({
                            description: peer.connection.localDescription,
                        })
                    )
                    .catch(callback)
            peer.setInterval(heartbeatIntervalFunction, heartbeatIntervalDelay)
        }

        signalingChannel.onmessage = ({
            data: { replacement, caller, description, candidate },
        }) => {
            if (caller != undefined) {
                createPeerConnection()
                if (caller) {
                    createDataChannel()
                }
                return
            }

            if (replacement) {
                peer.replace()
                return
            }

            if (description) {
                if (description.type === 'offer') {
                    // Callee receives caller's offer
                    ;(peer.connection.signalingState != 'stable'
                        ? Promise.all([
                              peer.connection
                                  .setLocalDescription({
                                      type: 'rollback',
                                  })
                                  .catch(callback),
                              peer.connection
                                  .setRemoteDescription(
                                      new RTCSessionDescription(description)
                                  )
                                  .catch(callback),
                          ])
                        : peer.connection.setRemoteDescription(
                              new RTCSessionDescription(description)
                          )
                    )
                        .then(() =>
                            // Callee anwsers SDP offer
                            peer.connection
                                .createAnswer()
                                .then(answer =>
                                    peer.connection.setLocalDescription(answer)
                                )
                                .then(() =>
                                    signalingChannel.send({
                                        description:
                                            peer.connection.localDescription,
                                    })
                                )
                        )
                        .catch(callback)
                } else if (description.type === 'answer') {
                    // Caller receives callee's answer
                    peer.connection
                        .setRemoteDescription(
                            new RTCSessionDescription(description)
                        )
                        .catch(callback)
                }
            } else if (candidate) {
                peer.connection
                    .addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(callback)
            }
        }
    }

    return discover
}

module.exports = autopeering
