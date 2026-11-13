// 생성물이다. plugin/devices/*.json 을 고치고 sh tools/gen-viewer.sh 로 만든다.
// 번들 밖 한 벌이다 — resize-scene.js 와 번들이 같은 주소에서 읽는다(motion.js 와 같은 이유).
export const DEVICES = {
  "s26": {
    "name": "Galaxy S26",
    "short": "S26",
    "fold": false,
    "open": {
      "w": 360,
      "h": 780
    },
    "look": {
      "open": {
        "tone": "#23262c",
        "bezel": 5,
        "radius": 28,
        "cam": {
          "w": 9,
          "h": 9,
          "y": 14
        },
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
  "a07": {
    "name": "Galaxy A07 5G",
    "short": "A07 5G",
    "fold": false,
    "open": {
      "w": 384,
      "h": 853.33
    },
    "look": {
      "open": {
        "tone": "#2a2d33",
        "bezel": 7,
        "radius": 36.27,
        "cam": {
          "w": 42.67,
          "h": 34.13,
          "y": 0,
          "notch": 17
        },
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
      "h": 832
    },
    "look": {
      "open": {
        "tone": "#34363a",
        "bezel": 5,
        "radius": 28.09,
        "cam": {
          "w": 9,
          "h": 9,
          "y": 13.99
        },
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
  "pixel9": {
    "name": "Pixel 9",
    "short": "Pixel 9",
    "fold": false,
    "open": {
      "w": 411.43,
      "h": 923.43
    },
    "look": {
      "open": {
        "tone": "#27292d",
        "bezel": 6,
        "radius": 50.29,
        "cam": {
          "w": 32,
          "h": 32,
          "y": 16.95
        },
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
    "short": "Pixel 10 Pro XL",
    "fold": false,
    "open": {
      "w": 443.08,
      "h": 986.26
    },
    "look": {
      "open": {
        "tone": "#2d2f33",
        "bezel": 6,
        "radius": 50.46,
        "cam": {
          "w": 31.64,
          "h": 31.64,
          "y": 17.14
        },
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
      "h": 874
    },
    "look": {
      "open": {
        "tone": "#2c2c2e",
        "bezel": 5,
        "radius": 62,
        "cam": {
          "w": 125.33,
          "h": 36.67,
          "y": 14
        },
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
    },
    "status": {
      "top": 26.33,
      "right": 366.67,
      "s": 1,
      "time": {
        "cx": 72.67,
        "base": 39,
        "size": 17
      }
    }
  },
  "ip17e": {
    "name": "iPhone 17e",
    "short": "17e",
    "fold": false,
    "open": {
      "w": 390,
      "h": 844
    },
    "look": {
      "open": {
        "tone": "#2c2c2e",
        "bezel": 5,
        "radius": 47.33,
        "cam": {
          "w": 161.33,
          "h": 33.67,
          "y": 0,
          "notch": 16
        },
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
    },
    "status": {
      "top": 18.67,
      "right": 372,
      "s": 0.89,
      "time": {
        "cx": 50.5,
        "base": 30,
        "size": 15
      }
    }
  },
  "ipair": {
    "name": "iPhone Air",
    "short": "Air",
    "fold": false,
    "open": {
      "w": 420,
      "h": 912
    },
    "look": {
      "open": {
        "tone": "#46484c",
        "bezel": 4,
        "radius": 62,
        "cam": {
          "w": 125.33,
          "h": 36.67,
          "y": 20
        },
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
    },
    "status": {
      "top": 31.33,
      "right": 385.33,
      "s": 1.12,
      "time": {
        "cx": 76.33,
        "base": 45.33,
        "size": 17.7
      }
    }
  },
  "ip17pm": {
    "name": "iPhone 17 Pro Max",
    "short": "17 Pro Max",
    "fold": false,
    "open": {
      "w": 440,
      "h": 956
    },
    "look": {
      "open": {
        "tone": "#3b3a38",
        "bezel": 5,
        "radius": 62,
        "cam": {
          "w": 125.33,
          "h": 36.67,
          "y": 14
        },
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
    },
    "status": {
      "top": 25.33,
      "right": 399.33,
      "s": 1.12,
      "time": {
        "cx": 82.33,
        "base": 39.33,
        "size": 17.7
      }
    }
  },
  "ip18pro": {
    "name": "iPhone 18 Pro",
    "short": "18 Pro",
    "fold": false,
    "open": {
      "w": 402,
      "h": 874
    },
    "look": {
      "open": {
        "tone": "#3a3734",
        "bezel": 5,
        "radius": 62,
        "cam": {
          "w": 94.67,
          "h": 36.67,
          "y": 14
        },
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
    },
    "status": {
      "top": 26.33,
      "right": 366.67,
      "s": 1,
      "time": {
        "cx": 72.67,
        "base": 39,
        "size": 17
      }
    }
  },
  "ipse3": {
    "name": "iPhone SE (3rd generation)",
    "short": "SE",
    "fold": false,
    "open": {
      "w": 375,
      "h": 667
    },
    "look": {
      "open": {
        "tone": "#3a3a3d",
        "bezel": 5,
        "ends": 18,
        "home": true,
        "radius": 0,
        "cam": {
          "w": 0,
          "h": 0,
          "y": 0
        },
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
    },
    "status": {
      "top": 4.8,
      "right": 368,
      "left": 7,
      "s": 0.85,
      "time": {
        "cx": 187.5,
        "base": 14.5,
        "size": 12
      }
    }
  },
  "duo": {
    "name": "iPhone Duo",
    "short": "Duo",
    "fold": true,
    "cover": {
      "w": 466,
      "h": 678
    },
    "open": {
      "w": 951,
      "h": 669,
      "hinge": 475.5
    },
    "look": {
      "cover": {
        "tone": "#4a4744",
        "bezel": 6,
        "radius": 59,
        "cam": {
          "w": 37,
          "h": 37,
          "y": 29.33,
          "x": 0.8974
        },
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
        "radius": 59,
        "cam": {
          "w": 0,
          "h": 0,
          "y": 11
        },
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
      "axis": "width"
    }
  },
  "fold8": {
    "name": "Galaxy Z Fold8",
    "short": "Fold8",
    "fold": true,
    "cover": {
      "w": 475.43,
      "h": 751.24
    },
    "open": {
      "w": 932.57,
      "h": 704,
      "hinge": 466.29
    },
    "look": {
      "cover": {
        "tone": "#2b2d32",
        "bezel": 6,
        "radius": 9.9,
        "cam": {
          "w": 9,
          "h": 9,
          "y": 15.31
        },
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
        "radius": 6.86,
        "cam": {
          "w": 0,
          "h": 0,
          "y": 10
        },
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
      "h": 840
    },
    "open": {
      "w": 752,
      "h": 834.67,
      "hinge": 376
    },
    "look": {
      "cover": {
        "tone": "#1f2125",
        "bezel": 5,
        "radius": 5,
        "cam": {
          "w": 8,
          "h": 8,
          "y": 14
        },
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
        "radius": 5,
        "cam": {
          "w": 0,
          "h": 0,
          "y": 10
        },
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
  "pixelfold": {
    "name": "Pixel 9 Pro Fold",
    "short": "9 Pro Fold",
    "fold": true,
    "cover": {
      "w": 443.08,
      "h": 994.46
    },
    "open": {
      "w": 851.69,
      "h": 882.87,
      "hinge": 425.85
    },
    "look": {
      "cover": {
        "tone": "#2f3135",
        "bezel": 6,
        "radius": 47.18,
        "cam": {
          "w": 34.05,
          "h": 34.05,
          "y": 18.26
        },
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
        "radius": 34.87,
        "cam": {
          "w": 32.41,
          "h": 32.41,
          "y": 16.62,
          "x": 0.9574
        },
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
    "short": "Pixel Tablet",
    "fold": false,
    "open": {
      "w": 1280,
      "h": 800
    },
    "look": {
      "open": {
        "tone": "#3a3a38",
        "bezel": 34,
        "radius": 34,
        "cam": {
          "w": 0,
          "h": 0,
          "y": 10
        },
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
      "h": 1691.43
    },
    "look": {
      "open": {
        "tone": "#2b2d31",
        "bezel": 10,
        "radius": 25.14,
        "cam": {
          "w": 57.14,
          "h": 16,
          "y": 0,
          "x": 0.5,
          "edge": "right",
          "notch": 4
        },
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

export const DEVICE_MENU = [
  {
    "group": "Android",
    "ids": [
      "s26",
      "a07",
      "s26ultra",
      "pixel9",
      "pixel10xl",
      "fold8",
      "ultra",
      "pixelfold",
      "tablet",
      "s11ultra"
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
