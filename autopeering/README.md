# @web-ict/autopeering

Creates a WebRTC p2p network.

## Installation

`npm i @web-ict/autopeering`

## 1. Signaling Server

Matches peers and forwards [SDP](https://tools.ietf.org/html/rfc4566) signals, enabling WebRTC communication.
Currently random matching is used.

Ict nodes should connect to at least 3 signaling servers and obtain 1 peer from each.

#### Running a signaling server

```
PORT=8080 MIN_DELAY=1 MAX_DELAY=1000 HEARTBEAT_DELAY=3600000 node node_modules/@web-ict/autopeering/examples/signaling-server.js
```

#### Running with docker

```
docker pull webict/autopeering:latest
docker run -p 8080:8080 -d webict/autopeering
```

## 2. Signaling channel

A channel connecting 2 peers for exchanging SDP signals.

## 3. Autopeering routine

Refreshes disconnected or faulty peers.
