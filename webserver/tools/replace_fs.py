from sys import platform
import os
Import("env")

# Resolve mklittlefs relative to this script so the binary can live alongside
# replace_fs.py (currently webserver/tools/) without relying on the cwd
# PlatformIO happens to launch from.
script_dir = os.path.dirname(os.path.abspath(__file__))
binary_name = "mklittlefs" if platform in ("linux", "linux2", "darwin") else "mklittlefs.exe"
binary_path = os.path.join(script_dir, binary_name)

print(f"Replace MKSPIFFSTOOL with {binary_path}")
env['MKSPIFFSTOOL'] = binary_path
