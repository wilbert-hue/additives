const fs = require('fs');
const path = require('path');

// Years: 2021-2033
const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

// Geographies with their region grouping
const regions = {
  "North America": ["U.S.", "Canada"],
  "Europe": ["U.K.", "Germany", "Italy", "France", "Spain", "Russia", "Rest of Europe"],
  "Asia Pacific": ["China", "India", "Japan", "South Korea", "ASEAN", "Australia", "Rest of Asia Pacific"],
  "Latin America": ["Brazil", "Argentina", "Mexico", "Rest of Latin America"],
  "Middle East & Africa": ["GCC", "South Africa", "Rest of Middle East & Africa"]
};

// Segment definitions — hierarchical (parent > children) or flat (leaf shares)
const segmentTypes = {
  "By Product Type": {
    type: "hierarchical",
    parentShares: {
      "Dispersants": 0.20,
      "Detergents": 0.25,
      "Anti-wear Additives": 0.22,
      "Friction Modifiers": 0.18,
      "Antioxidants": 0.15
    },
    hierarchy: {
      "Dispersants": {
        "Polyisobutylene Succinimides (PIBSI)": 0.55,
        "Mannich Dispersants": 0.45
      },
      "Detergents": {
        "Calcium-based": 0.35,
        "Magnesium-based": 0.30,
        "Sodium-based": 0.35
      },
      "Anti-wear Additives": {
        "Zinc Dialkyldithiophosphate (ZDDP)": 0.65,
        "Phosphorus-based": 0.35
      },
      "Friction Modifiers": {
        "Organic Friction Modifiers": 0.60,
        "Molybdenum-based": 0.40
      },
      "Antioxidants": {
        "Aminic": 0.55,
        "Phenolic": 0.45
      }
    }
  },
  "By Application": {
    type: "hierarchical",
    parentShares: {
      "Automotive Application": 0.45,
      "Industrial Application": 0.30
    },
    hierarchy: {
      "Automotive Application": {
        "Passenger Vehicle Engine Oil (PVEO)": 0.35,
        "Heavy Duty Engine Oil (HDEO)": 0.25,
        "Transmission Fluid": 0.20,
        "Gear Oil": 0.12,
        "Brake Fluid": 0.08
      },
      "Industrial Application": {
        "Hydraulic Fluids": 0.25,
        "Industrial Gear Oils": 0.25,
        "Compressor Oils": 0.20,
        "Turbine Oils": 0.15,
        "Metalworking Fluids": 0.15
      }
    },
    flat: {
      "Marine Lubricants": 0.10,
      "Aviation Lubricants": 0.08,
      "Railway Lubricants": 0.07
    }
  },
  "By Function": {
    type: "flat",
    segments: {
      "Wear Protection": 0.22,
      "Deposit Control": 0.18,
      "Oxidation Stability": 0.16,
      "Friction Reduction": 0.14,
      "Corrosion Protection": 0.12,
      "Viscosity Modification": 0.10,
      "Others": 0.08
    }
  },
  "By Lubricant Type": {
    type: "flat",
    segments: {
      "Engine Oils": 0.28,
      "Hydraulic Fluids": 0.18,
      "Gear Oils": 0.15,
      "Metalworking Fluids": 0.14,
      "Greases": 0.12,
      "Compressor Oils": 0.08,
      "Others": 0.05
    }
  },
  "By Base Oil Type": {
    type: "flat",
    segments: {
      "Mineral Oil": 0.45,
      "Synthetic Oil": 0.28,
      "Semi-Synthetic Oil": 0.18,
      "Bio-Based Oil": 0.09
    }
  }
};

// Regional base values (USD Million) for 2021 - total market per region
// Global lubricant additives market ~$14B in 2021
const regionBaseValues = {
  "North America": 4500,
  "Europe": 3800,
  "Asia Pacific": 4200,
  "Latin America": 800,
  "Middle East & Africa": 600
};

// Country share within region (must sum to ~1.0)
const countryShares = {
  "North America": { "U.S.": 0.82, "Canada": 0.18 },
  "Europe": { "U.K.": 0.18, "Germany": 0.22, "Italy": 0.12, "France": 0.16, "Spain": 0.10, "Russia": 0.08, "Rest of Europe": 0.14 },
  "Asia Pacific": { "China": 0.28, "India": 0.12, "Japan": 0.25, "South Korea": 0.12, "ASEAN": 0.10, "Australia": 0.07, "Rest of Asia Pacific": 0.06 },
  "Latin America": { "Brazil": 0.45, "Argentina": 0.15, "Mexico": 0.25, "Rest of Latin America": 0.15 },
  "Middle East & Africa": { "GCC": 0.45, "South Africa": 0.25, "Rest of Middle East & Africa": 0.30 }
};

// Growth rates (CAGR) per region
const regionGrowthRates = {
  "North America": 0.042,
  "Europe": 0.038,
  "Asia Pacific": 0.055,
  "Latin America": 0.048,
  "Middle East & Africa": 0.045
};

// Segment-specific growth multipliers (relative to regional base CAGR)
const segmentGrowthMultipliers = {
  "Polyisobutylene Succinimides (PIBSI)": 1.05,
  "Mannich Dispersants": 1.08,
  "Calcium-based": 0.98,
  "Magnesium-based": 1.02,
  "Sodium-based": 1.06,
  "Zinc Dialkyldithiophosphate (ZDDP)": 0.95,
  "Phosphorus-based": 1.10,
  "Organic Friction Modifiers": 1.08,
  "Molybdenum-based": 1.04,
  "Aminic": 1.03,
  "Phenolic": 1.06,
  "Passenger Vehicle Engine Oil (PVEO)": 1.02,
  "Heavy Duty Engine Oil (HDEO)": 1.05,
  "Transmission Fluid": 1.04,
  "Gear Oil": 0.98,
  "Brake Fluid": 1.08,
  "Hydraulic Fluids": 1.06,
  "Industrial Gear Oils": 1.03,
  "Compressor Oils": 1.05,
  "Turbine Oils": 1.07,
  "Metalworking Fluids": 1.04,
  "Marine Lubricants": 1.02,
  "Aviation Lubricants": 1.10,
  "Railway Lubricants": 1.06,
  "Wear Protection": 1.02,
  "Deposit Control": 1.05,
  "Oxidation Stability": 1.04,
  "Friction Reduction": 1.08,
  "Corrosion Protection": 1.03,
  "Viscosity Modification": 1.06,
  "Others": 1.01,
  "Engine Oils": 1.02,
  "Hydraulic Fluids": 1.05,
  "Gear Oils": 0.98,
  "Greases": 1.04,
  "Compressor Oils": 1.06,
  "Mineral Oil": 0.95,
  "Synthetic Oil": 1.10,
  "Semi-Synthetic Oil": 1.08,
  "Bio-Based Oil": 1.15
};

// Volume multiplier: kilotons per USD Million
const volumePerMillionUSD = 0.85;

// Seeded pseudo-random for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseValue, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const rawValue = baseValue * Math.pow(1 + growthRate, i);
    series[year] = roundFn(addNoise(rawValue));
  }
  return series;
}

function getGrowthMultiplier(segmentName) {
  return segmentGrowthMultipliers[segmentName] || 1.0;
}

function buildSegmentTypeData(segTypeConfig, baseValue, regionGrowth, roundFn) {
  const result = {};

  if (segTypeConfig.type === 'flat') {
    for (const [segName, share] of Object.entries(segTypeConfig.segments)) {
      const segGrowth = regionGrowth * getGrowthMultiplier(segName);
      const segBase = baseValue * share;
      result[segName] = generateTimeSeries(segBase, segGrowth, roundFn);
    }
    return result;
  }

  // Hierarchical: parent > children (leaf nodes get time series data)
  for (const [parentName, parentShare] of Object.entries(segTypeConfig.parentShares)) {
    result[parentName] = {};
    const children = segTypeConfig.hierarchy[parentName];
    for (const [childName, childShare] of Object.entries(children)) {
      const segGrowth = regionGrowth * getGrowthMultiplier(childName);
      const segBase = baseValue * parentShare * childShare;
      const shareVariation = 1 + (seededRandom() - 0.5) * 0.08;
      result[parentName][childName] = generateTimeSeries(segBase * shareVariation, segGrowth, roundFn);
    }
  }

  // Flat siblings at the same level as hierarchical parents
  if (segTypeConfig.flat) {
    for (const [segName, share] of Object.entries(segTypeConfig.flat)) {
      const segGrowth = regionGrowth * getGrowthMultiplier(segName);
      const segBase = baseValue * share;
      const shareVariation = 1 + (seededRandom() - 0.5) * 0.08;
      result[segName] = generateTimeSeries(segBase * shareVariation, segGrowth, roundFn);
    }
  }

  return result;
}

function buildSegmentationStructure() {
  const structure = { Global: {} };

  for (const [segTypeName, segTypeConfig] of Object.entries(segmentTypes)) {
    if (segTypeConfig.type === 'flat') {
      structure.Global[segTypeName] = {};
      for (const segName of Object.keys(segTypeConfig.segments)) {
        structure.Global[segTypeName][segName] = {};
      }
    } else {
      structure.Global[segTypeName] = {};
      for (const [parentName, children] of Object.entries(segTypeConfig.hierarchy)) {
        structure.Global[segTypeName][parentName] = {};
        for (const childName of Object.keys(children)) {
          structure.Global[segTypeName][parentName][childName] = {};
        }
      }
      if (segTypeConfig.flat) {
        for (const segName of Object.keys(segTypeConfig.flat)) {
          structure.Global[segTypeName][segName] = {};
        }
      }
    }
  }

  // Geography hierarchy (By Region)
  structure.Global["By Region"] = {};
  for (const [regionName, countries] of Object.entries(regions)) {
    structure.Global["By Region"][regionName] = {};
    for (const country of countries) {
      structure.Global["By Region"][regionName][country] = {};
    }
  }

  return structure;
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;

  for (const [regionName, countries] of Object.entries(regions)) {
    const regionBase = regionBaseValues[regionName] * multiplier;
    const regionGrowth = regionGrowthRates[regionName];

    // Region-level data
    data[regionName] = {};
    for (const [segTypeName, segTypeConfig] of Object.entries(segmentTypes)) {
      data[regionName][segTypeName] = buildSegmentTypeData(segTypeConfig, regionBase, regionGrowth, roundFn);
    }

    // By Country aggregation for each region
    data[regionName]["By Country"] = {};
    for (const country of countries) {
      const cShare = countryShares[regionName][country];
      const countryGrowthVariation = 1 + (seededRandom() - 0.5) * 0.06;
      const countryBase = regionBase * cShare;
      const countryGrowth = regionGrowth * countryGrowthVariation;
      data[regionName]["By Country"][country] = generateTimeSeries(countryBase, countryGrowth, roundFn);
    }

    // Country-level data
    for (const country of countries) {
      const cShare = countryShares[regionName][country];
      const countryBase = regionBase * cShare;
      const countryGrowthVariation = 1 + (seededRandom() - 0.5) * 0.04;
      const countryGrowth = regionGrowth * countryGrowthVariation;

      data[country] = {};
      for (const [segTypeName, segTypeConfig] of Object.entries(segmentTypes)) {
        data[country][segTypeName] = buildSegmentTypeData(segTypeConfig, countryBase, countryGrowth, roundFn);
      }
    }
  }

  return data;
}

// Generate both datasets
seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);

const segmentationStructure = buildSegmentationStructure();

// Write files
const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));
fs.writeFileSync(path.join(outDir, 'segmentation_analysis.json'), JSON.stringify(segmentationStructure, null, 2));

console.log('Generated value.json, volume.json, and segmentation_analysis.json successfully');
console.log('Value geographies:', Object.keys(valueData).length);
console.log('Segment types:', Object.keys(segmentationStructure.Global).join(', '));
console.log('Sample - North America, By Product Type:', JSON.stringify(valueData['North America']['By Product Type'], null, 2));
