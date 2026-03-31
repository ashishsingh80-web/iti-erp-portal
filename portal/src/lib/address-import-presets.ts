import { type StateMap } from "@/lib/address-masters";

export const recommendedAddressPreset: StateMap = {
  "Uttar Pradesh": {
    districts: {
      Lucknow: {
        tehsils: {
          "Bakshi Ka Talab": {
            blocks: {
              BKT: {
                wards: {
                  "Ward 1": ["Bharwara", "Madiyanva"],
                  "Ward 2": ["Itaunja", "Mohanlalganj Road Cluster"]
                }
              }
            }
          },
          Malihabad: {
            blocks: {
              Malihabad: {
                wards: {
                  "Ward 3": ["Malihabad Town", "Kakori"],
                  "Ward 4": ["Rahimabad", "Mal"]
                }
              }
            }
          },
          Sadar: {
            blocks: {
              "Lucknow Urban": {
                wards: {
                  "Ward 5": ["Aliganj", "Indira Nagar"],
                  "Ward 6": ["Gomti Nagar", "Alambagh"]
                }
              }
            }
          }
        }
      },
      Gorakhpur: {
        tehsils: {
          Sadar: {
            blocks: {
              Chargawan: {
                wards: {
                  "Ward 1": ["Rustampur", "Asuran"],
                  "Ward 2": ["Taramandal", "Padri Bazar"]
                }
              }
            }
          },
          Khajni: {
            blocks: {
              Khajni: {
                wards: {
                  "Ward 3": ["Khajni Town", "Belghat"],
                  "Ward 4": ["Unwal", "Bansgaon Link"]
                }
              }
            }
          }
        }
      },
      Sonbhadra: {
        tehsils: {
          Robertsganj: {
            blocks: {
              Myorpur: {
                wards: {
                  "Ward 1": ["Robertsganj", "Pipri"],
                  "Ward 2": ["Myorpur", "Renukoot"]
                }
              }
            }
          },
          Dudhi: {
            blocks: {
              Dudhi: {
                wards: {
                  "Ward 3": ["Dudhi Town", "Vindhamganj"],
                  "Ward 4": ["Babhani", "Beena"]
                }
              }
            }
          }
        }
      },
      Azamgarh: {
        tehsils: {
          Sadar: {
            blocks: {
              Palhani: {
                wards: {
                  "Ward 1": ["Civil Lines", "Harbanshpur"],
                  "Ward 2": ["Palhani", "Mubarakpur Road"]
                }
              }
            }
          },
          Lalganj: {
            blocks: {
              Lalganj: {
                wards: {
                  "Ward 3": ["Lalganj Town", "Mehnagar"],
                  "Ward 4": ["Tarwa", "Atraulia"]
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
      Rohtas: {
        tehsils: {
          Sasaram: {
            blocks: {
              Sasaram: {
                wards: {
                  "Ward 1": ["Sasaram Town", "Dalmianagar"],
                  "Ward 2": ["Dehri", "Nokha"]
                }
              }
            }
          },
          Bikramganj: {
            blocks: {
              Bikramganj: {
                wards: {
                  "Ward 3": ["Bikramganj", "Karakat"],
                  "Ward 4": ["Rajpur", "Tilouthu"]
                }
              }
            }
          }
        }
      },
      Kaimur: {
        tehsils: {
          Bhabua: {
            blocks: {
              Bhabua: {
                wards: {
                  "Ward 1": ["Bhabua Town", "Chainpur"],
                  "Ward 2": ["Mohania", "Ramgarh"]
                }
              }
            }
          }
        }
      },
      Patna: {
        tehsils: {
          Danapur: {
            blocks: {
              Danapur: {
                wards: {
                  "Ward 3": ["Danapur", "Khagaul"],
                  "Ward 4": ["Phulwari Sharif", "Anisabad"]
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
      Sidhi: {
        tehsils: {
          Sidhi: {
            blocks: {
              Sidhi: {
                wards: {
                  "Ward 1": ["Sidhi Town", "Rampur Naikin"],
                  "Ward 2": ["Majhauli", "Sihawal"]
                }
              }
            }
          }
        }
      },
      Singrauli: {
        tehsils: {
          Singrauli: {
            blocks: {
              Waidhan: {
                wards: {
                  "Ward 3": ["Waidhan", "Baidhan Urban"],
                  "Ward 4": ["Mada", "Deosar"]
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
      Bokaro: {
        tehsils: {
          Chas: {
            blocks: {
              Chas: {
                wards: {
                  "Ward 1": ["Chas", "Sector 4"],
                  "Ward 2": ["Sector 9", "Marafari"]
                }
              }
            }
          }
        }
      },
      Hazaribagh: {
        tehsils: {
          Hazaribagh: {
            blocks: {
              Katkamsandi: {
                wards: {
                  "Ward 3": ["Hazaribagh Town", "Katkamsandi"],
                  "Ward 4": ["Barhi", "Ichak"]
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
      "South West Delhi": {
        tehsils: {
          Najafgarh: {
            blocks: {
              Najafgarh: {
                wards: {
                  "Ward 1": ["Najafgarh", "Kapashera"],
                  "Ward 2": ["Dwarka", "Matiala"]
                }
              }
            }
          }
        }
      },
      "North East Delhi": {
        tehsils: {
          Seelampur: {
            blocks: {
              Seelampur: {
                wards: {
                  "Ward 3": ["Seelampur", "Welcome"],
                  "Ward 4": ["Yamuna Vihar", "Bhajanpura"]
                }
              }
            }
          }
        }
      }
    }
  }
};

export const recommendedAddressPresetJson = JSON.stringify(recommendedAddressPreset, null, 2);
