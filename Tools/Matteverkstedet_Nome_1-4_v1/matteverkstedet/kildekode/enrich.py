from content import *
byid={m['id']:m for m in modules}
def supplement(mid,paragraphs,questions):
 m=byid[mid];m['theory']+=paragraphs
 for q in questions:q['id']=f'{mid}-q{len(m["questions"])+1}';q['origin']='Egen øvingsoppgave · fordypning i pensum';m['questions'].append(q)
supplement('1-1',[r'Logistisk vekst legger inn en bæreevne: $u\prime=ku(1-u/K)$. Den relative veksten avtar når u nærmer seg K. Ved blanding i tanker settes endringen lik stoff inn minus stoff ut; konsentrasjon er mengde delt på volum. Hold også styr på om volumet endrer seg.'],[
 work(r'En tank rommer 100 liter og har 20 gram salt. Rent vann strømmer inn med 5 L/min, og perfekt blandet vann strømmer ut like fort. Finn saltmengden.',[r'Volumet er konstant. Utstrømning av salt er $5m/100=m/20$ gram/min.',r'$m\prime=-m/20$, $m(0)=20$.',r'$m(t)=20e^{-t/20}$.'],['Brukte konsentrasjon','Satte riktig fortegn','Kontrollerte enhetene']),
 num(r'En mengde dobles hvert 10. minutt. Hvor mange ganger startmengden har vi etter 30 minutter?',8,[r'Tre doblinger gir $2^3=8$.'])])
supplement('1-2',[r'Kompleks sinus og cosinus defineres med eksponentialer også for komplekst argument. Hyperbolske funksjoner er $\cosh t=(e^t+e^{-t})/2$ og $\sinh t=(e^t-e^{-t})/2$. Ved å sette inn komplekst argument får vi $\cos(a+ib)=\cos a\cosh b-i\sin a\sinh b$.'],[
 num(r'Hva er $\cosh(0)$?',1,[r'$(1+1)/2=1$.']),work(r'Utled $\cos(a+b)=\cos a\cos b-\sin a\sin b$ med Eulers formel.',[r'Skriv $e^{i(a+b)}=e^{ia}e^{ib}$.',r'Utvid produktet $(\cos a+i\sin a)(\cos b+i\sin b)$.',r'Sammenlign realdelene.'],['Brukte eksponentialregelen','Utvidet komplekst produkt','Sammenlignet realdeler'])])
supplement('1-10',[r'Symplektisk Euler for en oscillator oppdaterer først fart, så posisjon med den nye farten: $v_{n+1}=v_n-h\omega^2u_n$, $u_{n+1}=u_n+hv_{n+1}$. Den bevarer ikke eksakt energi, men unngår den systematiske energiveksten til eksplisitt Euler i vanlige stabile stegintervaller. Trapesmetoden bruker gjennomsnitt av start- og sluttstigning og er implisitt.'],[
 num(r'Symplektisk Euler med $u_0=1,v_0=0,h=0.1,\omega=2$. Hva er $u_1$?',.96,[r'$v_1=-0.1\cdot4=-0.4$.',r'$u_1=1+0.1(-0.4)=0.96$.']),
 work(r'Vis at eksplisitt Euler øker energien til $u\prime=v$, $v\prime=-u$ for ethvert $h>0$.',[r'Ett steg gir $u_+=u+hv$, $v_+=v-hu$.',r'Utvid $u_+^2+v_+^2$; kryssleddene kansellerer.',r'Det blir $(1+h^2)(u^2+v^2)$, så energien vokser med faktor $1+h^2$.'],['Brukte begge gamle verdier','Utvidet kvadratene','Fant energifaktoren'])])
supplement('2-5',[r'For flere uavhengige variable fungerer samme designmatrise. En planmodell $z=a+bx+cy$ gir rader $(1,x_i,y_i)$. Vi minimerer fortsatt med hensyn på koeffisientene. Hessianen til feilfunksjonen er $2A^TA$, som er positivt definitt ved full kolonnerang.'],[
 num(r'En førsteordens modell i to variable er $z=a+bx+cy$. Hvor mange parametre tilpasses?',3,[r'Konstantledd og to helninger gir tre parametre.']),
 work(r'Vis at minste-kvadratersløsningen er entydig når designmatrisen har full kolonnerang.',[r'For $v\ne0$ er $Av\ne0$, derfor $v^TA^TAv=\|Av\|^2>0$.',r'Feilfunksjonens Hessian er $2A^TA$ og er positivt definitt.',r'Feilfunksjonen er strengt konveks og normalbetingelsen har én løsning.'],['Brukte full kolonnerang','Viste positiv definitet','Knyttet dette til entydighet'])])
supplement('2-6',[r'For en sentrert datamatrise X med observasjoner i radene er utvalgs-kovariansmatrisen $X^TX/(n-1)$. En ortogonal transformasjon bevarer totale kvadratavstander. Den beste rang-k-approksimasjonen i Frobeniusnorm har feilkvadrat lik summen av de utelatte singulærverdienes kvadrater.'],[
 num(r'Singulærverdiene er 5, 3, 1. Hva er kvadrert Frobeniusfeil når bare første beholdes?',10,[r'Utelatte kvadrater gir $3^2+1^2=10$.']),
 work(r'Finn pseudoinversen til $A=\operatorname{diag}(4,0)$.',[r'Inverter den positive singulærverdien 4.',r'La null-singulærverdien forbli null.',r'$A^+=\operatorname{diag}(1/4,0)$.'],['Identifiserte singulærverdiene','Unngikk divisjon på null','Skrev pseudoinversen'])])
supplement('2-13',[r'Definisjonen av kontinuitet i a er: for hver $\epsilon>0$ finnes $\delta>0$ slik at $|x-a|<\delta$ gir $|f(x)-f(a)|<\epsilon$. Lipschitzkontinuitet krever $|f(x)-f(y)|\le L|x-y|$ for én konstant L. Det er sterkere enn kontinuitet. Funksjonen $x^2\sin(1/x)$ med verdi 0 i origo er deriverbar der; dette sjekkes med differansekvotienten.'],[
 num(r'$f(x)=x^2\sin(1/x)$ for $x\ne0$, $f(0)=0$. Finn $f\prime(0)$.',0,[r'Differansekvotienten er $h\sin(1/h)$.',r'Absoluttverdien er høyst $|h|$, så grensen er 0.']),
 work(r'Vis med epsilon-delta at $f(x)=3x$ er kontinuerlig i a.',[r'$|f(x)-f(a)|=3|x-a|$.',r'For gitt $\epsilon>0$, velg $\delta=\epsilon/3$.',r'$|x-a|<\delta$ gir $|f(x)-f(a)|<\epsilon$.'],['Startet med vilkårlig epsilon','Valgte positiv delta','Viste implikasjonen'])])
supplement('3-3',[r'En negativt semidefinitt Hessian er uavgjørende for en vilkårlig funksjon, men for et rent kvadratisk polynom har vi hele uttrykket. Da kan vi se direkte om en linje av kritiske punkter er en rygg av maksimumspunkter. Et eksempel er $f=5-(x-2y)^2$, som aldri overstiger 5.'],[
 num(r'$f(x,y)=5-(x-2y)^2$ på hele planet. Hva er største verdi?',5,[r'Kvadratet er ikke-negativt, og er null på linjen x=2y.']),
 work(r'Finn maksimum og minimum av $f=x+2y$ på enhetsskiven.',[r'Cauchy–Schwarz gir $|x+2y|\le\sqrt5\sqrt{x^2+y^2}\le\sqrt5$.',r'Likhet fås ved $(x,y)=\pm(1,2)/\sqrt5$.',r'Maksimum er $\sqrt5$, minimum $-\sqrt5$.'],['Tok hensyn til hele området','Fant kandidater på randen','Viste at grensene oppnås'])])
supplement('3-11',[r'Middelverdisatsen gjelder også i to dimensjoner: $u(x)=(2\pi r)^{-1}\int_{\partial B(x,r)}u\,ds$ for harmonisk u. Parametriser sirkelen slik at radiusfaktoren kansellerer. Deriver gjennomsnittet med hensyn på radius, og bruk Greens fluksteorem for å få null. Grensen ved radius null er sentrumsverdien.'],[
 work(r'Vis middelverdisatsen på sirkler for en harmonisk funksjon av to variable.',[r'Skriv $M(r)=(2\pi)^{-1}\int_0^{2\pi}u(x+r(\cos\theta,\sin\theta))d\theta$.',r'$M\prime(r)=(2\pi r)^{-1}\int_{\partial B}\partial_nu\,ds=(2\pi r)^{-1}\int_B\Delta u\,dA=0$.',r'Kontinuitet gir $M(r)=M(0)=u(x)$.'],['Tok radiusen ut av buelengden','Brukte kjerneregel og Green','Tok grensen i sentrum']),
 num(r'En harmonisk funksjon har verdi 3 i sentrum av en sirkel med radius 2. Integral over sirkelen er $C\pi$. Finn C.',12,[r'Integral = omkrets ganger middelverdi = $4\pi\cdot3=12\pi$.'])])
supplement('4-7',[r'For en Newtonsk inkompressibel væske med konstant viskositet blir momentlikningen Navier–Stokes: $\rho[v_t+(v\cdot\nabla)v]=-\nabla p+\mu\Delta v+\rho g$. Viskositetsleddet kommer fra divergensen av $2\mu D$. I enkel stasjonær kanalstrøm gir balanse mellom trykkgradient og viskositet en parabolsk hastighetsprofil.'],[
 num(r'Plan Poiseuille-strøm har $v(y)=2y(1-y)$ på $[0,1]$. Hva er maksimal fart?',.5,[r'Parabelen har topp ved y=1/2.',r'$v(1/2)=2\cdot1/2\cdot1/2=1/2$.']),
 work(r'Utled $v(y)$ mellom vegger y=0 og y=H for konstant trykkgradient $p_x=-G$, viskositet μ og no-slip.',[r'Fullt utviklet stasjonær strøm gir $0=G+\mu v\prime\prime$.',r'Integrer: $v=-Gy^2/(2\mu)+C_1y+C_2$.',r'$v(0)=v(H)=0$ gir $v=Gy(H-y)/(2\mu)$.'],['Reduserte momentlikningen','Integrerte med riktig fortegn','Brukte begge veggkrav'])])
# En egen leksjon for Laplace gjør det store hefte 2-2 mer håndterlig.
add('2-14','Laplacetransform og forsinkede påtrykk','Løse initialverdiproblemer i s-domenet.',['2-2','1-9'],[
 r'Den ensidige Laplacetransformen integrerer fra 0 til uendelig med en eksponentialvekt. Vekten gjør at også mange voksende signaler kan transformeres. Transformen finnes bare for s-verdier der integralet konvergerer.',
 r'Derivasjon blir multiplikasjon med s, men startverdiene kommer som egne ledd. Dette er grunnen til at Laplace er særlig praktisk for initialverdiproblemer. Etter transformasjon løser vi en algebraisk likning for U(s).',
 r'For å transformere tilbake bruker vi kjente par og delbrøkoppspalting. Gjentatte poler gir potenser av t sammen med eksponentialer. Komplekse polpar gir sinus og cosinus.',
 r'En forsinkelse som aktiveres med enhetsspranget gir faktoren $e^{-as}$. Hele signalet må forskyves: $H(t-a)f(t-a)$. Multiplikasjon med t i tidsdomenet gir minus derivasjon med hensyn på s.',
 r'Konvolusjonsteoremet gjør produkter av transformer til konvolusjoner i tid. For elektriske komponenter med null startenergi gir motstand R impedans R, spole L gir sL, og kondensator C gir 1/(sC). Startenergi krever egne ledd.'
],[r'F(s)=\int_0^\infty f(t)e^{-st}dt',r'\mathcal L(f\prime)=sF-f(0),\quad\mathcal L(f\prime\prime)=s^2F-sf(0)-f\prime(0)',r'\mathcal L(e^{at})=\frac1{s-a},\quad\mathcal L(\sin bt)=\frac b{s^2+b^2}',r'\mathcal L(H(t-a)f(t-a))=e^{-as}F(s),\quad\mathcal L(tf)=-F\prime(s)'],r'Løs $u\prime+2u=1$, $u(0)=3$ med Laplace.',[
 r'$sU-3+2U=1/s$. Dermed $U=(3+1/s)/(s+2)$.',r'Delbrøker gir $U=1/(2s)+5/[2(s+2)]$.',r'$u=1/2+(5/2)e^{-2t}$.'],r'Glemte initialledd i transformen av en derivert gir et annet initialverdiproblem.','response',[
 num(r'$f(t)=1$. Hva er $F(2)$?',.5,[r'$F(s)=1/s$, så $F(2)=1/2$.']),
 mc(r'Hva er $\mathcal L(f\prime)$?',[r'$sF-f(0)$',r'$sF$ alltid',r'$F/s$'],0,r'Integrasjon ved deler gir randleddet $-f(0)$.',2),
 num(r'$F(s)=1/(s-3)$. Hva er eksponenten a i $f(t)=e^{at}$?',3,[r'Standardparet gir a=3.']),
 mc(r'Hva svarer $e^{-2s}F(s)$ til?',[r'$H(t-2)f(t-2)$',r'$f(t+2)$',r'$e^{-2t}f(t)$'],0,r'Tidsforsinkelse må ha både forskyvning og aktivering.',2),
 work(r'Løs $u\prime\prime+u=\delta(t-2)$ med null startverdier.',[r'Transformasjon gir $(s^2+1)U=e^{-2s}$.',r'Uten forsinkelsen er inversen $\sin t$.',r'$u=H(t-2)\sin(t-2)$. Posisjonen er kontinuerlig; farten får sprang 1.'],['Tok med impulsens forsinkelse','Fant inversparet','Tolket aktiveringen']),
 work(r'Utled $\mathcal L(tf)=-F\prime(s)$ når derivasjon under integraltegnet er tillatt.',[r'Deriver $F(s)=\int_0^\infty f(t)e^{-st}dt$ med hensyn på s.',r'Deriverten av vekten er $-te^{-st}$.',r'$F\prime(s)=-\int_0^\infty tf(t)e^{-st}dt$.'],['Anga en forutsetning for byttet','Deriverte riktig variabel','Beholdt minustegnet'])])
new=modules[-1];new.update(source=byid['2-2']['source'],sourceLF=byid['2-2']['sourceLF'],sourceTitle='2-2 · Laplacetransform, videre del')
add('2-15','Varmekjernen på hele linjen','Løse diffusjon med Fouriertransform.',['2-11','2-7'],[
 r'På hele linjen har vi ingen ender som gir diskrete sinusmoder. Fouriertransform i rom gir i stedet en separat tidslikning for hver kontinuerlige frekvens.',
 r'Siden transformen av andre romderivert er $-\omega^2\widehat u$, blir varmelikningen $\widehat u_t=-\alpha\omega^2\widehat u$. Løsningen er eksponentiell demping av hver frekvens. Høye frekvenser dempes raskest.',
 r'Invers transform gir en konvolusjon av startprofilen med en Gauss-kjerne. Kjernen har integral 1, så total masse bevares. Bredden vokser med kvadratroten av tiden.',
 r'For t>0 blir en integrerbar startprofil utjevnet av kjernen. Grensekravet i t=0 forstås punktvis ved kontinuitetspunkter eller i passende norm, avhengig av startdataenes regularitet.'
],[r'K(x,t)=\frac1{\sqrt{4\pi\alpha t}}e^{-x^2/(4\alpha t)},\quad u(x,t)=(K(\cdot,t)*f)(x)',r'\widehat{e^{-ax^2}}(\omega)=\sqrt{\pi/a}\,e^{-\omega^2/(4a)},\quad a>0'],r'Startprofilen er en Gauss-fordeling med varians 2, og α=1. Finn variansen ved t=3.',[
 r'Varmekjernen ved tid t har varians $2\alpha t$.',r'Konvolusjon av disse Gauss-fordelingene legger sammen variansene.',r'Ny varians er $2+2\cdot1\cdot3=8$.'],r'Standardavvik er kvadratroten av variansen; de vokser forskjellig.','heat',[
 num(r'Varmekjernen har α=2 og t=3. Hva er variansen?',12,[r'$2\alpha t=12$.']),
 mc(r'Hva er integralet av varmekjernen for t>0?',['1','t','0'],0,r'Kjernen er normalisert og bevarer total masse.'),
 num(r'Startmassen er 5 på hele linjen og ingen kilder finnes. Hva er totalmassen senere?',5,[r'Konvolusjon med en kjerne med integral 1 bevarer massen.']),
 num(r'Frekvensen dobles. Dempingsraten αω² multipliseres med?',4,[r'Kvadratet av 2 er 4.']),
 work(r'Utled løsningen i Fourierdomenet for varmelikningen.',[r'Transformer romvariabelen: $\widehat u_t=-\alpha\omega^2\widehat u$.',r'For fast ω er dette en førsteordenslikning.',r'$\widehat u(\omega,t)=e^{-\alpha\omega^2t}\widehat f(\omega)$; inversjon gir varmekjernen.'],['Transformerte romderiverten','Brukte initialkravet','Knyttet produkt til konvolusjon'])])
modules[-1].update(source=byid['2-11']['source'],sourceLF=byid['2-11']['sourceLF'],sourceTitle='2-11 · Fourieromvending og varmelikningen')
# Eksamensnære oppgaver: egne tall og løsninger, med eksplisitt sporbarhet.
def examq(mid,q,file,task):
 q['origin']=f'Eksamensvariant · {file.split("-")[0]} · {task}'
 q['examSource']='https://mortano.folk.ntnu.no/eksamen/'+file
 m=byid[mid];q['id']=f'{mid}-q{len(m["questions"])+1}';m['questions'].append(q)
examq('1-7',work(r'Løs $x_1\prime=0$, $x_2\prime=2x_1-2x_2$, $x_3\prime=2x_2-2x_3$ med startverdier (1,0,0).',[r'Første komponent er 1. Andre likning gir $x_2=1-e^{-2t}$.',r'Tredje likning er $x_3\prime+2x_3=2-2e^{-2t}$. Multipliser med $e^{2t}$.',r'$x_3=1-(1+2t)e^{-2t}$.'],['Løste systemet i riktig rekkefølge','Brukte integrerende faktor','Kontrollerte alle startkrav']),'4101-25h-bm.pdf','oppgave 1')
examq('1-13',work(r'Utvikle $e^{-x^2}$ i Taylorrekke og tilnærm integralet over [−1,1] med de tre første leddene.',[r'$e^{-x^2}=\sum_{n=0}^\infty(-1)^nx^{2n}/n!$.',r'Integrasjon gir $2\sum_{n=0}^\infty(-1)^n/[n!(2n+1)]$.',r'Tre ledd gir $2-2/3+1/5=23/15$. Neste ledd har størrelse $1/21$, som begrenser feilen.'],['Substituerte inn i kjent rekke','Brukte jevn symmetri','Ga tilnærming og feilgrense']),'4101-25h-bm.pdf','oppgave 2')
examq('1-10',work(r'Skriv Python som løser $v\prime=3-v^2$, $v(0)=1$ til t=2 med 200 eksplisitte Euler-steg.',[r'Sett h=2/200 og v=1.',r'Gjenta 200 ganger: v = v + h*(3-v*v). Oppdater tiden hvis den lagres.',r'Lagre gjerne løsningen i en liste. Gjenta med 400 steg og sammenlign; løsningen bør nærme seg √3.'],['Brukte eksplisitt oppdatering','Brukte riktig start og antall steg','Beskrev kontroll av resultatet']),'4101-25h-bm.pdf','oppgave 6')
examq('1-3',num(r'En udempet masse på 2 kg har periode π sekunder. Finn fjærstivheten i N/m.',8,[r'$T=2\pi\sqrt{m/k}$ gir $\omega=2$.',r'$k=m\omega^2=2\cdot4=8$.'],level=3),'4101-25h-bm.pdf','oppgave 8')
examq('2-11',work(r'Finn Fouriertransformen til trekantpulsen $f(t)=1-|t|/2$ for |t|≤2 og 0 ellers.',[r'Jevn symmetri gir $\hat f=2\int_0^2(1-t/2)\cos(\omega t)dt$.',r'Delvis integrasjon gir $(1-\cos2\omega)/\omega^2$ for ω≠0.',r'I nullfrekvens er grensen 2, lik arealet.'],['Brukte symmetri','Integrerte produktet','Behandlet nullfrekvensen']),'4106-25v-bm.pdf','oppgave 1')
examq('2-5',work(r'Tilpass planet $z=a+bx+cy$ til (0,0,0), (1,0,2), (0,1,2), (1,1,2).',[r'Designmatrisen har rader (1,0,0),(1,1,0),(1,0,1),(1,1,1).',r'Symmetri gir b=c. Normalbetingelsene er $4a+2b+2c=6$, $2a+2b+c=4$, $2a+b+2c=4$.',r'Løsningen er a=1/2 og b=c=1.'],['Bygde riktig designmatrise','Satte opp normalbetingelsene','Fant alle tre parametre']),'4106-25v-bm.pdf','oppgave 3')
examq('2-11',work(r'En sannsynlighetstetthet f har endelig første absoluttmoment. Vis hvordan forventningen finnes fra $\hat f\prime(0)$.',[r'Deriver transformen under integraltegnet: $\hat f\prime(\omega)=\int(-it)f(t)e^{-i\omega t}dt$.',r'Sett ω=0: $\hat f\prime(0)=-i\int tf(t)dt$.',r'Dermed er forventningen $i\hat f\prime(0)$.'],['Anga integrerbarhet for momentet','Deriverte eksponentialen','Fikk riktig fortegn']),'4106-25v-bm.pdf','oppgave 7')
examq('2-7',work(r'Utled bølgelikningen for en streng med strekkraft T og masse per lengde μ ved små utslag.',[r'Vertikal kraft på et lite stykke er omtrent $T[u_x(x+dx,t)-u_x(x,t)]$.',r'Massen er μdx og akselerasjonen u_tt. Newton gir $\mu dx\,u_{tt}\approx T u_{xx}dx$.',r'Del på dx og ta grensen: $u_{tt}=(T/\mu)u_{xx}$, så $c^2=T/\mu$.'],['Brukte små helninger','Satte opp kraft og masse','Fant bølgefarten']),'4106-25v-bm.pdf','oppgave 6')
examq('3-3',work(r'La $f=4-(x-y)^2$ på kvadratet [0,1]². Finn kritiske punkter, ekstremalverdier, volumet under grafen og fluksen av ∇f ut av kvadratet.',[r'Gradienten er $(-2(x-y),2(x-y))^T$. Alle punkter x=y er maksimumspunkter med verdi 4.',r'Minimum er 3 ved (1,0) og (0,1). $\iint(x-y)^2=1/6$, så volumet er 23/6.',r'$\Delta f=-4$, og arealet er 1, så utadrettet fluks er −4.'],['Klassifiserte hele den kritiske linjen','Undersøkte randen','Regnet volum og fluks']),'4111-25h-bm.pdf','oppgave 1')
examq('3-12',work(r'Finn massesenteret til en homogen halvkuleflate med radius R over xy-planet.',[r'Symmetri gir første og andre komponent 0.',r'Arealet er $2\pi R^2$. Momentet i z-retning er $\int_0^{2\pi}\int_0^{\pi/2}R\cos\varphi\,R^2\sin\varphi d\varphi d\theta=\pi R^3$.',r'Massesenteret er $(0,0,R/2)$.'],['Skilte flate fra volum','Brukte riktig arealelement','Delte moment på total masse']),'4111-25h-bm.pdf','oppgave 2')
examq('3-10',work(r'Kan $u(x,y)=2-x^2-3y^2$ være realdelen av en holomorf funksjon på et åpent område?', [r'Realdelen av en holomorf funksjon er harmonisk.',r'$\Delta u=-2-6=-8$.',r'Derfor finnes ingen slik holomorf funksjon på et åpent område.'],['Knyttet holomorfi til harmonisitet','Fant Laplaceoperatoren','Konkluderte på et åpent område']),'4111-25h-bm.pdf','oppgave 1e')
examq('3-4',work(r'La $F(x)=(a\cdot x)v$ i planet med ikke-null konstante vektorer. Når er feltet konservativt?', [r'Jacobianen er $va^T$. Feltet er glatt på hele planet.',r'Kryssderivertbetingelsen er $v_1a_2=v_2a_1$, altså at a og v er parallelle.',r'Når v=ka er et potensial $\phi=k(a\cdot x)^2/2$.'],['Regnet kryssderiverte','Brukte at området er hele planet','Fant potensial i tilstrekkelig retning']),'4111-25h-bm.pdf','oppgave 5')
examq('4-1',work(r'Et tetraeder har hjørner (0,0,0),(1,0,0),(0,1,0),(0,0,3). Tettheten er 3−z. Finn massen.',[r'Ved fast z har snittet areal $(1-z/3)^2/2$.',r'Massen er $\frac12\int_0^3(3-z)(1-z/3)^2dz$.',r'Sett w=1−z/3. Resultatet blir $(9/2)\int_0^1w^3dw=9/8$.'],['Fant riktig snitt','Tok med tettheten','Integrerte over riktig høyde']),'4121-26v-bm.pdf','oppgave 1')
examq('4-4',work(r'La S være grafen z=2+x²−y² over enhetsskiven. Finn positiv sirkulasjon av F=(−y,x,3z) rundt randen med oppadrettet flatenormal.',[r'Rotasjonen er (0,0,2).',r'Grafens oppadrettede arealvektor er (−2x,2y,1)dxdy.',r'Prikkproduktet er 2, så sirkulasjonen er 2π.'],['Brukte Stokes','Valgte normal etter oppgaven','Regnet integral over grunnflaten']),'4121-26v-bm.pdf','oppgave 2a')
examq('4-10',work(r'Skriv en matrise som roterer vinkelen π/2 om aksen (1,1,1).',[r'Normaliser aksen: $a=(1,1,1)^T/\sqrt3$.',r'$S=\frac1{\sqrt3}\begin{pmatrix}0&-1&1\\1&0&-1\\-1&1&0\end{pmatrix}$.',r'Rodrigues gir $R=I+S+S^2=aa^T+S$. Dette er en fullstendig matriseform; kontroller Ra=a og RᵀR=I.'],['Normaliserte aksen','Skrev kryssproduktmatrisen','Brukte riktig vinkel i Rodrigues']),'4121-26v-bm.pdf','oppgave 3')
examq('4-3',work(r'Utled $\int_\Omega\partial_k u\,dz=\int_{\partial\Omega}u n_k\,dS$.',[r'Velg vektorfeltet F=u e_k med konstant basisvektor e_k.',r'Divergensen er $\partial_k u$, og normalbidraget er $u n_k$.',r'Bruk divergensteoremet på F.'],['Valgte et passende vektorfelt','Regnet divergens og normalbidrag','Brukte teoremet med nødvendige glatthetskrav']),'4121-26v-bm.pdf','oppgave 9')
# Tallvarianter gir flere forsøk uten at vi teller dem som nye oppgavetyper.
variants={
'1-1':lambda a:(fr'$u\prime=-{a}u$, $u(0)=2$. Finn $u\prime(0)$.',-2*a,fr'Likningen gir direkte $u\prime(0)=-{a}\cdot2={-2*a}$.'),
'1-2':lambda a:(fr'Finn modulus til ${3*a}+{4*a}i$.',5*a,fr'$\sqrt{{({3*a})^2+({4*a})^2}}={5*a}$.'),
'1-3':lambda a:(fr'$u\prime\prime+{a*a}u=0$. Finn vinkelfrekvensen.',a,fr'$\omega^2={a*a}$, så $\omega={a}$.'),
'1-4':lambda a:(fr'Finn den deriverte av $x^{{{a}}}$ ved $x=1$.',a,fr'$f\prime(x)={a}x^{{{a-1}}}$, så svaret er {a}.'),
'1-5':lambda a:(fr'En matrise har {a+4} kolonner og rang {a}. Finn nulliteten.',4,fr'Rang-nullitet gir ${a+4}-{a}=4$.'),
'1-6':lambda a:(fr'$A=\operatorname{{diag}}({a},2)$, $x=(3,1)^T$. Finn første komponent av Ax.',3*a,fr'Første rad gir ${a}\cdot3={3*a}$.'),
'1-7':lambda a:(fr'$A=\begin{{pmatrix}}{a}&1\\1&{a}\end{{pmatrix}}$. Finn egenverdien til (1,1).',a+1,fr'Produktet er $({a+1},{a+1})^T$.'),
'1-8':lambda a:(fr'Finn determinanten til $\begin{{pmatrix}}{a}&1\\2&3\end{{pmatrix}}$.',3*a-2,fr'Determinanten er ${a}\cdot3-2={3*a-2}$.'),
'1-9':lambda a:(fr'Finn $\int_0^1{a}x^2dx$.',a/3,fr'Antiderivert er ${a}x^3/3$, så verdien er ${a}/3$.'),
'1-10':lambda a:(fr'Euler: u′=−{a}u, u₀=1, h=0.1. Finn u₁.',1-a*.1,fr'$u_1=1-0.1\cdot{a}={1-a*.1:.1f}$.'),
'1-11':lambda a:(fr'Ett Newton-steg for $x^2-{a*a}=0$ fra x₀=1. Finn x₁.',(1+a*a)/2,fr'$x_1=1-(1-{a*a})/2={(1+a*a)/2}$.'),
'1-12':lambda a:(fr'Finn summen $\sum_{{n=0}}^\infty {a}(1/2)^n$.',2*a,fr'Geometrisk sum er ${a}/(1-1/2)={2*a}$.'),
'1-13':lambda a:(fr'Hva er koeffisienten foran x² i Taylorrekken til $e^{{{a}x}}$ rundt 0?',a*a/2,fr'Andregradsleddet er $({a}x)^2/2!$.'),
'2-1':lambda a:(fr'$N^2=0$. Hva er koeffisienten foran N i $e^{{{a}N}}$?',a,fr'Alle ledd fra andre potens forsvinner: $I+{a}N$.'),
'2-2':lambda a:(fr'u′+{a}u={2*a}, u(0)=0. Finn sluttverdien.',2,fr'Likevekt gir ${a}u={2*a}$, så u=2.'),
'2-3':lambda a:(fr'For $f(t)={a}+2\cos t$, finn c₀.',a,fr'Middelverdien er konstantleddet {a}.'),
'2-4':lambda a:(fr'Projiser ({a},2) på (1,1). Finn koeffisienten k i projeksjonen k(1,1).',(a+2)/2,fr'Koeffisienten er $({a}+2)/(1+1)={(a+2)/2}$.'),
'2-5':lambda a:(fr'Tilpass en konstant til {a}, {a+2}, {a+4}. Hva blir den?',a+2,fr'Middelverdien er {a+2}.'),
'2-6':lambda a:(fr'AᵀA har egenverdier {a*a} og 1. Finn største singulærverdi.',a,fr'Ta positiv kvadratrot av {a*a}.'),
'2-7':lambda a:(fr'For $X(x)=\sin({a}x)$ er X″=−kX. Finn k.',a*a,fr'To derivasjoner gir faktoren −{a*a}.'),
'2-8':lambda a:(fr'Startprofilen er ${a}\sin x+2\sin2x$. Finn første sinuskoeffisient.',a,fr'Første koeffisient leses direkte av ortogonal utvikling: {a}.'),
'2-9':lambda a:(fr'Finn normkvadratet til konstantfunksjonen {a} på [0,1].',a*a,fr'Integral av konstanten {a*a} over lengde 1 gir {a*a}.'),
'2-10':lambda a:(fr'Finn normkvadratet til den komplekse vektoren ({a},i).',a*a+1,fr'$|{a}|^2+|i|^2={a*a+1}$.'),
'2-11':lambda a:(fr'En puls er 1 på [−{a},{a}] og 0 ellers. Finn transformen ved nullfrekvens.',2*a,fr'Det er arealet av pulsen, {2*a}.'),
'2-12':lambda a:(fr'Finn Eₙ/E₁ for n={a} i en uendelig brønn.',a*a,fr'Energien vokser med kvadratet av modenummeret.'),
'2-13':lambda a:(fr'Finn $\int_0^1 x^{{{a}}}dx$.',1/(a+1),fr'Antiderivert gir $1/{a+1}$.'),
'2-14':lambda a:(fr'$F(s)=1/(s+{a})$. Finn f(0) etter invers Laplacetransform.',1,fr'$f(t)=e^{{-{a}t}}$, så f(0)=1.'),
'2-15':lambda a:(fr'Varmekjernen har α=1 og t={a}. Finn variansen.',2*a,fr'Variansen er 2αt={2*a}.'),
'3-1':lambda a:(fr'En sirkel har radius {a}. Finn krumningen.',1/a,fr'Krumning er $1/R=1/{a}$.'),
'3-2':lambda a:(fr'$f=x^2+{a}y^2$. Finn fᵧ i (1,2).',4*a,fr'$f_y={2*a}y$, som ved y=2 gir {4*a}.'),
'3-3':lambda a:(fr'Minimer x²+y² under x+y={2*a}. Finn minste verdi.',2*a*a,fr'Minimum oppnås ved x=y={a}, som gir {2*a*a}.'),
'3-4':lambda a:(fr'F=∇(xy). Finn arbeid fra (0,0) til ({a},2).',2*a,fr'Potensialforskjellen er {2*a}.'),
'3-5':lambda a:(fr'En tråd har lengde {a} og konstant tetthet 3. Finn massen.',3*a,fr'Integralet av tettheten er 3 ganger lengden.'),
'3-6':lambda a:(fr'Finn integralet av 2 over rektangelet [0,{a}]×[0,3].',6*a,fr'Konstant integrand ganger areal: 2·{a}·3={6*a}.'),
'3-7':lambda a:(fr'x={a}u, y=2v. Finn arealskaleringsfaktoren.',2*a,fr'Absoluttverdien av determinanten er {2*a}.'),
'3-8':lambda a:(fr'Qₓ−Pᵧ={a} på et område med areal 2. Finn positiv sirkulasjon.',2*a,fr'Greens teorem gir {a} ganger arealet 2.'),
'3-9':lambda a:(fr'F=({a}x,2y). Finn divergensen.',a+2,fr'Summen av de to relevante partiellderiverte er {a}+2.'),
'3-10':lambda a:(fr'For f(z)=z², finn realdelen av f′({a}+i).',2*a,fr'$f\prime(z)=2z$, som har realdel {2*a}.'),
'3-11':lambda a:(fr'Finn $\Delta({a}x^2-{a}y^2)$.',0,fr'De to andrederiverte er {2*a} og −{2*a}.'),
'3-12':lambda a:(fr'F=(0,0,{a}) gjennom en horisontal flate med areal 2 og oppadrettet normal. Finn fluksen.',2*a,fr'Normalbidrag {a} ganger areal 2.'),
'4-1':lambda a:(fr'En kube har side {a} og tetthet 2. Finn massen.',2*a**3,fr'Massen er 2 ganger volumet {a}³.'),
'4-2':lambda a:(fr'Finn $\Delta({a}x^2+y^2+z^2)$.',2*a+4,fr'Summen er {2*a}+2+2={2*a+4}.'),
'4-3':lambda a:(fr'u=|x|² på en kule med radius {a}. Finn utadrettet normalderivert.',2*a,fr'Gradienten er 2x, og enhetsnormalen er x/{a}.'),
'4-4':lambda a:(fr'v=ω×r med ω=(0,0,{a}). Finn z-komponenten av rotasjonen.',2*a,fr'Rotasjonen av stiv rotasjon er 2ω.'),
'4-5':lambda a:(fr'Ladning {2*a} er omsluttet av en lukket flate. Sett ε₀=2. Finn elektrisk fluks.',a,fr'Gauss gir Q/ε₀={a}.'),
'4-6':lambda a:(fr'En harmonisk funksjon er konstant {a} på randen av en begrenset region. Finn verdien i sentrum.',a,fr'Entydighet gir den konstante løsningen {a}.'),
'4-7':lambda a:(fr'Et stasjonært 1D-felt er v(x)={a}x. Finn akselerasjonen ved x=1.',a*a,fr'Materiell akselerasjon er vvₓ={a*a}x.'),
'4-8':lambda a:(fr'Innstrømning er {a+3}, utstrømning {a}. Ingen kilder. Finn endringsfarten.',3,fr'Inn minus ut er {a+3}−{a}=3.'),
'4-9':lambda a:(fr'En bølge har fart {a} og beveger seg i 3 tidsenheter. Hvor langt flytter fronten seg?',3*a,fr'Avstand er fart ganger tid: {3*a}.'),
'4-10':lambda a:(fr'Hvor mange rene rotasjonssymmetrier har et regulært {a+3}-kant?',a+3,fr'En rotasjon for hver av de {a+3} hjørneposisjonene.'),
'4-11':lambda a:(fr'Sett c=1. Hendelsen er (t,x)=({a+1},{a}). Finn t²−x².',2*a+1,fr'Kvadratdifferansen er {(a+1)**2}−{a*a}={2*a+1}.'),
'4-12':lambda a:(fr'Finn residyet til ${a}e^z/z$ i origo.',a,fr'Konstantleddet i eᶻ er 1, så 1/z-koeffisienten er {a}.')}
for m in modules:
 if m['id'] in variants:
  for a in [2,4,6]:
   prompt,answer,why=variants[m['id']](a);q=num(prompt,answer,[why]);q.update(id=f'{m["id"]}-q{len(m["questions"])+1}',origin='Tallvariant · samme oppgavetype',variant=True);m['questions'].append(q)
# Oppdater kildeinformasjon og stabile oppgaveidentiteter.
for m in modules:
 if not m.get('sourceLF') and (ROOT/'research'/f'{m["id"]}-lf.txt').exists():m['sourceLF']=m['source'].replace('.pdf','-lf.pdf')
 for q in m['questions']:
  if q['type']=='number':q['tolerance']=1e-6*max(1,abs(q['answer']))
  if 'origin' not in q:q['origin']='Egen øvingsoppgave · samme ferdighet som pensumheftet'
  if q['type']=='mc' and m['id'] in ['2-14','2-15']:
   shift=sum(map(ord,q['id']))%len(q['options']);q['options']=q['options'][shift:]+q['options'][:shift];q['answer']=(q['answer']-shift)%len(q['options'])
DATA['modules']=sorted(modules,key=lambda m:(m['course'],int(m['id'].split('-')[1])))
for i,files in enumerate([['4101-25h','4101-24h'],['4106-25v','4106-25k'],['4111-25h','4111-25k'],['4121-26v','4121-25v']],1):
 for f in files:
  year='20'+f.split('-')[1][:2];season={'h':'Høst','v':'Vår','k':'Kontinuasjon'}[f[-1]]
  DATA['exams'].append(dict(course=i,title=f'{codes[i-1]} · {season} {year}',url=f'https://mortano.folk.ntnu.no/eksamen/{f}-bm.pdf',solution=f'https://mortano.folk.ntnu.no/eksamen/{f}-lf.pdf',note='Originalt sett og publisert LF. Enkelte forsider har gamle datoer eller feil fagnavn; bruk oppgaveinnholdet og kursnettsidens opplysninger.'))
DATA['globalQuestionIds']=[q['id'] for m in DATA['modules'] for q in m['questions']]
DATA['notes'][3]='Alle 50 faghefter har egne temaleksjoner, supplert med to ekstra leksjoner. Innholdet er kontrollert mot utvalgte nyere eksamener. Enkelte originaloppgaver går dypere enn øvingsbanken; full oppgave-for-oppgave-dekning er ikke sertifisert.'
write_data()
print(len(DATA['modules']),'leksjoner;',sum(len(m['questions']) for m in modules),'oppgaver;',sum(bool(q.get('variant')) for m in modules for q in m['questions']),'tallvarianter;',sum(bool(q.get('examSource')) for m in modules for q in m['questions']),'eksamensvarianter')
