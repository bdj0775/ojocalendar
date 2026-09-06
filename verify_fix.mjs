/** verify_fix.mjs — 수정된 전체 예측 경로 재현 (bias 포함) */
import fs from 'fs';
const L = fs.readFileSync('bookings_latest.csv','utf8').trim().split(/\r?\n/);
const R = L.slice(1).map(l=>{const c=l.split(',');return{g:c[0],ci:c[1],co:c[2],bd:c[3],amt:+c[4]};})
  .filter(r=>!(r.g==='Not available'&&r.amt===0));
const ms=s=>new Date(s+'T12:00:00').getTime();
const dim=(y,m)=>new Date(y,m+1,0).getDate();
const ov=(r,y,m)=>{const S=new Date(y,m,1,12).getTime(),E=new Date(y,m+1,1,12).getTime();
  const s=Math.max(ms(r.ci),S),e=Math.min(ms(r.co),E);return e<=s?0:Math.round((e-s)/86400000);};
const occ=(y,m,asOf=Infinity)=>{let n=0,c=0;R.forEach(r=>{if(ms(r.bd)>asOf)return;const x=ov(r,y,m);if(x>0){n+=x;c++;}});
  return{o:Math.min(100,Math.round(n/dim(y,m)*100)),c};};
const TODAY=ms('2026-09-06'), TY=2026, TM=8, TAU=60, CLAMP=Number(process.argv[2]??10);

/** 새 공식 (앱과 동일) */
function predict(stly,h2y,otb,cc){
  const h=[]; if(stly!=null)h.push(stly); if(h2y!=null)h.push(h2y);
  const a=h.length?h.reduce((s,v)=>s+v,0)/h.length:65;
  const hr=Math.max(0,100-otb)/100;
  const pv=otb-a*cc, cv=Math.max(-a*0.5,Math.min(a*0.5,pv));
  const pf=Math.min(100,Math.max(otb,otb+a*(1-cc)*hr+cv*0.5*(1-cc)));
  const pW=30+50*cc, hW=100-pW;
  let en=pf*pW, ew=pW;
  if(h.length){const rt=h.length===2?[4/7,3/7]:[1];h.forEach((o,i)=>{en+=o*(hW*rt[i]);ew+=hW*rt[i];});}
  return Math.max(otb,Math.round(en/ew));
}
// ── biasCurve 재현 (D=90..-31) ──
const acc={};
for(let off=1;off<=12;off++){
  let by=TY,bm=TM-off; while(bm<0){bm+=12;by--;}
  const act=occ(by,bm); if(act.c<3)continue;
  const ps=occ(by-1,bm), ph=occ(by-2,bm);
  const psOk=ps.c>=3, phOk=ph.c>=3; if(!psOk&&!phOk)continue;
  const dm=dim(by,bm), S=new Date(by,bm,1).getTime();
  const rel=R.filter(r=>r.bd&&ov(r,by,bm)>0).map(r=>({b:ms(r.bd),n:ov(r,by,bm)})).sort((a,b)=>a.b-b.b);
  let p=0,on=0,bc=0;
  for(let D=90;D>=-31;D--){
    const cut=S-D*86400000;
    while(p<rel.length&&rel[p].b<=cut){on+=rel[p].n;bc++;p++;}
    if(bc<1)continue;
    const oc=Math.min(100,Math.round(on/(dm)*100));
    const cc=D>0?Math.exp(-D/TAU):Math.min(dm,Math.max(1,-D+1))/dm;
    const sim=predict(psOk?ps.o:null, phOk?ph.o:null, oc, cc);
    (acc[D]=acc[D]||[]).push(act.o-sim);
  }
}
const bias={};
for(const D in acc){const a=acc[D];const raw=a.reduce((s,v)=>s+v,0)/a.length;
  bias[D]=Math.max(-CLAMP,Math.min(CLAMP,raw));}
console.log(`■ biasCurve (상한 ±${CLAMP}%p 적용 후)`);
[-25,-15,-5,0,7,14,25,45,60,90].forEach(D=>{
  const a=acc[D]; if(!a){console.log(`   D=${D}: 샘플없음`);return;}
  const raw=a.reduce((s,v)=>s+v,0)/a.length;
  console.log(`   D=${String(D).padStart(3)}: 원본 ${(raw>=0?'+':'')+raw.toFixed(1)}%p → 적용 ${(bias[D]>=0?'+':'')+bias[D].toFixed(1)}%p (샘플 ${a.length})`);
});
console.log('\n■ 수정 후 예측 (오늘 2026-09-06 기준)');
console.log('월        STLY  OTB   D     bias전  bias후');
console.log('-'.repeat(52));
[[2026,8],[2026,9],[2026,10],[2026,11],[2027,0],[2027,5],[2027,6]].forEach(([y,m])=>{
  const S=new Date(y,m,1,12).getTime(), dm=dim(y,m);
  const dus=S>TODAY?Math.floor((S-TODAY)/86400000):0;
  const el=S>TODAY?0:Math.min(31,Math.floor((TODAY-S)/86400000));
  const D=dus>0?Math.min(90,dus):-el;
  const cc=dus>0?Math.exp(-dus/TAU):Math.min(dm,Math.max(1,el))/dm;
  const s=occ(y-1,m), h=occ(y-2,m), o=occ(y,m,TODAY);
  if(s.c<3&&h.c<3)return;
  const p0=predict(s.c>=3?s.o:null,h.c>=3?h.o:null,o.o,cc);
  const p1=Math.min(100,Math.max(o.o,Math.round(p0+(bias[D]??0))));
  console.log(`${y}-${String(m+1).padStart(2,'0')}   ${String(s.o).padStart(3)}%  ${String(o.o).padStart(3)}%  ${String(D).padStart(4)}   ${String(p0).padStart(4)}%   ${String(p1).padStart(4)}%`);
});
