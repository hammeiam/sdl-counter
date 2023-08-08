import { Address, PublicClient, Chain } from "viem";
export type AddressBIMap = { [key: Address]: bigint };
export type PublicChainClient = PublicClient & { chain: Chain };
