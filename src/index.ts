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
} from "./constants";
import { PublicChainClient, AddressBIMap } from "./types";
import "dotenv/config";
import {
  zip,
  enumerate,
  mergeBalanceMaps,
  formatBI18ForDisplay,
  createClient,
  parseCsv,
  batchArray,
  writeCsv,
  formatValuesAsCsv,
  parseUniv3LpCsv,
} from "./utils";

const allChains = [mainnet, arbitrum, optimism] as const;

/** BALANCE FUNCTIONS */
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
    const userPctReserves = (userLpBalance * BigInt(1e18)) / totalLpSupply;
    const userLpedSdl = (userPctReserves * sdlReserves) / BigInt(1e18);
    return userLpedSdl;
  });
  const balancesByAddress = zip(addresses, balances) as AddressBIMap;

  // Part 2: get SLP Gauge Depositors's share of reserves
  const sdlInGauge = (gaugeBalance * sdlReserves) / totalLpSupply;
  const balancesInGauge = userGaugeBalances.map((userGaugeBalance) => {
    const userPctReserves = (userGaugeBalance * BigInt(1e18)) / gaugeBalance;
    const userSdlInGauge = (userPctReserves * sdlInGauge) / BigInt(1e18);
    return userSdlInGauge;
  });
  const balancesInGaugeByAddress = zip(
    addresses,
    balancesInGauge
  ) as AddressBIMap;

  // Part 3: get SLP Masterchef Depositors's share of reserves
  const sdlInMasterchef = (masterchefBalance * sdlReserves) / totalLpSupply;
  const balancesInMasterchef = userMasterchefInfos.map(([userLpAmount]) => {
    const userPctReserves = (userLpAmount * BigInt(1e18)) / masterchefBalance;
    const userSdlInMasterchef =
      (userPctReserves * sdlInMasterchef) / BigInt(1e18);
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

  const targets = parseCsv("./targets.csv");
  const univ3LPs = parseUniv3LpCsv("./univ3_lps.csv");

  const vesdlPromises = [];
  const sdlPromises = [];
  const allExclusionSet = new Set(
    allChains.flatMap((chain) => EXCLUSION_LIST?.[chain.id] || [])
  );
  const nonEOASet = new Set(
    Object.keys(targets).filter(
      (address) =>
        (!targets?.[address as Address]?.[`${mainnet.id}_isEOA`] ||
          !targets?.[address as Address]?.[`${optimism.id}_isEOA`] ||
          !targets?.[address as Address]?.[`${arbitrum.id}_isEOA`]) &&
        !allExclusionSet.has(address as Address)
    )
  ) as Set<Address>;

  for (const chain of allChains) {
    const publicClient = createClient(chain);

    const chainExclusionSet = new Set([
      ...(EXCLUSION_LIST?.[chain.id] || []),
      ...(await getAllGaugeAddresses(publicClient)),
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

    sdlPromises.push(getVestingClaimableBalances(publicClient));
    sdlPromises.push(getUniV3PositionBalance(publicClient, univ3LPs[chain.id]));

    for (const batch of chainWallets) {
      vesdlPromises.push(getVesdlBalances(publicClient, batch));
      sdlPromises.push(getLockedSdlBalances(publicClient, batch));
      sdlPromises.push(getGaugesUnclaimedBalances(publicClient, batch));
      sdlPromises.push(getWalletSdlBalances(publicClient, batch));
      sdlPromises.push(getSushiSDLBalances(publicClient, batch));
      await Promise.all(sdlPromises);
    }
  }

  const vesdlBalances = mergeBalanceMaps(...(await Promise.all(vesdlPromises)));
  const sdlBalances = mergeBalanceMaps(...(await Promise.all(sdlPromises)));

  console.log("veSDL Balances");
  console.table([
    [
      "total",
      formatBI18ForDisplay(
        Object.values(vesdlBalances).reduce((sum, bal) => sum + bal, 0n)
      ),
    ],
    ...Object.entries(vesdlBalances)
      .filter(([, bal]) => bal > BigInt(1e18)) // > 1 veSDL
      .sort((a, b) => (a[1] > b[1] ? -1 : 1))
      .map(([k, v]) => [k, formatBI18ForDisplay(v)])
      .slice(0, 25),
  ]);

  console.log("SDL Balances");
  console.table([
    [
      "total",
      formatBI18ForDisplay(
        Object.values(sdlBalances).reduce((sum, bal) => sum + bal, 0n)
      ),
      "isContract?",
    ],
    ...Object.entries(sdlBalances)
      .filter(([, bal]) => bal > BigInt(1e20)) // > 100 SDL
      .sort((a, b) => (a[1] > b[1] ? -1 : 1))
      .map(([k, v]) => [
        k,
        formatBI18ForDisplay(v),
        nonEOASet.has(k as Address) ? "✅" : "❌",
      ])
      .slice(0, 30),
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
      .map((address) => [
        address,
        sdlBalances[address] || 0n,
        vesdlBalances[address] || 0n,
        targets[address]?.[`${mainnet.id}_isEOA`] ? "❌" : "✅",
        targets[address]?.[`${arbitrum.id}_isEOA`] ? "❌" : "✅",
        targets[address]?.[`${optimism.id}_isEOA`] ? "❌" : "✅",
      ])
      .filter(
        ([, sdl, vesdl, ,]) =>
          (sdl as bigint) > BigInt(1e20) || (vesdl as bigint) > BigInt(1e18)
      )
      .sort((a, b) => ((a[1] as bigint) > (b[1] as bigint) ? -1 : 1))
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
      ),
  ]);

  // Write some results to a CSV
  writeCsv(
    "sdl-balances.csv",
    formatValuesAsCsv(
      Object.entries(sdlBalances)
        .filter(([, bal]) => bal > BigInt(1e20))
        .sort((a, b) => (a[1] > b[1] ? -1 : 1))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
    )
  );

  writeCsv(
    "vesdl-balances.csv",
    formatValuesAsCsv(
      Object.entries(vesdlBalances)
        .filter(([, bal]) => bal > BigInt(1e18))
        .sort((a, b) => (a[1] > b[1] ? -1 : 1))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
    )
  );

  writeCsv("non-eoa-addresses.csv", [...nonEOASet].sort().join("\n"));
  return;
}
main();
