const peermatcher = require('./')
const util = require('util')
const { version } = require('./package.json')

const log = (message = '') => process.stdout.write(util.format(message) + '\n')
const logError = message => process.stderr.write(util.format(message) + '\n')

let totalConnections = 0
const onListening = function() {
    const { address, port } = this.address()
    log(
        `Peermatcher v${version} started listening on ws://${address}:${port}...`
    )
}
const onConnection = function() {
    const { address, port } = this.address()
    log(`connection #${++totalConnections} on ${address}:${port}`)
}
const onError = error => logError(`Server error: ${error.message}`)
const onClose = () => log(`Peermatcher v${version} stopped listenning.`)

const shutdown = () => {
    log(`Shutting down Peermatcher v${version}...`)
    server.close(function() {
        log('Done.')
        process.exit()
    })
}
const onSigInt = () => {
    log()
    shutdown()
}

const server = peermatcher.server({
    host: 'localhost',
    port: 3030,
    heartbeatIntervalDelay: 3 * 60 * 60 * 1000,
})
server.on('listening', onListening)
server.on('connection', onConnection)
server.on('error', onError)
server.on('close', onClose)
process.on('SIGTERM', shutdown)
process.on('SIGINT', onSigInt)
