import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

mod_path = Path(__file__).parent

# Load the CSV file
file_path = (mod_path / '../master-list.csv').resolve()
data = pd.read_csv(file_path)
data['SDL'] = pd.to_numeric(data['SDL'], errors='coerce')
data['veSDL'] = pd.to_numeric(data['veSDL'], errors='coerce')

# Function to generate pie chart for a given chain
def generate_pie_chart(chain_id, title):
    chain_data = data[data['chain'] == chain_id]
    total_chain_pct = chain_data['pctOfWeightedTotal'].sum()
    top_50_chain_addresses = chain_data.nlargest(50, 'pctOfWeightedTotal')

    # Adding a document emoji prefix if the address is a contract on any chain
    top_50_chain_addresses['Address'] = top_50_chain_addresses.apply(
        lambda row: 'C-' + row['Address'] if row['1_isContract'] == 1 or row['42161_isContract'] == 1 or row['10_isContract'] == 1 else row['Address'], axis=1)

    others_pct_chain = total_chain_pct - top_50_chain_addresses['pctOfWeightedTotal'].sum()
    top_50_chain_addresses.loc[len(top_50_chain_addresses)] ={'Address': 'Others', 'pctOfWeightedTotal': others_pct_chain}
    plt.figure(figsize=(12, 6))
    plt.pie(top_50_chain_addresses['pctOfWeightedTotal'], labels=top_50_chain_addresses['Address'], autopct='%1.1f%%', startangle=140)
    plt.title(title)
    plt.text(0, 1.2, f'Total Weighted Percentage for {chain_id} : {total_chain_pct:.4f}%', ha='center')
    plt.savefig((mod_path / f'../infographics/{title}.png').resolve())
    # plt.show()

def generate_top_50_total_pie_chart():
    top_50_total_addresses = data.nlargest(50, 'pctOfWeightedTotal')
    total_weighted_pct = data['pctOfWeightedTotal'].sum()

    # Adding a document emoji prefix if the address is a contract on any chain
    top_50_total_addresses['Address'] = top_50_total_addresses.apply(
        lambda row: 'C-' + row['Address'] if row['1_isContract'] == 1 or row['42161_isContract'] == 1 or row['10_isContract'] == 1 else row['Address'], axis=1)
    
    others_pct_total = total_weighted_pct - top_50_total_addresses['pctOfWeightedTotal'].sum()
    top_50_total_addresses.loc[len(top_50_total_addresses)] = {'Address': 'Others', 'pctOfWeightedTotal': others_pct_total}
    plt.figure(figsize=(12, 6))
    plt.pie(top_50_total_addresses['pctOfWeightedTotal'], labels=top_50_total_addresses['Address'], autopct='%1.1f%%', startangle=140)
    plt.title('Top 50 Addresses by Weighted Percentage Across All Chains')
    plt.text(0, 1.2, f'Total Weighted Percentage Across All Chains: {total_weighted_pct:.4f}%', ha='center')
    plt.savefig((mod_path / f'../infographics/Top 50 Addresses by Weighted Percentage Across All Chains.png').resolve())
    # plt.show()

# Function to generate bar chart for weighted percentage distribution across chains
def generate_bar_chart():
    chain_data = data.groupby('chain')['pctOfWeightedTotal'].sum()
    plt.figure(figsize=(12, 6))
    plt.bar(chain_data.index.astype(str), chain_data.values, tick_label=chain_data.index.astype(str))
    plt.title('Weighted Percentage Distribution Across Chains')
    plt.xlabel('Chain ID')
    plt.ylabel('Weighted Percentage')
    for i, v in enumerate(chain_data.values):
        plt.text(i, v, f'{v:.2f}%', ha='center', va='bottom')
    plt.savefig((mod_path / f'../infographics/Weighted Percentage Distribution Across Chains.png').resolve())
    # plt.show()

# Function to generate bar chart for total number of addresses per chain
def generate_addresses_per_chain_bar_chart():
    chain_address_count = data.groupby('chain')['Address'].count()
    plt.figure(figsize=(12, 6))
    plt.bar(chain_address_count.index.astype(str), chain_address_count.values, tick_label=chain_address_count.index.astype(str))
    plt.title('Total Number of Addresses Per Chain')
    plt.xlabel('Chain ID')
    plt.ylabel('Number of Addresses')
    for i, v in enumerate(chain_address_count.values):
        plt.text(i, v, str(v), ha='center', va='bottom')
    plt.savefig((mod_path / f'../infographics/Total Number of Addresses Per Chain.png').resolve())

# Generate pie charts for chains 1 and 42161
generate_top_50_total_pie_chart()
generate_pie_chart(1, 'Top 50 Addresses by Weighted Percentage for Chain 1')
generate_pie_chart(10, 'Top 50 Addresses by Weighted Percentage for Chain 10')
generate_pie_chart(42161, 'Top 50 Addresses by Weighted Percentage for Chain 42161')

generate_bar_chart()
generate_addresses_per_chain_bar_chart()
