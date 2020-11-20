# @web-ict/curl

## Installation

```
npm i @web-ict/curl
```

## Usage

### Web with a bundler

```JS
import('@web-ict/curl').then(({ Curl729_27 }) => {
    const message = new Int8Array(Curl729_27.HASH_LENGTH)
    const digest = new Int8Array(Curl729_27.HASH_LENGTH)

    Curl729_27.getDigest(message, 0, message.length, digest, 0, digest.length)
}
```

### Node.js

```JS
import Curl from '@web-ict/curl'

const message = new Int8Array(Curl729_27.HASH_LENGTH)
const digest = new Int8Array(Curl729_27.HASH_LENGTH)

Curl.Curl729_27().getDigest(message, 0, message.length, digest, 0, digest.length)
```
