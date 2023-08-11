import {
  createPublicClient,
  http,
  Address,
  PublicClient,
  formatEther,
  getAddress,
  Chain,
} from "viem";
import { REMAPPING, vestingToBeneficiaryContracts } from "./constants";
import { AddressBIMap, PublicChainClient } from "./types";
import { readFileSync } from "fs";

export function parseCsv(csvPath: string) {
  const csv = readFileSync(csvPath, "utf8");
  const lines = csv.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => line.split(","));
}

/** Parses a CSV of the format `address,ethBool,arbBool,optBool` */
export function readDuneTargetsCsv(csvPath: string) {
  const csv = parseCsv(csvPath);
  const result = {} as { [address: string]: { [chain: string]: boolean } };
  for (let i = 1; i < csv.length; i++) {
    const line = csv[i];
    const address = getAddress(line[0]);
    const values = line.slice(1).map((x) => x === "1");

    if (result[address]) throw Error(`Duplicate address: ${address}`);

    result[address] = zip(["eth", "arb", "opt"], values) as {
      [chain: string]: boolean;
    };
  }
  return result;
}

/** Parse a csv of the format 'chain,pool_address,tokenId'
 * to { [chain: string]: { [pool_address: string]: bigint[] } } */
export function readUniv3LpCsv(csvPath: string) {
  const csv = parseCsv(csvPath);
  const result = {} as {
    [chain: string]: { [pool_address: string]: bigint[] };
  };
  for (let i = 1; i < csv.length; i++) {
    const line = csv[i];
    const chain = line[0];
    const pool_address = getAddress(line[1]);
    const tokenId = line[2];
    if (!result[chain]) result[chain] = {};
    if (!result[chain][pool_address]) result[chain][pool_address] = [];
    result[chain][pool_address].push(BigInt(tokenId));
  }
  return result;
}

/**
 * Parse csv from etherscan csv export from https://etherscan.io/exportData
 * headers are: "HolderAddress","Unique Tokens","Quantity","PendingBalanceUpdate"
 */
export function readEtherscanNftCsv(csvPath: string) {
  const csv = parseCsv(csvPath);
  const result = {} as { [address: string]: bigint };
  for (let i = 1; i < csv.length; i++) {
    const line = csv[i];
    const address = getAddress(line[0]);
    const holdings = BigInt(line[2]);
    if (result[address]) throw Error(`Duplicate address: ${address}`);
    result[address] = holdings;
  }
  return result;
}

export function enumerate(length: number, start = 0): number[] {
  return Array.from(Array(length).keys()).map((x) => x + start);
}

export function zip<A extends string | number | symbol, B>(
  listA: A[],
  listB: B[]
): { string: B } {
  if (listA.length !== listB.length)
    throw Error("Zip input lengths don't match");

  return listA.reduce(
    (acc, a, i) => ({ ...acc, [a]: listB[i] }),
    {} as { string: B }
  );
}

export function mergeBalanceMaps(...inputs: AddressBIMap[]) {
  const result: AddressBIMap = {};
  for (const obj of inputs) {
    const keys = Object.keys(obj) as Address[];
    for (const key of keys) {
      if (REMAPPING[key]) {
        result[REMAPPING[key]] = (result?.[REMAPPING[key]] || 0n) + obj[key];
      } else result[key] = (result?.[key] || 0n) + obj[key];
    }
  }
  return result;
}

export function formatBI18ForDisplay(value: bigint) {
  return parseInt(formatEther(value)).toLocaleString();
}

export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/** transform lowercase / misformatted addresses to checksummed */
export function formatVestingAddresses() {
  const target = vestingToBeneficiaryContracts;
  return Object.keys(target).reduce(
    (acc, k) => ({ ...acc, [getAddress(k)]: getAddress(target[k as Address]) }),
    {}
  );
}

export function formatValuesAsCsv(addressToValueMap: AddressBIMap) {
  // @dev note that this keeps 1e18 and doesn't convert to float
  const list = ["address,value"];
  Object.entries(addressToValueMap)
    .sort((a, b) => (a[1] > b[1] ? -1 : 1))
    .forEach(([addr, value]) => {
      list.push(`${addr},${value}`);
    });
  return list.join("\n");
}

export function createClient(chain: Chain): PublicChainClient {
  if (!chain.rpcUrls.infura.http) throw Error(`Missing chain: ${chain.name}`);
  return createPublicClient({
    chain,
    transport: http(
      chain.rpcUrls.infura.http + "/" + process.env.INFURA_API_KEY
    ),
    batch: {
      multicall: {
        wait: 50,
        batchSize: 1_024,
      },
    },
  });
}

/** Binary search through blocks to find one with closest timestamp */
export async function getBlockForTimestamp(
  publicClient: PublicClient,
  targetTimestamp: bigint
) {
  // timestamp is seconds
  let [lastBlock, firstBlock] = await Promise.all([
    publicClient.getBlock({ blockTag: "latest" }),
    publicClient.getBlock({ blockNumber: 1n }),
  ]);
  let middleBlock = await publicClient.getBlock({
    blockNumber: (lastBlock.number as bigint) / 2n,
  });
  let maxRuns = 50; // will run in log(maxBlocks, 2) which is about 28 for Arb

  while (maxRuns) {
    if (maxRuns-- < 1) {
      throw new Error("Exceeded max runs");
    }
    if (
      middleBlock.timestamp === targetTimestamp ||
      (middleBlock.number as bigint) - (firstBlock.number as bigint) < 2n ||
      (lastBlock.number as bigint) - (middleBlock.number as bigint) < 2n
    ) {
      return middleBlock.number;
    }

    if (middleBlock.timestamp > targetTimestamp) {
      lastBlock = middleBlock;
    } else {
      firstBlock = middleBlock;
    }
    middleBlock = await publicClient.getBlock({
      blockNumber:
        ((lastBlock.number as bigint) + (firstBlock.number as bigint)) / 2n,
    });
  }
}
