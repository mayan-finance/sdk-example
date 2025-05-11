import {
	addresses,
	swapFromEvm,
	type Erc20Permit,
	type Quote,
} from "@mayanfinance/swap-sdk";
import {
	Wallet,
	Contract,
	TransactionResponse,
	Signature,
	parseUnits,
	getDefaultProvider,
	TypedDataEncoder,
} from "ethers";
import { abi as ERC20Permit_ABI } from "@openzeppelin/contracts/build/contracts/ERC20Permit.json";
import { JsonRpcProvider } from "ethers";
import MayanForwarderArtifact from "./contracts/MayanForwarderArtifact";
import { getPrivateKey } from "./util";

export async function swapEVM(quote: Quote, destAddr: string): Promise<string> {
	const privateKey = await getPrivateKey(
		"EVM_WALLET_PRIVATE_KEY",
		"Please enter your EVM wallet private key: ",
	);
	const wallet = new Wallet(privateKey);

	const provider = process.env.EVM_RPC_URL
		? new JsonRpcProvider(process.env.EVM_RPC_URL)
		: getDefaultProvider(quote.fromToken.chainId);
	const signer = wallet.connect(provider);
	const walletSrcAddr = await wallet.getAddress();

	let permit: Erc20Permit | undefined = await getErcPermitOrAllowance(
		quote,
		signer,
		walletSrcAddr,
	);

	const swapRes = (await swapFromEvm(
		quote,
		walletSrcAddr,
		destAddr,
		null,
		signer as any,
		permit,
		null,
		null,
	)) as any;
	if (typeof swapRes === "string") {
		throw swapRes;
	}
	return (swapRes as TransactionResponse).hash;
}

async function getErcPermitOrAllowance(
	quote: Quote,
	signer: Wallet,
	walletSrcAddr: string,
) {
	const tokenContract = new Contract(
		quote.fromToken.contract,
		ERC20Permit_ABI,
		signer,
	);
	const amountIn = getAmountOfFractionalAmount(
		quote.effectiveAmountIn,
		quote.fromToken.decimals,
	);
	if (quote.fromToken.supportsPermit) {
		const nonce = await tokenContract.nonces(walletSrcAddr);
		const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

		const domain = {
			name: await tokenContract.name(),
			version: "1",
			chainId: quote.fromToken.chainId,
			verifyingContract: await tokenContract.getAddress(),
		};
		const domainSeparator = await tokenContract.DOMAIN_SEPARATOR();
		for (let i = 1; i < 11; i++) {
			domain.version = String(i);
			const hash = TypedDataEncoder.hashDomain(domain);
			if (hash.toLowerCase() === domainSeparator.toLowerCase()) {
				break;
			}
		}

		let spender = addresses.MAYAN_FORWARDER_CONTRACT;
		if (quote.type === "SWIFT" && quote.gasless) {
			const forwarderContract = new Contract(
				addresses.MAYAN_FORWARDER_CONTRACT,
				MayanForwarderArtifact.abi,
				signer.provider,
			);
			const isValidSwiftContract = await forwarderContract.mayanProtocols(
				quote.swiftMayanContract,
			);
			if (!isValidSwiftContract) {
				throw new Error("Invalid Swift contract for gasless swap");
			}
			if (!quote.swiftMayanContract) {
				throw new Error("Swift contract not found");
			}
			spender = quote.swiftMayanContract;
		}

		const types = {
			Permit: [
				{ name: "owner", type: "address" },
				{ name: "spender", type: "address" },
				{ name: "value", type: "uint256" },
				{ name: "nonce", type: "uint256" },
				{ name: "deadline", type: "uint256" },
			],
		};

		const value = {
			owner: walletSrcAddr,
			spender,
			value: amountIn,
			nonce,
			deadline,
		};

		const signature = await signer.signTypedData(domain, types, value);
		const { v, r, s } = Signature.from(signature);

		const permitTx = await tokenContract.permit(
			walletSrcAddr,
			spender,
			amountIn,
			deadline,
			v,
			r,
			s,
		);
		await permitTx.wait();
		return {
			value: amountIn,
			deadline,
			v,
			r,
			s,
		};
	}

	const allowance: bigint = await tokenContract.allowance(
		walletSrcAddr,
		addresses.MAYAN_FORWARDER_CONTRACT,
	);
	if (allowance < amountIn) {
		const approveTx = await tokenContract.approve(
			addresses.MAYAN_FORWARDER_CONTRACT,
			amountIn,
		);
		await approveTx.wait();
	}
}

function getAmountOfFractionalAmount(
	amount: string | number,
	decimals: string | number,
): bigint {
	const cutFactor = Math.min(8, Number(decimals));
	const numStr = Number(amount).toFixed(cutFactor + 1);
	const reg = new RegExp(`^-?\\d+(?:\\.\\d{0,${cutFactor}})?`);
	const matchResult = numStr.match(reg);
	if (!matchResult) {
		throw new Error("getAmountOfFractionalAmount: fixedAmount is null");
	}
	const fixedAmount = matchResult[0];
	return parseUnits(fixedAmount, Number(decimals));
}
