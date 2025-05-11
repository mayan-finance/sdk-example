import { type Quote, swapFromSolana } from "@mayanfinance/swap-sdk";
import {
	Connection,
	Keypair,
	Transaction,
	VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { getPrivateKey } from "./util";

export async function swapSolana(
	quote: Quote,
	destAddr: string,
): Promise<string> {
	const privateKey = await getPrivateKey(
		"SOLANA_WALLET_PRIVATE_KEY",
		"Please enter your Solana wallet private key: ",
	);
	const privateKeyArray = bs58.decode(privateKey);
	const wallet = Keypair.fromSecretKey(privateKeyArray);

	const connection = new Connection(
		process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
	);

	async function signer(trx: Transaction): Promise<Transaction>;
	async function signer(
		trx: VersionedTransaction,
	): Promise<VersionedTransaction>;
	async function signer(
		trx: Transaction | VersionedTransaction,
	): Promise<Transaction | VersionedTransaction> {
		if ("version" in trx) {
			(trx as VersionedTransaction).sign([wallet]);
		} else {
			(trx as Transaction).sign(wallet);
		}
		return trx;
	}

	const swapRes = await swapFromSolana(
		quote,
		wallet.publicKey.toString(),
		destAddr,
		null,
		signer,
		connection,
		[],
		{ skipPreflight: true },
	);
	if (!swapRes.signature) {
		throw new Error("error: try again");
	}

	try {
		const { blockhash, lastValidBlockHeight } =
			await connection.getLatestBlockhash();
		const result = await connection.confirmTransaction(
			{
				signature: swapRes.signature,
				blockhash: blockhash,
				lastValidBlockHeight: lastValidBlockHeight,
			},
			"confirmed",
		);
		if (result?.value.err) {
			throw new Error(`Transaction ${swapRes.serializedTrx} reverted!`);
		}
		return swapRes.signature;
	} catch (error) {
		const res = await fetch(
			`https://explorer-api.mayan.finance/v3/swap/trx/${swapRes.signature}`,
		);
		if (res.status !== 200) {
			throw error;
		}
		return swapRes.signature;
	}
}
