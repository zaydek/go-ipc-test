# TODO: Do we need to polyfill window.location.pathname for the router, etc.?
# --define:window='{ "location": { "pathname": "/" } }'

all:
	npx esbuild scripts/backend/backend.ts \
		--bundle \
		--external:esbuild \
		--format=cjs \
		--log-level=warning \
		--outfile=scripts/backend.esbuild.js \
		--platform=node \
		--sourcemap

clean:
	rm \
		scripts/backend.esbuild.js \
		scripts/backend.esbuild.js.map
