import { Address, getContract, parseEther, getAddress } from "viem";
import { Pool, Position } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { mainnet, arbitrum, optimism } from "viem/chains";
import {
  childGaugeFactoryAbi,
  erc20Abi,
  gaugeControllerAbi,
  liquidityGaugeV5Abi,
  retroVestingAbi,
  uniV3PositionsAbi,
  veSdlAbi,
  vestingAbi,
  uniV3SDLPoolAbi,
  slpAbi,
  masterchefAbi,
} from "./abis";
import {
  ADDRESSES,
  EXCLUSION_LIST,
  vestingToBeneficiaryContracts,
  etherscanMevBots,
  saddleCreators,
  BI_1e18,
  CHAIN_ASSIGNMENT,
} from "./constants";
import { PublicChainClient, AddressBIMap } from "./types";
import "dotenv/config";
import {
  zip,
  enumerate,
  mergeBalanceMaps,
  formatBI18ForDisplay,
  createClient,
  readDuneTargetsCsv,
  batchArray,
  formatValuesAsCsv,
  readUniv3LpCsv,
  readEtherscanNftCsv,
  getBlockForTimestamp,
  parseCsv,
  mergeBalancesMapsHavingKey,
  sumObjectValues,
  filterObject,
} from "./utils";
import { writeFileSync } from "fs";

const allChains = [mainnet, arbitrum, optimism] as const;

/**
 * Fetch the veSDL balance of a wallet, which is already weighted by lock-duration
 */
export async function getVesdlBalances(
  publicClient: PublicChainClient,
  addresses: Address[],
  blockNumber?: bigint
) {
  if (publicClient.chain.id !== mainnet.id) return {} as AddressBIMap;

  const balances = await Promise.all(
    addresses.map((address) =>
      publicClient.readContract({
        abi: veSdlAbi,
        address: ADDRESSES[publicClient.chain.id].vesdl,
        functionName: "balanceOf",
        args: [address],
        blockNumber,
      })
    )
  );
  return zip(addresses, balances) as AddressBIMap;
}

/**
 * Fetch the SDL balance of a wallet which is locked in veSDL (not the veSDL balance itself)
 */
export async function getLockedSdlBalances(
  publicClient: PublicChainClient,
  addresses: Address[],
  blockNumber?: bigint
) {
  if (publicClient.chain.id !== mainnet.id) return {} as AddressBIMap;

  const lockedSdlBalances = await Promise.all(
    addresses.map((address) =>
      publicClient.readContract({
        abi: veSdlAbi,
        address: ADDRESSES[publicClient.chain.id].vesdl,
        functionName: "locked",
        args: [address],
        blockNumber,
      })
    )
  );
  return zip(
    addresses,
    lockedSdlBalances.map(({ amount }) => amount)
  ) as AddressBIMap;
}

/**
 * Fetch the SDL balance of a wallet from the SDL ERC20 contract
 */
export async function getWalletSdlBalances(
  publicClient: PublicChainClient,
  addresses: Address[],
  blockNumber?: bigint
) {
  const balances = await Promise.all(
    addresses.map((address) =>
      publicClient.readContract({
        abi: erc20Abi,
        address: ADDRESSES[publicClient.chain.id].sdl,
        functionName: "balanceOf",
        args: [address],
        blockNumber,
      })
    )
  );
  return zip(addresses, balances) as AddressBIMap;
}

export async function getRetroVestingBalances(
  publicClient: PublicChainClient,
  addresses: Address[],
  blockNumber?: bigint
) {
  // @dev: This call will fail on some addresses if they have not already verified their vesting contract by submitting a merkel tree.
  // However, this function is no longer being used, so we don't need to address it right now.
  if (publicClient.chain.id !== mainnet.id) return {} as AddressBIMap;

  const balances = await Promise.all(
    addresses.map((address) =>
      publicClient.readContract({
        abi: retroVestingAbi,
        address: ADDRESSES[publicClient.chain.id].retroVesting,
        functionName: "vestedAmount",
        args: [address],
        blockNumber,
      })
    )
  );
  return zip(addresses, balances) as AddressBIMap;
}

/**
 * Reads the badges-for-bandits-nfts.csv file and returns a map of address to number of badges
 * File is derived from https://etherscan.io/exportData using address 0xe374b4df4cf95ecc0b7c93b49d465a1549f86cc0
 */
export async function getBadgesForBanditsNFTCount(
  publicClient: PublicChainClient
) {
  if (publicClient.chain.id !== mainnet.id) return {} as AddressBIMap;

  const sdlPerNFT = 7_500n * BI_1e18;
  const addrToNFTCount = readEtherscanNftCsv("./badges-for-bandits-nfts.csv");
  return Object.fromEntries(
    Object.entries(addrToNFTCount).map(([addr, nftCount]) => [
      addr,
      sdlPerNFT * nftCount,
    ])
  ) as AddressBIMap;
}

/**
 * Assigns SDL to each saddle-creators-nft holder
 */
export async function getSaddleCreatorsNFTCount(
  publicClient: PublicChainClient
) {
  if (publicClient.chain.id !== mainnet.id) return {} as AddressBIMap;

  const sdlPerNFT = 350_000n * BI_1e18;
  return Object.fromEntries(
    saddleCreators.map((addr) => [getAddress(addr), sdlPerNFT])
  ) as AddressBIMap;
}

export async function _getAllGaugeAddressesMainnet(
  publicClient: PublicChainClient
) {
  if (publicClient.chain.id !== mainnet.id) throw Error("Wrong chain");

  const gaugeControllerContract = getContract({
    abi: gaugeControllerAbi,
    address: ADDRESSES[publicClient.chain.id].gaugeController,
    publicClient,
  });
  const gaugeCount = Number(await gaugeControllerContract.read.n_gauges());

  const gaugeAddresses = await Promise.all(
    enumerate(gaugeCount).map((n) =>
      gaugeControllerContract.read.gauges([BigInt(n)])
    )
  );

  const gaugeNames = await Promise.all(
    gaugeAddresses.map((gaugeAddress) =>
      publicClient.readContract({
        address: gaugeAddress,
        abi: liquidityGaugeV5Abi,
        functionName: "name",
      })
    )
  );

  // "[foo] root gauge" is a sidechain gauge. Only return mainnet gauges
  return gaugeAddresses.filter(
    (_, i) => !gaugeNames[i].toLowerCase().endsWith("root gauge")
  );
}

export async function _getAllGaugeAddressesSidechain(
  publicClient: PublicChainClient
) {
  if (!ADDRESSES[publicClient.chain.id]?.childGaugeFactory) return [];

  const childGaugeFactoryContract = getContract({
    abi: childGaugeFactoryAbi,
    address: ADDRESSES[publicClient.chain.id].childGaugeFactory,
    publicClient,
  });
  const gaugeCount = Number(
    await childGaugeFactoryContract.read.get_gauge_count()
  );

  return await Promise.all(
    enumerate(gaugeCount).map((n) =>
      childGaugeFactoryContract.read.get_gauge([BigInt(n)])
    )
  );
}

const gaugeAddressesCache: { [chainId: number]: Address[] } = {};
export async function getAllGaugeAddresses(publicClient: PublicChainClient) {
  const addressFetchFn =
    publicClient.chain.id === mainnet.id
      ? _getAllGaugeAddressesMainnet
      : _getAllGaugeAddressesSidechain;
  if (!gaugeAddressesCache[publicClient.chain.id]) {
    const fetchedAddrs = await addressFetchFn(publicClient);
    gaugeAddressesCache[publicClient.chain.id] = fetchedAddrs.map((addr) =>
      getAddress(addr)
    );
  }
  return gaugeAddressesCache[publicClient.chain.id];
}

/**
 * Fetch the outstanding SDL rewards for a wallet from all gauges
 */
export async function getGaugesUnclaimedBalances(
  publicClient: PublicChainClient,
  addresses: Address[],
  blockNumber?: bigint
) {
  const gaugeAddresses = await getAllGaugeAddresses(publicClient);

  // for each user, for each gauge, get user unclaimed balance. Sum all gauges for user.
  const balances = await Promise.all(
    addresses.map(async (userAddress) => {
      const unclaimedBalances = await Promise.all(
        gaugeAddresses.map((gaugeAddress) => {
          return publicClient.readContract({
            address: gaugeAddress,
            abi: liquidityGaugeV5Abi,
            args: [userAddress],
            functionName: "claimable_tokens",
            blockNumber,
          });
        })
      );
      return unclaimedBalances.reduce((sum, bal) => sum + bal, 0n);
    })
  );
  return zip(addresses, balances) as AddressBIMap;
}

/**
 * Fetch the outstanding vested SDL from all vesting contracts
 */
export async function getVestingClaimableBalances(
  publicClient: PublicChainClient,
  blockNumber?: bigint
) {
  if (publicClient.chain.id !== mainnet.id) return {} as AddressBIMap;

  const beneficiaryToBalance: { [beneficiary: Address]: bigint } = {};
  const vestingAddresses = Object.keys(vestingToBeneficiaryContracts);
  const vestingClaimableBalances = await Promise.all(
    vestingAddresses.map((vestingAddress) => {
      return publicClient.readContract({
        address: vestingAddress as Address,
        abi: vestingAbi,
        functionName: "vestedAmount",
        blockNumber,
      });
    })
  );
  // @dev: vesting addresses are unique, beneficiaries are not. Thus we must merge balances before returning
  vestingAddresses.forEach((vestingAddress, i) => {
    const beneficiaryAddress =
      vestingToBeneficiaryContracts[vestingAddress as Address];
    const existingBalance = beneficiaryToBalance[beneficiaryAddress] || 0n;
    beneficiaryToBalance[beneficiaryAddress] =
      existingBalance + vestingClaimableBalances[i];
  });
  return beneficiaryToBalance as AddressBIMap;
}

/**
 * Fetch and compute the SDL balance held by all UniV3 LP positions
 */
export async function getUniV3PositionBalance(
  publicClient: PublicChainClient,
  poolTokenIdMap: { [poolAddress: Address]: bigint[] },
  blockNumber?: bigint
) {
  if (!ADDRESSES[publicClient.chain.id].uniV3Positions) {
    throw new Error("No uniV3Positions contract address for chain");
  }
  const uniV3PositionOwnerToBalance: AddressBIMap = {};

  const uniV3PositionsContract = getContract({
    abi: uniV3PositionsAbi,
    address: ADDRESSES[publicClient.chain.id].uniV3Positions,
    publicClient,
  });

  for (const poolAddress of Object.keys(poolTokenIdMap)) {
    const poolTokenIds = poolTokenIdMap[poolAddress as Address];
    const uniV3SDLPoolContract = getContract({
      abi: uniV3SDLPoolAbi,
      address: poolAddress as Address,
      publicClient,
    });

    const [token0Address, token1Address, poolSlot0, fee, totalLiquidity] =
      await Promise.all([
        uniV3SDLPoolContract.read.token0({ blockNumber }),
        uniV3SDLPoolContract.read.token1({ blockNumber }),
        uniV3SDLPoolContract.read.slot0({ blockNumber }),
        uniV3SDLPoolContract.read.fee({ blockNumber }),
        uniV3SDLPoolContract.read.liquidity({ blockNumber }),
      ]);

    const token0 = new Token(1, token0Address, 18);
    const token1 = new Token(1, token1Address, 18);

    const configuredPool = new Pool(
      token0, // token0
      token1, // token1
      fee, // fee
      poolSlot0[0].toString(), // sqrtPriceX96
      totalLiquidity.toString(), // liquidity
      poolSlot0[1] // tick
    );

    // ensure sdl in the position
    const isSDLToken0 = token0.address === ADDRESSES[publicClient.chain.id].sdl;
    if (
      !isSDLToken0 &&
      token1.address !== ADDRESSES[publicClient.chain.id].sdl
    ) {
      throw new Error(`SDL is not a pooled token for: ${poolAddress}`);
    }

    const ownersAndPositions = await Promise.all(
      poolTokenIds.map((tokenId) => {
        return Promise.all([
          uniV3PositionsContract.read.ownerOf([tokenId], { blockNumber }),
          uniV3PositionsContract.read.positions([tokenId], { blockNumber }),
        ]);
      })
    );

    const feesData = await Promise.all(
      poolTokenIds.map((tokenId, i) => {
        const [tokenOwner] = ownersAndPositions[i];
        return uniV3PositionsContract.simulate.collect([
          {
            tokenId: tokenId,
            recipient: tokenOwner,
            amount0Max: 2n ** 128n - 1n,
            amount1Max: 2n ** 128n - 1n,
          },
        ]);
      })
    );

    for (let i = 0; i < poolTokenIds.length; i++) {
      const [tokenIDOwner, positionInfoArray] = ownersAndPositions[i];
      const feesGenerated = feesData[i];

      const positionInfo = {
        tickLower: positionInfoArray[5],
        tickUpper: positionInfoArray[6],
        liquidity: positionInfoArray[7].toString(),
      };

      if (!uniV3PositionOwnerToBalance[tokenIDOwner])
        uniV3PositionOwnerToBalance[tokenIDOwner] = 0n;

      // Calculate the fees generated by the position
      uniV3PositionOwnerToBalance[tokenIDOwner] += feesGenerated.result[1];

      const configuredPosition: Position = new Position({
        pool: configuredPool,
        liquidity: positionInfo.liquidity.toString(),
        tickLower: positionInfo.tickLower,
        tickUpper: positionInfo.tickUpper,
      });

      if (isSDLToken0) {
        const token0Reserve = parseEther(
          configuredPosition.amount0.toFixed(token0.decimals)
        );
        uniV3PositionOwnerToBalance[tokenIDOwner] += BigInt(token0Reserve);
      } else {
        const token1Reserve = parseEther(
          configuredPosition.amount1.toFixed(token1.decimals)
        );
        uniV3PositionOwnerToBalance[tokenIDOwner] += BigInt(token1Reserve);
      }
    }
  }

  return uniV3PositionOwnerToBalance;
}

/**
 * Fetch and compute the SDL balance held by all Sushi LP positions
 */
export async function getSushiSDLBalances(
  publicClient: PublicChainClient,
  addresses: Address[],
  blockNumber?: bigint
) {
  if (publicClient.chain.id !== mainnet.id) return {} as AddressBIMap;
  const slpContract = getContract({
    address: ADDRESSES[publicClient.chain.id].slp,
    abi: slpAbi,
    publicClient,
  });
  const [
    totalLpSupply,
    [, sdlReserves],
    gaugeBalance,
    masterchefBalance,
    userLpBalances,
    userGaugeBalances,
    userMasterchefInfos,
  ] = await Promise.all([
    slpContract.read.totalSupply({ blockNumber }),
    slpContract.read.getReserves({ blockNumber }),
    slpContract.read.balanceOf([ADDRESSES[mainnet.id].slpGauge], {
      blockNumber,
    }),
    slpContract.read.balanceOf([ADDRESSES[mainnet.id].sushiMasterchef], {
      blockNumber,
    }),
    Promise.all(
      addresses.map((userAddress) =>
        slpContract.read.balanceOf([userAddress], { blockNumber })
      )
    ),
    Promise.all(
      addresses.map((userAddress) =>
        publicClient.readContract({
          args: [userAddress],
          blockNumber,
          functionName: "balanceOf",
          abi: erc20Abi,
          address: ADDRESSES[mainnet.id].slpGauge,
        })
      )
    ),
    Promise.all(
      addresses.map((userAddress) =>
        publicClient.readContract({
          args: [61n, userAddress],
          blockNumber,
          functionName: "userInfo",
          abi: masterchefAbi,
          address: ADDRESSES[mainnet.id].sushiMasterchef,
        })
      )
    ),
  ]);

  // Part 1: get wallets's share of reserves
  const balances = userLpBalances.map((userLpBalance) => {
    const userPctReserves = (userLpBalance * BI_1e18) / totalLpSupply;
    const userLpedSdl = (userPctReserves * sdlReserves) / BI_1e18;
    return userLpedSdl;
  });
  const balancesByAddress = zip(addresses, balances) as AddressBIMap;

  // Part 2: get SLP Gauge Depositors's share of reserves
  const sdlInGauge = (gaugeBalance * sdlReserves) / totalLpSupply;
  const balancesInGauge = userGaugeBalances.map((userGaugeBalance) => {
    const userPctReserves = (userGaugeBalance * BI_1e18) / gaugeBalance;
    const userSdlInGauge = (userPctReserves * sdlInGauge) / BI_1e18;
    return userSdlInGauge;
  });
  const balancesInGaugeByAddress = zip(
    addresses,
    balancesInGauge
  ) as AddressBIMap;

  // Part 3: get SLP Masterchef Depositors's share of reserves
  const sdlInMasterchef = (masterchefBalance * sdlReserves) / totalLpSupply;
  const balancesInMasterchef = userMasterchefInfos.map(([userLpAmount]) => {
    const userPctReserves = (userLpAmount * BI_1e18) / masterchefBalance;
    const userSdlInMasterchef = (userPctReserves * sdlInMasterchef) / BI_1e18;
    return userSdlInMasterchef;
  });
  const balancesInMasterchefByAddress = zip(
    addresses,
    balancesInMasterchef
  ) as AddressBIMap;

  // Part 4: filter known contract addresses and return
  const allBalances = mergeBalanceMaps(
    balancesByAddress,
    balancesInGaugeByAddress,
    balancesInMasterchefByAddress
  );
  delete allBalances[ADDRESSES[mainnet.id].slpGauge];
  delete allBalances[ADDRESSES[mainnet.id].sushiMasterchef];
  return allBalances;
}

export async function main() {
  const demoAddresses = [
    "0x9eEf87f4C08d8934cB2a3309dF4deC5635338115",
    "0x5416808256eA66367d7Ec1Ae2C37BB64EC2425d4",
    "0x4802CedbDF865382dbaED8D5e41a65C8AB840676",
    "0xa76595083F0436912A50418901AcA7ED044Bb14F", // Mainnet Gnosis safe holding SDL
  ].map(getAddress);

  const targetTimestamp = 1690898195n;
  const targets = readDuneTargetsCsv("./targets.csv");
  const univ3LPs = readUniv3LpCsv("./univ3-lps.csv");

  const promises = [];
  const allExclusionSet = new Set(
    allChains.flatMap((chain) => EXCLUSION_LIST?.[chain.id] || [])
  );

  for (const chain of allChains) {
    const publicClient = createClient(chain);
    const [targetBlock, gaugeAddresses] = await Promise.all([
      getBlockForTimestamp(publicClient, targetTimestamp),
      getAllGaugeAddresses(publicClient),
    ]);

    console.log(`Target block for ${chain.name}: ${targetBlock}`);

    const chainExclusionSet = new Set([
      ...(EXCLUSION_LIST?.[chain.id] || []),
      ...(gaugeAddresses || []),
      ...(Object.keys(univ3LPs[chain.id]) || []), // exclude univ3 Pool contracts
      ...etherscanMevBots,
    ]);
    const chainWallets = batchArray(
      Object.keys(targets).filter(
        (address) =>
          targets?.[address as Address]?.[String(chain.id)] &&
          !chainExclusionSet.has(address as Address)
      ) as Address[],
      1000
    );
    promises.push(
      getVestingClaimableBalances(publicClient)
        .then((result) => {
          return Object.fromEntries(
            Object.entries(result).filter(
              ([address]) => !chainExclusionSet.has(address as Address)
            )
          ) as AddressBIMap;
        })
        .then((result) => ({
          vestingClaimable: result,
        }))
    );
    promises.push(
      getUniV3PositionBalance(publicClient, univ3LPs[chain.id])
        .then((result) => {
          return Object.fromEntries(
            Object.entries(result).filter(
              ([address]) => !chainExclusionSet.has(address as Address)
            )
          ) as AddressBIMap;
        })
        .then((result) => ({
          uniV3: result,
        }))
    );
    promises.push(
      getSaddleCreatorsNFTCount(publicClient)
        .then((result) => {
          return Object.fromEntries(
            Object.entries(result).filter(
              ([address]) => !chainExclusionSet.has(address as Address)
            )
          ) as AddressBIMap;
        })
        .then((result) => ({
          saddleCreatorsNFT: result,
        }))
    );
    promises.push(
      getBadgesForBanditsNFTCount(publicClient)
        .then((result) => {
          return Object.fromEntries(
            Object.entries(result).filter(
              ([address]) => !chainExclusionSet.has(address as Address)
            )
          ) as AddressBIMap;
        })
        .then((result) => ({
          badgesForBanditsNFT: result,
        }))
    );

    for (const batch of chainWallets) {
      promises.push(
        getVesdlBalances(publicClient, batch, targetBlock).then((result) => ({
          veSDL: result,
        }))
      );
      promises.push(
        getLockedSdlBalances(publicClient, batch, targetBlock).then(
          (result) => ({ lockedSDL: result })
        )
      );
      promises.push(
        getGaugesUnclaimedBalances(publicClient, batch, targetBlock).then(
          (result) => ({ gaugesUnclaimed: result })
        )
      );
      promises.push(
        getWalletSdlBalances(publicClient, batch, targetBlock).then(
          (result) => ({ walletSDL: result })
        )
      );
      promises.push(
        getSushiSDLBalances(publicClient, batch, targetBlock).then(
          (result) => ({ sushiSDL: result })
        )
      );

      await Promise.all(promises);
    }
  }

  const promisesResults = await Promise.all(promises);
  const resultKeys = [
    "veSDL",
    "lockedSDL",
    "gaugesUnclaimed",
    "walletSDL",
    "sushiSDL",
    "vestingClaimable",
    "uniV3",
    "saddleCreatorsNFT",
    "badgesForBanditsNFT",
  ] as const;
  const resultsByKey = resultKeys.reduce(
    (acc, key) => ({
      ...acc,
      [key]: mergeBalancesMapsHavingKey(promisesResults, key),
    }),
    {}
  ) as Record<(typeof resultKeys)[number], AddressBIMap>;
  const sumsByKeyUnfiltered = resultKeys.reduce(
    (acc, key) => ({ ...acc, [key]: sumObjectValues(resultsByKey[key]) }),
    {}
  ) as Record<(typeof resultKeys)[number], bigint>;
  const MIN_SDL_AMOUNT = 100n * BI_1e18;
  const allSDLBalancesUnfiltered = filterObject(
    mergeBalanceMaps(
      ...resultKeys.filter((k) => k !== "veSDL").map((k) => resultsByKey[k])
    ),
    (k, v) => v > 0n
  );
  const allVeSDLBalancesUnfiltered = filterObject(
    resultsByKey["veSDL"],
    (k, v) => v > 0n
  );
  const [sdlAmountUnfiltered, sdlHoldersUnfiltered] = [
    sumObjectValues(allSDLBalancesUnfiltered),
    Object.keys(allSDLBalancesUnfiltered).length,
  ];
  const [veSDLAmountUnfiltered, veSDLHoldersUnfiltered] = [
    sumObjectValues(allVeSDLBalancesUnfiltered),
    Object.keys(allVeSDLBalancesUnfiltered).length,
  ];
  const allSDLBalances = filterObject(
    allSDLBalancesUnfiltered,
    (k, v) => v > MIN_SDL_AMOUNT
  );
  const allVeSDLBalances = filterObject(
    allVeSDLBalancesUnfiltered,
    (k, v) => v > BI_1e18
  );
  const totalVeSDL = sumObjectValues(allVeSDLBalances);
  const totalSDL = sumObjectValues(allSDLBalances);

  console.table([
    ["", "UNFILTERED TOTALS"],
    ["SDL Sum", formatBI18ForDisplay(sdlAmountUnfiltered)],
    ["SDL holders", sdlHoldersUnfiltered],
    ["veSDL Sum", formatBI18ForDisplay(veSDLAmountUnfiltered)],
    ["veSDL holders", veSDLHoldersUnfiltered],
    ["", ""],
    ...resultKeys.map((k) => [k, formatBI18ForDisplay(sumsByKeyUnfiltered[k])]),
  ]);

  console.table([
    ["", "FILTERED TOTALS"],
    ["SDL Sum", formatBI18ForDisplay(totalSDL)],
    ["SDL holders", Object.keys(allSDLBalances).length],
    ["veSDL Sum", formatBI18ForDisplay(totalVeSDL)],
    ["veSDL holders", Object.keys(allVeSDLBalances).length],
  ]);

  console.log("veSDL Balances");
  console.table([
    ["total", formatBI18ForDisplay(totalVeSDL)],
    ...Object.entries(allVeSDLBalances)
      .sort((a, b) => (a[1] > b[1] ? -1 : 1))
      .map(([k, v]) => [k, formatBI18ForDisplay(v)])
      .slice(0, 25),
  ]);

  const nonEOASet = new Set(
    Object.keys(allSDLBalances).filter(
      (address) =>
        (!targets?.[address as Address]?.[`${mainnet.id}_isEOA`] ||
          !targets?.[address as Address]?.[`${optimism.id}_isEOA`] ||
          !targets?.[address as Address]?.[`${arbitrum.id}_isEOA`]) &&
        !allExclusionSet.has(address as Address)
    )
  ) as Set<Address>;

  console.log("SDL Balances");
  console.table([
    ["total", formatBI18ForDisplay(totalSDL), "isContract?"],
    ...Object.entries(allSDLBalances)
      .sort((a, b) => (a[1] > b[1] ? -1 : 1))
      .map(([k, v]) => [
        k,
        formatBI18ForDisplay(v),
        nonEOASet.has(k as Address) ? "✅" : "❌",
      ])
      .slice(0, 25),
  ]);

  console.log("Non EOA Addresses");
  console.table([
    [
      "Address",
      "SDL",
      "veSDL",
      "existsOnMainnet",
      "existsOnArbitrum",
      "existsOnOptimism",
    ],
    ...[...nonEOASet]
      .map(
        (address) =>
          [
            address,
            allSDLBalances[address] || 0n,
            allVeSDLBalances[address] || 0n,
            targets[address]?.[`${mainnet.id}_isEOA`] === undefined
              ? "❓"
              : targets[address]?.[`${mainnet.id}_isEOA`]
              ? "❌"
              : "✅",
            targets[address]?.[`${arbitrum.id}_isEOA`] === undefined
              ? "❓"
              : targets[address]?.[`${arbitrum.id}_isEOA`]
              ? "❌"
              : "✅",
            targets[address]?.[`${optimism.id}_isEOA`] === undefined
              ? "❓"
              : targets[address]?.[`${optimism.id}_isEOA`]
              ? "❌"
              : "✅",
          ] as const
      )
      .sort((a, b) => (a[1] + 4n * a[2] > b[1] + 4n * b[2] ? -1 : 1))
      .map(
        ([
          address,
          sdl,
          vesdl,
          existsOnMainnet,
          existsOnArbitrum,
          existsOnOptimism,
        ]) => [
          address,
          formatBI18ForDisplay(sdl as bigint),
          formatBI18ForDisplay(vesdl as bigint),
          existsOnMainnet,
          existsOnArbitrum,
          existsOnOptimism,
        ]
      )
      .slice(0, 25),
  ]);

  // Write some results to a CSV
  writeFileSync(
    "sdl-balances.csv",
    formatValuesAsCsv(
      Object.entries(allSDLBalances)
        .sort((a, b) => (a[1] > b[1] ? -1 : 1))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
    )
  );

  writeFileSync(
    "vesdl-balances.csv",
    formatValuesAsCsv(
      Object.entries(allVeSDLBalances)
        .sort((a, b) => (a[1] > b[1] ? -1 : 1))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
    )
  );

  writeFileSync("non-eoa-addresses.csv", [...nonEOASet].sort().join("\n"));

  const unknownEOASet = new Set(
    Object.keys(allSDLBalances).filter(
      (address) =>
        (targets?.[address as Address]?.[`${mainnet.id}_isEOA`] === undefined ||
          targets?.[address as Address]?.[`${optimism.id}_isEOA`] ===
            undefined ||
          targets?.[address as Address]?.[`${arbitrum.id}_isEOA`] ===
            undefined) &&
        !allExclusionSet.has(address as Address)
    )
  ) as Set<Address>;
  writeFileSync(
    "unknown-eoa-addresses.csv",
    [...unknownEOASet].sort().join("\n")
  );

  const weightedTotal = totalSDL + 4n * totalVeSDL;
  writeFileSync(
    "master-list.csv",
    [
      [
        "Address",
        "pctOfWeightedTotal",
        `${mainnet.id}_isContract`,
        `${arbitrum.id}_isContract`,
        `${optimism.id}_isContract`,
        "flagged?",
        "chain",
        "SDL",
        "veSDL",
      ].join(","),
      ...Object.entries(allSDLBalances)
        .map(([address, sdl]) => {
          const vesdl = allVeSDLBalances[address as Address] || 0n;
          const weightWalletAmt = sdl + 4n * vesdl;
          const pctOfWeightedTotal =
            (weightWalletAmt * BI_1e18) / weightedTotal;
          const isMainnetContract = !targets[address]?.[`${mainnet.id}_isEOA`];
          const isArbitrumContract =
            !targets[address]?.[`${arbitrum.id}_isEOA`];
          const isOptimismContract =
            !targets[address]?.[`${optimism.id}_isEOA`];
          const chain =
            CHAIN_ASSIGNMENT[address as Address] ||
            (isMainnetContract && mainnet.id) ||
            (isOptimismContract && optimism.id) ||
            arbitrum.id;
          const flagged =
            !CHAIN_ASSIGNMENT[address as Address] &&
            [isMainnetContract, isArbitrumContract, isOptimismContract].filter(
              Boolean
            ).length > 1;
          return [
            address,
            (Number((pctOfWeightedTotal * 10_000_000n) / BI_1e18) / 100_000)
              .toFixed(5)
              .padStart(8, " "),
            isMainnetContract ? 1 : 0,
            isArbitrumContract ? 1 : 0,
            isOptimismContract ? 1 : 0,
            flagged ? 1 : 0,
            chain,
            sdl,
            vesdl,
          ] as const;
        })
        .sort((a, b) => (Number(a[1]) > Number(b[1]) ? -1 : 1))
        .map((row) => row.join(",")),
    ].join("\n")
  );
  return;
}
main();

// (function () {
//   const csv = parseCsv("./master-list.csv");
//   const flaggedAddrs = csv.filter((row) => row[5] === "1").map((row) => row[0]);
//   const allMainnetAdrs = csv.filter((row) => Number(row[6]) === mainnet.id);
//   const allArbitrumAdrs = csv.filter((row) => Number(row[6]) === arbitrum.id);
//   const allOptimismAdrs = csv.filter((row) => Number(row[6]) === optimism.id);
//   const totalPctMainnet = allMainnetAdrs.reduce(
//     (sum, row) => sum + Number(row[1]),
//     0
//   );
//   const totalPctArbitrum = allArbitrumAdrs.reduce(
//     (sum, row) => sum + Number(row[1]),
//     0
//   );
//   const totalPctOptimism = allOptimismAdrs.reduce(
//     (sum, row) => sum + Number(row[1]),
//     0
//   );

//   console.table([
//     ["Total Flagged Addresses", flaggedAddrs.length],
//     [
//       "Dist. to Mainnet",
//       `${totalPctMainnet.toFixed(4)}% (ct. ${allMainnetAdrs.length})`,
//     ],
//     [
//       "Dist. to Arbitrum",
//       `${totalPctArbitrum.toFixed(4)}% (ct. ${allArbitrumAdrs.length})`,
//     ],
//     [
//       "Dist. to Optimism",
//       `${totalPctOptimism.toFixed(4)}% (ct. ${allOptimismAdrs.length})`,
//     ],
//   ]);
//   console.table(["Flagged Addrs", ...flaggedAddrs]);
// })();
