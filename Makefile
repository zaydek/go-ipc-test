all:
	npx esbuild scripts/backend.ts \
		--format=cjs \
		--log-level=warning \
		--outfile=scripts/backend.esbuild.js \
		--sourcemap

clean:
	rm backend.js
