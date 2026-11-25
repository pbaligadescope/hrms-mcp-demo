import json,subprocess
import sys
SRC=sys.argv[1]  # path to the Descope console screen recording
p=json.load(open('plan_t.json'))
for i,s in enumerate(p):
    if s['type']!='clip': continue
    SLW=1.6 if i==14 else 1.0; L=sum(b-a for a,b in s["segs"])*SLW; D=max(L,0.3+s['vo']+0.8)
    parts=[];fc=""
    for k,(a,b) in enumerate(s['segs']):
        fc+=f"[0:v]trim={a}:{b},setpts=(PTS-STARTPTS)*{SLW},crop=2933:1650:487:336,scale=1280:720:flags=lanczos,fps=30,format=yuv420p[v{k}];"
        parts.append(f"[v{k}]")
    fc+="".join(parts)+f"concat=n={len(parts)}:v=1:a=0,tpad=stop_mode=clone:stop_duration={D-L+0.1}[c];"
    fc+=f"[1:v]format=rgba,fade=in:st=0.4:d=0.4:alpha=1[cap];[c][cap]overlay=0:0:format=auto,trim=0:{D},format=yuv420p[out]"
    out=f"seg_{i:02d}.mp4"
    subprocess.run(["ffmpeg","-y","-v","error","-i",SRC,"-loop","1","-i",f"cap_{i:02d}.png","-filter_complex",fc,"-map","[out]","-c:v","libx264","-crf","18","-preset","medium","-r","30",out],check=True)
    print(i,L,round(D,2))
