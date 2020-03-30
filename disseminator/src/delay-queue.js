'use strict'

/**
 * @param {number} A >1ms
 * @param {number} B >=A
 * @throws {RangeError}
 */
export const delayQueue = (A, B) => {
    if (B < A) {
        throw new RangeError('B is less than A.')
    }
    if (A < 1) {
        throw new RangeError('A is less than 1.')
    }

    return {
        /**
         * `callback` is set to execute after `T`ms delay.
         * `T` is uniformly random value between `A` (inclusive) and `B` (inclusive).
         * @param {function} callback
         * @returns {number} `timeoutID`
         */
        schedule(callback) {
            return setTimeout(
                callback,
                Math.floor(Math.random() * (B - A + 1)) + A
            )
        },
        /**
         * Cancels a callback by its `timeoutID`.
         * @param {number} timeoutID
         */
        cancel(timeoutID) {
            clearTimeout(timeoutID)
        },
    }
}
