(function(){'use strict';
const NS='http://www.w3.org/2000/svg';let cleanup=()=>{};
const specs={
 growth:['Vekst og likevekt','Endre vekstraten. Hvilke kurver nærmer seg null?',['Vekstrate k',-1,1,.05,-.3]],
 complex:['Rotasjon i det komplekse planet','Forutsi punktets posisjon før du endrer vinkelen.',['Vinkel θ (grader)',-180,180,5,45]],
 oscillator:['Dempede svingninger','Endre dempingen og følg konvolutten. Modellen her er underkritisk.',['Demping α',0,1.5,.05,.3]],
 derivative:['Sekant blir tangent','Hva skjer med sekantstigningen når h nærmer seg null?',['Steg h',.02,2,.02,1]],
 matrix:['Se matriseavbildningen','Den blå rammen er bildet av enhetskvadratet under A = [[a,1],[0,1]].',['Strekking a',-2,3,.1,1.5]],
 phase:['Stabilitet i et lineært system','Blå kurve løser x′ = ax, y′ = −y fra (1,1). Hva gjør fortegnet til a?',['Egenverdi a',-1.5,1,.1,-.5]],
 integral:['Riemannsummer','Midtpunktsrektangler for f(x)=x² på [0,2]. Forutsi om summen øker.',['Antall rektangler',2,40,1,6]],
 euler:['Euler mot eksakt løsning','Blå: Euler for u′=−2u. Grønn: eksakt løsning. Prøv et stort steg.',['Steglengde h',.05,1.2,.05,.3]],
 newton:['Tangentens nullpunkt','Følg ett Newton-steg for x²−2. Sammenlign ny og gammel gjetning.',['Startverdi x₀',.3,3,.05,2]],
 series:['Delsummer og rest','Geometrisk rekke med forhold 1/2. Hvor mye mangler på summen 2?',['Antall ledd',1,16,1,5]],
 taylor:['Taylor nær sentrum','Blå: Taylorpolynom for eˣ rundt 0. Grønn: eˣ. Hvor er feilen størst?',['Polynomgrad',0,10,1,2]],
 response:['Sprangrespons','Responsen til u′+au=1, u(0)=0. Endre a og se både fart og sluttverdi.',['Koeffisient a',.2,3,.1,1]],
 fourier:['Bygg en firkantbølge','Legg til odde sinusmoder. Se etter oversving ved spranget.',['Antall odde moder',1,20,1,4]],
 projection:['Projeksjon og rest','Blå vektor er (3,2). Endre retningen vi projiserer på.',['Retningsvinkel (grader)',0,180,5,35]],
 regression:['Tilpass en linje','Punktene er (0,1), (1,2), (2,2), (3,4). Linjen går gjennom middelpunktet.',['Stigning b',0,2,.05,.9]],
 svd:['Komprimer en matrise','Fire singulærverdier: 8,4,2,1. Hvor mye kvadratisk energi beholder vi?',['Beholdte singulærverdier',1,4,1,2]],
 heat:['Diffusjon glatter ut','u(x,t)=e⁻ᵗ sin x + 0.4e⁻⁹ᵗ sin 3x. Hvilken detalj forsvinner først?',['Tid t',0,3,.02,.2]],
 spectrum:['Pulsens spekter','Transformen til en enhetspuls på [−a,a]. Endre pulsbredden.',['Halvbredde a',.2,3,.1,1]],
 quantum:['Tilstand i en brønn','Blå: normalisert romlig bølgefunksjon. Grønn: sannsynlighetstetthet. L=π.',['Modenummer n',1,6,1,1]],
 convergence:['Punktvis konvergens','fₙ(x)=xⁿ på [0,1]. Verdien ved 1 forblir 1.',['Eksponent n',1,60,1,5]],
 curve:['En heliks i rommet','En fast skrå projeksjon viser én runde. Endre stigningen b.',['Stigning b',0,1.5,.05,.3]],
 gradient:['Gradient og retningsderivert','f=x²+2y² i (1,1). Blå pil er gradienten; grønn pil er valgt enhetsretning.',['Retningsvinkel (grader)',0,360,5,60]],
 field:['Kilde og rotasjon','F=(ax−y,x+ay). Endre a: rotasjonen er konstant, divergensen endres.',['Kildestyrke a',-1,1,.1,.3]],
 line:['Sirkulasjon langs en sirkel','F=(−y,x). Blå punkt følger positiv orientering; grønn pil er feltet.',['Posisjon θ (grader)',0,360,5,45]],
 region:['Snitt gjennom trekanten','D: 0≤y≤x≤1. Flytt et vertikalt snitt og les innergrensene.',['Snitt x',0,1,.02,.6]],
 jacobian:['Polar arealskalering','En sektor med fast liten vinkel blir større lenger fra sentrum.',['Radius r',.4,2.8,.1,1.5]],
 harmonic:['Harmonisk sadelflate','Nivåkurver for u=x²−y². Den radielle middelverdien rundt origo er 0.',['Sirkelradius s',.3,2,.1,1]],
 surface:['Normal og flateareal','Flaten z=ax over enhetskvadratet. Arealet vokser, vertikal fluks er konstant.',['Helning a',-2,2,.1,1]],
 sphere:['Kuleflate og volum','Snitt av en kule med radius s. Areal vokser med s², volum med s³.',['Radius s',.3,3,.1,1]],
 flow:['Bevegelse gjennom et felt','v(x)=ax. En partikkel starter ved x=1; akselerasjonen er a²x.',['Koeffisient a',-.6,.6,.05,.3]],
 wave:['Bølgeforplantning','Startprofilen deles i to med halv amplitude når startfarten er null.',['Tid t',0,3,.02,.6]],
 rotation:['Rotasjon som matriseeksponential','Roter basisvektorene rundt origo. Vinkler og lengder bevares.',['Vinkel (grader)',-180,180,5,35]],
 lorentz:['Romtid og bevart intervall','Hendelsen er (ct,x)=(2,1). Se den samme hendelsen etter en boost.',['Hastighet β=v/c',-.85,.85,.05,.3]],
 residue:['Hvilke poler ligger innenfor?','f(z)=1/[(z−1)(z+2)]. Endre radius på en positiv sirkel om origo.',['Konturradius R',.4,3,.1,1.5]]
};
function mount(type,el){cleanup();if(!specs[type])return;let raf=0,playing=false,t0=0;const [title,desc,s]=specs[type];el.innerHTML=`<h3>${title}</h3><p class="small muted">${desc}</p><svg viewBox="0 0 720 340" role="img" aria-label="${title}"></svg><label>${s[0]}: <output></output><input type="range" min="${s[1]}" max="${s[2]}" step="${s[3]}" value="${s[4]}" aria-label="${s[0]}"></label><div class="button-row"><button class="small" data-lab="play">Spill av</button><button class="small" data-lab="reset">Nullstill</button></div><div class="lab-output" aria-live="polite"></div>`;
const svg=el.querySelector('svg'),slider=el.querySelector('input'),out=el.querySelector('output'),result=el.querySelector('.lab-output');
function draw(){let a=Number(slider.value);out.value=a.toFixed(2).replace(/\.00$/,'');svg.replaceChildren();let xmin=-3,xmax=3,ymin=-2.5,ymax=2.5;const blue='#00509e',green='#087459',amber='#bd7800';
function node(t,attrs,txt){let n=document.createElementNS(NS,t);for(let k in attrs)n.setAttribute(k,attrs[k]);if(txt!==undefined)n.textContent=txt;svg.append(n);return n;}
function X(x){return 48+(x-xmin)/(xmax-xmin)*624}function Y(y){return 302-(y-ymin)/(ymax-ymin)*272}
function line(x1,y1,x2,y2,c=blue,w=2,dash=''){return node('line',{x1:X(x1),y1:Y(y1),x2:X(x2),y2:Y(y2),stroke:c,'stroke-width':w,'stroke-dasharray':dash});}
function label(x,y,t,c='#51677d'){node('text',{x:X(x),y:Y(y),fill:c,'font-size':14},t)}
function dot(x,y,c=blue){node('circle',{cx:X(x),cy:Y(y),r:5,fill:c})}
function path(points,c=blue,w=3,fill='none'){node('path',{d:points.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(2)+','+Y(p[1]).toFixed(2)).join(' '),stroke:c,'stroke-width':w,fill,'stroke-linejoin':'round'});}
function fun(f,c=blue,lo=xmin,hi=xmax,n=240){let pts=[];for(let i=0;i<=n;i++){let x=lo+(hi-lo)*i/n,y=f(x);if(Number.isFinite(y)&&y>=ymin-2&&y<=ymax+2)pts.push([x,y]);else if(pts.length){path(pts,c);pts=[];}}if(pts.length)path(pts,c);}
function axes(){for(let i=Math.ceil(xmin);i<=xmax;i++)line(i,ymin,i,ymax,'#e3ebf3',1);for(let i=Math.ceil(ymin);i<=ymax;i++)line(xmin,i,xmax,i,'#e3ebf3',1);if(ymin<=0&&ymax>=0)line(xmin,0,xmax,0,'#91a9bf',1.5);if(xmin<=0&&xmax>=0)line(0,ymin,0,ymax,'#91a9bf',1.5);label(xmax-.25,0,'x');label(.08,ymax-.15,'y');label(.04,-.22,'0');}
function arrow(x,y,u,v,c=blue){line(x,y,x+u,y+v,c,2);let px=X(x+u),py=Y(y+v),ang=Math.atan2(py-Y(y),px-X(x));node('path',{d:`M ${px-7*Math.cos(ang-.45)} ${py-7*Math.sin(ang-.45)} L ${px} ${py} L ${px-7*Math.cos(ang+.45)} ${py-7*Math.sin(ang+.45)}`,stroke:c,'stroke-width':2,fill:'none'});}
let message='';if(['growth','oscillator','euler','response','flow'].includes(type)){xmin=0;xmax=5;ymin=-1.5;ymax=4;}
if(['integral','newton','derivative'].includes(type)){xmin=-.1;xmax=3;ymin=-1;ymax=7;}
if(['series'].includes(type)){xmin=0;xmax=16;ymin=0;ymax=2.5;}
if(type==='taylor'){xmin=-2;xmax=2;ymin=-1;ymax=8;}
if(['heat','quantum'].includes(type)){xmin=0;xmax=Math.PI;ymin=-1.2;ymax=1.2;}
if(type==='convergence'||type==='region'){xmin=0;xmax=1.1;ymin=0;ymax=1.1;}
if(type==='regression'){xmin=-.3;xmax=3.5;ymin=0;ymax=5;}
if(type==='projection'||type==='gradient'){xmin=-1;xmax=5;ymin=-1;ymax=5;}
if(type==='svd'){xmin=0;xmax=5;ymin=0;ymax=9;}
if(type==='lorentz'){xmin=-1;xmax=5;ymin=-1;ymax=6;}
axes();
switch(type){
case 'growth':fun(t=>Math.exp(a*t));message=`u(0)=1. u(5)=${Math.exp(5*a).toFixed(3)}. k ${a<0?'< 0 gir avtagning.':a>0?'> 0 gir vekst.':'= 0 gir konstant løsning.'}`;break;
case 'complex':case 'rotation':{let t=a*Math.PI/180;path(Array.from({length:129},(_,i)=>[Math.cos(i*Math.PI/64),Math.sin(i*Math.PI/64)]),'#cbd9e6',2);arrow(0,0,Math.cos(t),Math.sin(t));if(type==='rotation')arrow(0,0,-Math.sin(t),Math.cos(t),green);dot(Math.cos(t),Math.sin(t));message=`(cos θ, sin θ) = (${Math.cos(t).toFixed(3)}, ${Math.sin(t).toFixed(3)}). Lengden er 1.`;break;}
case 'oscillator':fun(t=>Math.exp(-a*t)*Math.cos(3*t));fun(t=>Math.exp(-a*t),green);fun(t=>-Math.exp(-a*t),green);message=`Konvolutt: ±e^(−${a.toFixed(2)}t). Vinkelfrekvensen er holdt fast på 3.`;break;
case 'derivative':{fun(x=>x*x);const slope=2+a;line(0,-1,3,5,green);line(1,1,1+a,(1+a)**2,blue,3);dot(1,1);dot(1+a,(1+a)**2);message=`Sekantstigning = 2+h = ${slope.toFixed(3)}. Tangentstigning ved x=1 er 2 (grønn).`;break;}
case 'matrix':path([[0,0],[1,0],[1,1],[0,1],[0,0]],'#8b9bae',2);path([[0,0],[a,0],[a+1,1],[1,1],[0,0]],blue,3,'#00509e16');arrow(0,0,a,0);arrow(0,0,1,1,green);message=`det A = ${a.toFixed(2)}. Arealskalering = ${Math.abs(a).toFixed(2)}. ${a===0?'Avbildningen mister en dimensjon.':''}`;break;
case 'phase':{path(Array.from({length:101},(_,i)=>[Math.exp(a*i/40),Math.exp(-i/40)]));dot(1,1,green);message=`Egenverdier: ${a.toFixed(1)} og −1. ${a<0?'Begge komponenter avtar.':a>0?'Første komponent vokser.':'Første komponent er konstant.'}`;break;}
case 'integral':{fun(x=>x*x,green,0,2);let sum=0,h=2/a;for(let i=0;i<a;i++){let v=((i+.5)*h)**2;sum+=v*h;path([[i*h,0],[i*h,v],[(i+1)*h,v],[(i+1)*h,0]],blue,1,'#00509e20');}message=`Midtpunktssum = ${sum.toFixed(5)}. Eksakt integral = 8/3 ≈ 2.66667.`;break;}
case 'euler':{fun(t=>Math.exp(-2*t),green);let pts=[[0,1]],v=1;for(let t=0;t+a<=5+1e-9;t+=a){v*=1-2*a;pts.push([t+a,v]);}path(pts);message=`Stegfaktor 1−2h = ${(1-2*a).toFixed(2)}. ${a<1?'Absoluttverdien er under 1: avtagende numerisk mode.':a===1?'Absoluttverdi 1: ingen numerisk demping.':'Absoluttverdien er over 1: ustabil Euler-løsning.'}`;break;}
case 'newton':{fun(x=>x*x-2,green);let next=a-(a*a-2)/(2*a);line(next-.4,-.8*a,a+.4,a*a-2+.8*a);dot(a,a*a-2);dot(next,0,amber);message=`x₁ = ${next.toFixed(6)}. Roten er √2 ≈ 1.414214.`;break;}
case 'series':{let pts=[];for(let n=1;n<=a;n++){let y=2*(1-2**(-n));pts.push([n,y]);dot(n,y);}path(pts);line(0,2,16,2,green);message=`Sum etter ${a} ledd = ${(2*(1-2**(-a))).toFixed(6)}. Rest = ${(2**(1-a)).toFixed(6)}.`;break;}
case 'taylor':fun(x=>Math.exp(x),green);fun(x=>{let s=1,t=1;for(let k=1;k<=a;k++){t*=x/k;s+=t;}return s;});message=`Grad ${a}. Begge kurvene møtes i x=0; høyere grad forbedrer tilnærmingen på dette intervallet.`;break;
case 'response':fun(t=>(1-Math.exp(-a*t))/a);line(0,1/a,5,1/a,green,1,'5 4');message=`Sluttverdi 1/a = ${(1/a).toFixed(3)}. Tidskonstant 1/a = ${(1/a).toFixed(3)}.`;break;
case 'fourier':fun(x=>x<0?-1:1,green,-Math.PI,Math.PI);fun(x=>{let y=0;for(let k=0;k<a;k++){let n=2*k+1;y+=4/Math.PI*Math.sin(n*x)/n;}return y;},blue,-Math.PI,Math.PI);message=`${a} odde moder. I spranget x=0 er summen alltid 0, gjennomsnittet av −1 og 1.`;break;
case 'projection':{let t=a*Math.PI/180,c=Math.cos(t),s=Math.sin(t),k=3*c+2*s;line(-c,-s,4*c,4*s,'#91a9bf');arrow(0,0,3,2);arrow(0,0,k*c,k*s,green);line(3,2,k*c,k*s,amber,2,'5 4');message=`Projeksjon = (${(k*c).toFixed(2)}, ${(k*s).toFixed(2)}). Restlengde = ${Math.hypot(3-k*c,2-k*s).toFixed(3)}.`;break;}
case 'regression':{let b=2.25-1.5*a,ys=[1,2,2,4],err=0;fun(x=>b+a*x);ys.forEach((y,i)=>{dot(i,y,green);line(i,y,i,b+a*i,amber,2);err+=(y-b-a*i)**2;});message=`Linje: y=${b.toFixed(2)}+${a.toFixed(2)}x. Kvadratsum = ${err.toFixed(4)}. Minimum ved b(stigning)=0.9.`;break;}
case 'svd':{let ss=[8,4,2,1],keep=0;ss.forEach((v,i)=>{path([[i+.5,0],[i+.5,v],[i+1,v],[i+1,0]],i<a?blue:'#b8c5d1',1,i<a?'#00509e77':'#ccd7e3');if(i<a)keep+=v*v;});message=`Rang ${a}: ${(100*keep/85).toFixed(1)} % av kvadratisk energi. Frobeniusfeil = ${Math.sqrt(85-keep).toFixed(3)}.`;break;}
case 'heat':fun(x=>Math.exp(-a)*Math.sin(x)+.4*Math.exp(-9*a)*Math.sin(3*x));fun(x=>Math.sin(x)+.4*Math.sin(3*x),green);message=`Grønn er startprofilen. Mode 1 har faktor ${Math.exp(-a).toFixed(3)}, mode 3 har faktor ${Math.exp(-9*a).toFixed(3)}.`;break;
case 'spectrum':fun(w=>Math.abs(w)<1e-8?2*a:2*Math.sin(a*w)/w);message=`F(0)=2a=${(2*a).toFixed(2)}. Første positive nullpunkt er π/a=${(Math.PI/a).toFixed(3)}.`;break;
case 'quantum':fun(x=>Math.sqrt(2/Math.PI)*Math.sin(a*x));fun(x=>2/Math.PI*Math.sin(a*x)**2,green);message=`n=${a}, energi Eₙ/E₁=${a*a}. Tettheten har integral 1 og er aldri negativ.`;break;
case 'convergence':fun(x=>x**a,blue,0,1);dot(1,1,amber);message=`fₙ(0.9)=${(.9**a).toFixed(5)}. fₙ(1)=1 for alle n. Konvergensen er ikke uniform på [0,1].`;break;
case 'curve':{function p(t){return [Math.cos(t)+.35*Math.sin(t),.3*Math.sin(t)+a*(t/Math.PI-1)];}path(Array.from({length:181},(_,i)=>p(i*Math.PI/90)));dot(...p(0),green);message=`r=(cos t,sin t,bt), 0≤t≤2π. Lengde=${(2*Math.PI*Math.sqrt(1+a*a)).toFixed(3)}, krumning=${(1/(1+a*a)).toFixed(3)}, torsjon=${(a/(1+a*a)).toFixed(3)}. Skrå projeksjon, ikke målestokkriktig i 3D.`;break;}
case 'gradient':{let t=a*Math.PI/180;arrow(1,1,2,4,blue);arrow(1,1,Math.cos(t),Math.sin(t),green);dot(1,1);message=`Retningsderivert = 2 cos θ + 4 sin θ = ${(2*Math.cos(t)+4*Math.sin(t)).toFixed(3)}. Maksimum er √20 ≈ 4.472.`;break;}
case 'field':for(let x=-2.5;x<=2.5;x+=.5)for(let y=-2;y<=2;y+=.5){let u=a*x-y,v=x+a*y;arrow(x,y,.09*u,.09*v);}message=`Divergens = ${(2*a).toFixed(2)}. Rotasjonens z-komponent = 2. Pilene er skalert med samme faktor.`;break;
case 'line':{path(Array.from({length:129},(_,i)=>[1.6*Math.cos(i*Math.PI/64),1.6*Math.sin(i*Math.PI/64)]),'#94acc2');let t=a*Math.PI/180,x=1.6*Math.cos(t),y=1.6*Math.sin(t);dot(x,y);arrow(x,y,-y*.4,x*.4,green);message='Feltet følger tangenten. Sirkulasjon rundt hele kurven er 2πR²; normalfluksen er 0.';break;}
case 'region':path([[0,0],[1,0],[1,1],[0,0]],blue,2,'#00509e15');line(a,0,a,a,green,5);message=`Ved x=${a.toFixed(2)} går y fra 0 til ${a.toFixed(2)}. Snittlengde=x. Totalt areal=1/2.`;break;
case 'jacobian':{let dr=.2,dth=.22;path([[a,0],[a+dr,0],[(a+dr)*Math.cos(dth),(a+dr)*Math.sin(dth)],[a*Math.cos(dth),a*Math.sin(dth)],[a,0]],blue,2,'#00509e25');message=`Lokalt areal ≈ r Δr Δθ = ${(a*dr*dth).toFixed(4)}. Eksakt sektorareal = ${(((a+dr)**2-a*a)*dth/2).toFixed(4)}.`;break;}
case 'harmonic':for(let k=-3;k<=3;k++){fun(x=>Math.sqrt(x*x-k),'#ccdceb',-2.5,2.5);fun(x=>-Math.sqrt(x*x-k),'#ccdceb',-2.5,2.5);}path(Array.from({length:129},(_,i)=>[a*Math.cos(i*Math.PI/64),a*Math.sin(i*Math.PI/64)]),blue);message=`På sirkelen er u=s² cos(2θ). Middelverdien er 0=u(0,0), uansett s=${a.toFixed(1)}.`;break;
case 'surface':{let p=(x,y,z)=>[1.6*x+.6*y-1,.5*y+z*.6-.6];path([[0,0],[1,0],[1,1],[0,1],[0,0]].map(([x,y])=>p(x,y,a*x)),blue,3,'#00509e22');message=`Areal=√(1+a²)=${Math.sqrt(1+a*a).toFixed(3)}. Oppadrettet fluks av (0,0,1) er 1 for alle a. Figuren er en skrå 3D-projeksjon.`;break;}
case 'sphere':{path(Array.from({length:129},(_,i)=>[a*Math.cos(i*Math.PI/64),a*.72*Math.sin(i*Math.PI/64)]),blue,2,'#00509e12');path(Array.from({length:129},(_,i)=>[a*Math.cos(i*Math.PI/64),a*.2*Math.sin(i*Math.PI/64)]),'#8ca6be',1);line(0,0,a,0,green,3);message=`Areal=4πs²=${(4*Math.PI*a*a).toFixed(3)}. Volum=4πs³/3=${(4*Math.PI*a**3/3).toFixed(3)}. Sirkelmeridianen vises i skrå projeksjon.`;break;}
case 'flow':fun(t=>Math.exp(a*t));message=`Partikkelposisjon x(t)=e^(at). Ved t=2 er x=${Math.exp(2*a).toFixed(3)} og akselerasjonen a²x=${(a*a*Math.exp(2*a)).toFixed(3)}.`;break;
case 'wave':{const f=x=>Math.exp(-5*x*x);fun(x=>.5*f(x-a),green);fun(x=>.5*f(x+a),amber);fun(x=>.5*(f(x-a)+f(x+a)));message=`c=1. Blå er summen, grønn går mot høyre og oransje mot venstre. Hver profil har halv startamplitude.`;break;}
case 'lorentz':{let g=1/Math.sqrt(1-a*a),xx=g*(1-2*a),tt=g*(2-a);line(0,0,5,5,'#d1ddea');line(0,0,-1,1,'#d1ddea');dot(1,2,green);dot(xx,tt);message=`Grønn: (x,ct)=(1,2). Blå: (${xx.toFixed(3)},${tt.toFixed(3)}). (ct′)²−x′²=${(tt*tt-xx*xx).toFixed(5)}=3.`;break;}
case 'residue':{path(Array.from({length:129},(_,i)=>[a*Math.cos(i*Math.PI/64),a*Math.sin(i*Math.PI/64)]));dot(1,0,amber);dot(-2,0,amber);label(1,.4,'res = 1/3');label(-2,.4,'res = −1/3');let edge=Math.abs(a-1)<.001||Math.abs(a-2)<.001;message=edge?'En pol ligger på kurven: standardintegralet er ikke definert.':a<1?'Ingen poler innenfor: integralet er 0.':a<2?'Bare z=1 er innenfor: integralet er 2πi/3.':'Begge poler er innenfor. Residysummen er 0, så integralet er 0.';break;}
}result.textContent=message;}
function stop(){playing=false;cancelAnimationFrame(raf);el.querySelector('[data-lab=play]').textContent='Spill av';}
function tick(t){if(!playing)return;if(!t0)t0=t;let span=s[2]-s[1],v=s[1]+((t-t0)/9000%1)*span;slider.value=v;draw();raf=requestAnimationFrame(tick);}
slider.addEventListener('input',()=>{stop();draw();});el.querySelector('[data-lab=reset]').onclick=()=>{stop();slider.value=s[4];draw();};el.querySelector('[data-lab=play]').onclick=()=>{if(playing){stop();return;}playing=true;t0=0;el.querySelector('[data-lab=play]').textContent='Pause';raf=requestAnimationFrame(tick);};cleanup=stop;draw();}
window.MatteLabs={mount,stop:()=>cleanup(),specs};})();
