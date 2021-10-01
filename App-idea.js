const path = require("path")
const React = require("react")
const ReactDOMServer = require("react-dom/server")

const App = require(path.join(process.cwd(), "out/__temp__/App.js")).default
console.log(ReactDOMServer.renderToString(React.createElement(App)))
