"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Container for a value of type T. Used to distinguish expections
 * thrown by failable from other exceptions.
 * This is for internal use only. It's not exported. Don't depend
 * on its behaviour.
 * @internal
 */
var ErrorValue = /** @class */ (function () {
    function ErrorValue(value) {
        this.value = value;
    }
    return ErrorValue;
}());
/**
 * Type that represents a failure result. This is not
 * a part of the exported API and isn't actually exported
 * directly. Depend on {@link IFailable} instead.
 */
var Failure = /** @class */ (function () {
    function Failure(error) {
        this.error = error;
        this.isError = true;
        this.error = error;
    }
    Failure.prototype.map = function (_) {
        // tslint:disable-next-line:no-any
        return this;
    };
    Failure.prototype.mapError = function (func) {
        return new Failure(func(this.error));
    };
    Failure.prototype.flatMap = function (_) {
        // tslint:disable-next-line:no-any
        return this;
    };
    Failure.prototype.match = function (cases) {
        return cases.failure(this.error);
    };
    return Failure;
}());
exports.Failure = Failure;
/**
 * Type that represents a success result.  This is not
 * a part of the exported API and isn't actually exported
 * directly. Depend on {@link IFailable} instead.
 */
var Success = /** @class */ (function () {
    function Success(value) {
        this.value = value;
        this.isError = false;
        this.value = value;
    }
    Success.prototype.isFailure = function () {
        return false;
    };
    Success.prototype.map = function (func) {
        return new Success(func(this.value));
    };
    Success.prototype.flatMap = function (func) {
        return func(this.value).match({
            success: function (value) { return new Success(value); },
            failure: function (e) { return new Failure(e); }
        });
    };
    Success.prototype.mapError = function (_) {
        // tslint:disable-next-line:no-any
        return this;
    };
    Success.prototype.match = function (cases) {
        return cases.success(this.value);
    };
    return Success;
}());
exports.Success = Success;
/**
 * Async version of failable that takes a computation that
 * returns a Promise<Failable<T, E>>. It can be combined with
 * async/await
 *
 * @example
 * ```
 *
 * const computation1: () => FailablePromise<string, string> = ...;
 * const computation2: (x: string) => FailablePromise<number, string> = ...;
 * const computation3: (x: number) => Failable<number, string> = ...;
 * const computation4 = failableAsync<number, string>(async ({ run, success, failure }) => {
 *   const str = run(await computation1());
 *   const num1 = run(await computation2(str));
 *
 *   // notice that computation3 returns a non async failable so await isn't required
 *   const num = run(computation3(num1));
 *   if (num > 10) {
 *     return success(num);
 *   } else {
 *     return failure("Number too small");
 *   }
 * })
 * ```
 */
function failableAsync(f) {
    return f({
        success: function (value) {
            return Promise.resolve(new Success(value));
        },
        failure: function (e) {
            return Promise.resolve(new Failure(e));
        },
        run: function (result) {
            return result.match({
                failure: function (error) { throw new ErrorValue(error); },
                success: function (value) { return value; }
            });
        }
    })
        .catch(function (e) {
        if (e instanceof ErrorValue) {
            return Promise.resolve(new Failure(e.value));
        }
        else {
            return Promise.reject(e);
        }
    });
}
exports.failableAsync = failableAsync;
/**
 * Creates a failable comutation from a function.
 * The supplied function receives an object containing
 * helper functions to create IFailable values. You
 * need to give generic arguments T and E to it indicating
 * the success and failure types.
 *
 * @param f Failable computation
 *
 * @example
 * ```
 *
 * const computation1: () => Failable<string, string> = ...;
 * const computation2: (x: string) => Failable<number, string> = ...;
 * const computation3 = failable<number, string>(({ run, success, failure }) => {
 *   const str = run(computation1());
 *   const num = run(computation2(str));
 *   if (num > 10) {
 *     return success(num);
 *   } else {
 *     return failure("Number too small");
 *   }
 * })
 * ```
 */
function failable(f) {
    try {
        return f({
            success: function (value) {
                return new Success(value);
            },
            failure: function (e) {
                return new Failure(e);
            },
            run: function (result) {
                return result.match({
                    failure: function (error) { throw new ErrorValue(error); },
                    success: function (value) { return value; }
                });
            }
        });
    }
    catch (e) {
        if (e instanceof ErrorValue) {
            return new Failure(e.value);
        }
        else {
            throw e;
        }
    }
}
exports.failable = failable;
/**
 * Create an error {@link IFailable} value.
 * @param err Error value
 */
function failure(err) {
    return new Failure(err);
}
exports.failure = failure;
/**
 * Create a successful {@link IFailable} value
 * @param value Result value
 */
function success(value) {
    return new Success(value);
}
exports.success = success;
/**
 * Take an array of elements and apply a failable computation to
 * the array, one element at a time, returning an IFailable of items.
 * @param arr Array of values of type T
 * @param f Function that takes an item of type T from the given array
 * and returns an IFailable<U, E>.
 * @returns A failable containing an array of U values wrapped inside
 * an {@link IFailable}
 */
function mapMultiple(arr, f) {
    var result = [];
    for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
        var item = arr_1[_i];
        var fail = f(item);
        // since there's no way to get a value from a failure,
        // we can just typecast the current failure and return it.
        if (fail.isError) {
            // tslint:disable-next-line
            return fail.error;
        }
        else {
            // tslint:disable-next-line
            result.push(fail.value);
        }
    }
    return success(result);
}
exports.mapMultiple = mapMultiple;
exports.mapM = mapMultiple;
// tslint:disable-next-line
function isSuccess(value) {
    return value instanceof Success;
}
exports.isSuccess = isSuccess;
// tslint:disable-next-line
function isFailure(value) {
    return value instanceof Failure;
}
exports.isFailure = isFailure;
/**
 * Object containing static functions for {@link IFailable}.
 * Anything that isn't an instance method should be added here.
 */
exports.Failable = {
    of: success,
    success: success,
    failure: failure,
    mapM: mapMultiple,
    mapMultiple: mapMultiple,
    isSuccess: isSuccess,
    isFailure: isFailure
};
//# sourceMappingURL=failable.js.map