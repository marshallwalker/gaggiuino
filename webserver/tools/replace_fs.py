from sys import platform
import os
Import("env")

# Resolve mklittlefs relative to this script so the binary can live alongside
# replace_fs.py (currently webserver/tools/) without relying on the cwd
# PlatformIO happens to launch from.
# Note: PlatformIO runs extra_scripts via exec(), so __file__ is not defined.
# SCons provides the script path through its call stack instead.
import inspect as _inspect
script_dir = os.path.dirname(os.path.abspath(
    _inspect.getfile(_inspect.currentframe())
))
binary_name = "mklittlefs" if platform in ("linux", "linux2", "darwin") else "mklittlefs.exe"
binary_path = os.path.join(script_dir, binary_name)

print(f"Replace MKSPIFFSTOOL with {binary_path}")
env['MKSPIFFSTOOL'] = binary_path
