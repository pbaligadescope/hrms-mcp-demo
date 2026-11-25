import json, soundfile as sf, sys
from kokoro_onnx import Kokoro
k=Kokoro(sys.argv[1]+"/kokoro.onnx",sys.argv[1]+"/voices.bin")
plan=json.load(open("plan.json"))
for i,b in enumerate(plan):
    s,sr=k.create(b["say"],voice="am_michael",speed=1.0,lang="en-us")
    sf.write(f"vo_{i:02d}.wav",s,sr); b["vo"]=len(s)/sr
json.dump(plan,open("plan_t.json","w"),indent=1)
print(sum(b["vo"] for b in plan))
