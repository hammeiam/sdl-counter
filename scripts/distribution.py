import csv
from pathlib import Path

mod_path = Path(__file__).parent


def calculate_rebalance(eth_price, arb_price, owned_eth, owned_arb, csv_filename):
    # Print the parameters in pretty format
    print("Parameters:")
    print("  ETH price:", "{:,.2f}".format(eth_price))
    print("  ARB price:", "{:,.2f}".format(arb_price))
    print("  Owned ETH:", "{:,.2f}".format(owned_eth))
    print("  Owned ARB:", "{:,.2f}".format(owned_arb))
    print("  CSV filename:", csv_filename)
    print()

    # Total USD to distribute
    total_usd_to_distribute = (owned_eth * eth_price + owned_arb * arb_price)

    # Print the total USD to distribute
    # format the number to 2 decimal places and add commas
    print("Total USD to distribute:", "{:,.2f}".format(total_usd_to_distribute))

    # Variables to track the distribution and total percentage of ETH and ARB chains
    total_eth_percentage = 0
    total_arb_percentage = 0

    # Read the CSV file to calculate the total percentage for ETH and ARB chains
    with open(csv_filename, newline='') as master_list_csv:
        reader = csv.DictReader(master_list_csv)
        for row in reader:
            if int(row['chain']) == 1 or int(row['chain']) == 10:
                total_eth_percentage += float(row['pctOfWeightedTotal'])
            elif int(row['chain']) == 42161:
                total_arb_percentage += float(row['pctOfWeightedTotal'])

    # Print the total percentage for ETH and ARB chains
    print("Total ETH percentage:", "{:.2f}".format(total_eth_percentage))
    print("Total ARB percentage:", "{:.2f}".format(total_arb_percentage))

    # Calculate the ideal USD distribution for ETH and ARB
    ideal_eth_usd = total_usd_to_distribute * total_eth_percentage / 100
    ideal_arb_usd = total_usd_to_distribute * total_arb_percentage / 100

    # Convert to the raw amount with 18-decimal precision
    ideal_eth = ideal_eth_usd / eth_price
    ideal_arb = ideal_arb_usd / arb_price

    print("Ideal ETH:", ideal_eth)
    print("Ideal ARB:", ideal_arb)

    # Calculate the rebalance amount
    rebalance_eth = ideal_eth - owned_eth
    rebalance_arb = ideal_arb - owned_arb

    # Store the address and the raw amount they receive as a list in format of [address, eth_amount, arb_amount, distribution_network]
    distribution_list = []
    with open(csv_filename, newline='') as master_list_csv:
        reader = csv.DictReader(master_list_csv)
        for row in reader:
            address = row['Address']
            pct_of_weighted_total = float(row['pctOfWeightedTotal']) / 100
            distribution_eth = 0
            distribution_arb = 0

            if int(row['chain']) == 1 or int(row['chain']) == 10:
                distribution_eth = int(pct_of_weighted_total * total_usd_to_distribute * 1e18 / eth_price)
            elif int(row['chain']) == 42161:
                distribution_arb = int(pct_of_weighted_total * total_usd_to_distribute  * 1e18 / arb_price)

            distribution_list.append([address, distribution_eth, distribution_arb, row['chain']])

    # Sort the list
    # The list is sorted in ascending order for distribution_network but descending order for eth_amount and arb_amount
    distribution_list.sort(key=lambda x: (x[3], -x[1], -x[2]))

    # Write the stored list to the csv file
    with open((mod_path / '../distribution.csv').resolve(), 'w', newline='') as distribution_csv:
        writer = csv.writer(distribution_csv)
        writer.writerow(["Address", "ETH", "ARB", "Network"])
        for row in distribution_list:
            writer.writerow(row)

    # Print top 100 addresses

    return rebalance_eth, rebalance_arb

# Example usage
eth_price = 1827.14
arb_price = 1.12
owned_eth = 70.46049
owned_arb = 1_545_243
csv_filename = (mod_path / '../master-list.csv').resolve()

rebalance_eth, rebalance_arb = calculate_rebalance(eth_price, arb_price, owned_eth, owned_arb, csv_filename)

if rebalance_eth > 0:
    rebalance_eth = "+" + str(rebalance_eth)
if rebalance_arb > 0:
    rebalance_arb = "+" + str(rebalance_arb)

print("Rebalance ETH:", rebalance_eth)
print("Rebalance ARB:", rebalance_arb)