/**
 * Test cases for failable
 */

import { failable, failableAsync, failure, success, mapMultiple, IFailableResult, isFailure, isSuccess } from "../src/failable";
// tslint:disable
import { expect } from "chai";

describe("failable", () => {
	it ("should create success values correctly", () => {
		const result = failable(() => success(10));
		result.match({
			success: (value) => expect(value).to.equal(10),
			failure: () => { throw "Shoudn't happen"; }
		});
	});

	it ("should create failure values correctly", () => {
		const result = failable<{}, string>(() => failure("FAILURE"));
		result.match({
			success: () => { throw "Shouldn't happen "; },
			failure: (err) => expect(err).to.equal("FAILURE")
		});
	});

	it ("should chain correctly", () => {
		const f1 = (s: string | undefined) => failable<string, "NOT_FOUND">(({ failure }) => {
			if (s) {
				return success(s);
			} else {
				return failure("NOT_FOUND");
			}
		});
		const f2 = (s: string) => failable<number, "NOT_A_NUMBER">(( { failure } ) => {
			const num = parseInt(s);
			if (!num || num === NaN) {
				return failure("NOT_A_NUMBER");
			} else {
				return success(num);
			}
		});
		failable<any, any>(
			({run}) => {
				run(f1(undefined));
				throw "Control flow should never reach here because f1 fails on undefined."
			}
		);

		failable<any, any>(({ run }) => {
			const str = run(f1("some_string"));
			expect(str).to.equal("some_string");
			run(f2(str));
			throw "Control flow shouldn't reach here.";
		});

		failable<any, any>(({ run }) => {
			const str = run(f1("10"));
			expect(str).to.equal("10");
			const num = run(f2(str));
			expect(num).to.equal(10);
			return success(0);
		});

		const f3 = (s: string | undefined) => failable<number, string>(({ run }) => {
			const r1 = run(f1(s));
			const  r2 = run(f2(r1));
			return success(r2);
		});
		expect(f3(undefined)).to.deep.equal(failure("NOT_FOUND"));
		expect(f3("asdf")).to.deep.equal(failure("NOT_A_NUMBER"));
		expect(f3("12")).to.deep.equal(success(12));
		const r = f3(undefined);
		if (r.isError) {
			expect(r.error).to.equal("NOT_FOUND");
		} else {
			throw new Error("Unexpectedly reached branch");
		}
	});
});

describe("failableAsync", () => {
	it ("should create success values correctly", async () => {
		const result = await failableAsync(async () => success(10));
		result.match({
			success: (value) => expect(value).to.equal(10),
			failure: () => { throw "Shoudn't happen"; }
		});
	});

	it ("should create failure values correctly", async () => {
		const result = await failableAsync<{}, string>(async () => failure("FAILURE"));
		result.match({
			success: () => { throw "Shouldn't happen"; },
			failure: (err) => expect(err).to.equal("FAILURE")
		});
	});

	it ("should chain correctly", async () => {
		const f1 = (s: string | undefined) => failableAsync<string, "NOT_FOUND">(async () => {
			if (s) {
				return success(s);
			} else {
				return failure(<"NOT_FOUND">"NOT_FOUND");
			}
		});
		const f2 = (s: string) => failableAsync<number, "NOT_A_NUMBER">(async () => {
			const num = parseInt(s);
			if (!num || num === NaN) {
				return failure(<"NOT_A_NUMBER">"NOT_A_NUMBER");
			} else {
				return success(num);
			}
		});
		await failableAsync<any, any>(async ({run}) => {
				run(await f1(undefined));
				throw "Control flow should never reach here because f1 fails on undefined."
			}
		);

		await failableAsync<any, any>(async ({ run }) => {
			const str = run(await f1("some_string"));
			expect(str).to.equal("some_string");
			run(await f2(str));
			throw "Control flow shouldn't reach here.";
		});

		await failableAsync<any, any>(async ({ run }) => {
			const str = run(await f1("10"));
			expect(str).to.equal("10");
			const num = run(await f2(str));
			expect(num).to.equal(10);
			return success(0);
		});

		const f3 = (s: string | undefined) => failableAsync<number, string>(async ({ run }) => {
			const r1 = run(await f1(s));
			const  r2 = run(await f2(r1));
			return success(r2);
		});
		expect(await f3(undefined)).to.deep.equal(failure("NOT_FOUND"));
		expect(await f3("asdf")).to.deep.equal(failure("NOT_A_NUMBER"));
		expect(await f3("12")).to.deep.equal(success(12));
	});
});

describe("mapMultiple", () => {
	const f = (arg: number) => failable<string, null>(({ success, failure }) => {
		if (arg > 5) {
			return success((arg - 5).toString());
		} else {
			return failure(null);
		}
	});
	it ("succeeds when all elements return success", () => {
		const validArray = [6, 7, 10, 8];
		const expectedArray = validArray.map(x => x - 5).map(x => x.toString());
		const result = mapMultiple(validArray, f)
		if(isSuccess(result)){
			expect(result.isError).to.be.false
			expect(result.value).to.be.deep.equals(expectedArray)
		}
	});
	it ("fails when one element fails", () => {
		const validArray = [6, 7, 3, 8];
		const result = mapMultiple(validArray, f)
		if(isFailure(result)){
			expect(result.isError).to.be.true
			expect(result.error).to.equal(null)
		}
	});
});

// type User = {
// 	id: number
// 	name: string
// 	photos: number[]
// }

// type ErrorKey = keyof ErrorsMap
// type TypedError = {
// 	type: ErrorKey
// }
// interface UserNotFoundError extends TypedError {
// 	type: 'USER_NOT_FOUND'
// 	message: string
// }

// interface UnexpectedError extends TypedError {
// 	type: 'UNEXPECTED_ERROR'
// 	message: string
// }

// function getUser(id: number) : GetUserResult {
// 	return failable(({ success, failure }) => {
// 		let number = (Math.random() * 10)
// 		if(number > 2){
// 			return success({
// 				id,
// 				name: 'Chris Coppola',
// 				photos: (new Array(Math.floor(Math.random() * 10)))
// 					.fill(0)
// 					.map(_ => Math.floor(Math.random() * 100))
// 			})
// 		} else if(number > 1) {
// 			return failure({
// 				type: 'USER_NOT_FOUND',
// 				message: Errors.USER_NOT_FOUND(id)
// 			})
// 		} else {
// 			return failure({
// 				type: 'UNEXPECTED_ERROR',
// 				message: 'An unexpected error occured'
// 			})
// 		}
// 	})
// }

// type GetUserResult = IFailableResult<User, UserNotFoundError | UnexpectedError>

// type ErrorLambda = (data: any) => string

// interface ErrorsMap {
// 	USER_NOT_FOUND: ErrorLambda
// 	UNEXPECTED_ERROR: ErrorLambda
// }

// const Errors: ErrorsMap = {
// 	USER_NOT_FOUND: (id: number) => `Could not find user with id '${id}'`,
// 	UNEXPECTED_ERROR: () => `An unexpected error occured`
// }

// let i = 0
// while(i <= 10){
// 	let results = getUser(i++)
// 	if(results.isError === false){
// 		let { id, name, photos } = results.value
// 		console.log(id, name, photos)
// 	} else {
// 		let { type, message } = results.error
// 		if(type === 'USER_NOT_FOUND'){
// 			console.log(type, message)
// 		} else {
// 			console.log(type, message)
// 		}
// 	}
// }
