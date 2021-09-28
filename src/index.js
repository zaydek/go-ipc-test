// import "esbuild:test-plugin"
import "env"

import App from "./App"

import "./index.css"

// function App() {
// 	const [state, setState] = React.useState(0)
//
// 	return (
// 		<div>
// 			<span>{state}</span>
// 			<button onClick={e => setState(state - 1)}>-</button>
// 			<button onClick={e => setState(state + 1)}>+</button>
// 		</div>
// 	)
// }

if (document.getElementById("root").hasChildNodes()) {
	ReactDOM.hydrate(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
		document.getElementById("root"),
	)
} else {
	ReactDOM.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
		document.getElementById("root"),
	)
}
