import "dotenv/config";
import prompts from "prompts";
import fs from "fs";
import {
  http,
  createWalletClient,
  publicActions,
  parseEther,
  parseUnits,
  isAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import config from "../config.js";

const PROVIDER_URL = process.env.PROVIDER_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

function getERC20ABI() {
  const json = fs.readFileSync("src/erc20.json", "utf8");
  const abi = JSON.parse(json);
  return abi;
}
const ERC20_ABI = getERC20ABI();

if (!PRIVATE_KEY || !PROVIDER_URL) {
  console.error("Please set your PROVIDER_URL, PRIVATE_KEY in a .env file");
  process.exit(1);
}
if (!config.tokenToTransfer) {
  console.error("Please set your tokenToTransfer in a config.js file");
  process.exit(1);
}
if (!config.amountToTransfer || config.amountToTransfer < 0) {
  console.error("Please set your amountToTransfer in a config.js file");
  process.exit(1);
}
if (!config.chain) {
  console.error("Please set your chain in a config.js file");
  process.exit(1);
}

function getReceiverAddresses() {
  const receiverAddresses = fs.readFileSync("receiverAddresses.txt", "utf8");
  return receiverAddresses.split("\n");
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function transferTokens() {
  const receiverAddresses = getReceiverAddresses();

  const account = privateKeyToAccount(PRIVATE_KEY);

  const client = createWalletClient({
    account,
    chain: config.chain,
    transport: http(PROVIDER_URL),
  }).extend(publicActions);

  for (let i = 0; i < receiverAddresses.length; i++) {
    const receiverAddress = receiverAddresses[i];
    if (!isAddress(receiverAddress)) {
      console.log(
        `[${i + 1}/${
          receiverAddresses.length
        }] - ${receiverAddress} is not a valid address`
      );
      continue;
    }

    if (
      config.tokenToTransfer === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ) {
      console.log(
        `[${i + 1}/${receiverAddresses.length}] - Sending ${
          config.amountToTransfer
        } Tokens to ${receiverAddress}`
      );
      const hash = await client.sendTransaction({
        from: account.address,
        to: receiverAddress,
        value: parseEther(config.amountToTransfer.toString()),
      });
      client.waitForTransactionReceipt({ hash }).then((transaction) => {
        console.log(
          `[${i + 1}/${receiverAddresses.length}] - Tx status: ${
            transaction.status
          }, Tx hash: ${transaction.transactionHash}`
        );
      });
      await sleep(111);
    } else {
      console.log(
        `[${i + 1}/${receiverAddresses.length}] - Sending ${
          config.amountToTransfer
        } Tokens to ${receiverAddress}`
      );
      const { request } = await client.simulateContract({
        account: client.account,
        address: config.tokenToTransfer,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [
          receiverAddress,
          parseUnits(config.amountToTransfer.toString(), 6),
        ],
      });
      const hash = await client.writeContract(request);
      client.waitForTransactionReceipt({ hash }).then((transaction) => {
        console.log(
          `[${i + 1}/${receiverAddresses.length}] - Tx status: ${
            transaction.status
          }, Tx hash: ${transaction.transactionHash}`
        );
      });
      await sleep(111);
    }
  }
}

async function main() {
  console.log(`Config:
  tokenToTransfer: ${config.tokenToTransfer}
  amountToTransfer: ${config.amountToTransfer}
  chain: ${config.chain.name}\n`);

  const prompt = await prompts({
    type: "confirm",
    name: "confirm",
    message: "Are you sure you want to continue?",
    initial: true,
  });
  if (prompt.confirm) {
    await transferTokens();
  }
  console.log("Exiting...");
  process.exit(0);
}
main();
