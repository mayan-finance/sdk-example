import { createSwapFromSuiMoveCalls, type Quote } from "@mayanfinance/swap-sdk";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getPrivateKey } from "./util";

export async function swapSui(quote: Quote, destAddr: string) {
	const privateKey = await getPrivateKey(
		"SUI_WALLET_PRIVATE_KEY",
		"Please enter your Sui wallet private key: ",
	);
	const cleanKey = privateKey.startsWith("0x")
		? privateKey.slice(2)
		: privateKey;
	const signer = Ed25519Keypair.fromSecretKey(cleanKey);

	const suiClient = new SuiClient({
		url: process.env.SUI_RPC_URL ?? getFullnodeUrl("mainnet"),
	});

	const transaction = await createSwapFromSuiMoveCalls(
		quote,
		signer.toSuiAddress(),
		destAddr,
		null,
		null,
		suiClient,
	);
	const { digest } = await suiClient.signAndExecuteTransaction({
		signer,
		transaction,
	});
	return digest;
}
