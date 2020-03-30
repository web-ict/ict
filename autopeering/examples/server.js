'use strict'

import { signalingServer } from '../index.js'
import util from 'util'

const version = '0.1.0'

const log = (message = '') => process.stdout.write(util.format(message) + '\n')
const logError = message => process.stderr.write(util.format(message) + '\n')

const server = signalingServer({
    host: 'localhost',
    port: 3030,
    // Wait `T`ms, in case buffer is empty (none is already waiting).
    // `T` is a uniformly random value between `minDelay` (inclusive) and
    // `maxDelay` (inclusive).
    minDelay: 1,
    maxDelay: 3000,
    // How many requests can be buffered.
    watermark: 1000,
    // Closes connections that stay innactive for at least `heartbeatDelay`ms.
    // Choose this carefully depending on how many connections you can handle.
    heartbeatDelay: 2 * 60 * 1000,
})

let totalConnections = 0

server.on('listening', function() {
    const { address, port } = this.address()
    log(
        `Peermatcher v${version} started listening on ws://${address}:${port}...`
    )
})

server.on('connection', function() {
    const { address, port } = this.address()
    log(`connection #${++totalConnections} on ${address}:${port}`)
})

server.on('error', error => logError(`Server error: ${error.message}`))

server.on('close', () => log(`Peermatcher v${version} stopped listenning.`))

const shutdown = () => {
    log(`Shutting down Peermatcher v${version}...`)
    server.close(() => {
        log('Done.')
        process.exit()
    })
}

process.on('SIGTERM', shutdown)

process.on('SIGINT', () => {
    log()
    shutdown()
})
