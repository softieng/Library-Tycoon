#!/usr/bin/env python3
"""Static Git blob integrity and GLB structure gate. Does NOT compile Unity."""
import hashlib, json, pathlib, struct, sys

root=pathlib.Path(__file__).resolve().parents[1]
registry=json.loads((root/"ASSET_SOURCES.json").read_text("utf-8"))
errors=[]
for name, rec in registry["models"].items():
    path=root/rec["unity_path"]
    if not path.exists():
        errors.append(f"{name}: not found")
        continue
    data=path.read_bytes()
    if len(data)<20 or data[:4]!=b"glTF" or struct.unpack_from("<I",data,8)[0]!=len(data):
        errors.append(f"{name}: malformed GLB header or length")
        continue
    try:
        json_length, json_kind=struct.unpack_from("<I4s",data,12)
        if json_kind!=b"JSON": raise ValueError("missing JSON chunk")
        info=json.loads(data[20:20+json_length].decode("utf-8").strip())
        if info["asset"]["version"]!="2.0": raise ValueError("wrong glTF version")
    except (ValueError, KeyError) as error: errors.append(f"{name}: {error}")
    expected=rec["git_blob_sha1"]
    actual=hashlib.sha1(f"blob {len(data)}\0".encode()+data).hexdigest()
    if actual!=expected: errors.append(f"{name}: Git hash mismatch {actual}")
for source in ["UnityHallBootstrap.cs","UnityGlbLibrary.cs","HallCameraController.cs",
               "LibraryMissionCore.cs","HallClickable.cs","HallWalker.cs"]:
    if not (root/"Assets/Scripts"/source).is_file(): errors.append(f"Missing script {source}")
if errors:
    print("FAILED:\n" + "\n".join(errors));sys.exit(1)
print(f"STATIC ASSET CHECK PASSED: {len(registry['models'])} verified GLBs. Unity Editor compilation and visual QA still pending.")
