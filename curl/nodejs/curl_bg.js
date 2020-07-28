
const path = require('path').join(__dirname, 'curl_bg.wasm');
const bytes = require('fs').readFileSync(path);
let imports = {};
imports['./curl.js'] = require('./curl.js');

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
module.exports = wasmInstance.exports;
