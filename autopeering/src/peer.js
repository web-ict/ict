'use strict'

import { randomSignalingServer } from './random-signaling-server.js'
import { SignalingChannel } from './signaling-channel.js'

export const peer = (
    properties,
    signalingServersCopy,
    signalingServersBuffer,
    peers,
    i,
    step,
    receiver
) => {
    const { iceServers, skippingDelay, maxDowntime } = properties
    const ws = new WebSocket(
        randomSignalingServer(signalingServersCopy, signalingServersBuffer)
    )

    let up = false
    const downtimeInterval = setInterval(
        () => (up ? (up = false) : ref.skip()),
        maxDowntime
    )

    const token = step()
    const ref = peers[i]
    ref.token = token
    ref.startTime = Date.now()
    ref.uptime = 0
    ref.numberOfInboundTransactions = 0
    ref.numberOfOutboundTransactions = 0
    ref.numberOfNewTransactions = 0
    ref.rateOfNewTransactions = 0

    let pc
    let dc
    let sc

    ref.terminate = () => {
        ref.token = -1
        if (dc !== undefined) {
            dc.close()
            dc = undefined
        }
        if (pc !== undefined) {
            pc.close()
            pc = undefined
        }
        if (sc) {
            sc.close()
        }
        ws.close()
        clearInterval(downtimeInterval)
    }

    ref.skip = () => {
        if (ref.token === token) {
            ref.terminate()
            setTimeout(
                () =>
                    peer(
                        properties,
                        signalingServersCopy,
                        signalingServersBuffer,
                        peers,
                        i,
                        step,
                        receiver
                    ),
                skippingDelay
            )
        }
    }

    ref.send = (packet, cb) => {
        if (dc !== undefined && dc.readyState === 'open') {
            dc.send(packet)
            cb()
        }
    }

    const onmessage = packet => {
        up = true
        receiver(packet, ref)
    }

    ws.onopen = () => {
        sc = new SignalingChannel(ws)
        console.log('OPEN')
        sc.onmessage = ({ data: { caller, description, candidate } }) => {
            console.log(data)
            if (caller !== undefined) {
                pc = new RTCPeerConnection({ iceServers })

                pc.oniceconnectionstatechange = () => {
                    if (
                        pc &&
                        (pc.iceConnectionState === 'failed' ||
                            pc.iceConnectionState === 'disconnected' ||
                            pc.iceConnectionState === 'closed')
                    ) {
                        ref.skip()
                    }
                }

                pc.ondatachannel = ({ channel }) => {
                    step()
                    dc = channel
                    dc.onmessage = onmessage
                }

                pc.onicecandidate = ({ candidate }) =>
                    !candidate || sc.send({ candidate })

                pc.onnegotiationneeded = () =>
                    // Caller issues SDP offer
                    pc
                        .createOffer()
                        .then(offer => pc.setLocalDescription(offer))
                        .then(() =>
                            sc.send({
                                description: pc.localDescription,
                            })
                        )
                        .catch(console.log)

                if (caller) {
                    dc = pc.createDataChannel('ict', {
                        binaryType: 'arraybuffer',
                        // udp semantics
                        ordered: false,
                        maxRetransmits: 0,
                    })
                    dc.onmessage = onmessage
                }

                return
            }

            if (description) {
                if (description.type === 'offer') {
                    ;(pc.signalingState !== 'stable'
                        ? Promise.all([
                              pc.setLocalDescription({
                                  type: 'rollback',
                              }),
                              pc.setRemoteDescription(
                                  new RTCSessionDescription(description)
                              ),
                          ])
                        : pc.setRemoteDescription(
                              new RTCSessionDescription(description)
                          )
                    )
                        .then(() =>
                            // Callee anwsers SDP offer
                            pc
                                .createAnswer()
                                .then(answer => pc.setLocalDescription(answer))
                        )
                        .then(() =>
                            sc.send({
                                description: pc.localDescription,
                            })
                        )
                        .catch(console.log)
                    return
                }
                if (description.type === 'answer') {
                    pc.setRemoteDescription(
                        new RTCSessionDescription(description)
                    ).catch(console.log)
                }
                return
            }

            if (candidate) {
                pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(
                    console.log
                )
                return
            }
        }
    }
}
