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
  }
};

export const DEVICE_MENU = [
  {
    "group": "Android",
    "ids": [
      "s26",
      "pixel9",
      "fold8",
      "ultra",
      "pixelfold",
      "tablet"
    ]
  },
  {
    "group": "iPhone",
    "ids": [
      "ip17",
      "ipair",
      "ip17pm",
      "ip18pro",
      "duo"
    ]
  }
];
