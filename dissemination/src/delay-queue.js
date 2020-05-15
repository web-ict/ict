'use strict'

/**
 * @param {number} A >= 1
 * @param {number} B >= A
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
         * Schedules `callback` after a random delay of `t` milliseconds.
         * `t` is uniformly random value between `A` (inclusive) and `B` (inclusive).
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
         * Cancels callback by timeoutID
         * @param {function} timeoutID
         */
        cancel(timeoutID) {
            clearTimeout(timeoutID)
        },
    }
}
