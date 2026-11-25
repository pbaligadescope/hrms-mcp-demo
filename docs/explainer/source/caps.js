const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const plan=JSON.parse(fs.readFileSync('plan_t.json'));const b=await chromium.launch();
const cp=await b.newPage({viewport:{width:1280,height:720}});await cp.goto('file://'+__dirname+'/cap.html');
for(let i=0;i<plan.length;i++){const s=plan[i];if(s.type!=='clip')continue;
await cp.evaluate(t=>document.getElementById('t').textContent=t,s.cap);
await cp.screenshot({path:`cap_${String(i).padStart(2,'0')}.png`,omitBackground:true});}
await b.close();})();
