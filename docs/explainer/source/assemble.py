import json,subprocess
p=json.load(open('plan_t.json'))
def dur(f): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
t=0; starts=[]
with open('list.txt','w') as L:
    for i in range(len(p)):
        f=f"seg_{i:02d}.mp4"; L.write(f"file '{f}'\n"); starts.append(t); t+=dur(f)
print("total",t)
inputs=[];fc=""
for i in range(len(p)):
    inputs+=["-i",f"vo_{i:02d}.wav"]
    fc+=f"[{i+1}:a]aresample=48000,adelay={int((starts[i]+0.3)*1000)}:all=1[a{i}];"
fc+="".join(f"[a{i}]" for i in range(len(p)))+f"amix=inputs={len(p)}:normalize=0,loudnorm=I=-16:TP=-1.5,atrim=0:{t}[aout]"
subprocess.run(["ffmpeg","-y","-v","error","-f","concat","-safe","0","-i","list.txt"]+inputs+["-filter_complex",fc,"-map","0:v","-map","[aout]","-c:v","libx264","-crf","20","-preset","medium","-pix_fmt","yuv420p","-c:a","aac","-b:a","160k","-movflags","+faststart","matrix-mcp-explainer-v2.mp4"],check=True)
# srt
def ts(x): h=int(x//3600);m=int(x%3600//60);s=x%60;return f"{h:02d}:{m:02d}:{int(s):02d},{int((s%1)*1000):03d}"
with open('matrix-mcp-explainer-v2.srt','w') as S:
    for i,b in enumerate(p):
        a=starts[i]+0.3;S.write(f"{i+1}\n{ts(a)} --> {ts(a+b['vo'])}\n{b['say']}\n\n")
json.dump(starts,open('starts.json','w'))
