import { ISS } from '@web-ict/iss'
import { Curl729_27 } from '@web-ict/curl'
import { persistence } from '@web-ict/persistence'
import fs from 'fs'

const { increment } = persistence({ path: './', id: 'index' })
const { merkleTree } = ISS(Curl729_27, increment)

const seed = new Int8Array(243)
const depth = 12
const security = 1

merkleTree(seed, depth, security).then((root) => fs.writeFileSync('./merkleTree.json', JSON.stringify(root)))
