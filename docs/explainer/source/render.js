const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');
const RATE=0.85, LEAD=0.3, PAD=0.8, fps=30;
(async()=>{
 const plan=JSON.parse(fs.readFileSync('plan_t.json'));
 const b=await chromium.launch();
 const cp=await b.newPage({viewport:{width:1280,height:720}});
 await cp.goto('file://'+__dirname+'/cap.html');
 const p=await b.newPage({viewport:{width:1280,height:720}});
 await p.goto('file://'+__dirname+'/index.html');await p.waitForTimeout(500);
 for(let i=0;i<plan.length;i++){const s=plan[i];
  if(s.type==='clip'){await cp.evaluate(t=>document.getElementById('t').textContent=t,s.cap);
    await cp.screenshot({path:`cap_${String(i).padStart(2,'0')}.png`,omitBackground:true});continue;}
  const span=s.b-s.a; const D=Math.max(span/RATE, LEAD+s.vo+PAD)+(s.tail||0); s.D=D;
  const n=Math.round(D*fps);
  const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','medium','-r',''+fps,`seg_${String(i).padStart(2,'0')}.mp4`],{stdio:['pipe','ignore','inherit']});
  for(let f=0;f<n;f++){const t=s.a+Math.min(span,(f/fps)*RATE);await p.evaluate(t=>render(t),t);
   const buf=await p.screenshot({type:'jpeg',quality:95});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));console.log('seg',i,D.toFixed(2));
 }
 await b.close();
})();
