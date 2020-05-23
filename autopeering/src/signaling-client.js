'use strict'

export const signalingClient = ({ signalingServers }) => {
    const urls = [signalingServers.slice(), []]

    return onsignal => {
        const ws = new WebSocket(
            (([a, b]) => {
                if (a.length === 0) {
                    b.forEach(url => a.push(url))
                    b.length = 0
                }
                const url = a.splice(Math.floor(Math.random() * a.length), 1)[0]
                b.push(url)
                return url
            })(urls)
        )

        const onmessage = event => {
            let signal
            try {
                signal = JSON.parse(event.data)
            } catch ({ message }) {
                ws.close(3000, `Nonsense signal. ${message}`)
                return
            }

            if (
                signal.caller !== undefined ||
                signal.candidate !== undefined ||
                signal.description !== undefined
            ) {
                onsignal(signal)
            } else {
                ws.close(3000, 'Nonsense signal.')
            }
        }

        ws.onopen = () => {
            ws.onmessage = onmessage
        }

        return {
            send(data) {
                ws.send(JSON.stringify(data))
            },
            close() {
                ws.close()
                ws.removeEventListener('message', onmessage)
            },
        }
    }
}
