"""Android SDK 판정 — 진짜 bin/prevue 가 데몬과 같은 순서(ANDROID_HOME → ANDROID_SDK_ROOT → ~/Library/Android/sdk)로
platforms/*/android.jar 를 찾고, 없으면 health 는 sdk 를 말하고 start 는 데몬을 띄우기 전에 멈추는가.
데몬을 띄우지 않는다. 실행: python3 -m unittest discover -s tests/cli
"""

import json
import os
from pathlib import Path
import subprocess
import unittest

from test_plan import Case, fake_jdk, fake_sdk

ROOT = Path(__file__).resolve().parents[2] / "plugin"


class AndroidSdk(Case):
    def setUp(self):
        super().setUp()
        self.r = self.repo(":app")
        os.chmod(os.path.join(self.r.root, "gradlew"), 0o755)
        self.file = self.r.src(":app")
        self.r.built(":app", "debug")
        self.home = os.path.join(self.tmp.name, "home")
        os.makedirs(self.home)
        self.jdk = fake_jdk(os.path.join(self.tmp.name, "jdk"), "21.0.5")

    def sdk(self, name, platforms=("android-36",)):
        return fake_sdk(os.path.join(self.tmp.name, name), platforms)

    def run_prevue(self, *args, **sdk_env):
        env = dict(os.environ, HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"), PREVUE_JDK=self.jdk,
                   NO_OPEN="1")
        # Codex 샌드박스 안에서 돌면 sandbox 가 missing 첫 자리를 차지한다 — 이 테스트가 보는 것은 sdk 다
        for k in ("PREVUE_LANG", "CODEX_SANDBOX", "CODEX_SANDBOX_NETWORK_DISABLED", "ANDROID_HOME", "ANDROID_SDK_ROOT"):
            env.pop(k, None)
        env.update(sdk_env)
        p = subprocess.run([str(ROOT / "bin/prevue"), *args], capture_output=True, text=True, cwd=self.tmp.name, env=env)
        return p.returncode, json.loads(p.stdout)

    def health(self, **sdk_env):
        return self.run_prevue("health", self.file, **sdk_env)[1]

    def test_없으면_기본_자리를_말하고_멈춘다(self):
        out = self.health()
        default = os.path.join(self.home, "Library/Android/sdk")
        self.assertEqual((out["missing"][0], out["sdk"], out["next"]), ("sdk", default, "prevue health " + self.file))
        self.assertIn(default, out["tell"])
        self.assertIn("ANDROID_HOME", out["tell"])

    def test_기본_자리에_있으면_통과한다(self):
        fake_sdk(os.path.join(self.home, "Library/Android/sdk"))
        self.assertNotIn("sdk", self.health()["missing"])

    def test_android_jar_가_없는_SDK_는_없는_것이다(self):
        sdk = self.sdk("empty", platforms=())
        os.makedirs(os.path.join(sdk, "platforms", "android-36"))
        out = self.health(ANDROID_HOME=sdk)
        self.assertEqual((out["missing"][0], out["sdk"]), ("sdk", sdk))

    def test_ANDROID_HOME_이_먼저다(self):
        out = self.health(ANDROID_HOME=self.sdk("empty", platforms=()), ANDROID_SDK_ROOT=self.sdk("full"))
        self.assertEqual(out["missing"][0], "sdk")
        self.assertNotIn("sdk", self.health(ANDROID_HOME=self.sdk("home"), ANDROID_SDK_ROOT="/nope")["missing"])

    # 지킬 것: 빈 ANDROID_HOME 은 없는 것이다 — 데몬(AndroidPlatforms.findJar)도 같은 순서로 찾는다
    def test_ANDROID_HOME_이_비면_ANDROID_SDK_ROOT_를_본다(self):
        out = self.health(ANDROID_HOME="", ANDROID_SDK_ROOT=self.sdk("root"))
        self.assertNotIn("sdk", out["missing"], out)

    def test_start_는_데몬을_띄우기_전에_멈춘다(self):
        sdk = self.sdk("empty", platforms=())
        rc, out = self.run_prevue("start", "--classpath", os.path.join(self.tmp.name, "dump.json"), "--port", "8899",
                                  ANDROID_HOME=sdk)
        self.assertEqual((rc, out["ok"], out["missing"], out["sdk"]), (3, False, ["sdk"], sdk))
        self.assertIn("ANDROID_HOME", out["tell"])
        self.assertFalse(os.path.exists(os.path.join(self.home, ".prevue", "daemons", "daemon-8899.log")))


if __name__ == "__main__":
    unittest.main()
