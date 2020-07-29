# @web-ict/timestamping

```
npm i @web-ict/timestamping
```

## Usage

### Running timestamping servers

```
SEED='999999999999999999999999999999999999999999999999999999999999999999999999999999999' \
LENGTH=3 \
TIMESTAMP_INDEX=0 \
HOST='localhost' \
PORT=3030 \
USER='user' \
PASSWORD='pwd' node examples/timestamping-server.js
```

```
SEED='A99999999999999999999999999999999999999999999999999999999999999999999999999999999' \
LENGTH=3 \
TIMESTAMP_INDEX=1 \
HOST='localhost' \
PORT=3031 \
USER='user' \
PASSWORD='pwd' node examples/timestamping-server.js
```

```
SEED='B99999999999999999999999999999999999999999999999999999999999999999999999999999999' \
LENGTH=3 \
TIMESTAMP_INDEX=2 \
HOST='localhost' \
PORT=3032 \
USER='user' \
PASSWORD='pwd' node examples/timestamping-server.js
```

Each server should output one of `X0`, `Y0`, `Z0` depending on its `timestampIndex`.

### Running a timestamper

```
TIMESTAMPING_SERVERS='ws://user:pwd@localhost:3030 ws://user:pwd@localhost:3031 ws://user:pwd@localhost:3032' \
RETRY_INTERVAL_DURATION=1000 \
RECONNECT_TIMEOUT_DURATION=1000 node examples/timestamper.js
```
