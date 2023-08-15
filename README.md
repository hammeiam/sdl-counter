# SDL Balances

> Calculates veSDL and SDL balances (including unclaimed SDL) for all users on all chains

## Getting started

1. Install dependencies with `pnpm install`
2. Copy `template.env` and add infura API key
3. Export addresses as `targets.csv` from https://dune.com/queries/2759260, save in project root
4. Export uniswap v3 positiosn as `univ3-lps.csv` from https://dune.com/queries/2727107, save in project root
5. Export badgesForBandits NFT holders from [etherscan csv export](https://etherscan.io/exportData) using address `0xe374b4df4cf95ecc0b7c93b49d465a1549f86cc0`
6. Run with `pnpm run exec`

## Understanding the results

Results are output to `master-list.csv`, which contains information about every recipient address. This includes its calculated SDL and veSDL balances, as well as the % of total distribution it is entitled to.

The % is derived from the formula `(walletSDL + 4 x walletVeSDL) / (totalSDL + 4 x totalVeSDL)`, as per the [proposal](https://snapshot.org/#/saddlefinance.eth/proposal/0x271aef6b1d04cf08878b33d304add4827da146dc7b1ca12d802a3922e29ad34b)

Addresses with less than 100 SDL (approx. $0.20, the cost of a transfer on Arbitrum) have been removed from the final list.

## Checklist

### VESDL Balances

- [x] vesdl contract #getVesdlBalances

### SDL Balances

- [x] user wallet `#getWalletSdlBalances`
- [x] unclaimed employee/investor vesting `#getVestingClaimableBalances`
- [x] unclaimed retro vesting `#getRetroVestingBalances`
- [x] sdl locked in vesdl `#getLockedSdlBalances`
- [x] unclaimed gauges `#getGaugesUnclaimedBalances`
  - `#getAllGaugeAddresses`
    - mainnet
    - sidechain
- [x] SLP pool `#getSushiSDLBalances`
- [x] UniV3 positions `#getUniV3PositionBalance`

### Utils

- [x] Helper to create client for chain #createPublicClient
- [x] Helper to output as CSV #formatValuesAsCsv
- [x] Helper to merge n {address:balance} maps #mergeBalanceMaps

### Operational

- [x] fetch values accross all chains
- [x] aggregate results and display
- [x] omit addresses (eg msig, treasury)

## Infographics

Note that contract addresses are prefixed with `C-`.

### Total Number of Addreses Per Chain

![Total Number of Addreses Per Chain](infographics/Total%20Number%20of%20Addresses%20Per%20Chain.png)

### Weighted Percetange Distribution Across Chains

![Total Number of Addreses Per Chain](infographics/Weighted%20Percentage%20Distribution%20Across%20Chains.png)

### Top 50 Addresses by Weighted Percentage Across All Chains

![Top 50 Addresses by Weighted Percentage Across All Chains](infographics/Top%2050%20Addresses%20by%20Weighted%20Percentage%20Across%20All%20Chains.png)

### Top 50 Addresses by Weighted Percentage for Chain 1

![Top 50 Addresses by Weighted Percentage for Chain 1](infographics/Top%2050%20Addresses%20by%20Weighted%20Percentage%20for%20Chain%201.png)

### Top 50 Addresses by Weighted Percentage for Chain 10

![Top 50 Addresses by Weighted Percentage for Chain 10](infographics/Top%2050%20Addresses%20by%20Weighted%20Percentage%20for%20Chain%2010.png)

### Top 50 Addresses by Weighted Percentage for Chain 42161

![Top 50 Addresses by Weighted Percentage for Chain 42161](infographics/Top%2050%20Addresses%20by%20Weighted%20Percentage%20for%20Chain%2042161.png)
