// async function sleep(milliseconds) {
// 	await new Promise(resolve => setTimeout(resolve, milliseconds))
// }
//
// function main() {
// 	console.log("ok (1 of 2)")
// 	await sleep(100)
// 	console.log("ok (2 of 2)")
// 	await sleep(100)
// 	console.log("<eof>")
// }
//
// main()
//

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
// async function sleep(milliseconds) {
// 	await new Promise(resolve => setTimeout(resolve, milliseconds))
// }
//
// async function main() {
// 	console.log(`stdin=${JSON.stringify(await readline())}`)
// 	sleep(100)
// 	console.log(`stdin=${JSON.stringify(await readline())}`)
// 	sleep(100)
// 	console.log("<eof>")
// }
//
// main()
