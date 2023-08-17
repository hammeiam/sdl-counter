# SDL Balances and Treasury Distribution

> Calculates veSDL/SDL balances (including unclaimed SDL) and the treasury distribution for all users on all chains

This is an implementation of [SIP-54: Protocol operations and treasury management](https://vote.saddle.community/#/proposal/0x271aef6b1d04cf08878b33d304add4827da146dc7b1ca12d802a3922e29ad34b).

The following parameters are used in the calculations:
- Target block for Ethereum: [17820592](https://etherscan.io/block/17820592)
- Target block for Arbitrum One: [117105902](https://arbiscan.io/block/117105902)
- Target block for Optimism: [107649708](https://optimistic.etherscan.io/block/107649708)
- ETH price: $1,820.38 (as of 2023-08-16 04:30 PM EST)
- ARB price: $1.09 (as of 2023-08-16 04:30 PM EST) 

The final distribution results are in [distributions.csv](distributions.csv).

## Getting started

1. Install dependencies with `pnpm install`
2. Copy [template.env](template.env) and add Infura API key
3. Export addresses as [targets.csv](targets.csv) from https://dune.com/queries/2759260, save in project root
4. Export Uniswap V3 positions as [univ3-lps.csv](univ3-lps.csv) from https://dune.com/queries/2727107, save in project root
5. Export badgesForBandits NFT holders from [Etherscan CSV export](https://etherscan.io/exportData) using address `0xe374b4df4cf95ecc0b7c93b49d465a1549f86cc0`
6. Run with `pnpm run exec`

## Understanding the results

Results are output to [master-list.csv](master-list.csv), which contains information about every recipient address. This includes its calculated SDL and veSDL balances, as well as the % of total distribution it is entitled to.

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

## Output

**> pnpm run exec**
```
> 

Target block for Ethereum: 17820592
Target block for Arbitrum One: 117105902
Target block for Optimism: 107649708
┌─────────┬───────────────────────┬─────────────────────┐
│ (index) │           0           │          1          │
├─────────┼───────────────────────┼─────────────────────┤
│    0    │          ''           │ 'UNFILTERED TOTALS' │
│    1    │       'SDL Sum'       │    '508,498,164'    │
│    2    │     'SDL holders'     │        3382         │
│    3    │      'veSDL Sum'      │    '41,998,357'     │
│    4    │    'veSDL holders'    │         164         │
│    5    │          ''           │         ''          │
│    6    │        'veSDL'        │    '41,998,357'     │
│    7    │      'lockedSDL'      │    '63,212,412'     │
│    8    │   'gaugesUnclaimed'   │     '2,433,298'     │
│    9    │      'walletSDL'      │    '317,448,092'    │
│   10    │      'sushiSDL'       │     '7,273,179'     │
│   11    │  'vestingClaimable'   │    '105,324,771'    │
│   12    │        'uniV3'        │      '296,410'      │
│   13    │  'saddleCreatorsNFT'  │     '3,150,000'     │
│   14    │ 'badgesForBanditsNFT' │     '8,100,000'     │
│   15    │    'delosSigners'     │     '1,260,000'     │
└─────────┴───────────────────────┴─────────────────────┘
┌─────────┬─────────────────┬───────────────────┐
│ (index) │        0        │         1         │
├─────────┼─────────────────┼───────────────────┤
│    0    │       ''        │ 'FILTERED TOTALS' │
│    1    │    'SDL Sum'    │   '508,483,030'   │
│    2    │  'SDL holders'  │       2468        │
│    3    │   'veSDL Sum'   │   '41,998,356'    │
│    4    │ 'veSDL holders' │        163        │
└─────────┴─────────────────┴───────────────────┘
veSDL Balances
┌─────────┬──────────────────────────────────────────────┬──────────────┬───────────────┐
│ (index) │                      0                       │      1       │       2       │
├─────────┼──────────────────────────────────────────────┼──────────────┼───────────────┤
│    0    │                   'total'                    │ '41,998,356' │ 'isContract?' │
│    1    │ '0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27' │ '18,767,482' │     '✅'      │
│    2    │ '0xb42b2FD9e3399336a47b6759A840F0baC1DdE895' │ '4,124,274'  │     '❌'      │
│    3    │ '0x01F3f5E04aC4ef7c632A16B1F5AcFAd1CC100077' │ '2,332,374'  │     '❌'      │
│    4    │ '0x6B6c51C444fea186e7dAb8963730f37FAFf1dB16' │ '2,096,282'  │     '❌'      │
│    5    │ '0xC6e00e0E3544C93460cdFb53E85C4528EF348265' │ '1,574,546'  │     '❌'      │
│    6    │ '0x5318f07A3a20A2f8bb0DDf14F1DD58C517a76508' │ '1,499,217'  │     '✅'      │
│    7    │ '0x7e108711771DfdB10743F016D46d75A9379cA043' │ '1,238,444'  │     '❌'      │
│    8    │ '0x82AbEDF193942a6Cdc4704A8D49e54fE51160E99' │ '1,021,487'  │     '❌'      │
│    9    │ '0xD9AED190e9Ae62b59808537D2EBD9E123eac4703' │  '970,164'   │     '❌'      │
│   10    │ '0xf6AdCf15A808d32ec0dB6592695C201120E2c478' │  '833,619'   │     '❌'      │
│   11    │ '0xDAD92B08880C86e639B47516C4FEb0B10B1871D8' │  '818,407'   │     '❌'      │
│   12    │ '0x2a6bf8a714AcDbe9d6e9dd1753Ca09b8e7D95328' │  '729,458'   │     '❌'      │
│   13    │ '0x7fF5526f2B01B6eF5e30EB6B0066642476Ee01A1' │  '642,387'   │     '❌'      │
│   14    │ '0x95f1872c2c63f54072BD42F68BeEe71E0D6f67d3' │  '604,347'   │     '❌'      │
│   15    │ '0x9eEf87f4C08d8934cB2a3309dF4deC5635338115' │  '510,888'   │     '❌'      │
│   16    │ '0x50AdF7A75d7cD6132ACc0a2FB21C019011286635' │  '494,629'   │     '❌'      │
│   17    │ '0x5416808256eA66367d7Ec1Ae2C37BB64EC2425d4' │  '478,703'   │     '❌'      │
│   18    │ '0xA40C8F96524cE6AFBfE1c080C18AA9587C0199c9' │  '453,776'   │     '❌'      │
│   19    │ '0x605B5F6549538a94Bd2653d1EE67612a47039da0' │  '448,656'   │     '❌'      │
│   20    │ '0x49c6fB6CBe27Ce0E773B85840Cb072791368e5Bb' │  '420,184'   │     '❌'      │
│   21    │ '0x0Cec743b8CE4Ef8802cAc0e5df18a180ed8402A7' │  '267,146'   │     '❌'      │
│   22    │ '0xCB11d6C568448cAbEC62C2c3469b538Eb37E1341' │  '246,593'   │     '❌'      │
│   23    │ '0xab58779cec2B82A75Ffd103fDc88D7e3aDb13468' │  '188,298'   │     '❌'      │
│   24    │ '0x5180db0237291A6449DdA9ed33aD90a38787621c' │  '138,500'   │     '❌'      │
│   25    │ '0x7BFEe91193d9Df2Ac0bFe90191D40F23c773C060' │  '130,054'   │     '❌'      │
└─────────┴──────────────────────────────────────────────┴──────────────┴───────────────┘
SDL Balances
┌─────────┬──────────────────────────────────────────────┬───────────────┬───────────────┐
│ (index) │                      0                       │       1       │       2       │
├─────────┼──────────────────────────────────────────────┼───────────────┼───────────────┤
│    0    │                   'total'                    │ '508,483,030' │ 'isContract?' │
│    1    │ '0x27E2E09a84BaE20C2a9667594896EaF132c862b7' │ '78,269,452'  │     '❌'      │
│    2    │ '0xda7Dc67829F5c1Ad7eC4C6174a6Fbbc722229a40' │ '28,461,986'  │     '❌'      │
│    3    │ '0x74c5E6Dc988989D3025292C94d36B9e0ABBcf3d0' │ '28,461,986'  │     '❌'      │
│    4    │ '0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27' │ '26,054,300'  │     '✅'      │
│    5    │ '0x53AB8F38EE493d88553Ea6c2766d574E404e249B' │ '25,952,517'  │     '✅'      │
│    6    │ '0x0e269790EBA49dCe4B852457F60f4A1493F42dC1' │ '23,717,410'  │     '❌'      │
│    7    │ '0xA44ED7D06cbEE6F7d166A7298Ec61724C08163F5' │ '21,346,489'  │     '✅'      │
│    8    │ '0xCB8EFB0c065071E4110932858A84365A80C8feF0' │ '17,654,325'  │     '❌'      │
│    9    │ '0xFADd1e869eEeb303785f9FafCEDBC40605B8B346' │ '12,323,861'  │     '❌'      │
│   10    │ '0xa0f75491720835b36edC92D06DDc468D201e9b73' │ '11,635,183'  │     '❌'      │
│   11    │ '0x89a88bcfe0A8BB0BD240FACf5f20385Cdc48eC4C' │ '10,421,416'  │     '❌'      │
│   12    │ '0xdB7A80DdfDeB83573636B84862803bB07317194C' │ '10,364,541'  │     '❌'      │
│   13    │ '0xbf6b82232Ab643ffb85578868B74919fE30E26e2' │  '9,138,432'  │     '❌'      │
│   14    │ '0x0EA4A285E1353F490eC7f473AB3174Cac71cF79a' │  '7,108,679'  │     '❌'      │
│   15    │ '0xb42b2FD9e3399336a47b6759A840F0baC1DdE895' │  '6,715,283'  │     '❌'      │
│   16    │ '0x38eE5F5A39c01cB43473992C12936ba1219711ab' │  '6,508,913'  │     '❌'      │
│   17    │ '0x38f9aBD4BD8947dA035abf51fC21244108a81CA6' │  '5,870,301'  │     '❌'      │
│   18    │ '0xD9AED190e9Ae62b59808537D2EBD9E123eac4703' │  '5,173,652'  │     '❌'      │
│   19    │ '0x90763Cf0cEB2D3Ea37702D69dB885e498EeE14fb' │  '3,885,659'  │     '❌'      │
│   20    │ '0x461aa63A98e6f8BdAa19CA3f2258670E794FFF34' │  '3,836,906'  │     '✅'      │
│   21    │ '0xa76595083F0436912A50418901AcA7ED044Bb14F' │  '3,751,200'  │     '✅'      │
│   22    │ '0xCf67910ed04fB23a2ccff3A4bEC259Bb0bf3841c' │  '3,284,075'  │     '❌'      │
│   23    │ '0x6De56F8fB34d6081FA173bFC29b3E953a78998dC' │  '3,284,075'  │     '❌'      │
│   24    │ '0x5D7de07FD214f0Ad436E808B0fFe338fCa02043f' │  '3,104,358'  │     '❌'      │
│   25    │ '0xC6e00e0E3544C93460cdFb53E85C4528EF348265' │  '2,711,131'  │     '❌'      │
└─────────┴──────────────────────────────────────────────┴───────────────┴───────────────┘
Non EOA Addresses
┌─────────┬──────────────────────────────────────────────┬──────────────┬──────────────┬───────────────────┬────────────────────┬────────────────────┐
│ (index) │                      0                       │      1       │      2       │         3         │         4          │         5          │
├─────────┼──────────────────────────────────────────────┼──────────────┼──────────────┼───────────────────┼────────────────────┼────────────────────┤
│    0    │                  'Address'                   │    'SDL'     │   'veSDL'    │ 'existsOnMainnet' │ 'existsOnArbitrum' │ 'existsOnOptimism' │
│    1    │ '0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27' │ '26,054,300' │ '18,767,482' │       '✅'        │        '❌'        │        '❌'        │
│    2    │ '0x27E2E09a84BaE20C2a9667594896EaF132c862b7' │ '78,269,452' │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│    3    │ '0xda7Dc67829F5c1Ad7eC4C6174a6Fbbc722229a40' │ '28,461,986' │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│    4    │ '0x74c5E6Dc988989D3025292C94d36B9e0ABBcf3d0' │ '28,461,986' │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│    5    │ '0x53AB8F38EE493d88553Ea6c2766d574E404e249B' │ '25,952,517' │     '0'      │       '✅'        │        '❌'        │        '✅'        │
│    6    │ '0x0e269790EBA49dCe4B852457F60f4A1493F42dC1' │ '23,717,410' │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│    7    │ '0xb42b2FD9e3399336a47b6759A840F0baC1DdE895' │ '6,715,283'  │ '4,124,274'  │       '❌'        │        '❌'        │        '❌'        │
│    8    │ '0xA44ED7D06cbEE6F7d166A7298Ec61724C08163F5' │ '21,346,489' │     '0'      │       '✅'        │        '❌'        │        '❌'        │
│    9    │ '0xCB8EFB0c065071E4110932858A84365A80C8feF0' │ '17,654,325' │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│   10    │ '0xFADd1e869eEeb303785f9FafCEDBC40605B8B346' │ '12,323,861' │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│   11    │ '0x01F3f5E04aC4ef7c632A16B1F5AcFAd1CC100077' │ '2,360,577'  │ '2,332,374'  │       '❌'        │        '❌'        │        '❌'        │
│   12    │ '0xa0f75491720835b36edC92D06DDc468D201e9b73' │ '11,635,183' │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│   13    │ '0x6B6c51C444fea186e7dAb8963730f37FAFf1dB16' │ '2,505,880'  │ '2,096,282'  │       '❌'        │        '❌'        │        '❌'        │
│   14    │ '0x89a88bcfe0A8BB0BD240FACf5f20385Cdc48eC4C' │ '10,421,416' │   '4,161'    │       '❌'        │        '❌'        │        '❌'        │
│   15    │ '0xdB7A80DdfDeB83573636B84862803bB07317194C' │ '10,364,541' │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│   16    │ '0xbf6b82232Ab643ffb85578868B74919fE30E26e2' │ '9,138,432'  │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│   17    │ '0xD9AED190e9Ae62b59808537D2EBD9E123eac4703' │ '5,173,652'  │  '970,164'   │       '❌'        │        '❌'        │        '❌'        │
│   18    │ '0xC6e00e0E3544C93460cdFb53E85C4528EF348265' │ '2,711,131'  │ '1,574,546'  │       '❌'        │        '❌'        │        '❌'        │
│   19    │ '0x5318f07A3a20A2f8bb0DDf14F1DD58C517a76508' │ '1,927,121'  │ '1,499,217'  │       '❌'        │        '✅'        │        '✅'        │
│   20    │ '0x0EA4A285E1353F490eC7f473AB3174Cac71cF79a' │ '7,108,679'  │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│   21    │ '0x7e108711771DfdB10743F016D46d75A9379cA043' │ '1,637,620'  │ '1,238,444'  │        '⚠️'        │        '⚠️'         │        '⚠️'         │
│   22    │ '0x38eE5F5A39c01cB43473992C12936ba1219711ab' │ '6,508,913'  │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│   23    │ '0x38f9aBD4BD8947dA035abf51fC21244108a81CA6' │ '5,870,301'  │     '0'      │       '❌'        │        '❌'        │        '❌'        │
│   24    │ '0x82AbEDF193942a6Cdc4704A8D49e54fE51160E99' │ '1,563,443'  │ '1,021,487'  │       '❌'        │        '❌'        │        '❌'        │
│   25    │ '0x2a6bf8a714AcDbe9d6e9dd1753Ca09b8e7D95328' │ '1,280,946'  │  '729,458'   │       '❌'        │        '❌'        │        '❌'        │
└─────────┴──────────────────────────────────────────────┴──────────────┴──────────────┴───────────────────┴────────────────────┴────────────────────┘
```

**> python scripts/distribution.py**
```
Parameters:
  ETH price: 1,820.38
  ARB price: 1.09
  Owned ETH: 244.40
  Owned ARB: 1,253,644.66
  CSV filename: /master-list.csv

Total USD to distribute: 1,811,374.46
Total ETH percentage: 24.61
Total ARB percentage: 75.39
Ideal ETH: 244.89876102028023
Ideal ARB: 1252811.0613974333
Rebalance ETH: +0.4982610202802391
Rebalance ARB: -833.6016809665598

Assuming we already own the ideal amount of ETH and ARB, distribution for each address is as follows:

Distributing ETH: 244.4005
Distributing ARB: 1,253,644.6631

Top 10 addresses for each network:

Ethereum:
0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27 ETH 148.4445
0x53AB8F38EE493d88553Ea6c2766d574E404e249B ETH 38.0968
0xA44ED7D06cbEE6F7d166A7298Ec61724C08163F5 ETH 31.3354
0x461aa63A98e6f8BdAa19CA3f2258670E794FFF34 ETH 5.6324
0xa76595083F0436912A50418901AcA7ED044Bb14F ETH 5.5065
0xF02e86D9E0eFd57aD034FaF52201B79917fE0713 ETH 3.6441
0x04B3f2Ac72AAD1Cdb12A4Cb516E2183F1D455442 ETH 1.9426
0x30A14d1BfBa95f1867a67Ae8C18A950075592C99 ETH 1.9283
0x67E3ea119E141406c37e2CA783b749Fe1437673f ETH 1.9283
0xFcfBF39D5211498AfD8a00C07AAD44A2a96118d0 ETH 1.4747

Arbitrum:
0x27E2E09a84BaE20C2a9667594896EaF132c862b7 ARB 192,402.2878
0xda7Dc67829F5c1Ad7eC4C6174a6Fbbc722229a40 ARB 69,965.3706
0x74c5E6Dc988989D3025292C94d36B9e0ABBcf3d0 ARB 69,965.3706
0x0e269790EBA49dCe4B852457F60f4A1493F42dC1 ARB 58,302.2342
0xb42b2FD9e3399336a47b6759A840F0baC1DdE895 ARB 57,060.7686
0xCB8EFB0c065071E4110932858A84365A80C8feF0 ARB 43,397.9335
0xFADd1e869eEeb303785f9FafCEDBC40605B8B346 ARB 30,294.5672
0x01F3f5E04aC4ef7c632A16B1F5AcFAd1CC100077 ARB 28,736.5894
0xa0f75491720835b36edC92D06DDc468D201e9b73 ARB 28,601.6545
0x6B6c51C444fea186e7dAb8963730f37FAFf1dB16 ARB 26,772.3277

Optimism:
0x8a08DCbC8c9c603428Ee7333ADAc9BcAbB9b23be ETH 0.0014
0x04641386e8bc87A533151d97D2d4E3656ed1237A ETH 0.0009
```
