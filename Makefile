# Bundle `backend.ts` for `node scripts/backend.esbuild.js`. Note esbuild and
# React dependencies shouldn't be bundled; these can be required because the
# backend script is run exclusively on the server.
all:
	npx esbuild node/scripts/backend/backend.ts \
		--bundle \
		--external:esbuild \
		--external:react \
		--external:react-dom \
		--external:react-dom/server \
		--log-level=warning \
		--outfile=node/scripts/backend.esbuild.js \
		--platform=node \
		--sourcemap

clean:
	rm \
		node/scripts/backend.esbuild.js \
		node/scripts/backend.esbuild.js.map
