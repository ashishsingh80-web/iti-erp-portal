import type { SelectOption } from "@/lib/types";

export type WardMap = Record<string, string[]>;

export type BlockMap = Record<
  string,
  {
    wards?: WardMap;
  }
>;

export type TehsilMap = Record<
  string,
  {
    blocks?: BlockMap;
  }
>;

export type DistrictMap = Record<
  string,
  {
    tehsils?: TehsilMap;
  }
>;

export type StateMap = Record<
  string,
  {
    districts?: DistrictMap;
  }
>;

function toOptions(values: string[]): SelectOption[] {
  return values.map((value) => ({ label: value, value }));
}

export const indiaStateOptions: SelectOption[] = toOptions([
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
]);

export const baseAddressHierarchy: StateMap = {
  "Uttar Pradesh": {
    districts: {
      Varanasi: {
        tehsils: {
          Pindra: {
            blocks: {
              Cholapur: {
                wards: {
                  "Ward 1": ["Azgara", "Tala"],
                  "Ward 2": ["Bharthara", "Cholapur Bazaar"]
                }
              },
              Harahua: {
                wards: {
                  "Ward 3": ["Pisaur", "Harahua"],
                  "Ward 4": ["Ganeshpur", "Koirajpur"]
                }
              }
            }
          },
          Sadar: {
            blocks: {
              KashiVidyapeeth: {
                wards: {
                  "Ward 5": ["Lahartara", "Manduadih"],
                  "Ward 6": ["Shivpur", "Pandeypur"]
                }
              },
              Chiraigaon: {
                wards: {
                  "Ward 7": ["Barai", "Niyardih"],
                  "Ward 8": ["Rustampur", "Sarairya"]
                }
              }
            }
          },
          "Raja Talab": {
            blocks: {
              Sevapuri: {
                wards: {
                  "Ward 9": ["Jakhini", "Kapsethi"],
                  "Ward 10": ["Barki", "Bhadai"]
                }
              }
            }
          }
        }
      },
      Chandauli: {
        tehsils: {
          Sakaldiha: {
            blocks: {
              Dhanapur: {
                wards: {
                  "Ward 1": ["Hetampur", "Awajapur"],
                  "Ward 2": ["Dhanapur Bazaar", "Madhopur"]
                }
              }
            }
          },
          Chakia: {
            blocks: {
              Chakiya: {
                wards: {
                  "Ward 3": ["Chakia Town", "Shikarganj"],
                  "Ward 4": ["Naugarh", "Shahabganj"]
                }
              }
            }
          },
          Mughalsarai: {
            blocks: {
              Niyamatabad: {
                wards: {
                  "Ward 5": ["Mughalsarai Urban", "Parmar Katra"],
                  "Ward 6": ["Niyamatabad", "Jalilpur"]
                }
              }
            }
          }
        }
      },
      Ghazipur: {
        tehsils: {
          Saidpur: {
            blocks: {
              Saidpur: {
                wards: {
                  "Ward 1": ["Saidpur Town", "Tarawn"],
                  "Ward 2": ["Audihar", "Deokali"]
                }
              }
            }
          },
          Zamania: {
            blocks: {
              Bhadaura: {
                wards: {
                  "Ward 3": ["Zamania Town", "Gahmar"],
                  "Ward 4": ["Bara", "Bhadaura"]
                }
              }
            }
          }
        }
      },
      Jaunpur: {
        tehsils: {
          Kerakat: {
            blocks: {
              Kerakat: {
                wards: {
                  "Ward 1": ["Kerakat Town", "Behda"],
                  "Ward 2": ["Dobhi", "Chandwak"]
                }
              }
            }
          },
          Machhlishahr: {
            blocks: {
              Machhlishahr: {
                wards: {
                  "Ward 3": ["Machhlishahr Town", "Janghai"],
                  "Ward 4": ["Mungra Badshahpur", "Pakari"]
                }
              }
            }
          }
        }
      },
      Mirzapur: {
        tehsils: {
          Sadar: {
            blocks: {
              Nagar: {
                wards: {
                  "Ward 1": ["Aghwar", "Bhariya"],
                  "Ward 2": ["Lohandi", "Vindhyachal"]
                }
              }
            }
          },
          Chunar: {
            blocks: {
              Chunar: {
                wards: {
                  "Ward 3": ["Chunar Fort Area", "Adalpura"],
                  "Ward 4": ["Sikhar", "Jamalpur"]
                }
              }
            }
          }
        }
      },
      Prayagraj: {
        tehsils: {
          Soraon: {
            blocks: {
              Soraon: {
                wards: {
                  "Ward 1": ["Soraon Town", "Mauima"],
                  "Ward 2": ["Holagarh", "Nawabganj"]
                }
              }
            }
          },
          Phulpur: {
            blocks: {
              Bahadurpur: {
                wards: {
                  "Ward 3": ["Phulpur Town", "Hanumanganj"],
                  "Ward 4": ["Bahadurpur", "Saidabad"]
                }
              }
            }
          }
        }
      }
    }
  },
  Bihar: {
    districts: {
      Buxar: {
        tehsils: {
          Dumraon: {
            blocks: {
              Dumraon: {
                wards: {
                  "Ward 1": ["Dumraon", "Nawanagar"],
                  "Ward 2": ["Chakki", "Kesath"]
                }
              }
            }
          }
        }
      },
      Patna: {
        tehsils: {
          PatnaSadar: {
            blocks: {
              Phulwari: {
                wards: {
                  "Ward 3": ["Phulwari Sharif", "Anisabad"],
                  "Ward 4": ["Danapur", "Khagaul"]
                }
              }
            }
          }
        }
      },
      Bhojpur: {
        tehsils: {
          Arrah: {
            blocks: {
              Arrah: {
                wards: {
                  "Ward 5": ["Arrah Town", "Koilwar"],
                  "Ward 6": ["Barhara", "Sandesh"]
                }
              }
            }
          }
        }
      }
    }
  },
  "Madhya Pradesh": {
    districts: {
      Rewa: {
        tehsils: {
          Huzur: {
            blocks: {
              Rewa: {
                wards: {
                  "Ward 1": ["Rewa City", "Amahiya"],
                  "Ward 2": ["Sirmaur", "Semariya"]
                }
              }
            }
          }
        }
      },
      Satna: {
        tehsils: {
          Raghurajnagar: {
            blocks: {
              Satna: {
                wards: {
                  "Ward 3": ["Satna City", "Maihar"],
                  "Ward 4": ["Nagod", "Rampur Baghelan"]
                }
              }
            }
          }
        }
      }
    }
  },
  Jharkhand: {
    districts: {
      Ranchi: {
        tehsils: {
          Ranchi: {
            blocks: {
              Kanke: {
                wards: {
                  "Ward 1": ["Kanke", "Pithoria"],
                  "Ward 2": ["Ranchi Urban", "Morabadi"]
                }
              }
            }
          }
        }
      },
      Dhanbad: {
        tehsils: {
          Dhanbad: {
            blocks: {
              Jharia: {
                wards: {
                  "Ward 3": ["Jharia", "Sindri"],
                  "Ward 4": ["Katras", "Govindpur"]
                }
              }
            }
          }
        }
      }
    }
  },
  Delhi: {
    districts: {
      "New Delhi": {
        tehsils: {
          Chanakyapuri: {
            blocks: {
              NDMC: {
                wards: {
                  "Ward 1": ["Chanakyapuri", "Sarojini Nagar"],
                  "Ward 2": ["Gole Market", "Connaught Place"]
                }
              }
            }
          }
        }
      }
    }
  }
};

export function getDistrictOptions(stateName: string) {
  return toOptions(Object.keys(baseAddressHierarchy[stateName]?.districts || {}));
}

function getMergedStateNode(hierarchy: StateMap, stateName: string) {
  return hierarchy[stateName]?.districts || {};
}

export function getDistrictOptionsFromHierarchy(hierarchy: StateMap, stateName: string) {
  return toOptions(Object.keys(getMergedStateNode(hierarchy, stateName)));
}

export function getTehsilOptionsFromHierarchy(hierarchy: StateMap, stateName: string, districtName: string) {
  return toOptions(Object.keys(hierarchy[stateName]?.districts?.[districtName]?.tehsils || {}));
}

export function getBlockOptionsFromHierarchy(
  hierarchy: StateMap,
  stateName: string,
  districtName: string,
  tehsilName: string
) {
  return toOptions(
    Object.keys(hierarchy[stateName]?.districts?.[districtName]?.tehsils?.[tehsilName]?.blocks || {})
  );
}

export function getWardOptionsFromHierarchy(
  hierarchy: StateMap,
  stateName: string,
  districtName: string,
  tehsilName: string,
  blockName: string
) {
  const wards =
    hierarchy[stateName]?.districts?.[districtName]?.tehsils?.[tehsilName]?.blocks?.[blockName]?.wards || {};
  return toOptions(Object.keys(wards));
}

export function getTehsilOptions(stateName: string, districtName: string) {
  return getTehsilOptionsFromHierarchy(baseAddressHierarchy, stateName, districtName);
}

export function getBlockOptions(stateName: string, districtName: string, tehsilName: string) {
  return getBlockOptionsFromHierarchy(baseAddressHierarchy, stateName, districtName, tehsilName);
}

export function getWardOptions(stateName: string, districtName: string, tehsilName: string, blockName: string) {
  return getWardOptionsFromHierarchy(baseAddressHierarchy, stateName, districtName, tehsilName, blockName);
}

export function mergeAddressHierarchies(base: StateMap, override: StateMap): StateMap {
  const merged: StateMap = JSON.parse(JSON.stringify(base));

  for (const [stateName, stateValue] of Object.entries(override || {})) {
    if (!merged[stateName]) {
      merged[stateName] = { districts: {} };
    }

    const baseDistricts = merged[stateName].districts || {};
    const overrideDistricts = stateValue.districts || {};

    for (const [districtName, districtValue] of Object.entries(overrideDistricts)) {
      if (!baseDistricts[districtName]) {
        baseDistricts[districtName] = { tehsils: {} };
      }

      const baseTehsils = baseDistricts[districtName].tehsils || {};
      const overrideTehsils = districtValue.tehsils || {};

      for (const [tehsilName, tehsilValue] of Object.entries(overrideTehsils)) {
        if (!baseTehsils[tehsilName]) {
          baseTehsils[tehsilName] = { blocks: {} };
        }

        const baseBlocks = baseTehsils[tehsilName].blocks || {};
        const overrideBlocks = tehsilValue.blocks || {};

        for (const [blockName, blockValue] of Object.entries(overrideBlocks)) {
          if (!baseBlocks[blockName]) {
            baseBlocks[blockName] = { wards: {} };
          }

          const baseWards = baseBlocks[blockName].wards || {};
          const overrideWards = blockValue.wards || {};

          for (const [wardName, villages] of Object.entries(overrideWards)) {
            baseWards[wardName] = Array.isArray(villages) ? villages : [];
          }

          baseBlocks[blockName].wards = baseWards;
        }

        baseTehsils[tehsilName].blocks = baseBlocks;
      }

      baseDistricts[districtName].tehsils = baseTehsils;
    }

    merged[stateName].districts = baseDistricts;
  }

  return merged;
}

export function getAddressHierarchyStats(hierarchy: StateMap) {
  let districtCount = 0;
  let tehsilCount = 0;
  let blockCount = 0;
  let wardCount = 0;

  for (const stateValue of Object.values(hierarchy)) {
    for (const districtValue of Object.values(stateValue.districts || {})) {
      districtCount += 1;
      for (const tehsilValue of Object.values(districtValue.tehsils || {})) {
        tehsilCount += 1;
        for (const blockValue of Object.values(tehsilValue.blocks || {})) {
          blockCount += 1;
          wardCount += Object.keys(blockValue.wards || {}).length;
        }
      }
    }
  }

  return {
    states: indiaStateOptions.length,
    districts: districtCount,
    tehsils: tehsilCount,
    blocks: blockCount,
    wards: wardCount
  };
}
