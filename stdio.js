const nodeReadline = require("readline")

const readline = (function () {
	async function* createReadlineGenerator() {
		const nodeReadlineInterface = nodeReadline.createInterface({ input: process.stdin })
		for await (const line of nodeReadlineInterface) {
			yield line
		}
	}
	const generator = createReadlineGenerator()
	return async () => {
		const result = await generator.next()
		return result.value
	}
})()

////////////////////////////////////////////////////////////////////////////////

// async function main() {
// 	function sleep(durationMs) {
// 		return new Promise(resolve => setTimeout(resolve, durationMs))
// 	}
//
// 	stdout("Hello, world! (stdout)")
// 	await sleep(10)
// 	stderr("Hello, world! (stderr)")
// 	await sleep(10)
//
// 	// throw new Error("Oops!")
// 	// process.exit(1)
//
// 	stdout("Hello, world! (stdout)")
// 	await sleep(10)
// 	stderr("Hello, world! (stderr)")
//
// 	stdout("<done>")
// }

function sleep(durationMs) {
	return new Promise(resolve => setTimeout(resolve, durationMs))
}

async function main() {
	while (true) {
		const line = await readline()
		switch (line) {
			case "done":
				return
			default: {
				console.log("Hello, world!")
				await sleep(100)
				console.log("Hello, world!")
				await sleep(100)
				throw new Error("Oops!")
				// process.exit(1)

				// console.log("Hello, world!")
				// await sleep(10)
				console.error("Hello, world!")
				console.error("Hello, world!")
				break
			}
		}
	}
}

main()
