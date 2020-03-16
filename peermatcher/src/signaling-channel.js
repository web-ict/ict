function SignalingChannel(socket, id) {
    const onmessage = ({ data }) => {
        try {
            data = JSON.parse(data)
        } catch ({ message }) {
            socket.close(3000, `Nonsesnse signal. ${message}`)
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
        } else if (data.id === id) {
            this.onmessage({ data })
        }
    }
    this.send = data => {
        data.id = id
        socket.send(JSON.stringify(data))
    }
    this.close = () => socket.removeEventListener('message', onmessage)
    socket.addEventListener('message', onmessage)
    socket.send(JSON.stringify({ id }))
}

module.exports = SignalingChannel
