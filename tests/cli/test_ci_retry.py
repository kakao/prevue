"""tools/ci-retry.sh — 다운로드 일시 실패만 한 번 다시 돌고, 그 밖의 실패는 다시 돌지 않는다. 실행: python3 -m unittest discover -s tests/cli"""

import os
import subprocess
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(__file__), "..", "..", "tools", "ci-retry.sh")


class CiRetryTest(unittest.TestCase):
    def run_flaky(self, first_output, first_rc, second_rc=0):
        """첫 실행은 first_output 을 찍고 first_rc 로, 두 번째는 second_rc 로 끝나는 명령을 감싸 돌려 (종료 코드, 실행 횟수)를 준다."""
        with tempfile.TemporaryDirectory() as d:
            count = os.path.join(d, "count")
            cmd = os.path.join(d, "cmd.sh")
            with open(cmd, "w") as f:
                f.write('echo x >> "%s"\nif [ "$(wc -l < "%s")" -eq 1 ]; then\n  cat <<\'EOF\'\n%s\nEOF\n  exit %d\nfi\nexit %d\n'
                        % (count, count, first_output, first_rc, second_rc))
            p = subprocess.run(["sh", SCRIPT, "sh", cmd], env=dict(os.environ, RETRY_DELAY="0"), capture_output=True, text=True)
            with open(count) as f:
                return p.returncode, len(f.read().splitlines())

    def test_429_runs_again_and_passes(self):
        out = "> Could not GET 'https://repo.maven.apache.org/x.pom'. Received status code 429 from server: Too Many Requests"
        self.assertEqual(self.run_flaky(out, 1), (0, 2))

    def test_server_error_runs_again(self):
        self.assertEqual(self.run_flaky("Received status code 503 from server", 1), (0, 2))

    def test_download_timeout_runs_again(self):
        out = "> Could not GET 'https://plugins.gradle.org/m2/x.pom'.\n   > Read timed out"
        self.assertEqual(self.run_flaky(out, 1), (0, 2))

    def test_runs_only_once_more(self):
        self.assertEqual(self.run_flaky("Received status code 429 from server", 1, second_rc=1), (1, 2))

    def test_test_failure_is_not_run_again(self):
        self.assertEqual(self.run_flaky("FAILED: SomeTest > renders\n  java.net.SocketTimeoutException: Read timed out", 1), (1, 1))

    def test_other_client_error_is_not_run_again(self):
        self.assertEqual(self.run_flaky("Could not GET 'https://x/y.pom'. Received status code 404 from server", 1), (1, 1))

    def test_success_runs_once(self):
        self.assertEqual(self.run_flaky("", 0), (0, 1))


if __name__ == "__main__":
    unittest.main()
