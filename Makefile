all:
	npx esbuild backend.ts \
		--format=cjs \
		--log-level=warning \
		--outfile=backend.esbuild.js \
		--sourcemap

clean:
	rm backend.js
