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

    if rebalance_eth > 0:
        rebalance_eth = "+" + str(rebalance_eth)
    if rebalance_arb > 0:
        rebalance_arb = "+" + str(rebalance_arb)

    print("Rebalance ETH:", rebalance_eth)
    print("Rebalance ARB:", rebalance_arb, "\n")

    return rebalance_eth, rebalance_arb

# Calculate distribution for a given ETH and ARB amount
def write_distribution_as_csv(owned_eth, owned_arb, master_list_csv):

    print("Assuming we already own the ideal amount of ETH and ARB, distribution for each address is as follows:\n")

    print("Distributing ETH:", "{:,.4f}".format(owned_eth))
    print("Distributing ARB:", "{:,.4f}".format(owned_arb), "\n")

    owned_eth_1e18 = int(owned_eth * 1e18)
    owned_arb_1e18 = int(owned_arb * 1e18)

    # Variables to track the distribution and total percentage of ETH and ARB chains
    total_eth_percentage = 0
    total_arb_percentage = 0

    # Store the address and the raw amount they receive as a list in format of [address, eth_amount, arb_amount, distribution_network]
    distribution_list = []

    # Read the CSV file to calculate the total percentage for ETH and ARB chains
    with open(master_list_csv, newline='') as master_list_csv:
        reader = csv.DictReader(master_list_csv)
        for row in reader:
            if int(row['chain']) == 1 or int(row['chain']) == 10:
                total_eth_percentage += float(row['pctOfWeightedTotal'])
            elif int(row['chain']) == 42161:
                total_arb_percentage += float(row['pctOfWeightedTotal'])

        # Scroll back to the top of the CSV file
        master_list_csv.seek(0)
        reader = csv.DictReader(master_list_csv)

        # Read the CSV file to calculate the distribution for each address
        for row in reader:
            address = row['Address']
            if int(row['chain']) == 1 or int(row['chain']) == 10:
                pct_of_eth = float(row['pctOfWeightedTotal']) / total_eth_percentage
                distribution_eth_amount = int(pct_of_eth * owned_eth_1e18)
                distribution_list.append([address, distribution_eth_amount, 0, int(row['chain'])])
            elif int(row['chain']) == 42161:
                pct_of_arb = float(row['pctOfWeightedTotal']) / total_arb_percentage
                distribution_arb_amount = int(pct_of_arb * owned_arb_1e18)
                distribution_list.append([address, 0, distribution_arb_amount, int(row['chain'])])

    # Sort the list
    # The list is sorted in ascending order for distribution_network but descending order for eth_amount and arb_amount
    distribution_list.sort(key=lambda x: (x[3], -x[1], -x[2]))

    # Pretty print top 10 addresses for each network. Printing user address, token, token amount formatted for human readability
    print("Top 10 addresses for each network:\n")

    # Get top 10 addresses for ethereum
    distribution_list_eth = [x for x in distribution_list if x[3] == 1]
    print("Ethereum:")
    for i in range(10):
        print(distribution_list_eth[i][0], "ETH", "{:,.4f}".format(distribution_list_eth[i][1] / 1e18))
    
    # Get top 10 addresses for arbitrum
    distribution_list_arb = [x for x in distribution_list if x[3] == 42161]
    print("\nArbitrum:")
    for i in range(10):
        print(distribution_list_arb[i][0], "ARB", "{:,.4f}".format(distribution_list_arb[i][2] / 1e18))
    
    # Get top 10 addresses for optimism
    distribution_list_opt = [x for x in distribution_list if x[3] == 10]
    print("\nOptimism:")
    for i in range(min(10, len(distribution_list_opt))):
        print(distribution_list_opt[i][0], "ETH", "{:,.4f}".format(distribution_list_opt[i][1] / 1e18))


    # Write the stored list to the csv file
    with open((mod_path / '../distribution.csv').resolve(), 'w', newline='') as distribution_csv:
        writer = csv.writer(distribution_csv)
        writer.writerow(["address", "eth_amount", "arb_amount", "distribution_network"])
        for row in distribution_list:
            writer.writerow(row)

# Price of ETH and ARB at the time of writing
# 2023-08-16 04:30 PM EST
eth_price = 1820.38
arb_price = 1.09
owned_eth = 244.4005
owned_arb = 1253644.6630783998

csv_filename = (mod_path / '../master-list.csv').resolve()
calculate_rebalance(eth_price, arb_price, owned_eth, owned_arb, csv_filename)
write_distribution_as_csv(owned_eth, owned_arb, csv_filename)

