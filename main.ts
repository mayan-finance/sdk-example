import { fetchQuote, type ChainName } from "@mayanfinance/swap-sdk";
import { swapSolana } from "./solana";
import { swapEVM } from "./evm";
import { swapSui } from "./sui";
import { createInterface } from "readline";

const { fromChain, fromToken, toChain, toToken, amount, destAddr } =
	parseArgs();

(async () => {
	const quotes = await fetchQuote({
		amount,
		fromChain,
		fromToken,
		toChain,
		toToken,
		slippageBps: "auto",
	});
	if (quotes.length === 0) {
		throw new Error("No quotes found");
	}
	const quote = quotes[0];

	console.log("\nSwap Details:");
	console.log(`From: ${quote.fromToken.name} (${quote.fromChain})`);
	console.log(`To: ${quote.toToken.name} (${quote.toChain})`);
	console.log(`Amount: ${amount}`);
	console.log(`Minimum received: ${quote.minAmountOut}`);
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	const proceed = await new Promise<boolean>((resolve) => {
		readline.question("\nProceed with swap? (y/n): ", (answer) => {
			readline.close();
			resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
		});
	});
	if (!proceed) {
		console.log("Swap cancelled by user");
		process.exit(0);
	}

	let txHash;
	if (quote.fromChain === "solana") {
		txHash = await swapSolana(quote, destAddr);
	} else if (quote.fromChain === "sui") {
		txHash = await swapSui(quote, destAddr);
	} else {
		txHash = await swapEVM(quote, destAddr);
	}

	console.log(
		`Go and see your swap here: https://explorer.mayan.finance/swap/${txHash}`,
	);
})();

function parseArgs(): {
	fromChain: ChainName;
	fromToken: string;
	toChain: ChainName;
	toToken: string;
	amount: number;
	destAddr: string;
} {
	const args = process.argv.slice(2);
	const parsedArgs: Record<string, string> = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--")) {
			const flag = arg.substring(2);
			const value = args[++i];

			switch (flag) {
				case "from-chain":
					parsedArgs.fromChain = value;
					break;
				case "from-token":
					parsedArgs.fromToken = value;
					break;
				case "to-chain":
					parsedArgs.toChain = value;
					break;
				case "to-token":
					parsedArgs.toToken = value;
					break;
				case "amount":
					parsedArgs.amount = value;
					break;
				case "dest-addr":
					parsedArgs.destAddr = value;
					break;
			}
		}
	}

	const requiredArgs = [
		"fromChain",
		"fromToken",
		"toChain",
		"toToken",
		"amount",
		"destAddr",
	];
	const missingArgs = requiredArgs.filter((arg) => !parsedArgs[arg]);

	if (missingArgs.length > 0) {
		console.error(
			`Error: Missing required arguments: ${missingArgs.map((arg) => `--${arg.replace(/([A-Z])/g, "-$1").toLowerCase()}`).join(", ")}`,
		);
		console.error(
			`Usage: bun run main.ts --from-chain <chain> --from-token <token> --to-chain <chain> --to-token <token> --amount <amount> --dest-addr <address>`,
		);
		process.exit(1);
	}

	return {
		fromChain: parsedArgs.fromChain as ChainName,
		fromToken: parsedArgs.fromToken,
		toChain: parsedArgs.toChain as ChainName,
		toToken: parsedArgs.toToken,
		amount: Number(parsedArgs.amount),
		destAddr: parsedArgs.destAddr,
	};
}
