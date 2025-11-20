#!/usr/bin/env python3
"""
Rename cocktail image files with special Unicode apostrophes
"""

import os

os.chdir('/Users/frodobagginz/Downloads/test-project/HomeGameAdvantage/assets/images/cocktails')

files = [
    ("Tommy\u2019s Margarita.png", "Tommys-Margarita.png"),
    ("Planter's Punch.png", "Planters-Punch.png"),
    ("Horse's Neck.png", "Horses-Neck.png"),
    ("Trader Vic\u2019s Grog.png", "Trader-Vics-Grog.png"),
    ("Vieux Carré.png", "Vieux-Carre.png")
]

for old, new in files:
    if os.path.exists(old):
        os.rename(old, new)
        print(f'✅ Renamed: {old} → {new}')
    else:
        print(f'❌ Not found: {old}')

print('\n✨ All files renamed successfully!')
