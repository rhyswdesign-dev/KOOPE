#!/usr/bin/env python3
"""
Properly fix cocktails.ts by:
1. Adding missing commas before requiresPro
2. Ensuring all Pro cocktails have requiresPro: true
"""

import re

# IDs of cocktails that should remain free
FREE_COCKTAIL_IDS = {
    'margarita', 'margarita-classic',
    'old-fashioned', 'old-fashioned-classic',
    'daiquiri', 'martini', 'dry-martini', 'vodka-martini',
    'negroni', 'whiskey-sour', 'mojito', 'cosmopolitan',
    'moscow-mule', 'aperol-spritz', 'espresso-martini',
    'tom-collins', 'paloma', 'pina-colada', 'french-75',
    'mai-tai', 'manhattan', 'gimlet', 'sidecar', 'dark-stormy',
}

import os

script_dir = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(script_dir, '../src/data/cocktails.ts')

# Read file
with open(file_path, 'r') as f:
    content = f.read()

# Remove all existing requiresPro fields
content = re.sub(r',?\s*requiresPro: true,?\s*\n', '\n', content)
print("Removed all existing requiresPro fields")

# Split into lines for processing
lines = content.split('\n')
new_lines = []
i = 0

while i < len(lines):
    line = lines[i]

    # Check if this line starts a cocktail object
    id_match = re.match(r"\s*id: '([^']+)'", line)

    if id_match:
        cocktail_id = id_match.group(1)
        cocktail_lines = [line]
        i += 1
        is_syrup = False

        # Collect all lines for this cocktail until we hit the closing brace
        while i < len(lines) and not lines[i].strip() == '},':
            cocktail_lines.append(lines[i])
            if "category: 'Syrups'" in lines[i]:
                is_syrup = True
            i += 1

        # Add the closing brace line
        if i < len(lines):
            closing_brace_line = lines[i]

            # Determine if we need requiresPro
            needs_pro = cocktail_id not in FREE_COCKTAIL_IDS and not is_syrup

            if needs_pro:
                # Find the last property line and ensure it has a comma
                if len(cocktail_lines) > 0:
                    last_prop_idx = len(cocktail_lines) - 1
                    last_line = cocktail_lines[last_prop_idx].rstrip()

                    if not last_line.endswith(','):
                        cocktail_lines[last_prop_idx] = last_line + ','

                    # Get indentation from the last line
                    indent_match = re.match(r'^(\s*)', cocktail_lines[last_prop_idx])
                    indent = indent_match.group(1) if indent_match else '    '

                    # Add requiresPro line
                    cocktail_lines.append(f"{indent}requiresPro: true,")
                    print(f"Added requiresPro to: {cocktail_id}")

            # Add all cocktail lines
            new_lines.extend(cocktail_lines)
            new_lines.append(closing_brace_line)

        i += 1
    else:
        new_lines.append(line)
        i += 1

# Write back
with open(file_path, 'w') as f:
    f.write('\n'.join(new_lines))

print("\n✅ Fixed cocktails.ts!")
