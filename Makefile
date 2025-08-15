BIN_DIR ?= node_modules/.bin
P="\\033[34m[+]\\033[0m"

SRC_DIR ?= src
TEST_TARGET ?= test/

lint:
	echo "  $(P) Linting"
	$(BIN_DIR)/eslint lib && $(BIN_DIR)/eslint test && $(BIN_DIR)/eslint middlewares

test: lint build
	echo "  $(P) Testing"
	NODE_ENV=test $(BIN_DIR)/nyc --all $(BIN_DIR)/ava
	echo "  $(P) Testing ESM entrypoint"
	node --experimental-vm-modules test/entrypoints/entrypoint-esm.mjs
	echo "  $(P) Testing CJS entrypoint"
	node test/entrypoints/entrypoint-cjs.cjs

test-watch:
	echo "  $(P) Testing forever"
	NODE_ENV=test $(BIN_DIR)/ava --watch

docs-clean:
	echo "  $(P) Cleaning gitbook"
	rm -rf _book

docs-prepare: docs-clean
	echo "  $(P) Preparing gitbook"
	$(BIN_DIR)/gitbook install

docs-build: docs-prepare
	echo "  $(P) Building gitbook"
	$(BIN_DIR)/gitbook build -g Automattic/monk

docs-watch: docs-prepare
	echo "  $(P) Watching gitbook"
	$(BIN_DIR)/gitbook serve

docs-publish: docs-build
	echo "  $(P) Publishing gitbook"
	cd _book && \
	git init && \
	git commit --allow-empty -m 'update book' && \
	git checkout -b gh-pages && \
	touch .nojekyll && \
	git add . && \
	git commit -am 'update book' && \
	git push https://github.com/Automattic/monk gh-pages --force

dist/monk.cjs dist/monk.mjs: lib/applyMiddlewares.mjs lib/compose.mjs lib/collection.mjs lib/helpers.mjs lib/manager.mjs lib/monk.mjs
	@echo "  $(P) Building"
	$(BIN_DIR)/rollup -c

build: dist/monk.cjs dist/monk.mjs

test-versions:
	@echo "  $(P) Testing with custom MongoDB version (set MONGOMS_VERSION)"
	MONGOMS_VERSION=$$MONGOMS_VERSION NODE_ENV=test $(BIN_DIR)/nyc --all $(BIN_DIR)/ava

test-all-versions:
	@for v in 6.0.14 7.0.14 8.0.0; do \
	  echo "  $(P) Testing with MongoDB version $$v"; \
	  MONGOMS_VERSION=$$v make test-versions || exit $$?; \
	done

.PHONY: lint test test-watch docs-clean docs-prepare docs-build docs-watch docs-publish
.SILENT: lint test test-watch docs-clean docs-prepare docs-build docs-watch docs-publish
