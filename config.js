import { sepolia } from "viem/chains";

const config = {
  chain: sepolia, // e.g. mainnet, bsc, polygon, etc.
  tokenToTransfer: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", //, 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for ETH
  amountToTransfer: 0.01,
};

export default config;
