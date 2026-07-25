#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Stop AI Skills Visual Center local server."""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

STATE_FILE = Path(__file__).resolve().parent / "visual-center.state"


def read_state_pid() -> int | None:
    if not STATE_FILE.exists():
        return None
    try:
        for line in STATE_FILE.read_text(encoding="ascii").splitlines():
            if line.startswith("pid="):
                return int(line.split("=", 1)[1])
    except (OSError, ValueError):
        return None
    return None


def stop_pid(pid: int) -> bool:
    if pid <= 0:
        return False
    if sys.platform.startswith("win"):
        try:
            result = subprocess.run(
                ["taskkill", "/PID", str(pid), "/F"],
                capture_output=True,
                text=True,
            )
            return result.returncode == 0
        except OSError:
            return False
    try:
        import os
        import signal

        os.kill(pid, signal.SIGTERM)
        return True
    except OSError:
        return False


def main() -> int:
    stopped = False
    pid = read_state_pid()
    if pid is not None:
        if stop_pid(pid):
            print(f"Stopped pid={pid}")
            stopped = True
        try:
            if STATE_FILE.exists():
                STATE_FILE.unlink()
        except OSError:
            pass

    if not stopped and sys.platform.startswith("win"):
        try:
            out = subprocess.check_output(
                [
                    "wmic",
                    "process",
                    "where",
                    "name='python.exe'",
                    "get",
                    "processid,commandline",
                ],
                text=True,
                errors="ignore",
            )
            for line in out.splitlines():
                if "start_visual_center.py" in line:
                    parts = line.strip().split()
                    if parts and parts[-1].isdigit():
                        if stop_pid(int(parts[-1])):
                            print(f"Stopped pid={parts[-1]}")
                            stopped = True
        except Exception:
            pass

    if stopped:
        time.sleep(0.3)
        print("Visual Center stopped.")
        return 0

    print("No running Visual Center server found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
