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

#![feature(test)]

extern crate test;
extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

const NUMBER_OF_ROUNDS: i8 = 27;
const LUT_0: [i8; 43] = [
    1, 0, 0, 0, 1, 2, 2, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 1, 2, 0, 1, 2, 1, 0,
    0, 1, 2, 0, 0, 0, 0, 0, 2, 1, 2, 0, 0, 0, 1, 0, 0, 2, 0
];
const LUT_1: [i8; 43] = [
    1, 0, 2, 0, 0, 1, 1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 1, 1, 0, 0, 2, 2, 0, 0,
    2, 1, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 2, 0, 1, 2, 0
];
const LUT_2: [i8; 43] = [
    1, 1, 2, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 2, 1, 0,
    1, 0, 2, 0, 0, 0, 0, 0, 0, 2, 1, 0, 2, 1, 2, 0, 2, 1, 0
];

pub const HASH_LENGTH: usize = 243;
pub const STATE_LENGTH: usize = 3 * HASH_LENGTH;

#[wasm_bindgen]
pub struct Curl729_27 {
    state: [i8; STATE_LENGTH],
    scratchpad: [i8; STATE_LENGTH]
}

#[wasm_bindgen]
impl Curl729_27 {
    #[wasm_bindgen(constructor)]
    pub fn new(length: usize) -> Curl729_27 {
        let mut curl: Curl729_27 = Curl729_27 {
            state: [0; STATE_LENGTH],
            scratchpad: [0; STATE_LENGTH]
        };

        curl.reset(length);
        curl
    }

    pub fn reset(&mut self, length: usize) {
        let mut length_trits: [i8; HASH_LENGTH] = [0; HASH_LENGTH];
        let mut value_copy = length;
        let mut i = 0;

        while value_copy  > 0 {
            let mut remainder = (value_copy % 3) as i8;
            value_copy /= 3;

            if remainder > 1 {
                remainder = -1;
                value_copy += 1
            }

            length_trits[i] = remainder;
            i += 1
        }

        for i in 0..HASH_LENGTH {
            self.state[i] = ((i + 1) % 3) as i8;
            self.state[HASH_LENGTH + i] = ((length_trits[i] + 1) % 3) as i8;
            self.state[HASH_LENGTH * 2 + i] = ((i + 1) % 3) as i8;
        }
    }

    pub fn get_digest(
        message: &[i8],
        message_offset: usize,
        message_length: usize,
        digest: &mut [i8],
        digest_offset: usize
    ) {
        let mut curl = Curl729_27::new(message_length);
        curl.absorb(message, message_offset, message_length);

        for i in 0..HASH_LENGTH {
            digest[digest_offset + i] = curl.state[i] - 1
        }
    }

    pub fn absorb(&mut self, trits: &[i8], offset: usize, length: usize) {
        let mut j = offset;
        let mut l = length;

        while {
            for i in 0..
                if l < HASH_LENGTH { l }
                else { HASH_LENGTH }
            {
                self.state[i] = trits[j] + 1;
                j += 1
            }

            self.transform();

            l -= if l < HASH_LENGTH { l } else { HASH_LENGTH };
            l > 0
        } {}
    }

    pub fn squeeze(&mut self, trits: &mut [i8], offset: usize, length: usize) {
        let mut l = length;
        let mut j = offset;

        while {
            for i in 0..
                if l < HASH_LENGTH { l }
                else { HASH_LENGTH }
            {
                trits[j] = self.state[i] - 1;
                j += 1
            }

            self.transform();

            l -= if l < HASH_LENGTH { l } else { HASH_LENGTH };
            l > 0
        } {}
    }

    fn transform(&mut self) {
        let mut i = 0;
        while i < NUMBER_OF_ROUNDS {
            let mut a: usize = 0;
            while a < HASH_LENGTH {
                let b: usize = a + 243;
                let c: usize = a + 486;
                let index: usize = (
                    self.state[a] |
                    (self.state[b] << 2) |
                    (self.state[c] << 4)
                ) as usize;
                self.scratchpad[a] = LUT_0[index];
                self.scratchpad[b] = LUT_1[index];
                self.scratchpad[c] = LUT_2[index];
                a += 1
            }

            let mut j: i16 = 81;
            a = 0;
            while a < STATE_LENGTH {
                let b: usize = a + 81;
                let c: usize = a + 162;
                let index: usize = (
                    self.scratchpad[a] |
                    (self.scratchpad[b] << 2) |
                    (self.scratchpad[c] << 4)
                ) as usize;
                self.state[a] = LUT_0[index];
                self.state[b] = LUT_1[index];
                self.state[c] = LUT_2[index];
                j -= 1;
                if j == 0 {
                    a = c;
                    j = 81
                }
                a += 1
            }


            a = 0;
            j = 27;
            while a < STATE_LENGTH {
                let b: usize = a + 27;
                let c: usize = a + 54;
                let index: usize = (
                    self.state[a] |
                    (self.state[b] << 2) |
                    (self.state[c] << 4)
                ) as usize;
                self.scratchpad[a] = LUT_0[index];
                self.scratchpad[b] = LUT_1[index];
                self.scratchpad[c] = LUT_2[index];
                j -= 1;
                if j == 0 {
                    a = c;
                    j = 27
                }
                a += 1
            }

            a = 0;
            j = 9;
            while a < STATE_LENGTH {
                let b: usize = a + 9;
                let c: usize = a + 18;
                let index: usize = (
                    self.scratchpad[a] |
                    (self.scratchpad[b] << 2) |
                    (self.scratchpad[c] << 4)
                ) as usize;
                self.state[a] = LUT_0[index];
                self.state[b] = LUT_1[index];
                self.state[c] = LUT_2[index];
                j -= 1;
                if j == 0 {
                    a = c;
                    j = 9
                }
                a += 1
            }

            a = 0;
            j = 3;
            while a < STATE_LENGTH {
                let b: usize = a + 3;
                let c: usize = a + 6;
                let index: usize = (
                    self.state[a] |
                    (self.state[b] << 2) |
                    (self.state[c] << 4)
                ) as usize;
                self.scratchpad[a] = LUT_0[index];
                self.scratchpad[b] = LUT_1[index];
                self.scratchpad[c] = LUT_2[index];
                j -= 1;
                if j == 0 {
                    a = c;
                    j = 3
                }
                a += 1
            }

            a = 0;
            while a < STATE_LENGTH {
                let index: usize = (
                    self.scratchpad[a] |
                    (self.scratchpad[a + 1] << 2) |
                    (self.scratchpad[a + 2] << 4)
                ) as usize;
                self.state[a]     = LUT_0[index];
                self.state[a + 1] = LUT_1[index];
                self.state[a + 2] = LUT_2[index];
                a += 3
            }

            i += 1
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TRANSACTION_LENGTH: usize = 243;

    #[test]
    fn get_digest() {
        const MESSAGE: [i8; TRANSACTION_LENGTH] = [0; TRANSACTION_LENGTH];
        let mut digest = [0; HASH_LENGTH];


        let mut expected: [i8; HASH_LENGTH] = [0; HASH_LENGTH];
        for i in (0..HASH_LENGTH).step_by(3) {
            expected[i] = 0;
            expected[i + 1] = 0;
            expected[i + 2] = 0;
        }

        Curl729_27::get_digest(
            &MESSAGE,
            0,
            TRANSACTION_LENGTH,
            &mut digest,
            0
        );

        for i in 0..HASH_LENGTH {
            assert_eq!(digest[i], expected[i])
        }

    }
}
