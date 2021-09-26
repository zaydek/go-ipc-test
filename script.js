// const readline = (() => {
// 	async function* createReadlineGenerator() {
// 		const readline = require("readline").createInterface({ input: process.stdin })
// 		for await (const stdin of readline) {
// 			yield stdin
// 		}
// 	}
// 	const readlineGenerator = createReadlineGenerator()
// 	return async () => {
// 		return (await readlineGenerator.next()).value
// 	}
// })()
//
// async function main() {
// 	const stdin = await readline()
// 	console.log(`stdin=${JSON.stringify(stdin)}`)
// 	console.log("<eof>")
// }
//
// main()

async function sleep(milliseconds) {
	await new Promise(resolve => setTimeout(resolve, milliseconds))
}

function main() {
	console.log("stdout ok (1 of 2)")
	console.error("stderr ok (1 of 2)")
	await sleep(1_000)
	console.log("stdout ok (2 of 2)")
	console.error("stderr ok (2 of 2)")
	await sleep(1_000)
	console.log("__DONE__")
}

main()
