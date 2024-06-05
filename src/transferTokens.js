import "dotenv/config";
import prompts from "prompts";
import fs from "fs";
import {
  createPublicClient,
  http,
  formatEther,
  createWalletClient,
  publicActions,
  parseEther,
  getContract,
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
function checkAddress(address) {
  if (isAddress(address)) {
    return true;
  }
  return false;
}

function getReceiverAddresses() {
  const receiverAddresses = fs.readFileSync("receiverAddresses.txt", "utf8");
  return receiverAddresses.split("\n");
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
    if (!checkAddress(receiverAddress)) {
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
      const hash = await client.sendTransaction({
        from: account.address,
        to: receiverAddress,
        value: parseEther(config.amountToTransfer.toString()),
      });
      const transaction = await client.waitForTransactionReceipt({ hash });
      console.log(
        `[${i + 1}/${receiverAddresses.length}] - Tx status: ${
          transaction.status
        }, Tx hash: ${transaction.transactionHash}\n`
      );
    } else {
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
      const transaction = await client.waitForTransactionReceipt({ hash });
      console.log(
        `[${i + 1}/${receiverAddresses.length}] - Tx status: ${
          transaction.status
        }, Tx hash: ${transaction.transactionHash}\n`
      );
    }
  }
}

transferTokens();
