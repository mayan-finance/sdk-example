import { createInterface } from "readline";
import { Writable } from "stream";

export async function getSecureInput(promptText: string): Promise<string> {
	const mutableStdout = new Writable({
		write: function (_: any, __: BufferEncoding, callback: () => void) {
			callback();
		},
	});

	const rl = createInterface({
		input: process.stdin,
		output: mutableStdout,
		terminal: true,
	});

	process.stdout.write(promptText);

	return new Promise<string>((resolve) => {
		rl.question("", (answer: string) => {
			rl.close();
			process.stdout.write("\n");
			resolve(answer);
		});
	});
}

export async function getPrivateKey(
	envVarName: string,
	promptMessage: string,
): Promise<string> {
	let privateKey = process.env[envVarName];
	if (!privateKey) {
		privateKey = await getSecureInput(promptMessage);
		if (!privateKey) {
			throw new Error(
				"Private key is required either in env file or as input.",
			);
		}
	}
	return privateKey;
}
