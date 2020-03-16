const server = require('./src/server.js')
const client = require('./src/client.js')
const WebSocket = require('ws')

module.exports = {
    server,
    client: client(WebSocket),
}
