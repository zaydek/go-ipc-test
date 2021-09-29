# --define:window='{ "location": { "pathname": "/" } }'
all:
	rm \
		scripts/backend.esbuild.js \
		scripts/backend.esbuild.js.map
	npx esbuild scripts/backend/backend.ts \
		--bundle \
		--external:esbuild \
		--format=cjs \
		--log-level=warning \
		--outfile=scripts/backend.esbuild.js \
		--platform=node \
		--sourcemap
