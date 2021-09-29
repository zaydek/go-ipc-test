# TODO: Do we need to polyfill window.location.pathname for the router, etc.?
# --define:window='{ "location": { "pathname": "/" } }'

all:
	npx esbuild node/scripts/backend/backend.ts \
		--bundle \
		--external:esbuild \
		--format=cjs \
		--log-level=warning \
		--outfile=node/scripts/backend.esbuild.js \
		--platform=node \
		--sourcemap

clean:
	rm \
		node/scripts/backend.esbuild.js \
		node/scripts/backend.esbuild.js.map
