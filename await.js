console.log(await hello())

async function hello() {
	return new Promise(resolve => {
		setTimeout(resolve, 1_000)
	})
}
