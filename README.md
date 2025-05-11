# Mayan swap SDK usage example
Providing basic example on how to use Mayan SDK for Solana/Solana, Solana/Sui, Solana/EVM, Sui/Solana, Sui/EVM, EVM/Solana, EVM/Sui, EVM/EVM bridges.
To see how it works checkout `main.ts` file and follow the code from there.
## How to run
In general you can run it this way:
```
bun run main.ts --from-chain <chain> --from-token <token> --to-chain <chain> --to-token <token> --amount <amount> --dest-addr <address>
```
For example you can bridge from Sui wUDT to Avalanche USDT running below command:
```
bun run main.ts --from-chain sui --to-chain avalanche --from-token 0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN --to-token 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7 --dest-addr 0xc2d3024d64f27d85e05c40056674Fd18772dd922 --amount 3
```
Checkout ".env.example". You will get prompted for private key if you dont provid it via env. Still you might need to fill specific chain rpc in the env file.
