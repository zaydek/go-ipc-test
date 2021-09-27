module.exports = [
	{
		path: "/",
		head: `
			<title>This is the home page!</title>
			<meta name="title" content=${JSON.stringify("This is the home page!")}>
			<meta name="description" content=${JSON.stringify("This is the home page!")}>
		`,
		props: {
			greeting: "Hello, world! (/)",
		},
	},
	{
		path: "/a",
		head: `
			<title>This is the a page!</title>
			<meta name="title" content=${JSON.stringify("This is the a page!")}>
			<meta name="description" content=${JSON.stringify("This is the a page!")}>
		`,
		props: {
			greeting: "Hello, world! (/a)",
		},
	},
	{
		path: "/b",
		head: `
			<title>This is the b page!</title>
			<meta name="title" content=${JSON.stringify("This is the b page!")}>
			<meta name="description" content=${JSON.stringify("This is the b page!")}>
		`,
		props: {
			greeting: "Hello, world! (/b)",
		},
	},
	{
		path: "/c",
		head: `
			<title>This is the c page!</title>
			<meta name="title" content=${JSON.stringify("This is the c page!")}>
			<meta name="description" content=${JSON.stringify("This is the c page!")}>
		`,
		props: {
			greeting: "Hello, world! (/c)",
		},
	},
	{
		path: "/d",
		head: `
			<title>This is the d page!</title>
			<meta name="title" content=${JSON.stringify("This is the d page!")}>
			<meta name="description" content=${JSON.stringify("This is the d page!")}>
		`,
		props: {
			greeting: "Hello, world! (/d)",
		},
	},
	{
		path: "/404",
		head: `
			<title>This is the 404 page!</title>
			<meta name="title" content=${JSON.stringify("This is the 404 page!")}>
			<meta name="description" content=${JSON.stringify("This is the 404 page!")}>
		`,
		props: {
			greeting: "Hello, world! (/404)",
		},
	},
]
