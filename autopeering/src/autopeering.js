'use strict'

import { SignalingChannel } from './signaling-channel.js'
import { randomSignalingServer } from './random-signaling-server.js'

export const autopeering = ({
    signalingServers,
    iceServers,
    heartbeatDelay,
}) => {
    const signalingServersCopy = signalingServers.slice()
    const signalingServersBuffer = []

    const discover = callback => {
        let peer
        let signalingChannel
        let peerConnection
        let dataChannel
        let socket = new WebSocket(
            randomSignalingServer(signalingServersCopy, signalingServersBuffer)
        )
        let responded = false
        let heartbeatInterval
        const heartbeatListener = () => (responded = true)
        const heartbeatIntervalFunction = () =>
            responded ? (responded = false) : replace()

        const close = () => {
            socket.close()
            if (signalingChannel) {
                signalingChannel.close()
            }
            if (dataChannel) {
                dataChannel.removeEventListener('message', heartbeatListener)
                dataChannel.close()
                dataChannel = undefined
            }
            if (peerConnection) {
                peerConnection.close()
                peerConnection = undefined
            }
            clearInterval(heartbeatInterval)
        }

        const replace = () => {
            close()
            setTimeout(() => discover(callback), 0)
        }

        const oniceconnectionstatechange = () => {
            if (
                peerConnection &&
                (peerConnection.iceConnectionState === 'failed' ||
                    peerConnection.iceConnectionState === 'disconnected' ||
                    peerConnection.iceConnectionState === 'closed')
            ) {
                replace()
            }
        }

        const onicecandidate = ({ candidate }) =>
            !candidate || signalingChannel.send({ candidate })

        const onnegotiationneeded = () =>
            // Caller issues SDP offer
            peerConnection
                .createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() =>
                    signalingChannel.send({
                        description: peerConnection.localDescription,
                    })
                )
                .catch(callback)

        const ondatachannel = ({ channel }) => {
            dataChannel = peer.dataChannel = channel
            dataChannel.addEventListener('message', heartbeatListener)
            callback(undefined, peer)
        }

        const onsocketopen = () => {
            peer = { close, replace }
            heartbeatInterval = setInterval(
                heartbeatIntervalFunction,
                heartbeatDelay
            )
            signalingChannel = new SignalingChannel(socket)
            signalingChannel.onmessage = ({
                data: { caller, description, candidate },
            }) => {
                if (caller !== undefined) {
                    peerConnection = peer.peerConnection = new RTCPeerConnection(
                        { iceServers }
                    )
                    peerConnection.oniceconnectionstatechange = oniceconnectionstatechange
                    peerConnection.ondatachannel = ondatachannel
                    peerConnection.onicecandidate = onicecandidate
                    peerConnection.onnegotiationneeded = onnegotiationneeded
                    if (caller) {
                        dataChannel = peer.dataChannel = peerConnection.createDataChannel(
                            'ict',
                            {
                                // udp semantics
                                ordered: false,
                                maxRetransmits: 0,
                            }
                        )
                        dataChannel.addEventListener(
                            'message',
                            heartbeatListener
                        )
                        callback(undefined, peer)
                    }
                    return
                }

                if (description) {
                    if (description.type === 'offer') {
                        // Callee receives caller's SDP offer
                        ;(peerConnection.signalingState !== 'stable'
                            ? Promise.all([
                                  peerConnection.setLocalDescription({
                                      type: 'rollback',
                                  }),
                                  peerConnection.setRemoteDescription(
                                      new RTCSessionDescription(description)
                                  ),
                              ])
                            : peerConnection.setRemoteDescription(
                                  new RTCSessionDescription(description)
                              )
                        )
                            .then(() =>
                                // Callee anwsers SDP offer
                                peerConnection
                                    .createAnswer()
                                    .then(answer =>
                                        peerConnection.setLocalDescription(
                                            answer
                                        )
                                    )
                            )
                            .then(() =>
                                signalingChannel.send({
                                    description:
                                        peerConnection.localDescription,
                                })
                            )
                            .catch(callback)
                        return
                    }

                    if (description.type === 'answer') {
                        // Caller receives callee's answer
                        peerConnection
                            .setRemoteDescription(
                                new RTCSessionDescription(description)
                            )
                            .catch(callback)
                    }
                    return
                }

                if (candidate) {
                    peerConnection
                        .addIceCandidate(new RTCIceCandidate(candidate))
                        .catch(callback)
                    return
                }
            }
        }

        socket.onopen = onsocketopen
    }

    return discover
}
