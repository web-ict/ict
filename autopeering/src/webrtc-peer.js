'use strict'

export const WebRTC_Peer = ({ iceServers, signalingChannel }) => (onopen, onpacket, skip) => {
    let sc
    let pc
    let dc

    const onmessage = ({ data }) => onpacket(data)

    const onclose = () => skip()

    sc = signalingChannel(signal => {
        const { caller, description, candidate } = signal

        if (caller !== undefined) {
            pc = new RTCPeerConnection({ iceServers })

            pc.oniceconnectionstatechange = () => {
                if (
                    pc &&
                    (pc.iceConnectionState === 'failed' ||
                        pc.iceConnectionState === 'disconnected' ||
                        pc.iceConnectionState === 'closed')
                ) {
                    skip()
                }
            }

            pc.ondatachannel = ({ channel }) => {
                dc = channel
                dc.binaryType = 'arraybuffer'
                dc.onopen = onopen
                dc.onmessage = onmessage
                dc.onclose = onclose
            }

            pc.onicecandidate = ({ candidate }) => !candidate || sc.send({ candidate })

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
                    // udp semantics
                    ordered: false,
                    maxRetransmits: 0,
                })
                dc.binaryType = 'arraybuffer'
                dc.onopen = onopen
                dc.onmessage = onmessage
                dc.onclose = onclose
            }
        } else if (description) {
            if (description.type === 'offer') {
                ;(pc.signalingState !== 'stable'
                    ? Promise.all([
                          pc.setLocalDescription({
                              type: 'rollback',
                          }),
                          pc.setRemoteDescription(new RTCSessionDescription(description)),
                      ])
                    : pc.setRemoteDescription(new RTCSessionDescription(description))
                )
                    .then(() =>
                        // Callee anwsers SDP offer
                        pc.createAnswer().then(answer => pc.setLocalDescription(answer))
                    )
                    .then(() =>
                        sc.send({
                            description: pc.localDescription,
                        })
                    )
                    .catch(console.log)
            } else if (description.type === 'answer') {
                pc.setRemoteDescription(new RTCSessionDescription(description)).catch(console.log)
            }
            return
        }

        if (candidate) {
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.log)
            return
        }
    })

    return {
        terminate() {
            if (dc !== undefined) {
                dc.close()
            }
            if (pc !== undefined) {
                pc.close()
            }
            if (sc !== undefined) {
                sc.close()
            }
        },
        send(packet) {
            if (dc !== undefined && dc.readyState === 'open') {
                dc.send(packet)
                return true
            }
            return false
        },
    }
}
