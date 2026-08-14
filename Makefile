# stellar-ambassador — Stellar / Soroban workflow
#
# Contracts live in contracts/; TypeScript bindings are generated into
# packages/contract-client. Configure a network + identity once, then deploy.
#
#   make setup                       # one-time: wasm target + funded testnet identity
#   make test                        # cargo unit tests
#   make build                       # compile contracts to wasm
#   make bindings                    # regenerate the TypeScript client(s)
#   make deploy                      # deploy + init every contract in CONTRACTS
#   make invoke CONTRACT=ambassador ARGS="bump --caller <G...>"

# --- config (override on the CLI, e.g. `make deploy NETWORK=mainnet SOURCE=me`) ---
NETWORK        ?= testnet
SOURCE         ?= deployer
CONTRACT       ?= ambassador
CONTRACTS      := ambassador
WASM_DIR       := contracts/target/wasm32v1-none/release
CLIENT_DIR     := packages/contract-client
CONTRACT_ID    := $(shell cat .contract-id.$(CONTRACT) 2>/dev/null)

.DEFAULT_GOAL := help
.PHONY: help setup test build optimize bindings deploy id invoke simulate fund clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## One-time: add wasm target + create & fund a testnet identity
	rustup target add wasm32v1-none
	stellar keys generate $(SOURCE) --network $(NETWORK) --fund || true
	@echo "Identity '$(SOURCE)' ready on $(NETWORK)."

test: ## Run contract unit tests (cargo test)
	cd contracts && cargo test

build: ## Compile contracts to wasm
	cd contracts && stellar contract build

optimize: build ## Build then optimize the wasm for deployment
	@for c in $(CONTRACTS); do \
		stellar contract optimize --wasm $(WASM_DIR)/$$c.wasm; \
	done

bindings: build ## Regenerate the TypeScript client(s) + rebuild dist
	@for c in $(CONTRACTS); do \
		rm -rf tmp-bindings; \
		stellar contract bindings typescript --wasm $(WASM_DIR)/$$c.wasm --output-dir tmp-bindings --overwrite; \
		cp tmp-bindings/src/index.ts $(CLIENT_DIR)/src/$$c.ts; \
		rm -rf tmp-bindings; \
	done
	pnpm --filter @stellar-ambassador/contract-client build

deploy: build ## Deploy every contract in CONTRACTS and init it with SOURCE as admin
	@for c in $(CONTRACTS); do \
		stellar contract deploy --wasm $(WASM_DIR)/$$c.wasm --source $(SOURCE) --network $(NETWORK) \
			| tee .contract-id.$$c; \
		stellar contract invoke --id $$(cat .contract-id.$$c) --source $(SOURCE) --network $(NETWORK) \
			-- init --admin $(SOURCE); \
	done
	@echo "\nDeployed. Set the printed ids in packages/web/.env.local and packages/api/.env:"
	@for c in $(CONTRACTS); do \
		echo "  NEXT_PUBLIC_$$(echo $$c | tr a-z A-Z)_CONTRACT_ID=$$(cat .contract-id.$$c)"; \
	done

id: ## Print a deployed contract id: make id CONTRACT=ambassador
	@echo "$(CONTRACT_ID)"

invoke: ## Invoke a function: make invoke CONTRACT=ambassador ARGS="bump --caller <G..>"
	stellar contract invoke --id $(CONTRACT_ID) --source $(SOURCE) --network $(NETWORK) -- $(ARGS)

simulate: ## Simulate (read-only): make simulate CONTRACT=ambassador ARGS="get_counter"
	stellar contract invoke --id $(CONTRACT_ID) --source $(SOURCE) --network $(NETWORK) --is-view -- $(ARGS)

fund: ## Fund the source identity via friendbot (testnet/futurenet)
	stellar keys fund $(SOURCE) --network $(NETWORK)

clean: ## Remove Rust build artifacts
	cd contracts && cargo clean
