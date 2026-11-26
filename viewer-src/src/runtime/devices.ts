// 생성물이다. plugin/devices/*.json 을 고치고 sh tools/gen-viewer.sh 로 만든다.
export type DeviceCam = { w: number; h: number; y: number; x?: number; notch?: number; edge?: 'right' | 'bottom'; lens?: true };
export type DeviceBody = { tone: string; bezel: number; ends?: number; home?: true; radius: [number, number, number, number]; cuts: DeviceCam[]; cams: DeviceCam[]; btn: { side: 1 | -1; at: number; len: number }[] };
export type DevicePanel = { w: number; h: number; hinge?: number; fixed?: true; cutIn: Record<string, '' | 'w' | 'h' | 'wh'> };
export type DeviceEntry = {
  name: string; short: string; fold: boolean;
  open: DevicePanel; cover?: DevicePanel;
  look: { open: DeviceBody; cover?: DeviceBody };
  plate?: { thickness: number; gap: number; axis: 'width' | 'height'; blur?: true };
};

export const DEVICES: Record<string, DeviceEntry> = {
  "s26": {
    "name": "Galaxy S26",
    "short": "S26",
    "fold": false,
    "open": {
      "w": 360,
      "h": 780,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "look": {
      "open": {
        "tone": "#23262c",
        "bezel": 5,
        "radius": [
          28,
          28,
          28,
          28
        ],
        "cuts": [
          {
            "w": 9,
            "h": 9,
            "y": 14
          }
        ],
        "cams": [
          {
            "w": 9,
            "h": 9,
            "y": 14
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 175,
            "len": 95
          },
          {
            "side": 1,
            "at": 300,
            "len": 50
          },
          {
            "side": 1,
            "at": 350,
            "len": 0
          },
          {
            "side": 1,
            "at": 350,
            "len": 0
          },
          {
            "side": 1,
            "at": 350,
            "len": 0
          }
        ]
      }
    }
  },
  "s26ultra": {
    "name": "Galaxy S26 Ultra",
    "short": "S26 Ultra",
    "fold": false,
    "open": {
      "w": 384,
      "h": 832,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "look": {
      "open": {
        "tone": "#34363a",
        "bezel": 5,
        "radius": [
          28.09,
          28.09,
          28.09,
          28.09
        ],
        "cuts": [
          {
            "w": 9,
            "h": 9,
            "y": 13.99
          }
        ],
        "cams": [
          {
            "w": 9,
            "h": 9,
            "y": 13.99
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 185,
            "len": 100
          },
          {
            "side": 1,
            "at": 318,
            "len": 52
          },
          {
            "side": 1,
            "at": 370,
            "len": 0
          },
          {
            "side": 1,
            "at": 370,
            "len": 0
          },
          {
            "side": 1,
            "at": 370,
            "len": 0
          }
        ]
      }
    }
  },
  "a07": {
    "name": "Galaxy A07 5G",
    "short": "A07 5G",
    "fold": false,
    "open": {
      "w": 384,
      "h": 853.33,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "look": {
      "open": {
        "tone": "#2a2d33",
        "bezel": 7,
        "radius": [
          36.27,
          36.27,
          36.27,
          36.27
        ],
        "cuts": [
          {
            "w": 42.67,
            "h": 34.13,
            "y": 0,
            "notch": 17
          }
        ],
        "cams": [
          {
            "w": 42.67,
            "h": 34.13,
            "y": 0,
            "notch": 17
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 175,
            "len": 95
          },
          {
            "side": 1,
            "at": 300,
            "len": 50
          },
          {
            "side": 1,
            "at": 350,
            "len": 0
          },
          {
            "side": 1,
            "at": 350,
            "len": 0
          },
          {
            "side": 1,
            "at": 350,
            "len": 0
          }
        ]
      }
    }
  },
  "pixel9": {
    "name": "Pixel 9",
    "short": "9",
    "fold": false,
    "open": {
      "w": 411.43,
      "h": 923.43,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "look": {
      "open": {
        "tone": "#27292d",
        "bezel": 6,
        "radius": [
          50.29,
          50.29,
          50.29,
          50.29
        ],
        "cuts": [
          {
            "w": 32,
            "h": 32,
            "y": 16.95
          }
        ],
        "cams": [
          {
            "w": 32,
            "h": 32,
            "y": 16.95
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 190,
            "len": 50
          },
          {
            "side": 1,
            "at": 270,
            "len": 95
          },
          {
            "side": 1,
            "at": 365,
            "len": 0
          },
          {
            "side": 1,
            "at": 365,
            "len": 0
          },
          {
            "side": 1,
            "at": 365,
            "len": 0
          }
        ]
      }
    }
  },
  "pixel10xl": {
    "name": "Pixel 10 Pro XL",
    "short": "10 Pro XL",
    "fold": false,
    "open": {
      "w": 443.08,
      "h": 986.26,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "look": {
      "open": {
        "tone": "#2d2f33",
        "bezel": 6,
        "radius": [
          50.46,
          50.46,
          50.46,
          50.46
        ],
        "cuts": [
          {
            "w": 31.64,
            "h": 31.64,
            "y": 17.14
          }
        ],
        "cams": [
          {
            "w": 31.64,
            "h": 31.64,
            "y": 17.14
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 205,
            "len": 52
          },
          {
            "side": 1,
            "at": 290,
            "len": 100
          },
          {
            "side": 1,
            "at": 390,
            "len": 0
          },
          {
            "side": 1,
            "at": 390,
            "len": 0
          },
          {
            "side": 1,
            "at": 390,
            "len": 0
          }
        ]
      }
    }
  },
  "ip17": {
    "name": "iPhone 17",
    "short": "17",
    "fold": false,
    "open": {
      "w": 402,
      "h": 874,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "look": {
      "open": {
        "tone": "#2c2c2e",
        "bezel": 5,
        "radius": [
          62,
          62,
          62,
          62
        ],
        "cuts": [
          {
            "w": 125.33,
            "h": 36.67,
            "y": 14
          }
        ],
        "cams": [
          {
            "w": 125.33,
            "h": 36.67,
            "y": 14
          }
        ],
        "btn": [
          {
            "side": -1,
            "at": 150,
            "len": 32
          },
          {
            "side": -1,
            "at": 205,
            "len": 60
          },
          {
            "side": -1,
            "at": 280,
            "len": 60
          },
          {
            "side": 1,
            "at": 235,
            "len": 100
          },
          {
            "side": 1,
            "at": 335,
            "len": 0
          }
        ]
      }
    }
  },
  "ip17e": {
    "name": "iPhone 17e",
    "short": "17e",
    "fold": false,
    "open": {
      "w": 390,
      "h": 844,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "look": {
      "open": {
        "tone": "#2c2c2e",
        "bezel": 5,
        "radius": [
          47.33,
          47.33,
          47.33,
          47.33
        ],
        "cuts": [
          {
            "w": 161.33,
            "h": 33.67,
            "y": 0,
            "notch": 16
          }
        ],
        "cams": [
          {
            "w": 161.33,
            "h": 33.67,
            "y": 0,
            "notch": 16
          }
        ],
        "btn": [
          {
            "side": -1,
            "at": 150,
            "len": 32
          },
          {
            "side": -1,
            "at": 205,
            "len": 60
          },
          {
            "side": -1,
            "at": 280,
            "len": 60
          },
          {
            "side": 1,
            "at": 235,
            "len": 100
          },
          {
            "side": 1,
            "at": 335,
            "len": 0
          }
        ]
      }
    }
  },
  "ipair": {
    "name": "iPhone Air",
    "short": "Air",
    "fold": false,
    "open": {
      "w": 420,
      "h": 912,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "look": {
      "open": {
        "tone": "#46484c",
        "bezel": 4,
        "radius": [
          62,
          62,
          62,
          62
        ],
        "cuts": [
          {
            "w": 125.33,
            "h": 36.67,
            "y": 20
          }
        ],
        "cams": [
          {
            "w": 125.33,
            "h": 36.67,
            "y": 20
          }
        ],
        "btn": [
          {
            "side": -1,
            "at": 155,
            "len": 32
          },
          {
            "side": -1,
            "at": 215,
            "len": 62
          },
          {
            "side": -1,
            "at": 292,
            "len": 62
          },
          {
            "side": 1,
            "at": 245,
            "len": 104
          },
          {
            "side": 1,
            "at": 349,
            "len": 0
          }
        ]
      }
    }
  },
  "ip17pm": {
    "name": "iPhone 17 Pro Max",
    "short": "17 Pro Max",
    "fold": false,
    "open": {
      "w": 440,
      "h": 956,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "look": {
      "open": {
        "tone": "#3b3a38",
        "bezel": 5,
        "radius": [
          62,
          62,
          62,
          62
        ],
        "cuts": [
          {
            "w": 125.33,
            "h": 36.67,
            "y": 14
          }
        ],
        "cams": [
          {
            "w": 125.33,
            "h": 36.67,
            "y": 14
          }
        ],
        "btn": [
          {
            "side": -1,
            "at": 160,
            "len": 34
          },
          {
            "side": -1,
            "at": 225,
            "len": 66
          },
          {
            "side": -1,
            "at": 305,
            "len": 66
          },
          {
            "side": 1,
            "at": 255,
            "len": 110
          },
          {
            "side": 1,
            "at": 365,
            "len": 0
          }
        ]
      }
    }
  },
  "ip18pro": {
    "name": "iPhone 18 Pro",
    "short": "18 Pro",
    "fold": false,
    "open": {
      "w": 402,
      "h": 874,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "look": {
      "open": {
        "tone": "#3a3734",
        "bezel": 5,
        "radius": [
          62,
          62,
          62,
          62
        ],
        "cuts": [
          {
            "w": 94.67,
            "h": 36.67,
            "y": 14
          }
        ],
        "cams": [
          {
            "w": 94.67,
            "h": 36.67,
            "y": 14
          }
        ],
        "btn": [
          {
            "side": -1,
            "at": 150,
            "len": 32
          },
          {
            "side": -1,
            "at": 205,
            "len": 60
          },
          {
            "side": -1,
            "at": 280,
            "len": 60
          },
          {
            "side": 1,
            "at": 235,
            "len": 100
          },
          {
            "side": 1,
            "at": 335,
            "len": 0
          }
        ]
      }
    }
  },
  "ipse3": {
    "name": "iPhone SE (3rd generation)",
    "short": "SE",
    "fold": false,
    "open": {
      "w": 375,
      "h": 667,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "",
        "landscape-right": ""
      }
    },
    "look": {
      "open": {
        "tone": "#3a3a3d",
        "bezel": 5,
        "ends": 18,
        "home": true,
        "radius": [
          0,
          0,
          0,
          0
        ],
        "cuts": [],
        "cams": [],
        "btn": [
          {
            "side": -1,
            "at": 110,
            "len": 24
          },
          {
            "side": -1,
            "at": 150,
            "len": 36
          },
          {
            "side": -1,
            "at": 200,
            "len": 36
          },
          {
            "side": 1,
            "at": 150,
            "len": 60
          },
          {
            "side": 1,
            "at": 210,
            "len": 0
          }
        ]
      }
    }
  },
  "duo": {
    "name": "iPhone Duo",
    "short": "Duo",
    "fold": true,
    "cover": {
      "w": 466,
      "h": 678,
      "cutIn": {
        "portrait": "h",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "open": {
      "w": 951,
      "h": 669,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      },
      "hinge": 475.5
    },
    "look": {
      "cover": {
        "tone": "#4a4744",
        "bezel": 6,
        "radius": [
          59,
          59,
          59,
          59
        ],
        "cuts": [
          {
            "w": 37,
            "h": 37,
            "y": 29.33,
            "x": 0.8974
          }
        ],
        "cams": [
          {
            "w": 37,
            "h": 37,
            "y": 29.33,
            "x": 0.8974
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 200,
            "len": 80
          },
          {
            "side": 1,
            "at": 470,
            "len": 46
          },
          {
            "side": 1,
            "at": 516,
            "len": 0
          },
          {
            "side": 1,
            "at": 516,
            "len": 0
          },
          {
            "side": 1,
            "at": 516,
            "len": 0
          }
        ]
      },
      "open": {
        "tone": "#4a4744",
        "bezel": 6,
        "radius": [
          59,
          59,
          59,
          59
        ],
        "cuts": [],
        "cams": [],
        "btn": [
          {
            "side": 1,
            "at": 200,
            "len": 80
          },
          {
            "side": 1,
            "at": 470,
            "len": 46
          },
          {
            "side": 1,
            "at": 516,
            "len": 0
          },
          {
            "side": 1,
            "at": 516,
            "len": 0
          },
          {
            "side": 1,
            "at": 516,
            "len": 0
          }
        ]
      }
    },
    "plate": {
      "thickness": 28,
      "gap": 2,
      "axis": "width",
      "blur": true
    }
  },
  "fold8": {
    "name": "Galaxy Z Fold8",
    "short": "Fold8",
    "fold": true,
    "cover": {
      "w": 475.43,
      "h": 751.24,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "open": {
      "w": 932.57,
      "h": 704,
      "cutIn": {
        "portrait": "",
        "landscape-left": ""
      },
      "hinge": 466.29
    },
    "look": {
      "cover": {
        "tone": "#2b2d32",
        "bezel": 6,
        "radius": [
          9.9,
          9.9,
          9.9,
          9.9
        ],
        "cuts": [
          {
            "w": 9,
            "h": 9,
            "y": 15.31
          }
        ],
        "cams": [
          {
            "w": 9,
            "h": 9,
            "y": 15.31
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 170,
            "len": 80
          },
          {
            "side": 1,
            "at": 270,
            "len": 55
          },
          {
            "side": 1,
            "at": 325,
            "len": 0
          },
          {
            "side": 1,
            "at": 325,
            "len": 0
          },
          {
            "side": 1,
            "at": 325,
            "len": 0
          }
        ]
      },
      "open": {
        "tone": "#2b2d32",
        "bezel": 6,
        "radius": [
          6.86,
          6.86,
          6.86,
          6.86
        ],
        "cuts": [],
        "cams": [],
        "btn": [
          {
            "side": 1,
            "at": 170,
            "len": 80
          },
          {
            "side": 1,
            "at": 270,
            "len": 55
          },
          {
            "side": 1,
            "at": 325,
            "len": 0
          },
          {
            "side": 1,
            "at": 325,
            "len": 0
          },
          {
            "side": 1,
            "at": 325,
            "len": 0
          }
        ]
      }
    },
    "plate": {
      "thickness": 26,
      "gap": 3,
      "axis": "width"
    }
  },
  "ultra": {
    "name": "Galaxy Z Fold8 Ultra",
    "short": "Fold8 Ultra",
    "fold": true,
    "cover": {
      "w": 360,
      "h": 840,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "open": {
      "w": 752,
      "h": 834.67,
      "cutIn": {
        "portrait": "",
        "landscape-left": "",
        "landscape-right": ""
      },
      "hinge": 376
    },
    "look": {
      "cover": {
        "tone": "#1f2125",
        "bezel": 5,
        "radius": [
          5,
          5,
          5,
          5
        ],
        "cuts": [
          {
            "w": 8,
            "h": 8,
            "y": 14
          }
        ],
        "cams": [
          {
            "w": 8,
            "h": 8,
            "y": 14
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 190,
            "len": 85
          },
          {
            "side": 1,
            "at": 300,
            "len": 55
          },
          {
            "side": 1,
            "at": 355,
            "len": 0
          },
          {
            "side": 1,
            "at": 355,
            "len": 0
          },
          {
            "side": 1,
            "at": 355,
            "len": 0
          }
        ]
      },
      "open": {
        "tone": "#1f2125",
        "bezel": 5,
        "radius": [
          5,
          5,
          5,
          5
        ],
        "cuts": [],
        "cams": [],
        "btn": [
          {
            "side": 1,
            "at": 190,
            "len": 85
          },
          {
            "side": 1,
            "at": 300,
            "len": 55
          },
          {
            "side": 1,
            "at": 355,
            "len": 0
          },
          {
            "side": 1,
            "at": 355,
            "len": 0
          },
          {
            "side": 1,
            "at": 355,
            "len": 0
          }
        ]
      }
    },
    "plate": {
      "thickness": 26,
      "gap": 3,
      "axis": "width"
    }
  },
  "flip8": {
    "name": "Galaxy Z Flip8",
    "short": "Flip8",
    "fold": true,
    "cover": {
      "w": 399.16,
      "h": 441.26,
      "cutIn": {
        "portrait": "w"
      },
      "fixed": true
    },
    "open": {
      "w": 360,
      "h": 840,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      },
      "hinge": 420
    },
    "look": {
      "cover": {
        "tone": "#2a2c31",
        "bezel": 5,
        "radius": [
          5.05,
          5.05,
          40.84,
          40.84
        ],
        "cuts": [
          {
            "w": 218.95,
            "h": 88,
            "y": 0,
            "x": 0.7257,
            "notch": 24,
            "edge": "bottom"
          }
        ],
        "cams": [
          {
            "w": 29,
            "h": 29,
            "y": 379.7,
            "x": 0.5168353542439122
          },
          {
            "w": 76,
            "h": 76,
            "y": 358.5,
            "x": 0.6794267962721715,
            "lens": true
          },
          {
            "w": 76,
            "h": 76,
            "y": 359.3,
            "x": 0.8813508367571901,
            "lens": true
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 120,
            "len": 70
          },
          {
            "side": 1,
            "at": 55,
            "len": 45
          },
          {
            "side": 1,
            "at": 100,
            "len": 0
          },
          {
            "side": 1,
            "at": 100,
            "len": 0
          },
          {
            "side": 1,
            "at": 100,
            "len": 0
          }
        ]
      },
      "open": {
        "tone": "#2a2c31",
        "bezel": 5,
        "radius": [
          22,
          22,
          22,
          22
        ],
        "cuts": [
          {
            "w": 9,
            "h": 9,
            "y": 13.5
          }
        ],
        "cams": [
          {
            "w": 9,
            "h": 9,
            "y": 13.5
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 230,
            "len": 70
          },
          {
            "side": 1,
            "at": 320,
            "len": 45
          },
          {
            "side": 1,
            "at": 365,
            "len": 0
          },
          {
            "side": 1,
            "at": 365,
            "len": 0
          },
          {
            "side": 1,
            "at": 365,
            "len": 0
          }
        ]
      }
    },
    "plate": {
      "thickness": 34,
      "gap": 3,
      "axis": "height"
    }
  },
  "pixelfold": {
    "name": "Pixel 9 Pro Fold",
    "short": "9 Pro Fold",
    "fold": true,
    "cover": {
      "w": 443.08,
      "h": 994.46,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "h",
        "landscape-right": "h"
      }
    },
    "open": {
      "w": 851.69,
      "h": 882.87,
      "cutIn": {
        "portrait": "w",
        "landscape-left": "w",
        "landscape-right": "w"
      },
      "hinge": 425.85
    },
    "look": {
      "cover": {
        "tone": "#2f3135",
        "bezel": 6,
        "radius": [
          47.18,
          47.18,
          47.18,
          47.18
        ],
        "cuts": [
          {
            "w": 34.05,
            "h": 34.05,
            "y": 18.26
          }
        ],
        "cams": [
          {
            "w": 34.05,
            "h": 34.05,
            "y": 18.26
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 200,
            "len": 50
          },
          {
            "side": 1,
            "at": 280,
            "len": 95
          },
          {
            "side": 1,
            "at": 375,
            "len": 0
          },
          {
            "side": 1,
            "at": 375,
            "len": 0
          },
          {
            "side": 1,
            "at": 375,
            "len": 0
          }
        ]
      },
      "open": {
        "tone": "#2f3135",
        "bezel": 7,
        "radius": [
          34.87,
          34.87,
          34.87,
          34.87
        ],
        "cuts": [
          {
            "w": 32.41,
            "h": 32.41,
            "y": 16.62,
            "x": 0.9574
          }
        ],
        "cams": [
          {
            "w": 32.41,
            "h": 32.41,
            "y": 16.62,
            "x": 0.9574
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 200,
            "len": 50
          },
          {
            "side": 1,
            "at": 280,
            "len": 95
          },
          {
            "side": 1,
            "at": 375,
            "len": 0
          },
          {
            "side": 1,
            "at": 375,
            "len": 0
          },
          {
            "side": 1,
            "at": 375,
            "len": 0
          }
        ]
      }
    },
    "plate": {
      "thickness": 32,
      "gap": 2,
      "axis": "width"
    }
  },
  "tablet": {
    "name": "Pixel Tablet",
    "short": "Tablet",
    "fold": false,
    "open": {
      "w": 1280,
      "h": 800,
      "cutIn": {
        "portrait": "",
        "landscape-left": "",
        "landscape-right": ""
      }
    },
    "look": {
      "open": {
        "tone": "#3a3a38",
        "bezel": 34,
        "radius": [
          34,
          34,
          34,
          34
        ],
        "cuts": [],
        "cams": [],
        "btn": [
          {
            "side": 1,
            "at": 120,
            "len": 70
          },
          {
            "side": 1,
            "at": 190,
            "len": 0
          },
          {
            "side": 1,
            "at": 190,
            "len": 0
          },
          {
            "side": 1,
            "at": 190,
            "len": 0
          },
          {
            "side": 1,
            "at": 190,
            "len": 0
          }
        ]
      }
    }
  },
  "s11ultra": {
    "name": "Galaxy Tab S11 Ultra",
    "short": "Tab S11 Ultra",
    "fold": false,
    "open": {
      "w": 1056,
      "h": 1691.43,
      "cutIn": {
        "portrait": "h",
        "landscape-left": "w",
        "landscape-right": "w"
      }
    },
    "look": {
      "open": {
        "tone": "#2b2d31",
        "bezel": 10,
        "radius": [
          25.14,
          25.14,
          25.14,
          25.14
        ],
        "cuts": [
          {
            "w": 57.14,
            "h": 16,
            "y": 0,
            "x": 0.5,
            "edge": "right",
            "notch": 4
          }
        ],
        "cams": [
          {
            "w": 57.14,
            "h": 16,
            "y": 0,
            "x": 0.5,
            "edge": "right",
            "notch": 4
          }
        ],
        "btn": [
          {
            "side": 1,
            "at": 200,
            "len": 70
          },
          {
            "side": 1,
            "at": 300,
            "len": 130
          },
          {
            "side": 1,
            "at": 430,
            "len": 0
          },
          {
            "side": 1,
            "at": 430,
            "len": 0
          },
          {
            "side": 1,
            "at": 430,
            "len": 0
          }
        ]
      }
    }
  }
};

export const DEVICE_MENU: { group: string; ids: string[] }[] = [
  {
    "group": "Galaxy",
    "ids": [
      "s26",
      "s26ultra",
      "a07",
      "fold8",
      "ultra",
      "flip8",
      "s11ultra"
    ]
  },
  {
    "group": "Pixel",
    "ids": [
      "pixel9",
      "pixel10xl",
      "pixelfold",
      "tablet"
    ]
  },
  {
    "group": "iPhone",
    "ids": [
      "ip17",
      "ip17e",
      "ipair",
      "ip17pm",
      "ip18pro",
      "ipse3",
      "duo"
    ]
  }
];
