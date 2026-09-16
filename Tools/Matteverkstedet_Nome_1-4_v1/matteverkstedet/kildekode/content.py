import json,pathlib
ROOT=pathlib.Path(__file__).resolve().parent
modules=[]
def mc(prompt,options,answer,why,level=1,skill='begrep'):
 return dict(type='mc',prompt=prompt,options=options,answer=answer,solution=[why],hints=[why.split('.')[0]+'.'],level=level,skill=skill)
def num(prompt,answer,steps,hints=None,level=2):
 return dict(type='number',prompt=prompt,answer=answer,solution=steps,hints=hints or ['Skriv opp sammenhengen fra teorien før du setter inn tall.'],level=level,skill='regning')
def work(prompt,steps,checks,level=3):
 return dict(type='work',prompt=prompt,solution=steps,rubric=checks,hints=[steps[0]],level=level,skill='anvendelse')
def add(id,title,goal,prereq,theory,formulas,example,steps,pitfall,lab,questions,extra=''):
 c=int(id[0]);m=dict(id=id,course=c,title=title,goal=goal,prereq=prereq,theory=theory,formulas=formulas,example=example,steps=steps,pitfall=pitfall,lab=lab,questions=questions,extra=extra)
 for i,q in enumerate(questions):q['id']=f'{id}-q{i+1}'
 modules.append(m)
add('1-1','Vekst, avkjøling og førsteordenslikninger','Sette opp en modell, løse den og bruke initialkravet.',['Derivasjon','Eksponentialfunksjonen'],[
 r'En differensiallikning beskriver endringsfarten. I modellen $u\prime=ku$ er veksten proporsjonal med mengden som allerede finnes. Positiv $k$ gir vekst; negativ $k$ gir nedbrytning. Initialkravet velger én kurve blant alle løsningene.',
 r'For en separabel likning $u\prime=f(t)g(u)$ samler vi $u$ på én side og $t$ på den andre, og integrerer. Før vi deler på $g(u)$ sjekker vi om $g(u)=0$ gir konstante løsninger. Ellers kan vi miste dem.',
 r'En lineær førsteordenslikning $u\prime+a(t)u=b(t)$ løses med integrerende faktor. Faktoren gjør venstresiden til den deriverte av et produkt. Ved avkjøling er det temperaturforskjellen fra omgivelsene som avtar, ikke nødvendigvis temperaturen selv.',
 r'Kontroller svaret ved innsetting i både likningen og initialkravet. En modell må også ha fornuftige enheter: når tiden måles i sekunder, har $k$ enhet per sekund.'
],[r'u(t)=u_0e^{kt}',r'\mu(t)=e^{\int a(t)\,dt},\qquad (\mu u)\prime=\mu b',r'T(t)=T_a+(T_0-T_a)e^{-kt}'],r'Løs $u\prime+2u=6$, $u(0)=1$.',[
 r'Likevekten er $u=3$. Sett $v=u-3$, slik at $v\prime=-2v$.',r'Da er $v=Ce^{-2t}$ og $u=3+Ce^{-2t}$.',r'Initialkravet gir $1=3+C$, altså $u=3-2e^{-2t}$. Dette nærmer seg 3 nedenfra.'
],r'Å dele på $u$ kan fjerne likevektsløsningen $u=0$.','growth',[
 mc(r'Hva forteller $u\prime=-3u$ når $u>0$?',['Mengden avtar med en fart proporsjonal med mengden','Mengden avtar med konstant fart 3','Mengden blir negativ med én gang'],0,r'Endringsfarten er negativ og størrelsen er $3u$.'),
 num(r'$u\prime=2u$ og $u(0)=3$. Hva er konstanten $C$ i $u=Ce^{2t}$?',3,[r'Sett $t=0$: $u(0)=C=3$.']),
 mc(r'Hvilken er integrerende faktor for $u\prime+4u=t$?',[r'$e^{4t}$',r'$4t$',r'$e^{-4t}$'],0,r'Vi bruker $e^{\int4dt}=e^{4t}$.',2),
 num(r'$T_a=20$, $T_0=80$. Temperaturforskjellen halveres. Hva er temperaturen da?',50,[r'Opprinnelig forskjell er 60. Halvparten er 30.',r'$T=20+30=50$.']),
 work(r'Løs $u\prime=u(1-u)$ med $u(0)=1/2$. Ta også med likevektene.',[r'Sjekk først $u=0$ og $u=1$. Begge er likevekter.',r'For øvrige løsninger: $du/[u(1-u)]=dt$. Integrasjon gir $\ln|u/(1-u)|=t+C$.',r'Initialkravet gir $u(t)=1/(1+e^{-t})$.'],['Fant begge likevektene','Gjennomførte separasjon og integrasjon','Brukte initialkravet og kontrollerte svaret'])])
add('1-2','Komplekse tall og svingninger','Regne med komplekse tall og knytte dem til rotasjon.',['Trigonometri','Potenser'],[
 r'Et komplekst tall $z=a+ib$ er et punkt i planet. Realdelen er $a$, imaginærdelen er $b$, og $i^2=-1$. Konjugering speiler punktet om realaksen. Produktet $z\bar z$ er reelt og gir kvadratet av lengden.',
 r'Polarformen $z=re^{i\theta}$ skiller lengde og vinkel. Ved multiplikasjon multipliseres lengdene og vinklene legges sammen. Derfor er multiplikasjon med $i$ en rotasjon på 90 grader.',
 r'For å løse $z^n=w$ skriver vi $w=Re^{i\phi}$. De $n$ røttene har lengde $R^{1/n}$ og jevnt fordelte vinkler. Husk alle røttene, ikke bare den første.',
 r'Eulers formel binder eksponentialfunksjonen til sinus og cosinus. Dette gjør komplekse eksponentialer nyttige når vi løser reelle svingelikninger.'
],[r'e^{i\theta}=\cos\theta+i\sin\theta',r'|z|=\sqrt{a^2+b^2},\quad \frac1z=\frac{\bar z}{|z|^2}',r'z_k=R^{1/n}e^{i(\phi+2\pi k)/n},\quad k=0,\ldots,n-1'],r'Finn $(1+i)^4$.',[
 r'Lengden av $1+i$ er $\sqrt2$ og vinkelen er $\pi/4$.',r'Fjerde potens får lengde $(\sqrt2)^4=4$ og vinkel $\pi$.',r'Dermed er svaret $4e^{i\pi}=-4$.'
],r'Argumentet må plasseres i riktig kvadrant; $\arctan(b/a)$ alene er ikke nok.','complex',[
 num(r'Hva er $|3+4i|$?',5,[r'$|z|=\sqrt{3^2+4^2}=5$.']),mc(r'Hva gjør multiplikasjon med $i$?',['Roterer 90° mot klokken','Speiler om realaksen','Dobler lengden'],0,r'$i=e^{i\pi/2}$ legger $\pi/2$ til vinkelen.'),
 num(r'Hva er realdelen av $(2+i)(3-i)$?',7,[r'Utvid: $6-2i+3i-i^2=7+i$.']),mc(r'Hvor mange forskjellige komplekse løsninger har $z^4=16$?',['4','2','1'],0,r'Røttene er $2,-2,2i,-2i$.',2),
 work(r'Finn alle løsningene av $z^3=-8$ og tegn dem.',[r'Skriv $-8=8e^{i(\pi+2k\pi)}$.',r'Røttene er $2e^{i\pi/3}$, $2e^{i\pi}$ og $2e^{i5\pi/3}$.',r'I kartesisk form: $1+i\sqrt3$, $-2$, $1-i\sqrt3$.'],['Brukte modulus 2','Fant tre ulike vinkler','Kontrollerte ved tredje potens'])])
add('1-3','Andreordenslikninger og demping','Skille dempingstilfellene og bestemme løsningen.',['1-1','1-2'],[
 r'For $mu\prime\prime+cu\prime+ku=0$ prøver vi $e^{rt}$. Da blir differensiallikningen til andregradslikningen $mr^2+cr+k=0$. Vi trenger to uavhengige løsninger fordi vi har to initialkrav.',
 r'To ulike reelle røtter gir to eksponentialledd. En dobbeltrot krever $te^{rt}$ som andre løsning. Komplekse røtter $\alpha\pm i\beta$ gir en reell kombinasjon av sinus og cosinus med konvolutt $e^{\alpha t}$.',
 r'Når $m,k>0$ og $c>0$, bestemmer diskriminanten om systemet er overkritisk, kritisk eller underkritisk dempet. Underkritisk demping svinger, mens kritisk og overkritisk demping ikke har sinusledd.',
 r'Bestem konstantene fra både posisjon og fart ved start. Deriver hele produktet når løsningen inneholder en eksponentialfaktor.'
],[r'r=\frac{-c\pm\sqrt{c^2-4mk}}{2m}',r'u=e^{\alpha t}(C\cos\beta t+D\sin\beta t)',r'u=(C+Dt)e^{rt}\quad\text{ved dobbeltrot}'],r'Løs $u\prime\prime+2u\prime+5u=0$, $u(0)=1$, $u\prime(0)=0$.',[
 r'Karakteristisk likning har røttene $-1\pm2i$.',r'$u=e^{-t}(C\cos2t+D\sin2t)$. Første krav gir $C=1$.',r'$u\prime(0)=-C+2D=0$ gir $D=1/2$.'],r'En dobbeltrot gir ikke to uavhengige kopier av $e^{rt}$.','oscillator',[
 mc(r'Hvilken løsning trengs i tillegg til $e^{-t}$ ved dobbeltrot $r=-1$?',[r'$te^{-t}$',r'$2e^{-t}$',r'$e^t$'],0,r'$te^{-t}$ er lineært uavhengig av $e^{-t}$.',2),
 num(r'$m=1$, $k=9$. Hva er kritisk demping $c>0$?',6,[r'Kritisk demping: $c^2=4mk=36$, så $c=6$.']),
 mc(r'Røttene er $-2\pm3i$. Hva er vinkelfrekvensen?',['3','2','6'],0,r'Imaginærdelen gir frekvensen i sinus- og cosinusleddene.'),
 num(r'$u\prime\prime+4u=0$, $u(0)=0$, $u\prime(0)=6$. Finn $D$ i $u=D\sin2t$.',3,[r'$u\prime(0)=2D=6$, altså $D=3$.']),
 work(r'Løs $u\prime\prime+4u\prime+4u=0$, $u(0)=2$, $u\prime(0)=-1$.',[r'Dobbeltroten er $-2$, så $u=(C+Dt)e^{-2t}$.',r'$C=2$ og $D-2C=-1$ gir $D=3$.',r'$u=(2+3t)e^{-2t}$.'],['Fant dobbeltroten','Brukte produktregelen','Fant begge konstantene'])])
add('1-4','Funksjoner, grenser og derivasjon','Forstå definisjonsmengde, invers og lokal endring.',['Algebra'],[
 r'En funksjon må gi nøyaktig én verdi for hvert element i definisjonsmengden. Injektiv betyr at ulike input gir ulike output. Surjektiv betyr at hele den oppgitte kodomenen treffes. Bijektiv betyr begge deler og gir en invers.',
 r'En grenseverdi beskriver hva funksjonen nærmer seg når input nærmer seg et punkt. Kontinuitet krever at denne grensen er lik funksjonsverdien. Deriverbarhet er sterkere: grafen må ha en veldefinert lokal stigning.',
 r'Den deriverte er grensen av sekantstigningen. Kjerneregelen brukes når funksjoner settes sammen. Den lineære tilnærmingen beskriver funksjonen nær ett valgt punkt; den er ikke en global erstatning.',
 r'For å bevise en påstand om alle input holder det ikke å sjekke noen tall. Et moteksempel er derimot nok til å avkrefte en slik påstand.'
],[r'f\prime(a)=\lim_{h\to0}\frac{f(a+h)-f(a)}h',r'f(a+h)\approx f(a)+f\prime(a)h',r'(f\circ g)\prime(x)=f\prime(g(x))g\prime(x)'],r'Finn lineær tilnærming til $\sqrt{x}$ rundt $x=4$.',[
 r'$f(4)=2$ og $f\prime(x)=1/(2\sqrt{x})$, så $f\prime(4)=1/4$.',r'$L(x)=2+(x-4)/4$.',r'Dermed er $\sqrt{4.04}\approx2.01$.'],r'$x^2$ har invers på $[0,\infty)$, men ikke som funksjon fra hele $\mathbb R$ til $[0,\infty)$.','derivative',[
 mc(r'Hvilken egenskap gir en invers funksjon?',['Bijektiv','Bare kontinuerlig','Bare surjektiv'],0,r'Både entydighet bakover og at alle verdier treffes kreves.'),
 num(r'Finn $f\prime(2)$ for $f(x)=x^3$.',12,[r'$f\prime(x)=3x^2$, så $f\prime(2)=12$.']),
 mc(r'Er $|x|$ deriverbar i 0?',['Nei, venstre og høyre stigning er ulike','Ja, fordi den er kontinuerlig','Ja, den deriverte er 0'],0,r'Venstresiden gir $-1$, høyresiden gir $1$.'),
 num(r'Finn $f\prime(0)$ for $f(x)=e^{3x}$.',3,[r'Kjerneregelen gir $f\prime(x)=3e^{3x}$.']),
 work(r'Vis at $f(x)=x^2$ ikke er injektiv på $\mathbb R$, og forklar hvordan vi kan få en invers.',[r'$f(1)=f(-1)=1$, mens $1\ne-1$.',r'Begrens domenet til $[0,\infty)$ og kodomenet til $[0,\infty)$.',r'Da er inversen $f^{-1}(y)=\sqrt y$.'],['Ga et moteksempel','Oppga både domene og kodomene','Kontrollerte sammensetningen'])])
add('1-5','Gausseliminasjon og løsningsrom','Løse lineære systemer og forstå frie variable.',['Algebra'],[
 r'Likningssystemet $Ax=b$ samler mange lineære likninger. Gausseliminasjon bruker radbytte, skalering med et ikke-null tall og addisjon av et multiplum av en annen rad. Operasjonene bevarer løsningene.',
 r'Et pivot er den første ledende koeffisienten i en ikke-null rad i trappeform. Kolonner uten pivot gir frie variable. En rad som sier $0=1$ betyr at systemet er inkonsistent.',
 r'Et homogent system har alltid nulløsningen. Alle løsningene danner nullrommet. Har $Ax=b$ én bestemt løsning $x_p$, får vi alle ved å legge til nullrommet: $x=x_p+x_h$.',
 r'Lineær uavhengighet betyr at en kombinasjon av vektorene bare kan bli null når alle koeffisientene er null. Dette testes med et homogent system.'
],[r'Ax=b,\qquad x=x_p+x_h,\quad Ax_h=0',r'\dim\ker A=n-\operatorname{rank}A'],r'Løs $x+y+z=2$ og $2x+2y+2z=4$.',[
 r'Andre rad minus to ganger første gir nullraden.',r'Velg $y=s$ og $z=t$ fritt. Da er $x=2-s-t$.',r'Alle løsningene er $(2,0,0)+s(-1,1,0)+t(-1,0,1)$.'],r'En nullrad betyr ikke automatisk ingen løsning. Se på høyresiden.','matrix',[
 mc(r'Hva betyr raden $[0\;0\;0\mid 2]$?',['Ingen løsning','To frie variable','Nulløsningen er eneste løsning'],0,r'Raden krever $0=2$, som er umulig.'),
 num(r'En matrise har 5 kolonner og rang 3. Hva er nulliteten?',2,[r'Rang-nullitet: $5-3=2$.']),
 num(r'Løs $x+y=5$, $x-y=1$. Oppgi $x$.',3,[r'Legg sammen: $2x=6$, så $x=3$.']),
 mc(r'Hva kan et homogent system aldri ha?',['Ingen løsninger','Bare nulløsningen','Uendelig mange løsninger'],0,r'$x=0$ løser alltid $Ax=0$.'),
 work(r'Beskriv alle løsninger av $x+2y-z=3$ og $2x+4y-2z=6$.',[r'Andre likning er dobbelt av den første.',r'Sett $y=s$, $z=t$. Da er $x=3-2s+t$.',r'Løsningen er $(3,0,0)+s(-2,1,0)+t(1,0,1)$.'],['Fant avhengigheten','Valgte to frie variable','Skrev en full parametrisering'])])
add('1-6','Matriser og inverse avbildninger','Forstå matriseprodukt, invers og sammensetning.',['1-5'],[
 r'Kolonnene i en matrise forteller hvor basisvektorene sendes. Produktet $Ax$ er en lineær kombinasjon av disse kolonnene. Dermed kan en matrise leses både som en tabell og som en geometrisk avbildning.',
 r'Produktet $AB$ betyr at $B$ virker først og $A$ etterpå. Rekkefølgen betyr noe. Sjekk dimensjonene før du regner: de indre dimensjonene må stemme.',
 r'En kvadratisk matrise er inverterbar akkurat når hver høyreside gir én løsning. Den inverse kan finnes ved å radredusere $[A\mid I]$ til $[I\mid A^{-1}]$.',
 r'Transponering bytter rader og kolonner. Ved transponering av et produkt snus rekkefølgen. Det samme skjer ved invers av et produkt.'
],[r'(AB)^T=B^TA^T,\qquad(AB)^{-1}=B^{-1}A^{-1}',r'\begin{pmatrix}a&b\\c&d\end{pmatrix}^{-1}=\frac1{ad-bc}\begin{pmatrix}d&-b\\-c&a\end{pmatrix}'],r'Finn inversen til $A=\begin{pmatrix}2&1\\1&1\end{pmatrix}$.',[
 r'Determinanten er $2\cdot1-1\cdot1=1$.',r'Formelen gir $A^{-1}=\begin{pmatrix}1&-1\\-1&2\end{pmatrix}$.',r'Multipliser og kontroller at $AA^{-1}=I$.'],r'Generelt er $AB\ne BA$. Ikke flytt matriser rundt som vanlige tall.','matrix',[
 mc(r'I produktet $ABx$, hvilken matrise virker først på $x$?',['B','A','Begge samtidig'],0,r'$ABx=A(Bx)$.',1),
 num(r'$A=\operatorname{diag}(2,5)$. Hva er første diagonalelement i $A^{-1}$?',.5,[r'Inversen har diagonalelementene $1/2$ og $1/5$.']),
 mc(r'En $3\times2$ matrise multipliseres med en $2\times4$ matrise. Resultatet er?',['3 × 4','2 × 2','4 × 3'],0,r'De indre dimensjonene 2 stemmer; de ytre gir $3\times4$.'),
 num(r'$A=\begin{pmatrix}1&2\\0&3\end{pmatrix}$ og $x=(2,1)^T$. Hva er første komponent i $Ax$?',4,[r'Første rad gir $1\cdot2+2\cdot1=4$.']),
 work(r'Bevis $(AB)^{-1}=B^{-1}A^{-1}$ når begge inversene finnes.',[r'Kontroller produktet med den foreslåtte inversen.',r'$(AB)(B^{-1}A^{-1})=AIA^{-1}=I$.',r'Også $(B^{-1}A^{-1})(AB)=B^{-1}IB=I$.'],['Beholdt rekkefølgen','Brukte assosiativitet','Kontrollerte begge sider'])])
add('1-7','Egenverdier og systemer av differensiallikninger','Løse koblede systemer ved hjelp av egenvektorer.',['1-3','1-6'],[
 r'En egenvektor endrer bare lengde eller fortegn under en lineær avbildning. Den oppfyller $Av=\lambda v$ med $v\ne0$. Egenverdiene finnes ved å kreve at $A-\lambda I$ er singulær.',
 r'For $x\prime=Ax$ gir et egenpar løsningen $e^{\lambda t}v$. Har vi nok uavhengige egenvektorer, summerer vi slike løsninger og bruker initialkravet til å finne koeffisientene.',
 r'Negative reelle deler av alle egenverdiene gir asymptotisk stabilitet for et konstant lineært system. En positiv reell del gir en voksende retning. Null reell del trenger nærmere undersøkelse.',
 r'Et andreordensproblem kan skrives som et førsteordenssystem ved å bruke posisjon og fart som to tilstandsvariable. Dette gjør samme metode nyttig for kretser og mekanikk.'
],[r'\det(A-\lambda I)=0',r'x(t)=\sum_j c_je^{\lambda_jt}v_j'],r'Løs $x\prime=\begin{pmatrix}2&1\\1&2\end{pmatrix}x$, $x(0)=(1,0)^T$.',[
 r'Egenparene er $\lambda=3$, $v=(1,1)^T$ og $\lambda=1$, $v=(1,-1)^T$.',r'$x(0)=\frac12v_1+\frac12v_2$.',r'$x(t)=\frac12e^{3t}(1,1)^T+\frac12e^t(1,-1)^T$.'],r'Egenvektoren må være forskjellig fra null.','phase',[
 num(r'$A=\begin{pmatrix}2&1\\1&2\end{pmatrix}$, $v=(1,1)^T$. Hva er egenverdien?',3,[r'$Av=(3,3)^T=3v$.']),
 mc(r'Alle egenverdier har negativ realdel. Likevekten 0 er da?',['Asymptotisk stabil','Ustabil','Alltid en periodisk bane'],0,r'Alle modene avtar mot null.'),
 num(r'En trekantmatrise har diagonal 2, 4 og 7. Hva er største egenverdi?',7,[r'Egenverdiene til en trekantmatrise er diagonalelementene.']),
 mc(r'Hva gjør vi med $u\prime\prime+3u\prime+2u=0$?',[r'Setter $x_1=u$, $x_2=u\prime$',r'Setter begge tilstandsvariable lik $u$',r'Fjerner andrederiverten'],0,r'Da blir $x_1\prime=x_2$, $x_2\prime=-2x_1-3x_2$.',2),
 work(r'Løs $x\prime=\operatorname{diag}(-1,2)x$, $x(0)=(3,4)^T$. Forklar stabiliteten.',[r'Likningene er dekoblet: $x_1\prime=-x_1$, $x_2\prime=2x_2$.',r'$x_1=3e^{-t}$ og $x_2=4e^{2t}$.',r'Nullikevekten er ustabil fordi andre retning vokser.'],['Løste begge komponentene','Brukte initialkravet','Knyttet vekst til egenverdien'])])
add('1-8','Determinanter, basis og dimensjon','Knytte geometri til rang og uavhengighet.',['1-5','1-6'],[
 r'En basis er et sett lineært uavhengige vektorer som spenner ut rommet. Hver vektor i rommet får da entydige koordinater. Antall basisvektorer er dimensjonen.',
 r'Determinanten gir orientert areal- eller volumskalering for en kvadratisk matrise. Null determinant betyr at avbildningen presser rommet ned til lavere dimensjon.',
 r'Radbytte skifter fortegn på determinanten. Skalering av én rad skalerer den tilsvarende. Å legge et multiplum av en rad til en annen endrer ikke determinanten.',
 r'For å finne basis for kolonnerommet finner vi pivotkolonnene ved eliminasjon, men henter selve basisvektorene fra den opprinnelige matrisen. Radoperasjoner kan endre kolonnerommet.'
],[r'\det\begin{pmatrix}a&b\\c&d\end{pmatrix}=ad-bc',r'\det(AB)=\det(A)\det(B)',r'\operatorname{rank}A+\dim\ker A=n'],r'Er $(1,1)^T$ og $(2,-1)^T$ en basis for $\mathbb R^2$?',[
 r'Sett dem som kolonner: $A=\begin{pmatrix}1&2\\1&-1\end{pmatrix}$.',r'$\det A=-1-2=-3\ne0$.',r'De er uavhengige og utspenner $\mathbb R^2$. Areal skaleres med 3, og orienteringen snus.'],r'Negativ determinant betyr ikke negativt geometrisk areal. Arealskaleringen er absoluttverdien.','matrix',[
 num(r'Finn determinanten til $\begin{pmatrix}3&2\\1&4\end{pmatrix}$.',10,[r'$3\cdot4-2\cdot1=10$.']),
 mc(r'Hva betyr $\det A=0$ geometrisk?',['Noe dimensjon går tapt','Alle vektorer dobles','Kun en rotasjon'],0,r'Matrisen er singulær og har rang mindre enn dimensjonen.'),
 num(r'En $3\times3$ matrise har determinant 5. Første rad dobles. Ny determinant?',10,[r'Skalering av én rad med 2 skalerer determinanten med 2.']),
 mc(r'Hvor henter vi basisvektorene for kolonnerommet etter eliminasjon?',['Fra pivotkolonnene i originalmatrisen','Alltid fra identitetsmatrisen','Fra nullradene'],0,r'Eliminasjon finner kolonneindeksene; originalen inneholder riktige vektorer.',2),
 work(r'Vis at tre vektorer i $\mathbb R^2$ alltid er lineært avhengige.',[r'Sett vektorene som kolonner i en $2\times3$ matrise.',r'Rangen er høyst 2. Nulliteten er derfor minst 1.',r'Det finnes en ikke-null koeffisientvektor som gir nullkombinasjonen.'],['Satte opp riktig matrisestørrelse','Brukte rang-nullitet','Koblet til definisjonen'])])
add('1-9','Integrasjon og analysens fundamentalteorem','Regne integraler og tolke akkumulert endring.',['1-4'],[
 r'Det bestemte integralet summerer fortegnet bidrag over et intervall. Riemannsummer gjør dette med små rektangler. For kontinuerlige funksjoner får vi integralet som grensen når oppdelingen blir finere.',
 r'Analysens fundamentalteorem kobler akkumulering til derivasjon. Har $F\prime=f$, er integralet differansen mellom endeverdiene til $F$. Integralet av fart gir forflytning; integralet av absoluttfarten gir tilbakelagt lengde.',
 r'Substitusjon er kjerneregelen baklengs. Ved bestemt integral må grensene endres når variabelen endres. Delvis integrasjon er produktregelen baklengs og er nyttig ved produkter som polynom ganger eksponential.',
 r'Uegentlige integraler defineres med grenser ved uendelig eller singulariteter. Del intervallet ved indre singulariteter; endelige uttrykk ved formell innsetting er ikke nok.'
],[r'\int_a^b f(x)\,dx=F(b)-F(a)',r'\int u\,v\prime\,dx=uv-\int u\prime v\,dx'],r'Finn $\int_0^1 xe^x\,dx$.',[
 r'Velg $u=x$ og $v\prime=e^x$. Da er $u\prime=1$, $v=e^x$.',r'Integralet blir $[xe^x]_0^1-\int_0^1e^x dx$.',r'Svaret er $e-(e-1)=1$.'],r'Glemte grenser og manglende kjernederivert er vanlige feil.','integral',[
 num(r'Beregn $\int_0^2 3x^2dx$.',8,[r'En antiderivert er $x^3$. Endeverdiene gir $8-0=8$.']),
 mc(r'$v(t)$ er negativ på hele intervallet. Hva gir $\int v(t)dt$?',['Fortegnet forflytning','Alltid positiv lengde','Akselerasjon'],0,r'Tilbakelagt lengde fås ved å integrere $|v|$.'),
 num(r'Beregn $\int_0^1 2x e^{x^2}dx$ uttrykt som $e-C$. Hva er $C$?',1,[r'Sett $u=x^2$, så $du=2x dx$.',r'$\int_0^1e^u du=e-1$.']),
 mc(r'Når konvergerer $\int_1^\infty x^{-p}dx$?',[r'$p>1$',r'$p>0$',r'$p<1$'],0,r'Antideriverten får en endelig grense akkurat når $p>1$.',2),
 work(r'Finn arealet mellom $y=x$ og $y=x^2$ på $[0,1]$.',[r'På intervallet er $x\ge x^2$.',r'Arealet er $\int_0^1(x-x^2)dx$.',r'$1/2-1/3=1/6$.'],['Fant øvre og nedre graf','Satte opp riktig differanse','Regnet integralet'])])
add('1-10','Numeriske metoder og enkel kode','Utføre Euler-steg og forstå feil og stabilitet.',['1-1','1-4'],[
 r'Når en differensiallikning ikke lar seg løse enkelt, kan vi beregne løsningen stegvis. Eksplisitt Euler bruker stigningen i starten av steget. Implisitt Euler bruker stigningen i slutten og krever vanligvis at vi løser en likning.',
 r'Heuns metode bruker først et Euler-forslag og deretter gjennomsnittet av gammel og foreslått stigning. Vi skiller mellom lokal feil i ett steg og global feil etter mange steg.',
 r'Et lite steg gir ofte bedre nøyaktighet, men stabilitet må vurderes separat. For $u\prime=\lambda u$ multipliserer eksplisitt Euler verdien med $1+h\lambda$ i hvert steg. Er absoluttverdien større enn 1, vokser feilene.',
 r'I kode må tiden og løsningen oppdateres i samme løkke. Ta vare på gammel verdi før nye størrelser beregnes, og sammenlign mot en kjent løsning når du tester.'
],[r'u_{n+1}=u_n+hf(t_n,u_n)',r'\widetilde u=u_n+hf(t_n,u_n),\quad u_{n+1}=u_n+\frac h2[f(t_n,u_n)+f(t_n+h,\widetilde u)]',r'|1+h\lambda|<1\quad\text{gir avtagende Euler-moder}'],r'Ett Euler-steg for $u\prime=-2u$, $u_0=1$, $h=0.1$.',[
 r'Stigningen i startpunktet er $-2$.',r'$u_1=1+0.1(-2)=0.8$.',r'Eksakt verdi er $e^{-0.2}\approx0.81873$. Forskjellen er diskretiseringsfeil.'],r'Å halvere steget fjerner ikke automatisk alle feil. Kontroller også modell, startverdi og kode.','euler',[
 num(r'Ett Euler-steg: $u\prime=3u$, $u_0=2$, $h=0.1$. Finn $u_1$.',2.6,[r'$u_1=2+0.1\cdot6=2.6$.']),
 mc(r'Hvilken stigning bruker eksplisitt Euler?',['Stigningen i starten av steget','Den ukjente sluttstigningen','Alltid null'],0,r'Metoden er eksplisitt fordi høyresiden bruker kjente verdier.'),
 num(r'For $u\prime=-4u$ er stabilitetsgrensen $h< H$. Finn $H$.',.5,[r'$|1-4h|<1$ gir $0<h<1/2$.']),
 num(r'Heun: $u\prime=-u$, $u_0=1$, $h=1$. Finn verdien etter ett steg.',.5,[r'Euler-forslaget er 0.',r'Gjennomsnittlig stigning er $(-1+0)/2=-1/2$.',r'Ny verdi er $1-1/2=1/2$.']),
 work(r'Skriv pseudokode for Euler fra $t=0$ til $t=1$ med $h=0.01$ for $u\prime=-u$, $u(0)=1$. Beskriv en test.',[r'Sett $u=1$, $t=0$. Gjenta 100 ganger: $u\leftarrow u-hu$, $t\leftarrow t+h$.',r'Lagre gjerne tid og verdi i hvert steg.',r'Sammenlign sluttverdien med $e^{-1}$. Gjenta med halv steglengde og sammenlign feilen.'],['Riktig start og antall steg','Oppdaterte fra gammel verdi','Testet mot kjent løsning'])])
add('1-11','Newton, fikspunkt og interpolasjon','Velge og kontrollere en iterativ løsningsmetode.',['1-4','1-5'],[
 r'Newtons metode erstatter grafen med tangenten i gjeldende punkt og bruker tangentens nullpunkt som nytt forslag. Den er rask nær en enkel rot, men kan feile ved dårlig start eller liten derivert.',
 r'Fikspunktiterasjon skriver problemet som $x=g(x)$ og gjentar $x_{n+1}=g(x_n)$. En tilstrekkelig lokal betingelse for tiltrekning er $|g\prime|<1$ nær fikspunktet.',
 r'Et interpolasjonspolynom går gjennom oppgitte punkter. Med $n+1$ ulike x-verdier finnes nøyaktig ett polynom av grad høyst $n$. Vi kan finne det med et lineært system eller Lagranges basispolynomer.',
 r'Et godt stoppkriterium bør sjekke både endring mellom iterasjoner og residualen $|f(x)|$. Et lite steg alene kan skyldes dårlig kondisjon eller avrunding.'
],[r'x_{n+1}=x_n-\frac{f(x_n)}{f\prime(x_n)}',r'p(x)=\sum_j y_j\prod_{k\ne j}\frac{x-x_k}{x_j-x_k}'],r'Ett Newton-steg for $x^2-2=0$ fra $x_0=1$.',[
 r'$f(1)=-1$ og $f\prime(1)=2$.',r'$x_1=1-(-1)/2=1.5$.',r'Nytt steg gir omtrent 1.41667. Målet er $\sqrt2$.'],r'Newton er ikke garantert å konvergere fra ethvert startpunkt.','newton',[
 num(r'Ett Newton-steg for $x^2-9=0$ fra $x_0=2$.',3.25,[r'$x_1=2-(4-9)/4=3.25$.']),
 mc(r'Hvilken lokal betingelse gjør et fikspunkt tiltrekkende?',[r'$|g\prime|<1$',r'$|g\prime|>1$',r'$g\prime$ finnes ikke'],0,r'Avstander trekkes sammen når den deriverte har absoluttverdi mindre enn 1.',2),
 num(r'Hva er største nødvendige grad for interpolasjon gjennom 4 ulike x-verdier?',3,[r'$n+1=4$ gir $n=3$.']),
 num(r'Linjen går gjennom $(0,1)$ og $(2,5)$. Hva er stigningstallet?',2,[r'$(5-1)/(2-0)=2$.']),
 work(r'Finn polynomet av grad høyst 2 gjennom $(0,1),(1,2),(2,5)$.',[r'Sett $p(x)=ax^2+bx+c$.',r'$c=1$, $a+b=1$, $4a+2b=4$.',r'Dette gir $a=1$, $b=0$, altså $p=x^2+1$.'],['Satte opp tre krav','Løste systemet','Kontrollerte alle punktene'])])
add('1-12','Følger, rekker og konvergens','Velge konvergenstest og forstå hva summen betyr.',['1-9'],[
 r'En følge er en liste tall. En rekke summerer tallene, og summen defineres som grensen til delsummene. At leddene går mot null er nødvendig for konvergens, men ikke tilstrekkelig.',
 r'Geometriske rekker har fast forhold mellom leddene. Forholdets absoluttverdi må være mindre enn 1 for at den uendelige summen skal finnes. Den harmoniske rekken divergerer selv om leddene går mot null.',
 r'Sammenligning brukes for positive ledd. Forholdstesten er nyttig når fakulteter eller potenser inngår. Gir grensen 1, sier testen ingenting. Alternerende rekker kan konvergere når leddstørrelsene avtar mot null.',
 r'Absolutt konvergens betyr at også summen av absoluttverdiene konvergerer. Betinget konvergens betyr at fortegnene er avgjørende.'
],[r'\sum_{n=0}^{\infty}ar^n=\frac a{1-r},\quad |r|<1',r'L=\lim_{n\to\infty}\left|\frac{a_{n+1}}{a_n}\right|'],r'Finn $\sum_{n=0}^{\infty}3(1/2)^n$.',[
 r'Dette er geometrisk med første ledd 3 og forhold $1/2$.',r'Forholdet har absoluttverdi under 1.',r'Summen er $3/(1-1/2)=6$.'],r'Konklusjonen «leddet går mot null, derfor konvergerer rekken» er feil.','series',[
 num(r'Finn $\sum_{n=0}^{\infty}(1/3)^n$.',1.5,[r'$1/(1-1/3)=3/2$.']),
 mc(r'Hva kan vi konkludere hvis $a_n$ ikke går mot null?',[r'$\sum a_n$ divergerer',r'$\sum a_n$ konvergerer','Ingenting'],0,r'Nullgrense er en nødvendig betingelse.'),
 mc(r'Forholdstesten gir $L=1$. Hva betyr det?',['Testen avgjør ikke saken','Rekken divergerer','Rekken konvergerer'],0,r'Vi må bruke en annen test.',2),
 num(r'For den alternerende harmoniske rekken er feilgrensen etter 4 ledd størrelsen på neste ledd. Hva er den?',.2,[r'Neste ledd har størrelse $1/5=0.2$.']),
 work(r'Forklar hvorfor $\sum1/n$ divergerer ved å gruppere ledd.',[r'Grupper $1/2$, så $1/3+1/4$, så $1/5+\cdots+1/8$, osv.',r'Hver gruppe fra og med disse har sum minst $1/2$.',r'Uendelig mange slike grupper gir ubundne delsummmer.'],['Brukte grupper med doblende lengde','Fant nedre grense','Knyttet dette til divergens'])])
add('1-13','Potensrekker og Taylorpolynomer','Bruke lokale polynomer med kontroll på gyldighet og feil.',['1-4','1-12'],[
 r'En potensrekke er en rekke av potenser rundt et sentrum. Den har en konvergensradius. Innenfor radiusen kan vi derivere og integrere leddvis; endepunktene må undersøkes hver for seg.',
 r'Taylorpolynomet velger koeffisienter slik at funksjon og polynom har samme deriverte i sentrum opp til valgt orden. En glatt funksjon er ikke automatisk lik sin uendelige Taylorrekke overalt.',
 r'Restleddet bestemmer hvor godt tilnærmingen virker. For Lagranges restledd trenger vi en øvre grense for neste derivert på intervallet mellom sentrum og punktet.',
 r'Kjente rekker kan settes sammen og brukes til grenser eller approksimasjon. Ta vare på nok ledd: kansellering kan gjøre at første ikke-null ledd kommer sent.'
],[r'P_n(x)=\sum_{k=0}^n\frac{f^{(k)}(a)}{k!}(x-a)^k',r'|R_n(x)|\le\frac{M|x-a|^{n+1}}{(n+1)!}',r'e^x=\sum_{n=0}^\infty\frac{x^n}{n!},\quad \sin x=x-\frac{x^3}{3!}+\cdots'],r'Tilnærm $e^{0.1}$ med andregradspolynom rundt 0.',[
 r'$P_2(x)=1+x+x^2/2$.',r'$P_2(0.1)=1.105$.',r'På $[0,0.1]$ er tredje derivert høyst $e^{0.1}<1.106$. Feilen er dermed mindre enn $1.106\cdot0.1^3/6<0.000185$.'],r'En konvergensradius avgjør ikke automatisk hva som skjer i endepunktene.','taylor',[
 num(r'Hva er koeffisienten foran $x^2$ i Taylorrekken til $e^x$ rundt 0?',.5,[r'Koeffisienten er $1/2!=1/2$.']),
 num(r'Hva er konvergensradiusen til $\sum_{n=0}^\infty(x/3)^n$?',3,[r'Geometrisk rekke krever $|x/3|<1$, altså $|x|<3$.']),
 mc(r'Hva må vi gjøre med endepunktene etter å ha funnet radiusen?',['Undersøke dem separat','Alltid inkludere dem','Alltid utelate dem'],0,r'Begge endepunkter kan ha ulik oppførsel.'),
 num(r'Finn $\lim_{x\to0}(1-\cos x)/x^2$.',.5,[r'$\cos x=1-x^2/2+O(x^4)$.',r'Etter divisjon blir grensen $1/2$.']),
 work(r'Finn Taylorpolynomet av grad 3 til $\ln(1+x)$ rundt 0 og oppgi konvergensintervallet til rekken.',[r'Deriver eller integrer geometrisk rekke for $1/(1+x)$.',r'$P_3=x-x^2/2+x^3/3$.',r'Radiusen er 1. Ved $x=1$ konvergerer den alternerende harmoniske rekken, mens $x=-1$ divergerer. Intervallet er $(-1,1]$.'],['Fant riktige fortegn og koeffisienter','Fant radius 1','Testet begge endepunktene'])])
add('2-1','Matriseeksponential og Jordanblokker','Løse lineære systemer også når diagonalisering feiler.',['1-7','1-13'],[
 r'Matriseeksponentialen defineres med samme potensrekke som den vanlige eksponentialfunksjonen, men med matriser. Den finnes for alle kvadratiske matriser. Løsningen av $x\prime=Ax$ er $e^{At}x_0$.',
 r'Diagonalisering gjør beregningen enkel fordi eksponentialen av en diagonalmatrise bare eksponensierer diagonalen. Men noen matriser mangler nok egenvektorer. Da kan vi bruke Jordanblokker og generaliserte egenvektorer.',
 r'En Jordanblokk kan skrives $J=\lambda I+N$, der $N$ er nilpotent. Hvis $N^k=0$, stopper rekken for $e^{Nt}$ etter endelig mange ledd. Dette er grunnen til at faktorer som $t e^{\lambda t}$ dukker opp.',
 r'Egenskapen $e^{A+B}=e^Ae^B$ gjelder når $A$ og $B$ kommuterer. Den gjelder ikke for vilkårlige matriser. Kontroller alltid løsningen og startverdien.'
],[r'e^{At}=\sum_{n=0}^{\infty}\frac{t^nA^n}{n!}',r'A=V\Lambda V^{-1}\Rightarrow e^{At}=Ve^{\Lambda t}V^{-1}',r'N^2=0\Rightarrow e^{(\lambda I+N)t}=e^{\lambda t}(I+tN)'],r'Finn $e^{At}$ for $A=\begin{pmatrix}-1&1\\0&-1\end{pmatrix}$.',[
 r'Skriv $A=-I+N$, der $N=\begin{pmatrix}0&1\\0&0\end{pmatrix}$ og $N^2=0$.',r'$-I$ og $N$ kommuterer.',r'$e^{At}=e^{-t}\begin{pmatrix}1&t\\0&1\end{pmatrix}$.'],r'Nilpotent betyr at en potens blir null. Idempotent betyr $P^2=P$; dette er forskjellige egenskaper.','phase',[
 mc(r'Hva er $e^{A\cdot0}$?',['Identitetsmatrisen','Nullmatrisen','A'],0,r'Nullte ledd i rekken er $I$, alle andre ledd forsvinner.'),
 num(r'$N^2=0$. Hva er koeffisienten foran $N$ i $e^{3N}$?',3,[r'$e^{3N}=I+3N$ fordi alle høyere potenser forsvinner.']),
 mc(r'Når kan vi trygt bruke $e^{A+B}=e^Ae^B$?',['Når AB = BA','For alle matriser','Bare når A = B = 0'],0,r'Kommutasjon gjør at binomialargumentet virker.',2),
 num(r'$J=\begin{pmatrix}0&1\\0&0\end{pmatrix}$. Finn elementet i rad 1, kolonne 2 i $e^{2J}$.',2,[r'$J^2=0$, dermed $e^{2J}=I+2J$.']),
 work(r'Løs $x\prime=\begin{pmatrix}-2&1\\0&-2\end{pmatrix}x$, $x(0)=(0,1)^T$.',[r'Bruk $A=-2I+N$ med $N^2=0$.',r'$e^{At}=e^{-2t}\begin{pmatrix}1&t\\0&1\end{pmatrix}$.',r'$x=e^{-2t}(t,1)^T$. Begge komponenter går mot null.'],['Identifiserte nilpotent del','Fant matriseeksponentialen','Multipliserte med startvektoren'])])
add('2-2','Påtrykk, impuls og frekvensrespons','Forstå hvordan et lineært system reagerer på et signal.',['1-3','2-1'],[
 r'Et inhomogent lineært problem har løsning som er summen av en homogen løsning og én partikulærløsning. Initialkravene settes inn i hele løsningen, ikke bare i den homogene delen.',
 r'Impulsresponsen beskriver respons på en idealisert enhetsimpuls med null forhistorie. En deltaimpuls forstås gjennom integraler, ikke som et vanlig tall som bare er uendelig i ett punkt. Generelt påtrykk bygges opp ved konvolusjon med impulsresponsen.',
 r'For harmonisk påtrykk bruker vi en kompleks eksponential og tar realdelen til slutt. Frekvensresponsen forteller både amplitudeforhold og faseforskyvning. Resonans oppstår når en frekvens eksiterer systemet sterkt.',
 r'Ved tidsforskyvning må både funksjonen og tidspunktet for aktivering flyttes. Sprangfunksjonen gjør at en forsinket respons starter på riktig tidspunkt.'
],[r'x(t)=e^{At}x_0+\int_0^t e^{A(t-s)}b(s)\,ds',r'(h*f)(t)=\int_0^t h(t-s)f(s)\,ds',r'H(i\omega)=\frac1{k-m\omega^2+ic\omega}'],r'Finn sprangresponsen til $u\prime+2u=1$, $u(0)=0$.',[
 r'Impulsresponsen for $t\ge0$ er $h(t)=e^{-2t}$.',r'Sprangresponsen er $\int_0^t e^{-2(t-s)}ds$.',r'$u(t)=(1-e^{-2t})/2$, som nærmer seg $1/2$.'],r'Frekvensresponsen gir den harmoniske delen; initialkrav kan i tillegg gi en transient.','response',[
 num(r'Hva er sluttverdien av $u\prime+4u=8$ når transienten dør ut?',2,[r'Likevekten oppfyller $4u=8$.']),
 mc(r'Hva betyr konvolusjonen med impulsresponsen?',['Summen av bidrag fra tidligere påtrykk','Bare produktet av to øyeblikksverdier','Kun startverdien'],0,r'Hvert tidligere signalbidrag gir en tidsforskjøvet respons.'),
 num(r'$H(i\omega)=1/(2+i\omega)$. Finn $|H(0)|$.',.5,[r'$H(0)=1/2$.']),
 mc(r'En enhetsimpuls har hvilket integral over et intervall som inneholder impulsen?',['1','0','Uendelig'],0,r'Deltafordelingen har total vekt 1.'),
 work(r'Løs $u\prime\prime+u=\cos t$ med null startposisjon og startfart.',[r'Påtrykket har samme frekvens som den homogene løsningen. Prøv $u_p=at\sin t$.',r'Innsetting gir $u_p\prime\prime+u_p=2a\cos t$, så $a=1/2$.',r'$u=(t/2)\sin t$ tilfredsstiller begge startkrav. Amplituden vokser ved udempet resonans.'],['Oppdaget resonans','Fant riktig partikulærløsning','Kontrollerte startkrav'])])
add('2-3','Fourierrekker og periodiske signaler','Finne frekvensinnhold med ortogonalitet og symmetri.',['1-2','1-9','1-12'],[
 r'En Fourierrekke beskriver et periodisk signal som en sum av harmoniske svingninger. Grunnfrekvensen bestemmes av perioden, og de øvrige frekvensene er heltallsmultipler av denne.',
 r'Koeffisientene finnes ved å multiplisere med riktig basisfunksjon og integrere over én hel periode. Ortogonalitet fjerner alle de andre frekvensene. Middelverdien er konstantleddet.',
 r'Jevne funksjoner har bare cosinusledd, odde funksjoner bare sinusledd, når sentrum og perioden er valgt symmetrisk. Symmetri bør sjekkes før lange integraler regnes.',
 r'For stykkevis glatte signaler går rekken ved et sprang mot gjennomsnittet av grenseverdiene. Nær sprang får endelige summer oversving; flere ledd gjør området smalere, men fjerner ikke relativt Gibbs-oversving.'
],[r'c_n=\frac1T\int_{-T/2}^{T/2}f(t)e^{-in\omega_0t}dt,\quad\omega_0=\frac{2\pi}T',r'f(t)\sim\sum_{n=-\infty}^{\infty}c_ne^{in\omega_0t}'],r'Finn de komplekse Fourierkoeffisientene til $f(t)=3+2\cos t$.',[
 r'Bruk $2\cos t=e^{it}+e^{-it}$.',r'Da er $c_0=3$, $c_1=c_{-1}=1$.',r'Alle andre koeffisienter er null.'],r'Pass på om konstantleddet skrives $a_0/2$ eller $c_0$.','fourier',[
 num(r'Hva er middelverdien til $4+3\sin t$ over én periode?',4,[r'Sinus har middelverdi null.']),
 mc(r'En odde reell funksjon på et symmetrisk intervall får hvilke reelle Fourierledd?',['Sinusledd','Bare konstantledd','Bare cosinusledd'],0,r'Odde ganger jevn er odde, så cosinusintegralene blir null.'),
 num(r'Et sprang går fra -2 til 4. Hva konvergerer Fourierrekken mot i sprangpunktet?',1,[r'Gjennomsnittet er $(-2+4)/2=1$.']),
 num(r'For $f(t)=6\cos(2t)$ med periode $2\pi$, hva er $c_2$?',3,[r'$6\cos2t=3e^{2it}+3e^{-2it}$.']),
 work(r'Finn sinuskoeffisientene til $f(t)=t$ på $(-\pi,\pi)$, periodisk utvidet.',[r'Funksjonen er odde, så bare sinusledd gjenstår.',r'$b_n=(2/\pi)\int_0^\pi t\sin(nt)dt$. Bruk delvis integrasjon.',r'$b_n=2(-1)^{n+1}/n$.'],['Brukte odd symmetri','Satte opp koeffisienten','Fikk riktig randledd og fortegn'])])
add('2-4','Projeksjon og Gram–Schmidt','Dele opp vektorer i ortogonale retninger.',['1-8'],[
 r'Skalarproduktet måler hvor mye to vektorer peker i samme retning. Når produktet er null, er vektorene ortogonale. Normen finnes ved å ta kvadratroten av skalarproduktet med seg selv.',
 r'Projeksjonen av $x$ på en ikke-null vektor $v$ ligger langs $v$. Resten står vinkelrett på $v$. Projeksjonen er derfor det nærmeste punktet på linjen til $x$.',
 r'Gram–Schmidt lager en ortogonal basis fra en uavhengig liste: behold første retning, trekk fra alle tidligere projeksjoner fra neste, og normaliser dersom du ønsker ortonormal basis.',
 r'For en matrise med ortonormale kolonner er $Q^TQ=I$. Projeksjonen på kolonnerommet er $QQ^T$. Ved redusert QR-faktorisering løses minste kvadrater gjennom $R\hat x=Q^Tb$.'
],[r'\operatorname{proj}_v x=\frac{v^Tx}{v^Tv}v',r'u_k=v_k-\sum_{j<k}\frac{u_j^Tv_k}{u_j^Tu_j}u_j',r'\|x\|=\sqrt{x^Tx}'],r'Projiser $x=(3,1)^T$ på $v=(1,1)^T$.',[
 r'$v^Tx=4$ og $v^Tv=2$.',r'Projeksjonen er $2(1,1)^T=(2,2)^T$.',r'Resten er $(1,-1)^T$ og har skalarprodukt null med $v$.'],r'Del på $v^Tv$ hvis vektoren ikke allerede har lengde 1.','projection',[
 num(r'Finn $(1,2,3)\cdot(2,0,1)$.',5,[r'$2+0+3=5$.']),
 num(r'Projiser $(4,2)$ på $(1,0)$. Hva er x-komponenten?',4,[r'Projeksjonen på x-aksen er $(4,0)$.']),
 mc(r'Hva er restvektoren etter en ortogonal projeksjon?',['Vinkelrett på underrommet','Alltid null','Parallell med underrommet'],0,r'Det er nettopp denne betingelsen som velger nærmeste punkt.'),
 num(r'Gram–Schmidt på $(1,0)$ og $(2,3)$ gir andre ortogonale vektor $(0,a)$. Finn $a$.',3,[r'Trekk fra projeksjonen $(2,0)$ fra $(2,3)$.']),
 work(r'Ortonormaliser $(1,1,0)$ og $(1,0,1)$.',[r'$q_1=(1,1,0)/\sqrt2$.',r'Trekk projeksjonen $(1/2,1/2,0)$ fra andre vektor: $(1/2,-1/2,1)$.',r'Normalisering gir $q_2=(1,-1,2)/\sqrt6$.'],['Normaliserte første vektor','Trakk riktig projeksjon','Kontrollerte ortogonalitet og norm'])])
add('2-5','Minste kvadrater og regresjon','Tilpasse modeller og forklare residualen.',['2-4','1-5'],[
 r'Måledata passer sjelden nøyaktig til en modell. Minste kvadrater velger parametre som minimerer summen av kvadrerte avvik. For en modell som er lineær i parametrene skriver vi dette som $\min\|Ax-b\|^2$.',
 r'Designmatrisen samler basisfunksjonene evaluert i datapunktene. For en rett linje har den en kolonne med ettall og en kolonne med x-verdier. Et polynom gir flere potenskolonner.',
 r'Normalbetingelsen sier at residualen er ortogonal på alle kolonner i designmatrisen. Normalmatrisen er inverterbar når kolonnene er uavhengige. Numerisk er QR eller SVD ofte bedre enn å danne inversen eksplisitt.',
 r'En liten treningsfeil betyr ikke automatisk en god modell. Vurder dataspredning, ekstrapolasjon og om modellen faktisk beskriver mekanismen. Delvis derivasjon brukes til å finne stasjonære parameterverdier.'
],[r'A^TA\hat x=A^Tb',r'\partial_x\|Ax-b\|^2=2(Ax-b)^TA'],r'Tilpass en konstant til målingene 2, 4 og 6.',[
 r'Minimer $S(c)=(c-2)^2+(c-4)^2+(c-6)^2$.',r'$S\prime(c)=6c-24=0$ gir $c=4$.',r'Residualene er $-2,0,2$ hvis vi bruker målt minus modell. Summen er null.'],r'Minste kvadrater minimerer kvadrerte vertikale residualer for denne modellen, ikke vilkårlige geometriske avstander.','regression',[
 num(r'Tilpass en konstant til 1, 3 og 8. Hva blir den?',4,[r'Konstanten er middelverdien $(1+3+8)/3=4$.']),
 mc(r'Hvilken betingelse gjelder for residualen $r=b-A\hat x$?',[r'$A^Tr=0$',r'$Ar=0$',r'$r=b$'],0,r'Residualen er ortogonal på kolonnerommet.',2),
 num(r'Modellen er $y=ax$ med data $(1,2),(2,4)$. Finn $a$.',2,[r'Begge punkter ligger nøyaktig på $y=2x$.']),
 num(r'Residualene er 1, -2 og 2. Hva er kvadratsummen?',9,[r'$1^2+(-2)^2+2^2=9$.']),
 work(r'Tilpass $y=a+bx$ til $(0,1),(1,2),(2,2)$.',[r'$A^TA=\begin{pmatrix}3&3\\3&5\end{pmatrix}$ og $A^Ty=(5,6)^T$.',r'Løs $3a+3b=5$, $3a+5b=6$.',r'$b=1/2$, $a=7/6$.'],['Bygde designmatrisen','Fant normalbetingelsene','Løste og kontrollerte residualen'])])
add('2-6','Spektralteoremet, SVD og datakomprimering','Forstå hovedretninger og redusert rang.',['1-7','2-4','2-5'],[
 r'En reell symmetrisk matrise kan diagonaliseres i en ortonormal basis og har reelle egenverdier. Det gjør symmetriske matriser sentrale når vi analyserer variasjon i data.',
 r'Før hovedkomponentanalyse sentrerer vi data ved å trekke fra kolonnemiddelverdier. Egenvektorene til kovariansmatrisen beskriver retninger, mens egenverdiene forteller hvor stor variansen er i hver retning.',
 r'Singulærverdidekomposisjon virker også for rektangulære matriser. Matrisen deles i to ortogonale eller unitære avbildninger og en diagonal skalering. Singulærverdiene er ikke-negative kvadratrøtter av egenverdiene til $A^TA$.',
 r'Ved å beholde bare de største singulærverdiene får vi en approksimasjon med lav rang. Dette kan brukes til bildekomprimering og dimensjonsreduksjon. En pseudoinvers inverterer de positive singulærverdiene og lar nullverdiene bli null.'
],[r'A=U\Sigma V^T,\qquad \sigma_j=\sqrt{\lambda_j(A^TA)}',r'A_k=\sum_{j=1}^k\sigma_ju_jv_j^T'],r'Finn en rang-1-approksimasjon til $A=\operatorname{diag}(5,2)$.',[
 r'Matrisen er allerede på SVD-form med singulærverdier 5 og 2.',r'Behold bare den største: $A_1=\operatorname{diag}(5,0)$.',r'Feilen i Frobeniusnorm er 2.'],r'Sentrering er nødvendig før vanlig PCA; ellers kan middelverdien dominere retningen.','svd',[
 num(r'$A^TA$ har egenverdier 16 og 9. Hva er største singulærverdi?',4,[r'$\sigma_1=\sqrt{16}=4$.']),
 mc(r'Hvilke reelle matriser er ortogonalt diagonaliserbare?',['Symmetriske matriser','Alle matriser','Bare diagonalmatriser'],0,r'Dette er spektralteoremet for reelle symmetriske matriser.'),
 num(r'Egenverdiene til kovariansmatrisen er 9 og 1. Hvor mange prosent varians forklares av første hovedkomponent?',90,[r'$9/(9+1)=0.9=90\%$.']),
 num(r'En matrise har singulærverdier 7, 2, 0. Hva er rangen?',2,[r'Rangen er antallet positive singulærverdier.']),
 work(r'Forklar hvorfor $A^TA$ aldri har negative egenverdier.',[r'For enhver $x$ er $x^TA^TAx=\|Ax\|^2\ge0$.',r'For en egenvektor $v$ får vi $\lambda\|v\|^2=\|Av\|^2$.',r'Siden $v\ne0$, er $\lambda\ge0$.'],['Brukte normkvadratet','Satte inn en egenvektor','Delte på positiv norm'])])
add('2-7','Bølge- og varmelikningen','Utlede og løse enkle separerte PDE-problemer.',['1-3','2-3'],[
 r'En partiell differensiallikning har en ukjent funksjon av flere variable. Romlig endring og tidsendring må holdes atskilt. Varmelikningen har én tidsderivert; bølgelikningen har to.',
 r'Varmelikningen følger av energibalanse og varme som strømmer mot lavere temperatur. Bølgelikningen for en streng følger av kraftbalanse og en tilnærming med små utslag.',
 r'Variabelseparasjon prøver $u(x,t)=X(x)T(t)$. Etter divisjon blir én side bare avhengig av rom og den andre bare av tid. Begge må derfor være en konstant.',
 r'Randkravene bestemmer hvilke romlige egenfunksjoner som er tillatt. Initialkravene bestemmer kombinasjonen. For bølger trenger vi både startutslag og startfart.'
],[r'u_t=\alpha u_{xx},\qquad u_{tt}=c^2u_{xx}',r'X(0)=X(L)=0\Rightarrow X_n=\sin(n\pi x/L)'],r'Løs varmelikningen på $[0,\pi]$ med null randtemperatur og $u(x,0)=\sin2x$.',[
 r'Prøv $u=T(t)\sin2x$. Da er $u_{xx}=-4T\sin2x$.',r'$T\prime=-4\alpha T$, med $T(0)=1$.',r'$u=e^{-4\alpha t}\sin2x$.'],r'En separert løsning dekker bare ett romlig mønster. Generelle startdata krever en sum.','heat',[
 mc(r'Hvilket problem trenger to initialkrav i tid?',['Bølgelikningen','Varmelikningen','Ingen av dem'],0,r'Bølgelikningen er andre orden i tid.'),
 num(r'For $\sin3x$ er $X\prime\prime=-kX$. Finn $k$.',9,[r'To derivasjoner gir $-9\sin3x$.']),
 num(r'På $[0,\pi]$ med $c=2$ har første bølgemode vinkelfrekvens hvor stor?',2,[r'$\omega_n=cn\pi/L$, så $\omega_1=2$.']),
 mc(r'Hvilken varmemode avtar raskest?',[r'$\sin5x$',r'$\sin2x$',r'$\sin x$'],0,r'Dempingsraten er proporsjonal med $n^2$.',2),
 work(r'Løs $u_{tt}=4u_{xx}$ på $[0,\pi]$ med null randverdier, $u(x,0)=\sin x$ og $u_t(x,0)=0$.',[r'Prøv $u=T(t)\sin x$. Da er $T\prime\prime=-4T$.',r'$T(0)=1$ og $T\prime(0)=0$ gir $T=\cos2t$.',r'$u=\sin x\cos2t$.'],['Fant romlig mode','Brukte begge startkrav','Kontrollerte randverdiene'])])
add('2-8','Sinusrekker, cosinusrekker og randkrav','Tilpasse Fourierutvikling til et PDE-problem.',['2-3','2-7'],[
 r'For null Dirichlet-randkrav passer sinusfunksjoner fordi de er null i begge ender. Null Neumann-randkrav passer cosinusfunksjoner fordi de har null derivert i endene.',
 r'Koeffisientene fås ved projeksjon på de romlige egenfunksjonene. På $[0,L]$ har sinusmodene normkvadrat $L/2$. Derfor kommer faktoren $2/L$ foran integralet.',
 r'En sinusrekke svarer til en odde utvidelse av startfunksjonen, mens en cosinusrekke svarer til en jevn utvidelse. Hvilken utvidelse vi bruker henger sammen med randkravene.',
 r'Når randverdiene er konstante og ulike, trekker vi først fra en stasjonær løsning. Restproblemet har homogene randkrav og kan behandles med standardmodene.'
],[r'b_n=\frac2L\int_0^L f(x)\sin(n\pi x/L)dx',r'u(x,t)=\sum_{n=1}^{\infty}b_ne^{-\alpha(n\pi/L)^2t}\sin(n\pi x/L)'],r'Finn sinuskoeffisientene til $f(x)=1$ på $(0,\pi)$.',[
 r'$b_n=(2/\pi)\int_0^\pi\sin(nx)dx$.',r'$b_n=2[1-(-1)^n]/(n\pi)$.',r'Partall gir null; oddetall gir $4/(n\pi)$. Randverdiene til rekken er null.'],r'Startdata som ikke passer randkravene i hjørnene kan gi diskontinuitet der.','fourier',[
 mc(r'Hvilken basis passer $u(0,t)=u(L,t)=0$?',['Sinusmodene','Konstanten alene','Bare cosinusmodene'],0,r'Sinus er null ved begge ender for frekvensene $n\pi/L$.'),
 num(r'$f=3\sin x+2\sin4x$ på $[0,\pi]$. Finn $b_4$.',2,[r'Ortogonalitet gir direkte koeffisienten 2.']),
 mc(r'Cosinusutvidelse svarer til hvilken speiling?',['Jevn','Odde','Ingen utvidelse'],0,r'Cosinus er en jevn funksjon.'),
 num(r'En stasjonær temperatur er 10 ved x=0 og 30 ved x=2. Hva er temperaturen ved x=1?',20,[r'Stasjonær 1D-varmeledning uten kilder gir en rett linje: $10+10x$.']),
 work(r'Løs varmeproblemet med $\alpha=1$, $L=\pi$, null randverdier og $f(x)=2\sin x-\sin3x$.',[r'Hver mode utvikler seg uavhengig.',r'Første mode dempes med $e^{-t}$ og tredje med $e^{-9t}$.',r'$u=2e^{-t}\sin x-e^{-9t}\sin3x$.'],['Identifiserte koeffisientene','Brukte kvadratet av modenummeret','Kontrollerte startdata'])])
add('2-9','Funksjonsrom og ortogonale polynomer','Bruke geometri på funksjoner.',['2-4','1-9'],[
 r'Funksjoner kan behandles som vektorer. Et vanlig reelt indreprodukt er integralet av produktet. Normen måler da samlet kvadratisk størrelse, og ortogonalitet betyr at produktintegralet er null.',
 r'De samme regnereglene som i endelig dimensjon gir Cauchy–Schwarz, trekantulikheten og ortogonal projeksjon. En funksjon kan tilnærmes i et valgt underrom, for eksempel polynomer av grad høyst to.',
 r'Gram–Schmidt på $1,x,x^2,\ldots$ lager ortogonale polynomer for det valgte intervallet og vekten. Endrer vi indreproduktet, endrer vi også hva ortogonal betyr.',
 r'For kvadratintegrerbare funksjoner identifiserer vi funksjoner som er like nesten overalt. Forskjeller i enkeltpunkter gir ikke endring i integralnormen. Dette er nødvendig for at norm og indreprodukt skal være veldefinert på rommet.'
],[r'\langle f,g\rangle=\int_a^bf(x)g(x)dx',r'|\langle f,g\rangle|\le\|f\|\|g\|',r'P_Vf=\sum_j\frac{\langle f,v_j\rangle}{\langle v_j,v_j\rangle}v_j'],r'Finn beste konstante tilnærming til $f(x)=x^2$ på $[-1,1]$.',[
 r'Projiser på basisfunksjonen 1.',r'Koeffisienten er $\int_{-1}^1x^2dx/\int_{-1}^11dx=(2/3)/2=1/3$.',r'Resten $x^2-1/3$ er ortogonal på 1.'],r'Funksjonsverdiene trenger ikke være punktvis nærmest selv om integralfeilen er minst.','projection',[
 num(r'Finn $\langle1,x\rangle$ på $[-1,1]$.',0,[r'Integranden er odde.']),
 num(r'Finn $\|1\|^2$ på $[0,3]$ med standard integralindreprodukt.',3,[r'$\int_0^31dx=3$.']),
 mc(r'Hvilken funksjon er ortogonal på 1 på $[-1,1]$?',[r'$x$',r'$x^2$',r'$2$'],0,r'$\int_{-1}^1x dx=0$.'),
 num(r'Beste konstante tilnærming til $x$ på $[0,2]$ er?',1,[r'$\int_0^2x dx/2=2/2=1$.']),
 work(r'Ortogonaliser $1,x,x^2$ på $[-1,1]$.',[r'1 og $x$ er allerede ortogonale.',r'$x^2$ har projeksjon $1/3$ på 1 og null projeksjon på $x$.',r'En ortogonal basis er $1,x,x^2-1/3$.'],['Brukte symmetri','Regnet riktig normkvadrat','Trakk projeksjonen'])])
add('2-10','Komplekse indreproduktrom og unitære matriser','Bruke konjugering riktig i geometri og operatorer.',['1-2','2-9'],[
 r'I komplekse rom må ett argument konjugeres, ellers kan et normkvadrat bli negativt eller null for en ikke-null vektor. Her bruker vi $\langle z,w\rangle=z^*w$, som er lineært i andre argument.',
 r'Adjungering betyr transponering og komplekskonjugering. En hermitisk matrise oppfyller $A^*=A$ og har reelle egenverdier. Egenvektorer til ulike egenverdier er ortogonale.',
 r'En unitær matrise oppfyller $U^*U=I$ og bevarer indreprodukt og norm. Den er den komplekse utgaven av en ortogonal matrise. Med ortonormale egenvektorer kan hermitiske matriser diagonaliseres unitært.',
 r'Kompleks Pytagoras krever varsomhet: likheten for normkvadrater sier at realdelen av indreproduktet er null, ikke nødvendigvis hele indreproduktet.'
],[r'A^*=\overline A^T,\qquad\|z\|^2=z^*z',r'\langle z,w\rangle=\overline{\langle w,z\rangle}',r'U^{-1}=U^*'],r'Finn normen til $z=(1,i)^T$.',[
 r'$z^*=(1,-i)$.',r'$z^*z=1+(-i)i=2$.',r'Normen er $\sqrt2$.'],r'$z^Tz$ er ikke et normkvadrat i et komplekst rom.','complex',[
 num(r'Hva er $\|(1,i)\|^2$?',2,[r'$|1|^2+|i|^2=2$.']),
 mc(r'Hva betyr hermitisk?',[r'$A^*=A$',r'$A^T=-A$',r'$A^2=0$'],0,r'Matrisen er lik sin konjugert transponerte.'),
 num(r'Hva er realdelen av $\langle(1,i),(i,1)\rangle$?',0,[r'Produktet er $i-i=0$.']),
 mc(r'Hvilken invers har en unitær matrise?',[r'$U^*$',r'$U$ alltid',r'$-U$'],0,r'Definisjonen gir $U^*U=I$.'),
 work(r'Vis at $A=\begin{pmatrix}0&-i\\i&0\end{pmatrix}$ er hermitisk og finn egenverdiene.',[r'Transponering og konjugering gir tilbake $A$.',r'$\det(A-\lambda I)=\lambda^2-1$.',r'Egenverdiene er $1$ og $-1$, begge reelle.'],['Konjugerte og transponerte','Regnet determinant riktig','Fant begge egenverdiene'])])
add('2-11','Fouriertransform og konvolusjon','Gå fra periodiske signaler til kontinuerlig frekvens.',['2-3','2-10'],[
 r'Fouriertransformen beskriver ikke-periodiske signaler med et kontinuerlig spekter. Den kan forstås ved å la perioden til en Fourierrekke vokse. Koeffisientene blir da en funksjon av frekvens.',
 r'Vi bruker konvensjonen med $e^{-i\omega t}$ i framtransformen og $1/(2\pi)$ i inversen. Andre bøker kan fordele faktorene annerledes; sjekk konvensjonen før formler kombineres.',
 r'Tidsforskyvning gir en fasefaktor i frekvens. Derivasjon blir multiplikasjon med $i\omega$ når randleddene forsvinner. Konvolusjon i tid blir produkt i frekvens.',
 r'En smal puls trenger et bredt frekvensinnhold. For regulære kvadratintegrerbare signaler knytter Parsevals identitet energien i tid til energien i frekvens.'
],[r'\widehat f(\omega)=\int_{-\infty}^\infty f(t)e^{-i\omega t}dt',r'f(t)=\frac1{2\pi}\int_{-\infty}^\infty\widehat f(\omega)e^{i\omega t}d\omega',r'\widehat{f*g}=\widehat f\widehat g'],r'Transformer $f(t)=1$ for $|t|<a$ og 0 ellers.',[
 r'$\widehat f=\int_{-a}^a e^{-i\omega t}dt$.',r'For $\omega\ne0$: $\widehat f=2\sin(a\omega)/\omega$.',r'I null brukes grensen, som gir $2a$, lik pulsens areal.'],r'En verdi som gir $0/0$ i transformformelen kan være en fjernbar singularitet.','spectrum',[
 num(r'En puls er 1 på $[-2,2]$. Hva er $\widehat f(0)$?',4,[r'Nullfrekvensverdien er integralet av signalet, altså arealet 4.']),
 mc(r'Hva blir konvolusjon i frekvensdomenet?',['Multiplikasjon av transformene','Alltid derivasjon','Divisjon med tiden'],0,r'Konvolusjonsteoremet gir $\widehat{f*g}=\hat f\hat g$.'),
 mc(r'Hva skjer med spekterets bredde når en puls blir smalere?',['Det blir bredere','Det blir smalere','Det blir null'],0,r'Tidsskalering gir motsatt skalering i frekvens.'),
 num(r'$f$ har integral 3 og $g$ integral 2. Hva er integralet av $f*g$ for integrerbare signaler?',6,[r'I nullfrekvens: $\widehat{f*g}(0)=\hat f(0)\hat g(0)=6$.']),
 work(r'Utled transformen til $f(t-t_0)$ fra definisjonen.',[r'Sett $s=t-t_0$, slik at $t=s+t_0$.',r'Eksponentialen blir $e^{-i\omega s}e^{-i\omega t_0}$.',r'Transformen er $e^{-i\omega t_0}\hat f(\omega)$.'],['Gjorde variabelskifte','Tok fasefaktoren utenfor','Beholdt riktig fortegn'])])
add('2-12','Schrödingerlikningen og egenfunksjoner','Knytte norm, sannsynlighet og tidsutvikling.',['2-7','2-10'],[
 r'Bølgefunksjonen er kompleks. Sannsynlighetstettheten er absoluttverdien i andre, og den totale sannsynligheten skal være 1. Normalisering velger derfor en skaleringskonstant.',
 r'For et tidsuavhengig potensial kan vi separere rom og tid. Den romlige delen løser et egenverdiproblem for Hamiltonoperatoren, og hver energimode får en kompleks fasefaktor i tid.',
 r'En enkelt energimode har tidsuavhengig sannsynlighetstetthet fordi fasefaktoren har modulus 1. En superposisjon av ulike energier kan derimot gi tidsavhengig tetthet gjennom kryssledd.',
 r'I en uendelig brønn må bølgefunksjonen være null i endene. Dette gir sinusfunksjoner og diskrete energinivåer som vokser med kvadratet av modenummeret. Forventningsverdier beregnes med operatoren mellom funksjonen og dens konjugerte.'
],[r'i\hbar\Psi_t=H\Psi,\quad H=-\frac{\hbar^2}{2m}\Delta+V',r'\Psi_n(x,t)=\phi_n(x)e^{-iE_nt/\hbar}',r'\phi_n=\sqrt{2/L}\sin(n\pi x/L),\quad E_n=\frac{\hbar^2n^2\pi^2}{2mL^2}'],r'Normaliser $\phi(x)=C\sin(\pi x/L)$ på $[0,L]$ med $C>0$.',[
 r'Kravet er $C^2\int_0^L\sin^2(\pi x/L)dx=1$.',r'Integralet er $L/2$.',r'$C=\sqrt{2/L}$.'],r'Bruk $|\Psi|^2$, ikke $\Psi^2$, som sannsynlighetstetthet.','quantum',[
 num(r'En konstant normalisert bølgefunksjon på $[0,4]$ er positiv reell. Finn verdien.',.5,[r'$4C^2=1$ gir $C=1/2$.']),
 num(r'Hva er $E_3/E_1$ for en uendelig 1D-brønn?',9,[r'Energien er proporsjonal med $n^2$.']),
 mc(r'En enkelt energimode har hvilken tidsutvikling av tettheten?',['Tettheten er konstant i tid','Tettheten må vokse','Tettheten blir kompleks'],0,r'Tidsfaktoren har absoluttverdi 1.'),
 num(r'For en normalisert symmetrisk brønntilstand på $[0,2]$, hva er forventet posisjon?',1,[r'Symmetri rundt midtpunktet gir $\langle x\rangle=1$.']),
 work(r'To ortonormale energitilstander har koeffisientene $1/\sqrt2$ og $i/\sqrt2$. Vis at superposisjonen er normalisert.',[r'Normkvadratet er summen av koeffisientenes modulus i andre fordi kryssproduktene er null.',r'$|1/\sqrt2|^2+|i/\sqrt2|^2=1/2+1/2=1$.',r'Tidsutviklingen endrer bare fasene, så normen bevares.'],['Brukte ortogonalitet','Tok absoluttverdi av kompleks koeffisient','Forklarte normbevaring'])])
add('2-13','Konvergens, presisjon og bevis','Skille intuisjon fra gyldig begrunnelse.',['1-12','2-9','2-11'],[
 r'Uendelige summer og grenser krever tydelige betingelser. Punktvis konvergens undersøker ett punkt om gangen. Uniform konvergens gir én feilgrense som virker over hele området.',
 r'Følgen $x^n$ på $[0,1]$ viser forskjellen: den går mot 0 for $x<1$, men er 1 i $x=1$. Grensefunksjonen er diskontinuerlig selv om alle funksjonene i følgen er kontinuerlige.',
 r'Et enkeltpunkts verdi endrer ikke et vanlig integral. Derfor kan funksjoner som er ulike i et punkt ha avstand null i en integralnorm. I $L^2$ arbeider vi med klasser av funksjoner som er like nesten overalt.',
 r'Du må begrunne bytte mellom grense, integral og derivert. Uniform konvergens av kontinuerlige funksjoner på et kompakt intervall tillater integrasjon av grensen. Derivasjon krever sterkere betingelser. Et moteksempel avslører raskt en påstand som mangler hypoteser.'
],[r'\|f\|_2^2=\int|f|^2,\qquad\|f\|_\infty=\sup|f|',r'\sup_x|f_n(x)-f(x)|\to0\quad\text{betyr uniform konvergens}'],r'Undersøk $f_n(x)=x^n$ på $[0,1]$.',[
 r'For hvert $x<1$ er grensen 0, mens $f_n(1)=1$.',r'Grensefunksjonen er derfor 0 på $[0,1)$ og 1 i 1.',r'Konvergensen er ikke uniform på hele intervallet, men er uniform på $[0,a]$ for hvert fast $a<1$.'],r'Et plot av mange punkter kan støtte intuisjon, men beviser ikke en påstand om alle punkter.','convergence',[
 num(r'Hva er $\lim_{n\to\infty}(1/2)^n$?',0,[r'Geometrisk avtagning med forhold under 1.']),
 mc(r'Endrer én punktverdi integralet av en ellers integrerbar funksjon?',['Nei','Ja, alltid med 1','Ja, integralet blir uendelig'],0,r'Et enkeltpunkt har mål null.'),
 mc(r'Er $x^n\to0$ uniformt på $[0,1/2]$?',['Ja','Nei','Bare for partall n'],0,r'Maksimal feil er $(1/2)^n$, som går mot null.',2),
 num(r'Finn $\int_0^1x^n dx$ når $n=4$.',.2,[r'$1/(n+1)=1/5$.']),
 work(r'Gi et moteksempel til «en punktvis grense av kontinuerlige funksjoner er kontinuerlig».',[r'Bruk $f_n(x)=x^n$ på $[0,1]$.',r'Alle $f_n$ er kontinuerlige.',r'Grensefunksjonen hopper fra 0 til 1 i høyre endepunkt.'],['Fant en gyldig følge','Bestemte hele grensefunksjonen','Viste diskontinuiteten'])])
add('3-1','Kurver, buelengde og krumning','Beskrive bevegelse og geometrien til en romkurve.',['1-4','1-9'],[
 r'En parametrisert kurve gir posisjonen som funksjon av en parameter. Parameteren kan være tid, men trenger ikke være det. Den deriverte er tangentvektor, og normen av den er farten når parameteren er tid.',
 r'Buelengde er integralet av farten. En omparametrisering endrer hvor fort kurven tegnes, men ikke lengden når kurven gjennomløpes én gang. En regulær kurve har ikke-null tangent.',
 r'Enhetstangenten viser retningen uten fart. Krumningen måler hvor raskt tangenten snur per lengdeenhet. En sirkel har konstant krumning, omvendt proporsjonal med radius.',
 r'For romkurver beskriver normal og binormal et bevegelig koordinatsystem. Torsjonen måler vridning ut av krumningsplanet. Formlene for normal og torsjon krever at nevnerne ikke er null.'
],[r'L=\int_a^b\|r\prime(t)\|dt,\quad T=\frac{r\prime}{\|r\prime\|}',r'\kappa=\frac{\|r\prime\times r\prime\prime\|}{\|r\prime\|^3},\quad\tau=\frac{\det(r\prime,r\prime\prime,r\prime\prime\prime)}{\|r\prime\times r\prime\prime\|^2}'],r'Finn lengden av én runde av $r(t)=(2\cos t,2\sin t,t)$, $0\le t\le2\pi$.',[
 r'$r\prime=(-2\sin t,2\cos t,1)$.',r'Farten er $\sqrt{4\sin^2t+4\cos^2t+1}=\sqrt5$.',r'Lengden er $2\pi\sqrt5$.'],r'Tangentvektoren er ikke automatisk en enhetsvektor.','curve',[
 num(r'En sirkel har radius 4. Hva er krumningen?',.25,[r'$\kappa=1/R=1/4$.']),
 num(r'$r(t)=(3t,4t,0)$. Hva er farten?',5,[r'$\sqrt{3^2+4^2}=5$.']),
 mc(r'Hva er buelengdeparameterens særtrekk?',['Tangentvektoren har norm 1','Kurven er en rett linje','Alle koordinatene er like'],0,r'Endring i parameteren er lik tilbakelagt lengde.'),
 num(r'En rett linje har hvilken krumning?',0,[r'Tangentretningen endrer seg ikke.']),
 work(r'Finn krumning og torsjon for $r(t)=(a\cos t,a\sin t,bt)$ med $a>0$.',[r'$\|r\prime\|=\sqrt{a^2+b^2}$ og $\|r\prime\times r\prime\prime\|=a\sqrt{a^2+b^2}$.',r'$\kappa=a/(a^2+b^2)$.',r'Determinanten er $a^2b$, så $\tau=b/(a^2+b^2)$.'],['Deriverte tre ganger','Fant kryssproduktets norm','Beholdt fortegnet til torsjonen'])])
add('3-2','Gradient, kjerneregel og tangentplan','Regne lokal endring med riktig rad- og kolonnenotasjon.',['1-4','2-5'],[
 r'Et skalarfelt gir ett tall for hver posisjon. Nivåkurver eller nivåflater samler punkter med lik verdi. Gradientens retning er normal på nivåflaten og peker mot sterkest lokal økning.',
 r'Vi skriver den radformede deriverte som $\partial_x f$ og kolonnegradienten som $\nabla_x f=(\partial_x f)^T$. Dette gjør kjerneregelen til et matriseprodukt med synlige dimensjoner.',
 r'Retningsderivert i en enhetsretning $n$ er $\nabla f\cdot n$. Hvis retningen ikke normaliseres, får vi endring per parameterenhet i stedet for per lengdeenhet.',
 r'Tangentplanet er den lineære tilnærmingen i ett punkt. Eksistens av partiellderiverte alene garanterer ikke total deriverbarhet. Kontinuerlige partiellderiverte i et nabolag er en tilstrekkelig betingelse.'
],[r'f(x+h)\approx f(x)+\partial_x f(x)h',r'\frac{d}{dt}f(r(t))=\partial_x f(r(t))r\prime(t)',r'D_nf=\nabla_xf\cdot n,\quad\|n\|=1'],r'Finn retningsderiverten til $f(x,y)=x^2+2y^2$ i $(1,1)$ mot $(3,4)$.',[
 r'Gradienten er $(2x,4y)^T$, altså $(2,4)^T$ i punktet.',r'Enhetsretningen er $(3/5,4/5)^T$.',r'Prikkproduktet gir $6/5+16/5=22/5$.'],r'Ikke bland en radderivert med en kolonnegradient i kjerneregelen.','gradient',[
 num(r'$f=x^2+3y^2$. Hva er $f_y(1,2)$?',12,[r'$f_y=6y=12$.']),
 mc(r'Gradienten står hvordan på en regulær nivåkurve?',['Normalt','Tangentielt','Alltid horisontalt'],0,r'Endringen langs nivåkurven er null, altså er prikkproduktet med tangenten null.'),
 num(r'Gradienten er $(3,4)$. Hva er største retningsderiverte over enhetsretninger?',5,[r'Maksimum er gradientens norm $\sqrt{9+16}=5$.']),
 num(r'$f(x,y)=xy$ langs $r(t)=(t,t^2)$. Finn tidsderiverten ved $t=1$.',3,[r'$f(r(t))=t^3$, som har derivert $3t^2$.']),
 work(r'Finn tangentplanet til $z=x^2+y^2$ i $(1,2,5)$.',[r'$f_x=2x$, $f_y=2y$.',r'I punktet er den radderiverte $(2,4)$.',r'$z=5+2(x-1)+4(y-2)$.'],['Fant punktverdien','Fant begge partiellderiverte','Skrev planet med riktige forskyvninger'])])
add('3-3','Optimering og Lagranges multiplikator','Finne og klassifisere ekstremalverdier.',['3-2','1-7'],[
 r'Indre ekstremalpunkter for en deriverbar funksjon må ha null gradient. Men et stasjonært punkt kan også være et sadelpunkt. Hessianen undersøker krumningen i alle retninger.',
 r'En positivt definitt Hessian gir et strengt lokalt minimum, negativt definitt gir maksimum, og både positive og negative egenverdier gir sadel. En semidefinitt Hessian kan være uavgjørende.',
 r'På et kompakt område må også randen og eventuelle hjørner undersøkes. Sammenlign funksjonsverdiene til alle kandidater når du søker globale ekstremalverdier.',
 r'Med binding $g(x)=c$ blir gradientene parallelle ved regulære kandidater. Lagranges metode løser $\nabla f=\lambda\nabla g$ sammen med bindingen. Punkter der $\nabla g=0$ må undersøkes separat.'
],[r'f(x+h)=f(x)+\partial_x f\,h+\frac12h^TH_fh+o(\|h\|^2)',r'\nabla f=\lambda\nabla g,\quad g=c'],r'Klassifiser $(0,0)$ for $f=x^2-y^2$.',[
 r'Gradienten er $(2x,-2y)^T$ og er null i origo.',r'Hessianen er $\operatorname{diag}(2,-2)$.',r'Positiv og negativ retning gir sadelpunkt.'],r'Andreordensleddet i Taylorformelen har faktor $1/2$.','gradient',[
 mc(r'Hessianen har egenverdier 2 og 5 ved et kritisk punkt. Punktet er?',['Strengt lokalt minimum','Maksimum','Sadel'],0,r'Begge egenverdier er positive.'),
 num(r'Minimer $x^2+y^2$ under $x+y=2$. Hva er minste verdi?',2,[r'Minimum er ved $x=y=1$, som gir 2.']),
 mc(r'Hva sier en null Hessian alene?',['Testen er uavgjørende','Punktet er alltid minimum','Punktet er alltid sadel'],0,r'Høyere ordens ledd kan avgjøre.'),
 num(r'Finn x-koordinaten til minimum av $(x-3)^2+(y+1)^2$.',3,[r'Begge kvadrater minimeres når $x=3$, $y=-1$.']),
 work(r'Finn maksimum og minimum av $f=x+y$ på enhetssirkelen.',[r'$(1,1)=\lambda(2x,2y)$ gir $x=y$.',r'Bindingen gir $x=y=\pm1/\sqrt2$.',r'Verdiene er $\sqrt2$ og $-\sqrt2$.'],['Satte opp Lagrange','Brukte bindingen','Sammenlignet kandidatverdiene'])])
add('3-4','Vektorfelt, strømkurver og potensial','Lese et felt og finne konservative krefter.',['3-2','1-7'],[
 r'Et vektorfelt tilordner en pil til hvert punkt. Pilene kan beskrive hastighet eller kraft. For et stasjonært hastighetsfelt følger en partikkel likningen $r\prime=F(r)$ og er tangent til feltet.',
 r'Et konservativt felt kan skrives som gradienten til et potensial. Da blir arbeid langs en kurve bestemt bare av endepunktene. Potensialet finnes ved integrasjon, men integrasjonskonstanten kan være en funksjon av de øvrige variablene.',
 r'Likhet mellom kryssderiverte er nødvendig for et glatt gradientfelt. På et enkelt sammenhengende åpent område er rotasjonsfrihet også tilstrekkelig. Hull og singulariteter kan ødelegge den globale konklusjonen.',
 r'Jacobianen beskriver feltet nær et punkt. Rundt en likevekt brukes linearisering til å undersøke lokal oppførsel, men null realdel hos egenverdier krever mer analyse.'
],[r'r\prime(t)=F(r(t)),\qquad F=\nabla\phi',r'\int_\Gamma F\cdot dr=\phi(B)-\phi(A)'],r'Finn et potensial til $F=(2xy,x^2+2y)$.',[
 r'Integrer første komponent i x: $\phi=x^2y+g(y)$.',r'Deriver i y og sammenlign: $x^2+g\prime(y)=x^2+2y$.',r'$\phi=x^2y+y^2+C$.'],r'Rotasjonsfritt felt rundt et hull trenger ikke ha et globalt potensial.','field',[
 mc(r'Hva kjennetegner en strømlinje i et stasjonært felt?',['Tangenten følger feltet','Den er alltid rett','Den er normal på feltet'],0,r'Definisjonen er $r\prime=F(r)$.',1),
 num(r'$\phi=x^2+y^2$. Hva er første komponent i gradienten ved $(2,3)$?',4,[r'$\phi_x=2x=4$.']),
 num(r'Arbeidet i $F=\nabla(xy)$ fra $(0,1)$ til $(2,3)$ er?',6,[r'Potensialforskjellen er $6-0=6$.']),
 mc(r'Rotasjonen er null utenfor origo. Er feltet automatisk konservativt på hele det punkterte planet?',['Nei','Ja','Bare hvis feltet er stort'],0,r'Området har et hull; en lukket kurve rundt hullet kan ha ikke-null integral.',2),
 work(r'Undersøk $F=(-y,x)$ og beskriv strømlinjene.',[r'Likningene er $x\prime=-y$, $y\prime=x$.',r'$(x^2+y^2)\prime=2x(-y)+2yx=0$.',r'Strømlinjene utenom origo er sirkler som gjennomløpes mot klokken.'],['Satte opp systemet','Fant en bevart størrelse','Bestemte retningen'])])
add('3-5','Linjeintegraler: masse og arbeid','Velge mellom skalar- og vektorlinjeintegral.',['3-1','3-4'],[
 r'Et skalarlinjeintegral summerer en tetthet langs en kurve. Buelengdeelementet er positivt og tar med hvor fort parametriseringen beveger seg. Dette kan gi masse av en tråd.',
 r'Et arbeidsintegral summerer kraftkomponenten i bevegelsesretningen. Her bruker vi tangentvektoren direkte. Når orienteringen snus, skifter integralet fortegn.',
 r'Velger du en enkel parametrisering, blir integralet et vanlig envariabelintegral. Sett feltet inn langs kurven før du multipliserer med tangent eller fart.',
 r'For et gradientfelt kan potensialforskjellen spare hele integrasjonen. For andre felt må kurven faktisk tas med. En stykkevis glatt kurve deles opp i biter.'
],[r'\int_\Gamma f\,ds=\int_a^bf(r(t))\|r\prime(t)\|dt',r'\int_\Gamma F\cdot dr=\int_a^bF(r(t))\cdot r\prime(t)dt'],r'Finn arbeidet til $F=(-y,x)$ rundt enhetssirkelen mot klokken.',[
 r'Bruk $r(t)=(\cos t,\sin t)$ for $0\le t\le2\pi$.',r'Både $F(r(t))$ og $r\prime(t)$ er $(-\sin t,\cos t)$.',r'Prikkproduktet er 1, så integralet er $2\pi$.'],r'Ikke bytt $r\prime$ og $\|r\prime\|$; de beskriver to forskjellige integraltyper.','line',[
 mc(r'Hva skjer med et skalarlinjeintegral når kurvens orientering snus?',['Det er uendret','Det skifter fortegn','Det blir null'],0,r'Buelengdeelementet er positivt.'),
 num(r'En rett tråd har lengde 3 og konstant tetthet 2. Hva er massen?',6,[r'Masse er tetthet ganger lengde.']),
 num(r'$F=(2,0)$ langs linjen fra $(0,0)$ til $(3,1)$. Hva er arbeidet?',6,[r'$F\cdot(B-A)=(2,0)\cdot(3,1)=6$.']),
 mc(r'Kraften er alltid normal på bevegelsen. Hva er arbeidet?',['0','Alltid positivt','Lik buelengden'],0,r'Prikkproduktet med tangenten er null.'),
 work(r'Beregn $\int_\Gamma(x+y)ds$ langs linjen fra $(0,0)$ til $(1,1)$.',[r'Parametriser $r(t)=(t,t)$, $0\le t\le1$.',r'$x+y=2t$, og farten er $\sqrt2$.',r'Integralet er $\sqrt2\int_0^12t dt=\sqrt2$.'],['Parametriserte riktig','Tok med farten','Brukte skalarintegral'])])
add('3-6','Dobbeltintegraler og integrasjonsområder','Sette grenser fra geometrien og bytte integrasjonsrekkefølge.',['1-9'],[
 r'Dobbeltintegralet summerer bidrag over et område i planet. For en ikke-negativ høydefunksjon gir det volum; for en flatetetthet gir det masse. Integralet av 1 gir arealet.',
 r'Fubinis teorem gjør integralet til to vanlige integraler når betingelsene er oppfylt. Det innerste integralet sveiper over et snitt, mens det ytterste flytter snittet gjennom området.',
 r'Tegn området før grensene skrives. Ved bytte av rekkefølge må samme punkter beskrives med nye snitt. Noen områder må deles i flere deler.',
 r'Symmetri kan gjøre mye av regningen overflødig. En odde integrand over et område som er symmetrisk i den aktuelle variabelen gir null, dersom integralet finnes.'
],[r'\iint_Df\,dA=\int_a^b\int_{g_1(x)}^{g_2(x)}f(x,y)\,dy\,dx',r'\bar x=\frac{\iint_Dx\rho\,dA}{\iint_D\rho\,dA}'],r'Finn arealet av trekanten $0\le x\le1$, $0\le y\le x$.',[
 r'Arealet er $\int_0^1\int_0^x1\,dy\,dx$.',r'Innerintegralet gir x.',r'Ytterintegralet gir $1/2$. Alternativt: $0\le y\le1$, $y\le x\le1$.'],r'Grensene til det ytterste integralet kan ikke avhenge av den innerste variabelen.','region',[
 num(r'Beregn $\int_0^2\int_0^3 1\,dy\,dx$.',6,[r'Rektangelets areal er $2\cdot3=6$.']),
 mc(r'$0\le y\le x\le1$. Hva er korrekt omvendt rekkefølge?',[r'$0\le y\le1,\ y\le x\le1$',r'$0\le y\le1,\ 0\le x\le y$',r'$0\le x,y\le1$'],0,r'Horisontale snitt går fra diagonalen til x=1.',2),
 num(r'Beregn $\iint_{[-1,1]^2} x\,dA$.',0,[r'Integranden er odde i x og området symmetrisk.']),
 num(r'En enhetskvadratplate har tetthet 3. Hva er massen?',3,[r'$3\cdot1=3$.']),
 work(r'Beregn $\int_0^1\int_x^1 e^{y^2}\,dy\,dx$ ved å bytte rekkefølge.',[r'Området er $0\le x\le y\le1$.',r'Bytt til $\int_0^1\int_0^y e^{y^2}\,dx\,dy=\int_0^1 y e^{y^2}dy$.',r'Substitusjon gir $(e-1)/2$.'],['Tegnet samme område','Byttet grensene riktig','Brukte substitusjon'])])
add('3-7','Koordinatbytte og Jacobideterminant','Forenkle integraler ved å flytte geometrien.',['3-2','3-6','1-8'],[
 r'Et koordinatbytte gir nye navn til punktene i området. Det er nyttig når et komplisert område blir et rektangel eller en sirkel i de nye koordinatene.',
 r'Jacobianen beskriver den lokale lineære avbildningen. Absoluttverdien av determinanten gir lokal arealskalering. Både integranden, området og arealelementet må endres.',
 r'Polarkoordinater passer sirkler og radielle funksjoner. Arealelementet inneholder radiusen fordi en liten vinkel dekker større buelengde lenger fra sentrum.',
 r'For en ellipse kan vi bruke skalert polarform. Pass på at parametrisering ikke teller samme areal flere ganger, bortsett fra randsett med areal null.'
],[r'\iint_Df(x)dx=\iint_Uf(g(u))|\det Dg(u)|du',r'x=r\cos\theta,\ y=r\sin\theta,\quad dA=r\,dr\,d\theta'],r'Finn arealet av ellipsen $x^2/9+y^2/4\le1$.',[
 r'Sett $x=3r\cos\theta$, $y=2r\sin\theta$.',r'Jacobianens absoluttverdi er $6r$, med $0\le r\le1$, $0\le\theta\le2\pi$.',r'Arealet er $\int_0^{2\pi}\int_0^16r dr d\theta=6\pi$.'],r'Glemt Jacobideterminant gir feil selv om integranden og grensene er riktige.','jacobian',[
 num(r'Avbildningen $x=3u,y=2v$ skalerer areal med hvilken faktor?',6,[r'Determinanten er $3\cdot2=6$.']),
 mc(r'Hva er arealelementet i polarkoordinater?',[r'$r\,dr\,d\theta$',r'$dr\,d\theta$',r'$r^2\,dr\,d\theta$'],0,r'Vinkelretningen har lengdeskala r.'),
 num(r'En ellipse har halvakser 4 og 2. Arealet er $C\pi$. Finn C.',8,[r'$A=\pi ab=8\pi$.']),
 num(r'$x=u+v,y=u-v$. Hva er absoluttverdien av Jacobideterminanten?',2,[r'$\det\begin{pmatrix}1&1\\1&-1\end{pmatrix}=-2$. Absoluttverdien er 2.']),
 work(r'Beregn $\iint_{x^2+y^2\le1}(x^2+y^2)dA$.',[r'Bruk polarform: integranden er $r^2$, arealelementet $rdrd\theta$.',r'$\int_0^{2\pi}\int_0^1r^3drd\theta$.',r'Svaret er $2\pi/4=\pi/2$.'],['Endret integranden','Tok med Jacobianen','Brukte full sirkel'])])
add('3-8','Greens teorem: sirkulasjon','Koble arbeid rundt randen til rotasjon inne i området.',['3-5','3-6'],[
 r'Greens sirkulasjonsteorem erstatter et lukket kurveintegral i planet med et dobbeltintegral. Lokale bidrag inne i området summeres; langs indre delekanter kansellerer de hverandre.',
 r'Positiv orientering betyr at området ligger til venstre når vi går langs randen. Ytterranden går mot klokken, mens randen rundt et hull går med klokken.',
 r'Feltet må være tilstrekkelig glatt på et område som inneholder hele flaten og randen. Et felt med singularitet inne i kurven kan ikke behandles som om hullet ikke fantes.',
 r'Teoremet kan også brukes baklengs til å regne areal fra en parametrisering av randen. Velg et felt med konstant rotasjon lik 1.'
],[r'\oint_{\partial D}Pdx+Qdy=\iint_D(Q_x-P_y)dA',r'\operatorname{areal}(D)=\frac12\oint_{\partial D}(xdy-ydx)'],r'Finn sirkulasjonen til $F=(-y,x)$ rundt en sirkel med radius 2 mot klokken.',[
 r'$Q_x-P_y=1-(-1)=2$.',r'Arealet er $4\pi$.',r'Integralet er $2\cdot4\pi=8\pi$.'],r'Riktig orientering er en del av svaret, ikke bare en tegnedetalj.','line',[
 num(r'$P=-3y$, $Q=2x$. Finn $Q_x-P_y$.',5,[r'$2-(-3)=5$.']),
 mc(r'Positiv orientering rundt et hull er?',['Med klokken','Mot klokken','Vilkårlig'],0,r'Området skal fortsatt ligge til venstre.',2),
 num(r'Rotasjonen er konstant 4 og området har areal 3. Finn positiv sirkulasjon.',12,[r'$\iint_D4dA=12$.']),
 mc(r'Feltet er singulært i et punkt inne i området. Kan vanlig Green brukes direkte?',['Nei, hypotesene må håndteres','Ja, alltid','Bare ved negativ orientering'],0,r'Glatthet må gjelde i hele området.'),
 work(r'Bruk Green til å finne $\oint xdy$ rundt enhetssirkelen mot klokken.',[r'Velg $P=0$, $Q=x$.',r'$Q_x-P_y=1$.',r'Integralet er sirkelens areal $\pi$.'],['Valgte riktig felt','Regnet rotasjonen','Brukte orienteringen'])])
add('3-9','Greens teorem: fluks','Koble utstrømning til divergens.',['3-8','3-4'],[
 r'Fluks måler feltet gjennom randen, i normalretningen. Positiv fluks betyr netto utstrømning. Sirkulasjon måler derimot feltet langs randen.',
 r'Divergensen $P_x+Q_y$ beskriver lokal utvidelse eller netto kildevirkning. Integralet av divergensen over området er lik samlet utadrettet fluks.',
 r'For en rand som går mot klokken er det utadrettede normalelementet $(dy,-dx)$. Derfor blir fluksen $Pdy-Qdx$. Det er et annet fortegnsmønster enn arbeidsintegralet.',
 r'Et felt kan ha null divergens og stor rotasjon, eller motsatt. Disse målene sier forskjellige ting om feltet. Singulariteter må behandles like forsiktig som for sirkulasjonsformen.'
],[r'\oint_{\partial D}F\cdot n\,ds=\iint_D(P_x+Q_y)dA',r'F\cdot n\,ds=Pdy-Qdx\quad\text{ved positiv orientering}'],r'Finn utadrettet fluks av $F=(x,y)$ gjennom enhetssirkelen.',[
 r'Divergensen er $1+1=2$.',r'Integralet av 2 over enhetsskiven er $2\pi$.',r'Direkte: feltet er enhetsnormalen på randen, så fluksen er omkretsen.'],r'Normalretning og tangentretning må ikke blandes.','field',[
 num(r'Finn divergensen til $F=(2x,3y)$.',5,[r'$P_x+Q_y=2+3=5$.']),
 num(r'$F=(-y,x)$. Hva er divergensen?',0,[r'$P_x=0$ og $Q_y=0$.']),
 mc(r'Positiv utadrettet fluks betyr?',['Mer strømmer ut enn inn','Feltet roterer mot klokken','Alt står stille'],0,r'Fluksen summerer normalbidrag med utad som positivt.'),
 num(r'Konstant divergens 3 over areal 2 gir hvilken fluks?',6,[r'$\iint_D3dA=6$.']),
 work(r'Finn fluksen av $F=(x^2,y)$ gjennom randen av $[0,1]^2$.',[r'Divergensen er $2x+1$.',r'Integrer $\int_0^1\int_0^1(2x+1)dydx$.',r'Svaret er $[x^2+x]_0^1=2$.'],['Brukte divergensformen','Satte opp området','Valgte utadrettet normal'])])
add('3-10','Kompleks derivasjon og konturintegraler','Bruke Cauchy–Riemann og Cauchys integralformel.',['1-2','3-8'],[
 r'Kompleks deriverbarhet krever at differansekvotienten har samme grense fra alle komplekse retninger. Det er mye sterkere enn å kunne partiellderivere real- og imaginærdel hver for seg.',
 r'For $f=u+iv$ gir Cauchy–Riemann-likningene nødvendige betingelser. Når første partiellderiverte er kontinuerlige i et nabolag og likningene gjelder der, er funksjonen holomorf.',
 r'Et konturintegral beregnes ved $\int f(z(t))z\prime(t)dt$. For holomorfe funksjoner i et enkelt sammenhengende område blir integralet rundt lukkede kurver null.',
 r'Cauchys integralformel henter funksjonsverdien inne i kurven fra randintegralet. Poler på selve kurven er ikke tillatt i standardformelen. En holomorf funksjons real- og imaginærdel er harmoniske.'
],[r'u_x=v_y,\qquad u_y=-v_x',r'\oint_\Gamma\frac{f(z)}{z-a}dz=2\pi i f(a)'],r'Er $f(z)=\bar z$ kompleksderiverbar?',[
 r'Her er $u=x$ og $v=-y$.',r'$u_x=1$, men $v_y=-1$.',r'Cauchy–Riemann feiler overalt, så funksjonen er ingen steder kompleksderiverbar.'],r'Cauchys teorem kan ikke brukes over en singularitet som ligger inne i området.','complex',[
 mc(r'Hvilken er holomorf på hele det komplekse planet?',[r'$z^2$',r'$\bar z$',r'$|z|$'],0,r'Polynomer i z er holomorfe overalt.'),
 num(r'For $f(z)=z^2$, hva er realdelen av $f\prime(1+i)$?',2,[r'$f\prime=2z=2+2i$.']),
 num(r'$\oint_{|z|=1} dz/z=C\pi i$, mot klokken. Finn C.',2,[r'Cauchys formel med $f=1$, $a=0$ gir $2\pi i$.']),
 num(r'Finn $\oint_{|z|=1} z^3dz$.',0,[r'Integranden er holomorf overalt og har en stamfunksjon.']),
 work(r'Beregn $\oint_{|z|=2}e^z/(z-1)\,dz$ mot klokken.',[r'$e^z$ er holomorf og punktet 1 ligger innenfor kurven.',r'Cauchys integralformel gir $2\pi i e^1$.',r'Svaret er $2\pi i e$.'],['Sjekket singularitetens plassering','Brukte formelen med a=1','Tok med orienteringen'])])
add('3-11','Laplaceoperatoren og harmoniske funksjoner','Løse et todimensjonalt randverdiproblem.',['2-8','3-2','3-9'],[
 r'Laplaceoperatoren er divergensen av gradienten. Vi skriver $\Delta_x=\partial_x\nabla_x$. I kartesiske koordinater summerer den de rene andrederiverte.',
 r'En harmonisk funksjon oppfyller $\Delta u=0$. Dette beskriver blant annet stasjonær varme uten kilder. Gradientfeltet har da null netto fluks ut av områder der løsningen er glatt.',
 r'På et rektangel kan vi bruke separasjon. Nullverdier på to motsatte sider gir sinus i den retningen, mens den andre retningen får hyperbolske sinus- og cosinusfunksjoner.',
 r'I polarkoordinater endres operatorens uttrykk fordi koordinatretningene og lengdeskalaene varierer. For radielle funksjoner i planet står både andrederivert og et ledd med første derivert igjen.'
],[r'\Delta u=u_{xx}+u_{yy}',r'\Delta u=u_{rr}+\frac1ru_r+\frac1{r^2}u_{\theta\theta}',r'u(x,y)=\frac{\sinh(ny)}{\sinh(nH)}\sin(nx)'],r'Løs på $0<x<\pi$, $0<y<H$ med null på tre sider og $u(x,H)=\sin2x$.',[
 r'Velg $u=X(x)Y(y)$ med $X=\sin2x$.',r'$Y\prime\prime-4Y=0$. Kravet ved y=0 gir $Y=C\sinh2y$.',r'Toppkravet gir $u=\sin2x\,\sinh(2y)/\sinh(2H)$.'],r'Laplaceoperatoren er ikke en Laplacetransform.','harmonic',[
 num(r'Finn $\Delta(x^2-y^2)$.',0,[r'$2-2=0$.']),
 num(r'Finn $\Delta(x^2+y^2)$.',4,[r'$2+2=4$.']),
 mc(r'Hva betyr harmonisk?',[r'$\Delta u=0$',r'$u=0$ overalt',r'$\nabla u=0$ overalt'],0,r'Harmoniske funksjoner kan variere selv om summen av andrederiverte er null.'),
 num(r'For $u=\ln r$ i planet, $r>0$, hva er $\Delta u$?',0,[r'$u_{rr}=-1/r^2$ og $u_r/r=1/r^2$.']),
 work(r'Vis at $u=\sin x\sinh y$ er harmonisk.',[r'$u_{xx}=-\sin x\sinh y$.',r'$u_{yy}=\sin x\sinh y$.',r'Summen er null.'],['Tok begge andrederiverte','Beholdt fortegnene','Summerte til null'])])
add('3-12','Parametriserte flater og fluks','Beregne areal og felt gjennom en flate.',['3-1','3-5','3-7'],[
 r'En parametrisert flate bruker to parametre for å angi punkter i rommet. De to parameterderiverte ligger i tangentplanet. Kryssproduktet gir en normal og lokal arealskalering.',
 r'Skalarflateintegralet bruker normen av kryssproduktet. Fluksintegralet bruker det orienterte kryssproduktet uten norm. Normalen må vendes slik oppgaven ber om.',
 r'For en graf $z=f(x,y)$ kan vi bruke $r=(x,y,f)$. Da er oppadrettet arealvektor $(-f_x,-f_y,1)dxdy$. Dette sparer normalisering.',
 r'En lukket flate velges vanligvis med utadrettet normal. I denne modulen øver vi direkte parametrisering; i Matte 4 kommer teoremene som kan erstatte flateintegralet.'
],[r'dS=\|r_u\times r_v\|du\,dv',r'd\mathbf S=(r_u\times r_v)du\,dv=n\,dS',r'\iint_SF\cdot d\mathbf S=\iint_UF(r)\cdot(r_u\times r_v)du\,dv'],r'Finn oppadrettet fluks av $F=(0,0,1)$ gjennom $z=x+y$ over enhetskvadratet.',[
 r'$r=(x,y,x+y)$ gir $r_x\times r_y=(-1,-1,1)$.',r'$F\cdot(r_x\times r_y)=1$.',r'Integralet over enhetskvadratet er 1. Selve flatearealet er $\sqrt3$.'],r'Fluks og flateareal er forskjellige størrelser selv om de gjelder samme flate.','surface',[
 num(r'En horisontal flate har areal 4 og oppadrettet normal. $F=(0,0,3)$. Finn fluksen.',12,[r'Normalbidraget er 3, så fluksen er 12.']),
 mc(r'Hva skjer med fluksen hvis normalen snus?',['Fortegnet snus','Den er uendret','Den blir null'],0,r'Arealvektoren skifter fortegn.'),
 num(r'Grafen $z=0$ over $[0,2]^2$ har hvilket areal?',4,[r'Det er et flatt kvadrat med side 2.']),
 mc(r'Hvilket uttrykk brukes for skalararealet?',[r'$\|r_u\times r_v\|$',r'$r_u\cdot r_v$',r'$r_u+r_v$'],0,r'Kryssproduktets norm gir parallellogramarealet.'),
 work(r'Finn arealet av $z=2x$ over $0\le x,y\le1$.',[r'Bruk $r=(x,y,2x)$.',r'$r_x\times r_y=(-2,0,1)$ har norm $\sqrt5$.',r'Arealet er $\sqrt5$ ganger grunnflatens areal 1.'],['Parametriserte flaten','Fant kryssproduktet','Integrerte normen'])])
add('4-1','Trippelintegraler og kulekoordinater','Beregne volum, masse og gjennomsnitt i rommet.',['3-6','3-7','3-12'],[
 r'Trippelintegralet summerer over et volum. Integranden kan være tetthet, energi per volum eller bare 1. Velg koordinater etter symmetrien og tegn snittene før du setter grensene.',
 r'Sylinderkoordinater har volumelement $r\,dr\,d\theta\,dz$. Kulekoordinater har et ekstra lengdeledd og en sinusfaktor. Her er $\theta$ vinkel rundt z-aksen og $\varphi$ vinkel ned fra positiv z-akse.',
 r'For en kule med sentrum $x$ skriver vi $z=x+sn(\theta,\varphi)$. Radien s varierer i volumintegralet og holdes fast i flateintegralet. Den samme parametriseringstanken brukes senere i middelverdisatsen.',
 r'Massesenteret er et vektorgjennomsnitt vektet med tetthet. Symmetri kan bestemme noen komponenter uten regning. En ikke-konstant tetthet kan bryte geometrisk symmetri.'
],[r'n=(\sin\varphi\cos\theta,\sin\varphi\sin\theta,\cos\varphi)',r'dS=s^2\sin\varphi\,d\varphi\,d\theta,\quad dz=s^2\sin\varphi\,d\varphi\,d\theta\,ds',r'\bar z=\frac{\iiint_\Omega z\rho(z)dz}{\iiint_\Omega\rho(z)dz}'],r'Finn volumet av kulen med radius R.',[
 r'Grensene er $0\le s\le R$, $0\le\varphi\le\pi$, $0\le\theta\le2\pi$.',r'Integralet faktoriseres: $\int_0^Rs^2ds\int_0^\pi\sin\varphi d\varphi\int_0^{2\pi}d\theta$.',r'Volumet er $(R^3/3)\cdot2\cdot2\pi=4\pi R^3/3$.'],r'Bytter du vinkelnavn fra en annen bok, må sinusfaktoren følge riktig vinkel.','sphere',[
 num(r'En boks er $2\times3\times4$ og har tetthet 5. Hva er massen?',120,[r'Volumet er 24, så massen er 120.']),
 num(r'Volumet av en kule skaleres med hvilken faktor når radien dobles?',8,[r'Volumet er proporsjonalt med $R^3$, så faktoren er $2^3=8$.']),
 mc(r'Hvilken vinkel går fra 0 til π i vår kulekonvensjon?',[r'$\varphi$',r'$\theta$','Begge'],0,r'$\varphi$ måles ned fra positiv z-akse.'),
 num(r'En homogen kule er sentrert i origo. Hva er z-koordinaten til massesenteret?',0,[r'Symmetri gir massesenter i origo.']),
 work(r'Finn $\iiint_{|z|\le R}|z|^2dz$.',[r'Integranden er $s^2$, og volumelementet bidrar med ytterligere $s^2$.',r'Vinkelintegralene gir $4\pi$.',r'Svaret er $4\pi\int_0^Rs^4ds=4\pi R^5/5$.'],['Skilte integrand fra volumelement','Brukte riktige vinkelgrenser','Integrerte riktig potens'])])
add('4-2','Nabla, divergens, rotasjon og koordinater','Bruke operatorene uten å miste dimensjoner og fortegn.',['3-2','3-4','3-11'],[
 r'Vi bruker radoperatoren $\partial_x=(\partial_{x_1},\partial_{x_2},\partial_{x_3})$ og kolonneoperatoren $\nabla_x=\partial_x^T$. Da er divergensen $\partial_xF$ og Laplaceoperatoren $\partial_x\nabla_x$.',
 r'Rotasjonen av et vektorfelt måler lokal sirkulasjon. Divergensen måler lokal ekspansjon. Gradient tar skalar til vektor, divergens tar vektor til skalar, mens rotasjon tar vektor til vektor i tre dimensjoner.',
 r'For glatte felt følger identitetene om gradient og rotasjon fra likhet av blandede deriverte. Dobbel rotasjon blir gradienten av divergensen minus komponentvis Laplaceoperator.',
 r'Ved et konstant ortogonalt koordinatbytte $y=Ax$ gir kjerneregelen $\partial_x=\partial_yA$ og $\nabla_x=A^T\nabla_y$. Dermed er $\Delta_x=\partial_yAA^T\nabla_y=\Delta_y$. For krumme koordinater varierer basisen, så dette korte argumentet kan ikke brukes uendret.'
],[r'\nabla\times\nabla u=0,\qquad\nabla\cdot(\nabla\times F)=0',r'\nabla\times(\nabla\times F)=\nabla(\nabla\cdot F)-\Delta F',r'\partial_x=\partial_yA,\quad\nabla_x=A^T\nabla_y'],r'Finn divergens og rotasjon av $F=(-y,x,2z)$.',[
 r'Divergensen er $0+0+2=2$.',r'Rotasjonen har bare z-komponent: $\partial_x(x)-\partial_y(-y)=2$.',r'$\nabla\times F=(0,0,2)$. Feltet både roterer og utvider seg.'],r'Operatorene virker på det som kommer etter dem. Produktregelen forsvinner ikke i vektornotasjon.','field',[
 num(r'Finn $\Delta(x^2+y^2+z^2)$.',6,[r'Hver av tre rene andrederiverte er 2.']),
 mc(r'Hva er rotasjonen av gradienten til et $C^2$-skalarfelt?',['Nullvektoren','Skalarfeltet selv','Alltid gradienten'],0,r'Blandede andrederiverte kansellerer.'),
 num(r'$F=(x,2y,3z)$. Finn divergensen.',6,[r'$1+2+3=6$.']),
 mc(r'Hvorfor er Laplaceoperatoren uendret ved et ortogonalt koordinatbytte?',[r'$AA^T=I$',r'$A=0$',r'$A$ har bare positive elementer'],0,r'Kjerneregelen gir $\partial_yAA^T\nabla_y$.',2),
 work(r'Vis rotasjonsinvarians av $\Delta$ for et konstant ortogonalt $A$ med $y=Ax$.',[r'Kjerneregelen gir $\partial_x=\partial_yA$ og $\nabla_x=A^T\nabla_y$.',r'Sett sammen: $\Delta_x=\partial_yAA^T\nabla_y$.',r'Ortogonalitet gir identitetsmatrisen, og dermed $\Delta_x=\Delta_y$.'],['Brukte rad og kolonne korrekt','Brukte at A er konstant','Brukte ortogonalitet'])])
add('4-3','Divergensteoremet og normalderivert','Regne fluks gjennom lukkede flater og knytte den til volum.',['4-1','4-2'],[
 r'Divergensteoremet sier at samlet utadrettet fluks er integralet av divergensen i volumet. Tenk små bokser: fluksen gjennom indre deleflater kansellerer, og bare ytterflaten står igjen.',
 r'Teoremet krever en lukket rand og et tilstrekkelig glatt felt i hele volumet. For en åpen flate kan vi legge til en hjelpelokkflate, bruke teoremet og trekke fra lokkets bidrag.',
 r'Normalderiverten av et skalarfelt er gradientens komponent langs enhetsnormalen. Med $d\mathbf S=n\,dS$ er $\nabla u\cdot d\mathbf S=(\partial u/\partial n)dS$.',
 r'I kulekoordinater har et radialt felt $F=f(s)e_s$ divergens $(s^2f)\prime/s^2$ for $s>0$. Singulariteter i sentrum må undersøkes separat; null divergens utenfor sentrum betyr ikke null total fluks.'
],[r'\iint_{\partial\Omega}F\cdot d\mathbf S=\iiint_\Omega\nabla\cdot F\,dz',r'\frac{\partial u}{\partial n}=\nabla u\cdot n',r'\nabla\cdot(f(s)e_s)=\frac1{s^2}\frac d{ds}(s^2f(s))'],r'Finn utadrettet fluks av $F=(x,y,z)$ gjennom en kule med radius R.',[
 r'Divergensen er 3.',r'Fluksen er 3 ganger volumet $4\pi R^3/3$.',r'Svaret er $4\pi R^3$. Direkte er normalbidraget R på hele kulen.'],r'Øving 4-3 oppgave 5 er uttrykkelig unntatt eksamen i LF fra 2026. Kilden har fortsatt verdifullt fordypningsstoff.','sphere',[
 num(r'Konstant divergens 2 over volum 5 gir hvilken fluks?',10,[r'Integralet av divergensen er $2\cdot5=10$.']),
 num(r'$u=x^2+y^2+z^2$ på kulen med radius 3. Finn utadrettet normalderivert.',6,[r'$\nabla u=2z$ og $n=z/3$, så prikkproduktet er 6.']),
 mc(r'Kan divergensteoremet brukes direkte på en åpen halvkule?',['Nei, vi må lukke flaten eller integrere direkte','Ja, som om den var lukket','Bare med radius 1'],0,r'Teoremet gjelder hele randen til et volum.'),
 num(r'Et radialt felt har $f(s)=s$. Hva er divergensen for $s>0$?',3,[r'$(s^3)\prime/s^2=3$.']),
 work(r'Finn fluksen av $F=(0,0,z)$ ut gjennom den krumme øvre enhetshalvkulen.',[r'Lukk med skiven i z=0. Divergensen er 1.',r'Volumet er $2\pi/3$. På skiven er feltet null.',r'Den krumme fluksen er derfor $2\pi/3$.'],['Lukket flaten','Regnet og vurderte lokket','Brukte halvkulevolumet'])])
add('4-4','Stokes, rotasjon og moment','Koble sirkulasjon til rotasjon gjennom en flate.',['3-12','4-2'],[
 r'Stokes teorem erstatter et linjeintegral rundt en romkurve med rotasjonsfluksen gjennom en flate som spenner ut kurven. Vi kan velge den enkleste flaten når feltet er glatt der.',
 r'Normalen og randretningen henger sammen gjennom høyrehåndsregelen. Sett tommelen langs normalen; fingrene angir positiv retning rundt randen.',
 r'For stiv rotasjon med vinkelhastighet $\omega$ er hastighetsfeltet $v=\omega\times r$. Rotasjonen av feltet er $2\omega$, ikke $\omega$. Dette forklarer den lokale koblingen mellom sirkulasjon og fysisk rotasjon.',
 r'Dreiemoment er $r\times F$, og dreieimpuls er $r\times p$. Når det totale ytre momentet er null, bevares dreieimpulsen. For en rotasjon rundt fast akse betyr det at mindre treghetsmoment gir større vinkelhastighet.'
],[r'\oint_{\partial S}F\cdot dr=\iint_S(\nabla\times F)\cdot d\mathbf S',r'\tau=r\times F,\quad L=r\times p,\quad\dot L=\tau'],r'Finn sirkulasjonen av $F=(-y,x,0)$ rundt enhetssirkelen i xy-planet mot klokken.',[
 r'Velg den flate skiven med normal $(0,0,1)$.',r'Rotasjonen er $(0,0,2)$.',r'Fluksen er $2\pi$, lik sirkulasjonen.'],r'Øving 4-4 oppgave 9 er unntatt eksamen i 2026-LF. Det fritar ikke for å forstå Stokes og orientering.','line',[
 num(r'Et stivt legeme har $\omega=(0,0,3)$. Hva er z-komponenten av $\nabla\times v$?',6,[r'Rotasjonen er $2\omega$.']),
 mc(r'Normalen peker opp. Positiv randretning sett ovenfra er?',['Mot klokken','Med klokken','Vilkårlig'],0,r'Høyrehåndsregelen bestemmer retningen.'),
 num(r'$r=(2,0,0)$ og $F=(0,3,0)$. Finn z-komponenten av momentet.',6,[r'$r\times F=(0,0,6)$.']),
 num(r'Treghetsmomentet halveres uten ytre moment. Vinkelhastigheten multipliseres med?',2,[r'$I\omega$ bevares, så $\omega$ dobles.']),
 work(r'Finn sirkulasjonen av $F=(0,x,0)$ rundt en sirkel med radius 2 i xy-planet, mot klokken.',[r'Rotasjonen er $(0,0,1)$.',r'Velg skiven med oppadrettet normal.',r'Integralet er skivens areal $4\pi$.'],['Regnet rotasjonen','Valgte riktig flate og normal','Regnet arealet'])])
add('4-5','Maxwells likninger','Gå mellom integralform og differensialform.',['4-3','4-4'],[
 r'Maxwells likninger kobler elektrisk og magnetisk felt til ladnings- og strømtetthet. Gradient, divergens og rotasjon virker bare på romkoordinatene; prikken eller tidsindeksen betyr tidsderivasjon.',
 r'Divergenslovene blir integralform ved divergensteoremet. Rotasjonslovene blir integralform ved Stokes. Vi holder flaten fast når tidsderivasjonen flyttes gjennom integralet.',
 r'Tar vi divergensen av Ampère–Maxwell og bruker Gauss, får vi ladningsbevaring. Forskyvningsstrømleddet er nødvendig for at tidsvarierende ladning skal passe inn.',
 r'I vakuum uten ladning og strøm gir dobbel rotasjon bølgelikningen for feltene. Fortegnene fra Faradays lov og identiteten for dobbel rotasjon må begge være med. Elektrostatiske felt kan skrives $E=-\nabla V$; magnetfelt kan lokalt skrives som rotasjonen av et vektorpotensial.'
],[r'\nabla\cdot E=\rho/\epsilon_0,\quad\nabla\cdot B=0',r'\nabla\times E=-B_t,\quad c^2\nabla\times B=E_t+J/\epsilon_0',r'\rho_t+\nabla\cdot J=0'],r'Utled bølgelikningen for E i kildefritt vakuum.',[
 r'Ta rotasjonen av Faraday: $\nabla\times(\nabla\times E)=-\partial_t(\nabla\times B)$.',r'Venstresiden er $-\Delta E$ fordi $\nabla\cdot E=0$. Høyresiden er $-E_{tt}/c^2$.',r'Dermed er $E_{tt}=c^2\Delta E$.'],r'$\nabla\cdot B=0$ betyr ikke at magnetfeltet er null.','field',[
 mc(r'Hvilket teorem omgjør Faradays lov til integralform?',['Stokes','Bare Pytagoras','Bare Taylor'],0,r'Faraday inneholder rotasjon og blir et randintegral ved Stokes.'),
 num(r'En lukket flate omslutter ladning $Q=6$ med $\epsilon_0=2$ i valgte enheter. Finn elektrisk fluks.',3,[r'Gauss gir $Q/\epsilon_0=3$.']),
 num(r'Hva er netto magnetisk fluks gjennom en lukket flate?',0,[r'Divergensen av B er null, så totalfluksen er null.']),
 mc(r'Hvilken størrelse er en skalar?',[r'Ladningstetthet $\rho$',r'Strømtetthet $J$',r'Elektrisk felt $E$'],0,r'Ladningstetthet gir ett tall per rom- og tidspunkt.'),
 work(r'Utled $\rho_t+\nabla\cdot J=0$ fra Maxwell.',[r'Ta divergensen av $c^2\nabla\times B=E_t+J/\epsilon_0$.',r'Venstresiden er null. Bytt rekkefølge mellom tid og rom på høyresiden.',r'Bruk $\nabla\cdot E=\rho/\epsilon_0$ og multipliser med $\epsilon_0$.'],['Tok riktig operator','Brukte divergens av rotasjon lik null','Satte inn Gauss'])])
add('4-6','Harmoniske funksjoner, middelverdi og entydighet','Forstå Laplace og Poisson gjennom fluks og energi.',['4-1','4-3','4-2'],[
 r'For en radial funksjon i tre dimensjoner er $\Delta u=u\prime\prime+2u\prime/s$. Løsningen av $\Delta u=0$ for $s>0$ er $a+b/s$. Leddet $1/s$ er singulært i origo og er ikke harmonisk på hele rommet.',
 r'Fundamentalløsningen $G(z)=1/(4\pi|z|)$ oppfyller $-\Delta G=\delta$ i fordelingsforstand. Konvolusjon med en passende kildetetthet gir en løsning til Poisson på hele rommet, med tilleggskrav for å bestemme løsningen entydig.',
 r'En harmonisk funksjons verdi i sentrum er lik gjennomsnittet over en kuleflate og over kulevolumet når hele kulen ligger i området. Maksimumsprinsippet sier at en ikke-konstant harmonisk funksjon ikke kan ha et indre maksimum.',
 r'Entydighet for Dirichletproblemet følger ved å ta differansen av to løsninger. Differansen er harmonisk med null randverdi. Green-identiteten gir null gradientenergi, slik at differansen må være null. Den harmoniske løsningen minimerer Dirichletenergien blant funksjoner med samme randverdier.'
],[r'u(x)=\frac1{4\pi s^2}\iint_{\partial B(x,s)}u\,dS',r'\int_\Omega|\nabla w|^2=\int_{\partial\Omega}w\frac{\partial w}{\partial n}dS-\int_\Omega w\Delta w',r'E(u)=\frac12\int_\Omega|\nabla u|^2'],r'Vis at $u=1/s$ er harmonisk for $s>0$.',[
 r'$u\prime=-1/s^2$ og $u\prime\prime=2/s^3$.',r'$\Delta u=2/s^3+(2/s)(-1/s^2)=0$.',r'Konklusjonen gjelder ikke i sentrum, der funksjonen ikke er definert.'],r'Ved bevis for kulemiddelverdien må s-avhengigheten i både flateareal og integral tas med.','harmonic',[
 num(r'En harmonisk funksjon har konstant randverdi 7 på en begrenset sammenhengende region. Hva er løsningen?',7,[r'Konstanten 7 er en løsning, og Dirichlet-entydighet gir at den er den eneste.']),
 mc(r'Er $1/|z|$ harmonisk på hele $\mathbb R^3$?',['Nei, den er singulær i origo','Ja','Bare i origo'],0,r'Den er harmonisk utenfor origo.'),
 num(r'Gjennomsnittet av en harmonisk funksjon over en kuleflate er 4. Hva er verdien i sentrum?',4,[r'Middelverdisatsen gir samme verdi.']),
 mc(r'Hva er et nyttig første steg i et entydighetsbevis?',['Ta differansen av to antatte løsninger','Legge sammen alle randverdier','Anta at gradienten er 1'],0,r'Differansen får homogen likning og homogene randkrav.'),
 work(r'Vis at en harmonisk løsning u minimerer Dirichletenergien for gitt randverdi.',[r'Skriv en konkurrent som $v=u+w$ med $w=0$ på randen.',r'Utvid energien: $E(v)=E(u)+\int\nabla u\cdot\nabla w+E(w)$.',r'Integrasjon ved deler gir null kryssledd fordi $\Delta u=0$ og $w=0$ på randen. Dermed $E(v)\ge E(u)$.'],['Brukte null randverdi for variasjonen','Utvidet med riktig kryssledd','Brukte Green og ikke-negativ energi'])],r'For kulemiddelverdien: sett $M(s)=(4\pi)^{-1}\int_0^{2\pi}\int_0^\pi u(x+sn)\sin\varphi\,d\varphi d\theta$. Derivasjon gir $M\prime(s)=(4\pi s^2)^{-1}\int_{\partial B}\partial_nu\,dS=(4\pi s^2)^{-1}\int_B\Delta u\,dz=0$. Kontinuitet gir $M(0)=u(x)$. Integrer flategjennomsnittet med vekten $s^2$ for å få volumgjennomsnittet.')
add('4-7','Fluidmekanikk og materiell derivasjon','Skille lokal tidsendring fra endring langs en partikkel.',['3-2','4-3'],[
 r'Et hastighetsfelt beskriver hastigheten ved faste steder i rommet. En partikkel flytter seg gjennom feltet og opplever både lokal tidsendring og romlig variasjon. Kjerneregelen samler dette i den materielle deriverte.',
 r'Akselerasjonen er $v_t+(v\cdot\nabla)v$. Et stasjonært felt kan ha ikke-null akselerasjon fordi partikkelen beveger seg mellom steder med ulik hastighet.',
 r'For en ideell væske uten viskositet gir Newtons lov Eulerlikningen. Trykk virker fra høyt til lavt trykk og gir $-\nabla p$. Hydrostatikk er spesialtilfellet der væsken er i ro.',
 r'Bernoulli følger langs en strømlinje for stasjonær, inkompressibel, ikke-viskøs strømning med konservativ kroppskraft. Konstanten trenger ikke være lik på tvers av strømlinjer uten ytterligere betingelser. Massesenter og treghetsmoment finnes med tetthetsvektede integraler.'
],[r'\frac{D f}{Dt}=f_t+\partial_xf\,v',r'\rho[v_t+(v\cdot\nabla)v]=-\nabla p+\rho g',r'p+\tfrac12\rho|v|^2+\rho gz=\text{konstant langs en strømlinje}'],r'Finn akselerasjonen i det stasjonære 1D-feltet $v(x)=2x$.',[
 r'Lokal tidsderivert er null.',r'Konvektiv akselerasjon er $v v_x=(2x)2=4x$.',r'En partikkel akselererer selv om feltet ikke endres ved faste punkter.'],r'Stasjonært betyr ikke at partiklene har konstant hastighet.','flow',[
 num(r'$v(x)=3x$. Hva er akselerasjonen ved $x=2$?',18,[r'$a=vv_x=6\cdot3=18$.']),
 mc(r'Hvorfor trenger vi materiell derivert?',['Partikkelen beveger seg gjennom romlig variasjon','Fordi tid ikke finnes','Fordi alle felt er konstante'],0,r'Kjerneregelen tar med både tids- og posisjonsendring.'),
 num(r'$f(x,t)=x+t$ langs en partikkel med fart 2. Finn $Df/Dt$.',3,[r'$f_t+f_xv=1+1\cdot2=3$.']),
 mc(r'Hva er trykkraft per volumenhet?',[r'$-\nabla p$',r'$p$ alene',r'$\Delta p$'],0,r'Trykkforskjeller driver kraft mot lavere trykk.'),
 work(r'Utled hydrostatisk trykk for konstant tetthet med z oppover.',[r'Sett hastighet og akselerasjon lik null i Eulerlikningen.',r'$0=-\nabla p-\rho g e_z$ gir $p_z=-\rho g$.',r'$p(z)=p(z_0)-\rho g(z-z_0)$.'],['Valgte retning for tyngdekraft','Satte akselerasjonen lik null','Integrerte med referansetrykk'])])
add('4-8','Bevaringslover, transport og diffusjon','Utlede PDE-er fra innstrømning minus utstrømning.',['4-3','4-7'],[
 r'En bevaringslov starter med en beholdning i et kontrollvolum. Endringsfarten er innstrømning minus utstrømning pluss eventuell produksjon. Med utadrettet normal kommer fluksen med negativt fortegn på høyresiden.',
 r'Divergensteoremet omgjør randfluksen til et volumintegral. Hvis balansen gjelder for alle små volum og feltene er glatte, må integrandene være like punktvis. Dette gir kontinuitetslikningen.',
 r'For massestrøm er $J=\rho v$. Konstant tetthet gir $\nabla\cdot v=0$. For konstant transportfart i én dimensjon flyttes startprofilen uten å endre form.',
 r'Ficks lov $J=-D\nabla\rho$ gir diffusjonslikningen for konstant D. Fouriers varmelov gir tilsvarende varmeledning. Hvis koeffisienten varierer, må den bli inne i divergensen. Med kildeledd kan masse eller energi tilføres i volumet.'
],[r'\frac d{dt}\int_\Omega\rho dz=-\int_{\partial\Omega}J\cdot d\mathbf S+\int_\Omega q dz',r'\rho_t+\nabla\cdot J=q',r'\rho_t+v\rho_x=0\Rightarrow\rho(x,t)=f(x-vt)'],r'Utled diffusjonslikningen uten kilder og med konstant D.',[
 r'Start med $\rho_t+\nabla\cdot J=0$.',r'Sett $J=-D\nabla\rho$.',r'Da blir $\rho_t-D\Delta\rho=0$.'],r'Fortegnet skal gi utjevning av topper, ikke at topper spontant vokser.','heat',[
 num(r'Innstrømning er 7 kg/s, utstrømning 4 kg/s og ingen kilde. Finn masseendring per sekund.',3,[r'$7-4=3$ kg/s.']),
 mc(r'Hva kjennetegner en inkompressibel strøm med konstant tetthet?',[r'$\nabla\cdot v=0$',r'$v=0$',r'$\nabla\times v=0$'],0,r'Kontinuitetslikningen reduseres til null divergens.'),
 num(r'En profil transporteres mot høyre med fart 3. Hvor langt har den flyttet seg etter 2 tidsenheter?',6,[r'Forskyvningen er $vt=6$.']),
 mc(r'Diffusjon transporterer vanligvis stoff i hvilken retning?',['Mot lavere konsentrasjon','Mot høyere konsentrasjon','Bare i positiv x-retning'],0,r'Minustegnet i Ficks lov gir strøm motsatt gradienten.'),
 work(r'Vis at total masse bevares under diffusjon med null normalfluks på randen.',[r'Integrer kontinuitetslikningen over volumet.',r'Bruk divergensteoremet: tidsderivert av total masse er minus randfluksen.',r'Null randfluks gir null tidsderivert og dermed konstant total masse.'],['Integrerte den lokale loven','Brukte randkravet','Konkluderte om total masse'])])
add('4-9','Bølger, refleksjon og kulemiddel','Løse bølgeproblemer på linjen og forstå forplantning i rommet.',['2-7','4-6','4-8'],[
 r'Bølgelikningen følger for små trykkforstyrrelser ved å kombinere linearisert masse- og momentbalanse med en sammenheng mellom trykk og tetthet. Bølgefarten bestemmes av denne sammenhengen.',
 r'På hele linjen er løsningen summen av høyre- og venstregående profiler. d’Alemberts formel bruker både startutslag og startfart. Verdien i et punkt avhenger bare av startdata innenfor et endelig påvirkningsintervall.',
 r'En fast ende gir refleksjon med fortegnsskifte og behandles med odde utvidelse. En fri ende gir jevn utvidelse for et null Neumann-krav. Utvid begge initialfunksjonene riktig.',
 r'I tre dimensjoner kan sfærisk middel redusere problemet til en radial likning. Produktet av radius og sfærisk middel oppfyller en 1D-bølgelikning. Kirchhoffs formel viser at data på kuleflaten med radius ct styrer løsningen. I to dimensjoner bidrar data fra hele skiven, slik at en ettervirkning kan bli igjen.'
],[r'u(x,t)=\frac{f(x-ct)+f(x+ct)}2+\frac1{2c}\int_{x-ct}^{x+ct}g(s)ds',r'u(x,t)=\partial_t\left[\frac1{4\pi c^2t}\int_{\partial B(x,ct)}f\,dS\right]+\frac1{4\pi c^2t}\int_{\partial B(x,ct)}g\,dS'],r'Løs på hele linjen med $c=1$, $f(x)=\cos x$, $g(x)=0$.',[
 r'd’Alembert gir $u=[\cos(x-t)+\cos(x+t)]/2$.',r'Addisjonsformelen gir $u=\cos x\cos t$.',r'Begge initialkrav og bølgelikningen kan kontrolleres direkte.'],r'Husk faktoren $1/(2c)$ foran startfartsintegralet.','wave',[
 mc(r'$f(x-ct)$ for $c>0$ beveger seg hvilken vei?',['Mot høyre','Mot venstre','Den står stille'],0,r'Et fast punkt i profilen krever $x-ct$ konstant, altså voksende x.'),
 num(r'Lydfarten er 340 m/s og avstanden 680 m. Hvor lang tid før fronten når frem?',2,[r'$t=d/c=2$ s.']),
 mc(r'Hvilken utvidelse brukes ved fast ende $u(0,t)=0$?',['Odde','Jevn','Konstant'],0,r'Odde utvidelse gir kansellering i endepunktet.'),
 num(r'$f=0$, $g=2$ konstant, $c=1$. Hva er $u(x,3)$ på hele linjen?',6,[r'Integralet over lengde 6 er 12, og faktoren 1/2 gir 6.']),
 work(r'Vis at $U(r,t)=rM(r,t)$ oppfyller $U_{tt}=c^2U_{rr}$ når $M_{tt}=c^2(M_{rr}+2M_r/r)$.',[r'$U_{tt}=rM_{tt}$.',r'$U_{rr}=2M_r+rM_{rr}$.',r'Multipliser likningen for M med r, og uttrykk begge sider med U.'],['Brukte produktregelen to ganger','Ganget hele likningen med radius','Fant samme operator'])],r'I to dimensjoner er løsningen $u(x,t)=\frac1{2\pi c}\left[\partial_t\int_{B(x,ct)}\frac{f(y)}{\sqrt{c^2t^2-|y-x|^2}}dy+\int_{B(x,ct)}\frac{g(y)}{\sqrt{c^2t^2-|y-x|^2}}dy\right]$. Tolk forskjellen fra 3D før du prøver å huske formelen: i 2D står et integral over skiven, i 3D over kuleflaten.')
add('4-10','Rotasjonsgeneratorer, deformasjon og symmetri','Koble skjevsymmetriske matriser til rotasjon.',['2-1','4-2','4-7'],[
 r'En lokal hastighetsgradient J kan deles i en symmetrisk del D og en skjevsymmetrisk del W. Den symmetriske delen beskriver deformasjon, mens den skjevsymmetriske delen beskriver lokal stiv rotasjon.',
 r'Kryssprodukt med en fast vektor kan skrives som multiplikasjon med en skjevsymmetrisk matrise. Eksponentialen av en slik matrise gir en rotasjon. For en enhetsakse gir Rodrigues formel en praktisk, endelig form.',
 r'Symmetrier danner grupper når de kan settes sammen, har identitet og inverse, og sammensetningen er assosiativ. Planrotasjoner av et regulært n-kant er en syklisk gruppe; legger vi til speilinger får vi den dihedrale gruppen.',
 r'Rekkefølgen på romrotasjoner betyr vanligvis noe. Generatorer er små byggeelementer som gir hele familien ved gjentatt sammensetning eller eksponentiering. For en Newtonsk inkompressibel væske er den viskøse spenningsdelen $2\mu D$.'
],[r'D=\frac{J+J^T}2,\quad W=\frac{J-J^T}2',r'S(a)b=a\times b,\quad S(a)^T=-S(a)',r'R(\theta)=I+\sin\theta S+(1-\cos\theta)S^2'],r'Finn generatoren for rotasjon rundt positiv z-akse.',[
 r'Kryssproduktet $e_z\times(x,y,z)=(-y,x,0)$.',r'Derfor er $S=\begin{pmatrix}0&-1&0\\1&0&0\\0&0&0\end{pmatrix}$.',r'$e^{\theta S}$ gir standard rotasjonsmatrise i xy-planet.'],r'Bruk en enhetsakse i Rodrigues-formelen slik den står her.','rotation',[
 num(r'Hvor mange rene rotasjonssymmetrier har et regulært sekskant?',6,[r'Vinklene er $k\cdot60^\circ$ for k=0 til 5.']),
 mc(r'Hvilken del av J beskriver lokal stiv rotasjon?',[r'$(J-J^T)/2$',r'$(J+J^T)/2$',r'$J^TJ$'],0,r'Den skjevsymmetriske delen er en rotasjonsgenerator.'),
 num(r'Hvor mange permutasjoner finnes av fire ulike elementer?',24,[r'$4!=24$.']),
 num(r'En regulær sekskant tillates både speilet og rotert i planet. Hvor mange symmetrier har den?',12,[r'6 rotasjoner og 6 speilinger.']),
 work(r'Vis at $R(t)=e^{tS}$ er ortogonal når $S^T=-S$.',[r'$R^T=e^{tS^T}=e^{-tS}$.',r'Matrisene $tS$ og $-tS$ kommuterer.',r'$R^TR=e^{-tS}e^{tS}=I$.'],['Transponerte eksponentialen','Brukte skjevsymmetri','Viste normbevaring'])])
add('4-11','d’Alembertoperatoren og Lorentztransformasjon','Forstå invarians i tid og rom.',['4-2','4-9','4-10'],[
 r'd’Alembertoperatoren kombinerer andrederivert i tid med romlig Laplaceoperator. Ved å bruke tidskoordinaten $x_0=ct$ får alle fire koordinatene lengdeenhet, og operatoren kan skrives med en diagonal metrikksmatrise.',
 r'En Lorentztransformasjon bevarer Minkowski-intervallet, ikke den vanlige euklidske lengden i fire dimensjoner. En boost langs x kobler rom og tid med faktoren $\gamma$.',
 r'Kjerneregelen gir transformasjonen av de deriverte. Kravet om bevart metrikk gjør at bølgeoperatoren får samme form i begge inertialsystemer, på samme måte som ortogonalitet bevarer Laplaceoperatoren ved romrotasjon.',
 r'Rapiditet gjør kollineære booster additive: $\beta=\tanh\eta$, $\gamma=\cosh\eta$. Hastigheter må kombineres med relativistisk addisjon. Booster i ulike retninger kan ikke generelt byttes om.'
],[r'\Box=\frac1{c^2}\partial_{tt}-\Delta,\quad\eta=\operatorname{diag}(1,-1,-1,-1)',r'ct\prime=\gamma(ct-\beta x),\quad x\prime=\gamma(x-\beta ct),\quad\gamma=(1-\beta^2)^{-1/2}',r'\Lambda^T\eta\Lambda=\eta'],r'Finn Lorentzfaktoren ved $v=0.6c$.',[
 r'$\beta=0.6$ og $1-\beta^2=0.64$.',r'$\sqrt{0.64}=0.8$.',r'$\gamma=1/0.8=1.25$.'],r'Lysfartens invarians krever Lorentztransformasjon; en galileisk transformasjon bevarer ikke bølgeoperatoren.','lorentz',[
 num(r'Finn $\gamma$ ved $v=0$.',1,[r'$\beta=0$ gir $\gamma=1$.']),
 mc(r'Hva bevarer en Lorentztransformasjon?',['Minkowski-intervallet','Vanlig 4D-lengde','Tiden alene'],0,r'Den bevarer den indefinite metrikken $\eta$.'),
 num(r'$c=1$, $t=5$, $x=3$, $y=z=0$. Finn $t^2-x^2$.',16,[r'$25-9=16$.']),
 num(r'To kollineære hastigheter på 0.5c kombineres. Svaret er hvor mange ganger c?',.8,[r'$(0.5+0.5)/(1+0.25)=0.8$.']),
 work(r'Vis i 1+1 dimensjoner at boostmatrisen bevarer $c^2t^2-x^2$.',[r'Sett inn $ct\prime=\gamma(ct-\beta x)$ og $x\prime=\gamma(x-\beta ct)$.',r'Utvid differansen av kvadratene. Kryssleddene kansellerer.',r'Resten er $\gamma^2(1-\beta^2)(c^2t^2-x^2)=c^2t^2-x^2$.'],['Brukte begge transformasjonslikningene','Kansellerte kryssledd','Brukte definisjonen av gamma'])],r'For en vilkårlig boostretning med $\boldsymbol\beta=v/c$ er blokkm at risen $\Lambda=\begin{pmatrix}\gamma&-\gamma\boldsymbol\beta^T\\-\gamma\boldsymbol\beta&I+\frac{\gamma^2}{\gamma+1}\boldsymbol\beta\boldsymbol\beta^T\end{pmatrix}$. Fra $\partial_x=\partial_y\Lambda$ følger $\Box_x=\partial_y\Lambda\eta\Lambda^T\nabla_y=\Box_y$. Ved null fart er romblokken I, så uttrykket er også regulært der.')
add('4-12','Laurentrekker og residyregning','Beregne konturintegraler fra singularitetene.',['3-10','1-13'],[
 r'En Laurentrekke tillater negative potenser rundt et punkt. Residyet er koeffisienten foran $(z-a)^{-1}$. Det er akkurat dette leddet som bidrar til integralet rundt en liten positiv sirkel.',
 r'En fjernbar singularitet har ingen negative potenser etter forenkling. En pol har endelig mange, mens en essensiell singularitet har uendelig mange. Residyet kan være null selv ved en ikke-fjernbar singularitet.',
 r'Residyteoremet summerer bidragene fra alle isolerte singulariteter innenfor kurven, med orientering og vindingsnummer. Enkle poler kan ofte behandles med en grense eller en kvotientformel.',
 r'Reelle integraler kan finnes ved å lukke konturen i et komplekst halvplan og vise at ekstrabuen gir null. Dette siste steget er nødvendig. Cauchys formel for høyere deriverte er en nær slektning. Invers Laplacetransform kan også regnes med residyer når forutsetningene holder.'
],[r'\oint_\Gamma f(z)dz=2\pi i\sum_a\operatorname{Ind}_\Gamma(a)\operatorname{Res}(f,a)',r'\operatorname{Res}(g/h,a)=\frac{g(a)}{h\prime(a)}\quad\text{for enkel null i h}',r'\operatorname{Res}(f,a)=\frac1{(m-1)!}\lim_{z\to a}\frac{d^{m-1}}{dz^{m-1}}[(z-a)^mf(z)]'],r'Finn residyet til $e^z/z^2$ i origo.',[
 r'$e^z=1+z+z^2/2+\cdots$.',r'Divisjon gir $z^{-2}+z^{-1}+1/2+\cdots$.',r'Koeffisienten foran $z^{-1}$ er 1.'],r'Øving 4-12 oppgave 15 er unntatt eksamen i 2026-LF. Ikke hopp over resten av residyregningen.','residue',[
 num(r'Finn residyet til $3/z$ i origo.',3,[r'Koeffisienten foran $z^{-1}$ er 3.']),
 num(r'Finn residyet til $1/z^2$ i origo.',0,[r'Laurentrekken mangler $z^{-1}$-ledd.']),
 mc(r'Hvilken singularitet har $e^{1/z}$ i 0?',['Essensiell','Enkel pol','Fjernbar'],0,r'Rekken har uendelig mange negative potenser.',2),
 num(r'Finn residyet til $\sin z/z^2$ i 0.',1,[r'$\sin z/z^2=1/z-z/6+\cdots$.']),
 work(r'Beregn $\int_{-\infty}^{\infty}dx/(x^2+1)$ med residyer.',[r'Lukk med en stor halvsirkel i øvre halvplan. Bare polen i z=i ligger inne.',r'Residyet er $1/(2i)$. Bueintegralet går mot null fordi integranden er av orden $R^{-2}$ og buen har lengde $\pi R$.',r'Integralet er $2\pi i/(2i)=\pi$.'],['Valgte kontur og pol','Regnet residyet','Begrunnet at buen forsvinner'])],r'Cauchys formel for høyere deriverte: $\oint_\Gamma f(z)/(z-a)^{n+1}\,dz=(2\pi i/n!)f^{(n)}(a)$ for en positiv enkel kurve og f holomorf i og på kurven. Eksempel: integralet av $e^z/z^3$ rundt en positiv enhetssirkel er $\pi i$.')
# Samle kursmetadata og kildekoblinger.
codes=['TMA4101','TMA4106','TMA4111','TMA4121'];semesters=['Høst 2024 / siste eksamen 2025','Vår 2025','Høst 2025','Vår 2026']
sourcepages=json.loads((ROOT/'research/sources.json').read_text())
courses=[]
for i,code in enumerate(codes,1):
 p=sourcepages[i-1]
 courses.append(dict(id=i,code=code,title=f'Matematikk {i}',semester=semesters[i-1],source=p['url'],intro=['Modeller, matriser og rekker','Signaler, funksjonsrom og differensiallikninger','Kurver, felt og flervariabel analyse','Feltteori, bevaring og bølger'][i-1],examNote=['Siste publiserte Nome-versjon. Enkel programmering inngår i eksamensopplegget.','Ingen Python på eksamen i denne versjonen. Gamle sett må relevansvurderes.','Ingen programmering på eksamen. Trippelintegraler og Maxwell hører til Matte 4 i dette løpet.','LF fra 2026 unntar blant annet 4-3-5, 4-4-9 og 4-12-15.'][i-1]))
for m in modules:
 base='stoff' if m['course']<3 else 'grunnstoff'
 m['source']=f'https://folk.ntnu.no/mortano/{base}/{m["id"]}.pdf'
 m['sourceLF']=next((u for u,t in sourcepages[m['course']-1]['links'] if u.endswith('/'+m['id']+'-lf.pdf')),None)
 m['sourceTitle']=next((t for u,t in sourcepages[m['course']-1]['links'] if u==m['source']),m['title'])
 m['extra']=m['extra'].replace('blokkm at risen','blokkmatrisen')
 for q in m['questions']:
  q['origin']='Egen øvingsoppgave · samme ferdighet som pensumheftet'
  if q['type']=='mc':
   # Flytt riktig alternativ deterministisk, slik at det ikke alltid ligger først.
   n=len(q['options']);shift=sum(map(ord,q['id']))%n
   q['options']=q['options'][shift:]+q['options'][:shift];q['answer']=(q['answer']-shift)%n
  if q['type']=='number':q['tolerance']=1e-6*max(1,abs(q['answer']))
DATA=dict(version='1.0.0',checked='2026-09-07',courses=courses,modules=modules,exams=[],notes=[
 'Eget undervisningsmateriale basert på temaene i Nomes siste publiserte kursversjoner. Ikke et offisielt NTNU-produkt.',
 'Oppgavebanken inneholder egne oppgaver og tydelig merkede eksamensvarianter. Originaloppgavene åpnes hos NTNU.',
 'Mestringstall viser dokumentert øving i denne pakken. De er ikke karaktergrenser eller en karakterprognose.',
 'Leksjonene dekker alle 50 faghefter på temanivå. Kildenes enkeltoppgaver kan gå dypere; oppgave-for-oppgave-dekning er ikke fullstendig sertifisert.'
])
def write_data():
 (ROOT/'dist/data.js').write_text('window.MATTE_DATA = '+json.dumps(DATA,ensure_ascii=False,indent=1)+';\n')
if __name__=='__main__':
 write_data();print(len(modules),'moduler',sum(len(m['questions']) for m in modules),'oppgaver')
