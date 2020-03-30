'use strict'

export function SignalingChannel(socket) {
    const onmessage = ({ data }) => {
        try {
            data = JSON.parse(data)
        } catch ({ message }) {
            socket.close(3000, `Nonsense signal. ${message}`)
            return
        }

        if (
            data.id === undefined &&
            data.caller === undefined &&
            !data.candidate &&
            !data.description &&
            !data.close
        ) {
            socket.close(3000, 'Nonsense signal.')
        } else {
            this.onmessage({ data })
        }
    }

    this.send = data => socket.send(JSON.stringify(data))
    this.close = () => socket.removeEventListener('message', onmessage)

    socket.addEventListener('message', onmessage)
}
