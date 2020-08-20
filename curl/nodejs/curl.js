let wasm;
const { TextDecoder } = require(String.raw`util`);

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachegetInt8Memory0 = null;
function getInt8Memory0() {
    if (cachegetInt8Memory0 === null || cachegetInt8Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt8Memory0 = new Int8Array(wasm.memory.buffer);
    }
    return cachegetInt8Memory0;
}
/**
*/
class Curl729_27 {

    static __wrap(ptr) {
        const obj = Object.create(Curl729_27.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_curl729_27_free(ptr);
    }
    /**
    * @param {number} length
    */
    constructor(length) {
        var ret = wasm.curl729_27_new(length);
        return Curl729_27.__wrap(ret);
    }
    /**
    * @param {number} length
    */
    reset(length) {
        wasm.curl729_27_reset(this.ptr, length);
    }
    /**
    * @param {Int8Array} message
    * @param {number} message_offset
    * @param {number} message_length
    * @param {Int8Array} digest
    * @param {number} digest_offset
    */
    static get_digest(message, message_offset, message_length, digest, digest_offset) {
        try {
            var ptr0 = passArray8ToWasm0(message, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            var ptr1 = passArray8ToWasm0(digest, wasm.__wbindgen_malloc);
            var len1 = WASM_VECTOR_LEN;
            wasm.curl729_27_get_digest(ptr0, len0, message_offset, message_length, ptr1, len1, digest_offset);
        } finally {
            digest.set(getInt8Memory0().subarray(ptr1 / 1, ptr1 / 1 + len1));
            wasm.__wbindgen_free(ptr1, len1 * 1);
        }
    }
    /**
    * @param {Int8Array} trits
    * @param {number} offset
    * @param {number} length
    */
    absorb(trits, offset, length) {
        var ptr0 = passArray8ToWasm0(trits, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.curl729_27_absorb(this.ptr, ptr0, len0, offset, length);
    }
    /**
    * @param {Int8Array} trits
    * @param {number} offset
    * @param {number} length
    */
    squeeze(trits, offset, length) {
        try {
            var ptr0 = passArray8ToWasm0(trits, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.curl729_27_squeeze(this.ptr, ptr0, len0, offset, length);
        } finally {
            trits.set(getInt8Memory0().subarray(ptr0 / 1, ptr0 / 1 + len0));
            wasm.__wbindgen_free(ptr0, len0 * 1);
        }
    }
}
module.exports.Curl729_27 = Curl729_27;
/**
*/
class Curl729_27_Ref {

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_curl729_27_ref_free(ptr);
    }
    /**
    * @param {Int8Array} length_trits
    */
    reset(length_trits) {
        var ptr0 = passArray8ToWasm0(length_trits, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.curl729_27_ref_reset(this.ptr, ptr0, len0);
    }
    /**
    * @param {Int8Array} message
    * @param {number} message_offset
    * @param {number} message_length
    * @param {Int8Array} digest
    * @param {number} digest_offset
    */
    static get_digest(message, message_offset, message_length, digest, digest_offset) {
        try {
            var ptr0 = passArray8ToWasm0(message, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            var ptr1 = passArray8ToWasm0(digest, wasm.__wbindgen_malloc);
            var len1 = WASM_VECTOR_LEN;
            wasm.curl729_27_ref_get_digest(ptr0, len0, message_offset, message_length, ptr1, len1, digest_offset);
        } finally {
            digest.set(getInt8Memory0().subarray(ptr1 / 1, ptr1 / 1 + len1));
            wasm.__wbindgen_free(ptr1, len1 * 1);
        }
    }
    /**
    * @param {Int8Array} trits
    * @param {number} offset
    * @param {number} length
    */
    absorb(trits, offset, length) {
        var ptr0 = passArray8ToWasm0(trits, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.curl729_27_ref_absorb(this.ptr, ptr0, len0, offset, length);
    }
    /**
    * @param {Int8Array} trits
    * @param {number} offset
    * @param {number} length
    */
    squeeze(trits, offset, length) {
        try {
            var ptr0 = passArray8ToWasm0(trits, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.curl729_27_ref_squeeze(this.ptr, ptr0, len0, offset, length);
        } finally {
            trits.set(getInt8Memory0().subarray(ptr0 / 1, ptr0 / 1 + len0));
            wasm.__wbindgen_free(ptr0, len0 * 1);
        }
    }
}
module.exports.Curl729_27_Ref = Curl729_27_Ref;

module.exports.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};
wasm = require('./curl_bg');

