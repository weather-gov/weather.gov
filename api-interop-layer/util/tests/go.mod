module wxgov-api-interop-layer/tests

go 1.21

require wxgov-api-interop-layer/util/util-golang v0.0.0

require (
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/redis/go-redis/v9 v9.17.3 // indirect
)

replace wxgov-api-interop-layer/util/util-golang => ../util-golang
