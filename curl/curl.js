/*
Permission is hereby granted, perpetual, worldwide, non-exclusive, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:



1. The Software cannot be used in any form or in any substantial portions for development, maintenance and for any other purposes, in the military sphere and in relation to military products, including, but not limited to:

a. any kind of armored force vehicles, missile weapons, warships, artillery weapons, air military vehicles (including military aircrafts, combat helicopters, military drones aircrafts), air defense systems, rifle armaments, small arms, firearms and side arms, melee weapons, chemical weapons, weapons of mass destruction;

b. any special software for development technical documentation for military purposes;

c. any special equipment for tests of prototypes of any subjects with military purpose of use;

d. any means of protection for conduction of acts of a military nature;

e. any software or hardware for determining strategies, reconnaissance, troop positioning, conducting military actions, conducting special operations;

f. any dual-use products with possibility to use the product in military purposes;

g. any other products, software or services connected to military activities;

h. any auxiliary means related to abovementioned spheres and products.



2. The Software cannot be used as described herein in any connection to the military activities. A person, a company, or any other entity, which wants to use the Software, shall take all reasonable actions to make sure that the purpose of use of the Software cannot be possibly connected to military purposes.



3. The Software cannot be used by a person, a company, or any other entity, activities of which are connected to military sphere in any means. If a person, a company, or any other entity, during the period of time for the usage of Software, would engage in activities, connected to military purposes, such person, company, or any other entity shall immediately stop the usage of Software and any its modifications or alterations.



4. Abovementioned restrictions should apply to all modification, alteration, merge, and to other actions, related to the Software, regardless of how the Software was changed due to the abovementioned actions.



The above copyright notice and this permission notice shall be included in all copies or substantial portions, modifications and alterations of the Software.



THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import * as wasm from "./curl_bg.wasm";

const lTextDecoder =
  typeof TextDecoder === "undefined"
    ? require("util").TextDecoder
    : TextDecoder;

let cachedTextDecoder = new lTextDecoder("utf-8", {
  ignoreBOM: true,
  fatal: true,
});

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
  if (
    cachegetUint8Memory0 === null ||
    cachegetUint8Memory0.buffer !== wasm.memory.buffer
  ) {
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
  if (
    cachegetInt8Memory0 === null ||
    cachegetInt8Memory0.buffer !== wasm.memory.buffer
  ) {
    cachegetInt8Memory0 = new Int8Array(wasm.memory.buffer);
  }
  return cachegetInt8Memory0;
}
/**
 */
export class Curl729_27 {
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
   * @param {Int8Array} length_trits
   */
  reset(length_trits) {
    var ptr0 = passArray8ToWasm0(length_trits, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.curl729_27_reset(this.ptr, ptr0, len0);
  }
  /**
   * @param {Int8Array} message
   * @param {number} message_offset
   * @param {number} message_length
   * @param {Int8Array} digest
   * @param {number} digest_offset
   */
  static get_digest(
    message,
    message_offset,
    message_length,
    digest,
    digest_offset
  ) {
    try {
      var ptr0 = passArray8ToWasm0(message, wasm.__wbindgen_malloc);
      var len0 = WASM_VECTOR_LEN;
      var ptr1 = passArray8ToWasm0(digest, wasm.__wbindgen_malloc);
      var len1 = WASM_VECTOR_LEN;
      wasm.curl729_27_get_digest(
        ptr0,
        len0,
        message_offset,
        message_length,
        ptr1,
        len1,
        digest_offset
      );
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
/**
 */
export class Curl729_27_Ref {
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
  static get_digest(
    message,
    message_offset,
    message_length,
    digest,
    digest_offset
  ) {
    try {
      var ptr0 = passArray8ToWasm0(message, wasm.__wbindgen_malloc);
      var len0 = WASM_VECTOR_LEN;
      var ptr1 = passArray8ToWasm0(digest, wasm.__wbindgen_malloc);
      var len1 = WASM_VECTOR_LEN;
      wasm.curl729_27_ref_get_digest(
        ptr0,
        len0,
        message_offset,
        message_length,
        ptr1,
        len1,
        digest_offset
      );
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

export const __wbindgen_throw = function (arg0, arg1) {
  throw new Error(getStringFromWasm0(arg0, arg1));
};
