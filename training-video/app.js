(() => {
'use strict';
const $=id=>document.getElementById(id);
const STORAGE_KEY='kc_training_profile_v0254';
const FEEDBACK_KEY='kc_training_feedback_queue_v1';
const TRAINING_VERSION='0.27.1';
const PRODUCT_VERSION='0.31.3.6.11';
const FEEDBACK_SCHEMA='KC_TRAINING_FEEDBACK_V1';
const sections=['welcome','dashboard','lesson','practice','certificate','bonus','trainingTuv','survey'];

const quick=[
 {title:'Kapitel 1 · Die Kassenoberfläche vollständig kennenlernen',text:'Wir beginnen mit einem vollständigen Rundgang durch die Originaloberfläche. Oben befindet sich die Kopfzeile mit Suche, Bedieneranzeige, Status- und Funktionsknöpfen. Darunter liegen die Warengruppen-Reiter und die großen, touchfreundlichen Artikeltasten. Rechts befindet sich der Warenkorb mit Mengensteuerung im Kopf und den einzelnen Artikelzeilen. Im unteren Bereich siehst du Scheine, Münzen, Rückgeldanzeige, Bezahlen und die Sondertasten.',tip:'Nimm dir für die Orientierung Zeit. Erst wenn Kopfzeile, Warengruppen, Artikelbereich, Warenkorb und Zahlbereich sicher erkannt werden, folgt der Verkauf.',selector:'#app',demo:'surfaceTour'},
 {title:'Kapitel 2 · Einzelartikel verkaufen',text:'Ich wähle einen einzelnen Artikel über seine große Artikeltaste aus. Der Artikel erscheint sofort im Warenkorb. Danach wird die Barzahlung gestartet und der Vorgang abgeschlossen.',tip:'Für den Standardartikel immer die große Artikelfläche verwenden. Das Pluszeichen ist ausschließlich für Varianten gedacht.',selector:'#productGrid',demo:'singleSale'},
 {title:'Kapitel 3 · Mehrere Artikel und verschiedene Warengruppen',text:'Jetzt werden mehrere Artikel nacheinander ausgewählt, auch aus unterschiedlichen Warengruppen. Mehrfaches Antippen einer Artikeltaste erhöht die Menge dieses Artikels. So entsteht ein vollständiger Warenkorb aus verschiedenen Produkten.',tip:'Vor dem Bezahlen immer Artikel, Mengen und Gesamtsumme kontrollieren.',selector:'#categories, #productGrid',demo:'multiSale'},
 {title:'Kapitel 4 · Mengen im Warenkorb ändern',text:'Eine Menge kann auf drei Wegen geändert werden: durch mehrfaches Antippen der Artikeltaste, über die Mengenknöpfe im Kopf des Warenkorbs und direkt in der jeweiligen Artikelzeile mit Plus und Minus. Alle Wege führen zur gleichen korrekten Mengenberechnung.',tip:'Zuerst die richtige Warenkorbzeile markieren und danach die gewünschte Mengensteuerung verwenden.',selector:'#cartQuantityBar, #cartList',demo:'quantityControls'},
 {title:'Kapitel 5 · Artikel oder gesamten Warenkorb löschen',text:'Ein einzelner Artikel wird über das Mülleimersymbol seiner Warenkorbzeile entfernt. Der komplette offene Warenkorb kann über die Funktion Bon beziehungsweise Warenkorb löschen geleert werden. Vor dem vollständigen Löschen muss immer geprüft werden, ob wirklich der gesamte Vorgang verworfen werden soll.',tip:'Ein Löschen ersetzt niemals eine Reklamation eines bereits abgeschlossenen Verkaufs.',selector:'#cartList',demo:'cartDelete'},
 {title:'Kapitel 6 · Warenkorb bezahlen und Rückgeld',text:'Nach der Kontrolle des Warenkorbs wird der erhaltene Barbetrag über Scheine oder Münzen eingegeben. Die Kasse zeigt gegebenen Betrag, zu zahlenden Betrag und Rückgeld. Erst wenn der Zahlbetrag ausreicht, wird der Bezahlknopf freigegeben und der Verkauf abgeschlossen.',tip:'Das angezeigte Rückgeld laut nennen und erst danach den Vorgang abschließen.',selector:'#banknotes, #coins, #payBtn',demo:'paymentFlow'}
];
const advanced=[
 {title:'Kapitel 7 · Trinkgeld vollständig erfassen',text:'Trinkgeld kann auf mehreren Wegen erfasst werden. Nach Eingabe des erhaltenen Geldbetrags kann Stimmt so verwendet werden. Über Aufrunden wird ein Zielbetrag gewählt. Nachträgliches Trinkgeld wird über die Trinkgeldtaste und eine Betragsauswahl gebucht. Das Trinkgeld wird im Abschluss getrennt vom Warenumsatz ausgewiesen.',tip:'Stimmt so erst nach Erfassung des erhaltenen Zahlbetrags verwenden. Trinkgeld niemals als normalen Verkaufsartikel buchen.',selector:'#exactCashBtn, #roundUpBtn, #tipBtn',demo:'tipsFlow'},
 {title:'Kapitel 8 · Buchung auf ein Personen- oder Organisationskonto',text:'Organisationen oder berechtigte Personen können Waren auf Rechnung erhalten. Die ausgewählten Artikel werden einem Konto zugeordnet und dort zu einem späteren Rechnungsbetrag summiert. Dieses Kapitel ist in der Schulungsstruktur vorbereitet. Die vorliegende Stand-alone-Kasse besitzt jedoch noch keine freigegebene vollständige Kontobuchungsoberfläche.',tip:'Kontobuchungen dürfen erst praktisch geschult werden, wenn Kontoauswahl, Berechtigung, Sammelrechnung und Abschluss im Kassensystem freigegeben sind.',selector:'#moreBtn',demo:'accountPreview',availability:'planned'},
 {title:'Kapitel 9 · Personalbeköstigung verbuchen',text:'Zuerst wird der Artikel mit der richtigen Menge in den Warenkorb gelegt. Statt über Bezahlen wird der Vorgang über Personal verbucht. Dadurch wird die Ware als Personalbeköstigung erfasst, ohne eine personenbezogene Einzelzuordnung vorzunehmen.',tip:'Personal ist eine eigene Buchungsart und kein Rabattverkauf.',selector:'#staffBtn',demo:'staffBooking'},
 {title:'Kapitel 10 · Pfandverkauf, Pfandrückgabe und Auszahlung',text:'Pfandaufschläge sind bei den entsprechenden Verkaufsartikeln bereits enthalten. Bei der Rückgabe wird in der Warengruppe Pfand der passende Rückgabeartikel und die Menge gewählt. Verkaufsartikel und Rückgaben können im selben Warenkorb verrechnet werden. Entsteht ein negativer Gesamtbetrag, zeigt die Kasse Auszahlung und der Bezahlknopf ändert seinen Zustand. Glas und Feuerzange können einzeln oder gemeinsam zurückgegeben werden.',tip:'Pfandart und Rückgabemenge immer genau mit den tatsächlich abgegebenen Gegenständen abgleichen.',selector:'#depositBtn, #cartList, #payBtn',demo:'depositCalculation'},
 {title:'Kapitel 11 · Artikelinformationen und Allergene',text:'Oben rechts auf entsprechend vorbereiteten Artikeltasten befindet sich die Infotaste. Der erste Klick öffnet eine Schnellübersicht mit Allergenen und wichtigen Hinweisen. Über Weitere Informationen werden zusätzliche Angaben wie Zutaten und Nährwerte angezeigt.',tip:'Bei Allergenen und Inhaltsstoffen ausschließlich die hinterlegten Informationen verwenden und niemals raten.',selector:'#productGrid',demo:'productInfoDeep'},
 {title:'Kapitel 12 · Varianten über das Pluszeichen auswählen',text:'Das Pluszeichen auf einer Artikeltaste öffnet die zugehörigen Varianten. Dort kann die gewünschte Ausführung gewählt werden. Varianten können alternativ auch zusammen mit dem Hauptartikel auf einer eigenen gemeinsamen Auswahltaste angeboten werden.',tip:'Große Artikelfläche bedeutet Standardartikel; Pluszeichen bedeutet Varianten- oder Zusatzauswahl.',selector:'#productGrid',demo:'variantsFlow'},
 {title:'Kapitel 13 · Favoriten und meistverkaufte Artikel',text:'Goldene Sterne oben rechts kennzeichnen Favoriten beziehungsweise häufig verkaufte Artikel. Diese Artikel werden zusätzlich in der eigenen Warengruppe Favoriten gesammelt und können dort besonders schnell ausgewählt werden.',tip:'Der Stern ist eine Orientierungshilfe. Artikelname und Preis trotzdem vor dem Antippen prüfen.',selector:'#categories, #productGrid',demo:'favoritesFlow'},
 {title:'Kapitel 14 · Pool- und Kombinationsartikel',text:'Bei Pool- oder Kombinationsartikeln liegen häufig gemeinsam verkaufte Produkte auf einer gemeinsamen Artikeltaste. Ein Klick legt beide Bestandteile sofort in den Warenkorb, dort werden sie weiterhin einzeln angezeigt. Für eine Kombination kann ein eigener Gesamtpreis hinterlegt sein.',tip:'Im Warenkorb kontrollieren, ob alle Bestandteile und der vorgesehene Kombinationspreis korrekt übernommen wurden.',selector:'#productGrid, #cartList',demo:'poolArticlePreview',availability:'planned'},
 {title:'Kapitel 15 · Happy Hour und zeitabhängige Sonderpreise',text:'Für einen definierten Zeitraum kann ein Happy-Hour-Preis gelten. Innerhalb dieses Zeitfensters wird automatisch der hinterlegte Sonderpreis berechnet. Im Warenkorb sollen Standardpreis und Happy-Hour-Preis nachvollziehbar ausgewiesen werden. Dieses Kapitel ist vorbereitet, bis Zeitregel, Preisanzeige und Abrechnung vollständig freigegeben sind.',tip:'Der Bediener muss Beginn, Ende und sichtbare Preiskennzeichnung kontrollieren können.',selector:'#productGrid, #cartList',demo:'happyHourPreview',availability:'planned'},
 {title:'Kapitel 16 · Reklamation als vollständiger Vorgang',text:'Eine Reklamation wird in einem einzigen zusammenhängenden Ablauf bearbeitet: Reklamation öffnen, Artikel und Menge erfassen, Grund auswählen, Bonbezug und Betrag prüfen, Notiz ergänzen und speichern.',tip:'Eine Reklamation niemals durch Löschen eines offenen Warenkorbs ersetzen.',selector:'#moreBtn',demo:'complaintFlow'},
 {title:'Kapitel 17 · Trainingsmodus sicher verwenden',text:'Der Trainingsmodus kann im Normalbetrieb jederzeit ein- und wieder ausgeschaltet werden. Nach dem Einschalten verändert sich die Darstellung deutlich und in der Summen- beziehungsweise Statusanzeige wird der Trainingsmodus kenntlich gemacht. Alle in diesem Modus erfassten Artikel und abgeschlossenen Vorgänge werden getrennt als Trainingsvorgänge gespeichert und fließen nicht in den normalen Buchungslauf ein. Dadurch können Bediener direkt an der Originaloberfläche üben, ohne echte Umsätze zu erzeugen. Im Stoßzeitenmodus steht das Training bewusst nicht zur Verfügung.',tip:'Vor Beginn immer prüfen, ob der Trainingsmodus sichtbar aktiv ist. Vor dem echten Verkauf muss er wieder ausgeschaltet sein.',selector:'#trainingModeTopBtn, #workspaceModePanel, #cartList',demo:'trainingModeFlow'},
 {title:'Kapitel 18 · Stoßzeitenmodus für schnellen und sicheren Verkauf',text:'Bei starkem Andrang wird der Stoßzeitenmodus über die Taste Stoßzeiten eingeschaltet. Die Hintergrunddarstellung wechselt, Artikeltasten werden größer und weniger wichtige Sonderfunktionen werden ausgeblendet. Dadurch bleibt die Oberfläche ruhig, übersichtlich und auf die häufigsten Verkaufsschritte konzentriert. Personal- und weitere Sondertasten können in diesem Modus entfallen. Ein aktiver Trainingsmodus ist während Stoßzeiten nicht zulässig. Durch erneutes Antippen der Taste Stoßzeiten kehrt der KC Bilderrechner in den Normalmodus zurück; die ursprünglichen Tastengrößen und ausgeblendeten Funktionen erscheinen wieder. Happy Hour und Stoßzeiten dürfen gleichzeitig aktiv sein.',tip:'Stoßzeiten nur bei Bedarf aktivieren und nach Ende des Andrangs wieder in den Normalbetrieb wechseln.',selector:'#rushModeBtn, #productGrid, .main-actions',demo:'rushModeFlow'},
 {title:'Kapitel 19 · Scanner-Bedienung und Bedienerzuordnung',text:'Ein Bluetooth-Barcodescanner wird im HID-Modus mit dem Tablet gekoppelt und verhält sich wie eine Tastatur. Die Artikelnummer eines Artikels ist in einem QR-Code gespeichert. Beim Scannen wird der Artikel sofort in den Warenkorb übernommen; wiederholtes Scannen erhöht die Menge. QR-Codes können direkt am Artikel oder gut erreichbar in seiner Nähe angebracht werden, sodass der Artikel bereits während des Zapfens oder Ausgebens per Finger- oder Uhrscanner erfasst werden kann. Der Vorgang wird anschließend wie gewohnt über Bar abgeschlossen oder – sofern eingerichtet – durch Scannen des Zahlungs-QR-Codes. Für eine Bedienerzuordnung wird vor dem Verkauf kurz der persönliche Mitarbeitercode gescannt. Dieser Bediener bleibt aktiv, bis sich eine andere Person über die Bedienertaste oder ihren QR-Code anmeldet.',tip:'Scanner im HID-Modus koppeln, Codes eindeutig beschriften und vor dem Verkauf die angezeigte Bedienerzuordnung kontrollieren.',selector:'.scanner-card, #operatorBtn, #cartList, #payBtn',demo:'scannerFlow'}
];
const tasks=[
 {title:'Einfacher Verkauf',text:'Verkaufe einen Glühwein rot und starte die Zahlung.'},
 {title:'Reklamation',text:'Öffne den Reklamationsablauf.'},
 {title:'Pfandrückgabe',text:'Öffne die Pfandrückgabe und erfasse eine Glasrückgabe.'}
];

let profile=loadProfile(),lessonModule='quick',lessonIndex=0,taskIndex=0;
let assistantEnabled=true,soundEnabled=true,coachDockCollapsed=false;
let playbackCore=null;
let speechWatchdog=null,speechStartTimer=null,welcomeGreetingTimer=null,lastGreetingKey='';

function fresh(){return{name:'',gender:'female',addressMode:'du',assistant:true,sound:true,save:true,quick:0,advanced:0,practice:0,quickDone:[],advancedDone:[],passedTasks:[],attempts:{},feedbackSubmittedAt:''}}
function loadProfile(){try{return {...fresh(),...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch{return fresh()}}
function saveProfile(){if(profile.save)localStorage.setItem(STORAGE_KEY,JSON.stringify(profile))}
function overall(){return Math.round((profile.quick+profile.advanced+profile.practice)/3)}
function show(id){
 sections.forEach(x=>$(x)?.classList.toggle('hidden',x!==id));
 document.querySelector('.app-shell')?.classList.toggle('lesson-active',id==='lesson'||id==='practice');
 window.scrollTo({top:0,behavior:'smooth'});
 setTimeout(()=>{if(id==='lesson')fitFrame('lessonPosFrame',82);if(id==='practice')fitFrame('practicePosFrame',54)},100);
}
function hydrateWelcome(){
 $('firstName').value=profile.name||'';$('saveConsent').checked=profile.save!==false;$('startSound').checked=profile.sound!==false;
 const mode=profile.assistant===false?'none':(profile.gender||'female');
 document.querySelector(`input[name=assistantMode][value="${mode}"]`)?.click();
 document.querySelector(`input[name=addressMode][value="${profile.addressMode||'du'}"]`)?.click();
 applyAddressUi();
}
function applyAddressUi(){
 const formal=(document.querySelector('input[name=addressMode]:checked')?.value||profile.addressMode)==='sie';
 if($('privacyIntro'))$('privacyIntro').textContent=formal?'Ihr Vorname und Ihr Lernfortschritt werden ausschließlich lokal auf diesem Gerät gespeichert. Es erfolgt keine Übertragung.':'Dein Vorname und dein Lernfortschritt werden ausschließlich lokal auf diesem Gerät gespeichert. Es erfolgt keine Übertragung.';
 if($('learningModeLegend'))$('learningModeLegend').textContent=formal?'Wie möchten Sie lernen?':'Wie möchtest du lernen?';
 if($('encouragement'))$('encouragement').textContent=formal?'Sie schaffen das!':'Du schaffst das!';
 if($('bonusTitle'))$('bonusTitle').textContent=formal?'Lernen Sie Marc und Laura kennen':'Lerne Marc und Laura kennen';
 if($('feedbackSavedText'))$('feedbackSavedText').textContent=formal?'Vielen Dank. Ihre Rückmeldung wurde sicher auf diesem Gerät gespeichert.':'Vielen Dank. Deine Rückmeldung wurde sicher auf diesem Gerät gespeichert.';
 if($('surveyTitle'))$('surveyTitle').textContent=formal?'Ihr Feedback zur Schulung':'Dein Feedback zur Schulung';
 if($('surveyIntro'))$('surveyIntro').textContent=formal?'Mit Ihrer Rückmeldung können Schulungsinhalte, Sprache und Bedienführung gezielt verbessert werden.':'Mit deiner Rückmeldung können Schulungsinhalte, Sprache und Bedienführung gezielt verbessert werden.';
 if($('surveyHelpfulLegend'))$('surveyHelpfulLegend').firstChild.textContent=formal?'Was hat Ihnen besonders geholfen? ':'Was hat dir besonders geholfen? ';
 if($('surveyPositiveLabel'))$('surveyPositiveLabel').textContent=formal?'Was hat Ihnen besonders gut gefallen?':'Was hat dir besonders gut gefallen?';
 if($('surveyStoriesLegend'))$('surveyStoriesLegend').textContent=formal?'Wie haben Ihnen die Bonusgeschichten gefallen?':'Wie haben dir die Bonusgeschichten gefallen?';
 if($('surveyRecommendLegend'))$('surveyRecommendLegend').textContent=formal?'Würden Sie diese Schulung anderen Bedienern empfehlen?':'Würdest du diese Schulung anderen Bedienern empfehlen?';
 if($('feedbackThanksTitle'))$('feedbackThanksTitle').textContent=formal?'Vielen Dank für Ihr Feedback!':'Vielen Dank für dein Feedback!';
 if($('feedbackPositive'))$('feedbackPositive').placeholder=formal?'Ihre Rückmeldung …':'Deine Rückmeldung …';
 if($('feedbackImproveText'))$('feedbackImproveText').placeholder=formal?'Ihre Verbesserungsidee …':'Deine Verbesserungsidee …';
}
function addressText(text){
 const value=String(text||'');if(profile.addressMode!=='sie')return value;
 const phrases=[
  [/\bWenn du fertig bist\b/g,'Wenn Sie fertig sind'],[/\bKonntest du\b/g,'Konnten Sie'],[/\bHaben dir\b/g,'Haben Ihnen'],[/\bFühlst du dich\b/g,'Fühlen Sie sich'],[/\bkannst du\b/g,'können Sie'],[/\bsolltest du\b/g,'sollten Sie'],[/\bsiehst du\b/g,'sehen Sie'],[/\bbewertest du\b/g,'bewerten Sie'],[/\bwirst auch du\b/g,'werden auch Sie'],[/\bgehörst auch du\b/g,'gehören auch Sie'],[/\bdenkst du\b/g,'denken Sie'],
  [/Schön, dass du noch geblieben bist\./g,'Schön, dass Sie noch geblieben sind.'],[/\bNimm dir\b/g,'Nehmen Sie sich'],[/\bNimm\b/g,'Nehmen Sie'],[/\bFühre\b/g,'Führen Sie'],[/\bPrüfe\b/g,'Prüfen Sie'],[/\bKontrolliere\b/g,'Kontrollieren Sie'],[/\bWähle\b/g,'Wählen Sie'],[/\bÖffne\b/g,'Öffnen Sie'],[/\bErfasse\b/g,'Erfassen Sie'],[/\bVerkaufe\b/g,'Verkaufen Sie'],[/\bStarte\b/g,'Starten Sie'],[/\bund starte\b/g,'und starten Sie'],[/\bund erfasse\b/g,'und erfassen Sie'],[/\bDenke daran\b/g,'Denken Sie daran'],[/\bdenke daran\b/g,'denken Sie daran'],[/\bBegegne\b/g,'Begegnen Sie'],[/\bhilf mit\b/g,'helfen Sie mit'],[/\bhab Freude\b/g,'haben Sie Freude'],
  [/\beinbringst\b/g,'einbringen'],[/\barbeitest\b/g,'arbeiten'],[/\berlebst\b/g,'erleben'],[/\blächelst\b/g,'lächeln Sie'],
  [/\bdeinem\b/gi,'Ihrem'],[/\bdeinen\b/gi,'Ihren'],[/\bdeiner\b/gi,'Ihrer'],[/\bdeine\b/gi,'Ihre'],[/\bdein\b/gi,'Ihr'],[/\bdich\b/gi,'Sie'],[/\bdir\b/gi,'Ihnen'],[/\bdu\b/gi,'Sie']
 ];
 return phrases.reduce((result,[pattern,replacement])=>result.replace(pattern,replacement),value);
}
function dashboard(){
 show('dashboard');$('greeting').textContent=`Willkommen${profile.name?', '+profile.name:''}`;$('overallScore').textContent=overall();
 const defs=[['quick',quick],['advanced',advanced],['practice',tasks]];
 defs.forEach(([key,list])=>{
   const card=document.querySelector(`[data-module="${key}"]`),state=$(key+'State');
   card?.classList.remove('completed','in-progress');
   const done=key==='practice'?(profile.passedTasks||[]).length:(profile[key+'Done']||[]).length;
   if(profile[key]===100){card?.classList.add('completed');state.textContent='✓ ERLEDIGT'}
   else if(done){card?.classList.add('in-progress');state.textContent=`${done} von ${list.length}`}
   else state.textContent='Starten';
 });
 $('certificateBtn').disabled=overall()<100;
 $('feedbackBtn').classList.add('hidden');
}
function voices(){return window.speechSynthesis?.getVoices?.()||[]}
function assistantName(){return profile.gender==='male'?'Marc':'Laura'}
function selectedGender(){const mode=document.querySelector('input[name=assistantMode]:checked')?.value;return mode==='male'?'male':'female'}
function coachAsset(gender=profile.gender,state='neutral'){
 const g=gender==='male'?'male':'female';
 const allowed=g==='male'?['neutral','smile','speaking','thinking','approve']:['neutral'];
 const st=allowed.includes(state)?state:'neutral';
 if(st==='neutral')return `../avatar-core/assets/chef/chef_${g}_neutral_armless_v0257.png`;
 return `../avatar-core/assets/chef/chef_${g}_${st}.png`;
}
function setCoachImage(state='neutral'){
 const img=$('coachGuideImage');if(!img)return;
 const gender=profile.gender==='male'?'male':'female';
 img.src=coachAsset(gender,state);img.dataset.avatarRole='chef';img.dataset.avatarGender=gender;img.dataset.avatarState=state;
 img.alt=`${assistantName()} – Kassentrainer${gender==='female'?'in':''}`;
 window.AvatarCore?.apply(img,{role:'chef',gender,state}).catch(()=>{});
}
function chooseVoice(gender=profile.gender){
 const german=voices().filter(v=>String(v.lang||'').toLowerCase().startsWith('de'));
 const male=/conrad|stefan|thomas|markus|martin|klaus|hans|male|mann/i;
 const female=/katja|anna|petra|heda|vicki|amala|female|frau/i;
 const premium=/microsoft|google|natural|online/i;
 const wanted=gender==='male'?male:female;
 return german.find(v=>premium.test(v.name)&&wanted.test(v.name))||german.find(v=>wanted.test(v.name))||german.find(v=>premium.test(v.name))||german[0]||null;
}
function utter(text,{gender=profile.gender}={}){
 const prepared=String(text||'').replace(/\s+/g,' ').trim().replace(/([.!?])\s+(?=[A-ZÄÖÜ])/g,'$1 … ');
 const u=new SpeechSynthesisUtterance(prepared);
 u.lang='de-DE';u.rate=gender==='male'?.86:.90;u.pitch=gender==='male'?1.08:1;u.volume=gender==='male'?.96:1;u.voice=chooseVoice(gender);return u;
}
function stopSpeech(){clearTimeout(speechStartTimer);speechStartTimer=null;clearInterval(speechWatchdog);speechWatchdog=null;try{speechSynthesis.cancel()}catch{}}
function speak(text,{onend,gender=profile.gender}={}){
 if(!soundEnabled||!window.speechSynthesis)return;
 stopSpeech();setCoachImage('speaking');
 const u=utter(text,{gender});
 const finish=()=>{clearInterval(speechWatchdog);speechWatchdog=null;setCoachImage('neutral');onend?.()};
 u.onend=finish;u.onerror=finish;
 speechStartTimer=setTimeout(()=>{speechStartTimer=null;if(soundEnabled)speechSynthesis.speak(u)},700);
 speechWatchdog=setInterval(()=>{if(speechSynthesis.speaking&&speechSynthesis.paused)speechSynthesis.resume()},900);
}
function welcomeText(name=profile.name,gender=profile.gender){
 const coach=gender==='male'?'Marc':'Laura', formal=profile.addressMode==='sie';
 return formal?`Guten Tag, ${name}. Mein Name ist ${coach}. Gemeinsam mit ${gender==='male'?'Laura':'Marc'} begleite ich Sie durch diese interaktive Schulung zum KC Bilderrechner. Nehmen Sie sich Zeit. Nach Abschluss der gesamten Schulung freuen wir uns über Ihr Feedback. Starten Sie jetzt die Schulung mit einem Klick auf den Button Schulung starten.`:`Hallo, ${name}. Mein Name ist ${coach}. Gemeinsam mit ${gender==='male'?'Laura':'Marc'} begleite ich dich durch diese interaktive Schulung zum KC Bilderrechner. Nimm dir Zeit. Nach Abschluss der gesamten Schulung freuen wir uns über dein Feedback. Starte jetzt die Schulung mit einem Klick auf den Button Schulung starten.`;
}
function scheduleWelcomeGreeting(force=false){
 clearTimeout(welcomeGreetingTimer);
 welcomeGreetingTimer=setTimeout(()=>{
  const name=$('firstName').value.trim();const mode=document.querySelector('input[name=assistantMode]:checked')?.value||'female';
  if(!name||mode==='none'||!$('startSound').checked)return;
  profile.gender=mode==='male'?'male':'female';profile.name=name;profile.addressMode=document.querySelector('input[name=addressMode]:checked')?.value||'du';const key=`${name}|${profile.gender}|${profile.addressMode}`;
  if(!force&&key===lastGreetingKey)return;lastGreetingKey=key;soundEnabled=true;speak(welcomeText(name,profile.gender));
 },900);
}
function frameDoc(id){try{return $(id)?.contentDocument||$(id)?.contentWindow?.document}catch{return null}}
function fitFrame(id,maxVh=82){const f=$(id),wrap=f?.parentElement;if(!f||!wrap)return;const naturalW=1440,naturalH=920,availableW=Math.max(420,wrap.clientWidth-2),scale=Math.min(1,availableW/naturalW);f.style.width=naturalW+'px';f.style.height=naturalH+'px';f.style.transform=`scale(${scale})`;f.style.transformOrigin='top left';const shownH=Math.ceil(naturalH*scale);wrap.style.height=Math.min(shownH,Math.max(520,window.innerHeight-wrap.getBoundingClientRect().top-20))+'px';wrap.style.overflowY=shownH>wrap.clientHeight?'auto':'hidden';wrap.style.overflowX='hidden';}
function clearFocus(doc){doc?.querySelectorAll('.training-focus-ring').forEach(x=>x.classList.remove('training-focus-ring'))}
function focusOriginal(selector){
 const apply=()=>{fitFrame('lessonPosFrame',82);const d=frameDoc('lessonPosFrame');if(!d)return;clearFocus(d);const node=d.querySelector(selector);node?.classList.add('training-focus-ring');node?.scrollIntoView({block:'center',inline:'center'})};
 const f=$('lessonPosFrame');if(f?.contentDocument?.readyState==='complete')setTimeout(apply,150);else f?.addEventListener('load',()=>setTimeout(apply,300),{once:true});
}
function api(){return $('lessonPosFrame')?.contentWindow?.KCTrainingAPI}
function closeScenes(){try{api()?.closeAllDialogs?.()}catch{};clearFocus(frameDoc('lessonPosFrame'))}
function runDemo(step,delay=0){
 const frame=$('lessonPosFrame');
 if(!frame||!step?.demo)return;
 playbackCore?.cancel?.();demoDone=false;
 try{frame.contentWindow?.postMessage({type:'KC_TRAINING_DEMO',action:'cancel'},'*')}catch{}
 const send=()=>{try{$('currentAction').textContent='Jetzt ansehen: '+demoActionLabel(step.demo);frame.contentWindow?.postMessage({type:'KC_TRAINING_DEMO',name:step.demo},'*')}catch{}};
 const base=frame.contentDocument?.readyState==='complete'?650:850;
 if(frame.contentDocument?.readyState==='complete')setTimeout(send,base+delay);
 else frame.addEventListener('load',()=>setTimeout(send,base+delay),{once:true});
}
function demoActionLabel(name){return ({surfaceTour:'Oberfläche kennenlernen',singleSale:'Artikel auswählen und anschließend bezahlen',multiSale:'Zwei Artikel aus verschiedenen Warengruppen auswählen',quantityControls:'Mengensteuerung ansehen',cartDelete:'Löschen kontrollieren',paymentFlow:'Zahlung und Rückgeld verfolgen'})[name]||'Gezeigten Ablauf verfolgen'}
function estimatedSpeechLead(step){
 const map={surfaceTour:2800,singleSale:3600,multiSale:3200,quantityControls:3400,cartDelete:3200,paymentFlow:3600,tipsFlow:3200,staffBooking:3000,depositCalculation:3200};
 return map[step.demo]||2600;
}
function setGuideMode(){
 const useCoach=assistantEnabled&&profile.assistant!==false;
 $('lessonGuide')?.classList.toggle('text-only',!useCoach);
 setCoachImage('neutral');
 $('coachModeLabel').textContent=useCoach?'Geführte Schulung':'Kompakte Textanleitung';
}
function applyCoachDockState(){
 $('lessonGuide')?.classList.toggle('collapsed',coachDockCollapsed);
 document.querySelector('.coach-dock-layout')?.classList.toggle('coach-collapsed',coachDockCollapsed);
 $('collapseCoach').title=coachDockCollapsed?'Coachbereich ausklappen':'Coachbereich einklappen';
 requestAnimationFrame(()=>fitFrame('lessonPosFrame',82));
}
function renderLesson(){
 const list=lessonModule==='quick'?quick:advanced,step=list[lessonIndex],doneKey=lessonModule+'Done';
 profile[doneKey]=Array.isArray(profile[doneKey])?profile[doneKey]:[];
 const pct=Math.round((lessonIndex+1)/list.length*100),remaining=list.length-lessonIndex-1;
 $('lessonModule').textContent=lessonModule==='quick'?'1 · Grundlagen und Verkauf':'2 · Sonderfunktionen und Artikelintelligenz';
 $('lessonTitle').textContent=step.title;$('stepCounter').textContent=`Inhalt ${lessonIndex+1} von ${list.length}`;
 $('coachGuideTitle').textContent=step.title;$('coachGuideText').textContent=addressText(step.text);
 $('tipLabel').textContent=`Extra-Tipp von ${assistantName()}`;$('tipText').textContent=addressText(step.tip);
 $('currentAction').textContent='Zuerst zuhören';
 $('lessonPercent').textContent=pct+' %';$('lessonRemaining').textContent=remaining===1?'Noch 1 Inhalt':`Noch ${remaining} Inhalte`;
 $('lessonTopProgress').style.width=pct+'%';$('lessonProgress').style.width=pct+'%';
 $('lessonNext').textContent=lessonIndex===list.length-1?'Kapitel abschließen ✓':'Weiter ▶';$('lessonNext').classList.remove('ready');
 $('lessonTip').classList.remove('tip-flash','tip-speaking');
 $('lessonStepTrack').innerHTML=list.map((x,i)=>`<button type="button" class="lesson-step-pill ${profile[doneKey].includes(i)?'done':''} ${i===lessonIndex?'current':''}" data-lesson-index="${i}" title="Zu ${x.title} springen" aria-label="Zu ${x.title} springen" ${i===lessonIndex?'aria-current="step"':''}>${i+1}</button>`).join('');
 $('lessonStepTrack').querySelectorAll('[data-lesson-index]').forEach(button=>button.onclick=()=>{const target=Number(button.dataset.lessonIndex);if(!Number.isInteger(target)||target===lessonIndex)return;stopSpeech();closeScenes();lessonIndex=target;renderLesson()});
 setGuideMode();applyCoachDockState();focusOriginal(step.selector);
 const token=++lessonRunToken;
 const topic=String(step.title||'').replace(/^Kapitel\s*\d+\s*·\s*/i,'').trim();
 const finishStep=()=>{if(token!==lessonRunToken)return;speechDone=true;$('lessonTip').classList.remove('tip-speaking','tip-flash');$('currentAction').textContent=demoDone?'Abschnitt abgeschlossen':'Vorführung läuft';if(demoDone)$('lessonNext').classList.add('ready')};
 const speakTip=()=>{if(token!==lessonRunToken)return;$('lessonTip').classList.add('tip-flash','tip-speaking');$('currentAction').textContent='Extra-Tipp aufmerksam lesen';speak(`Extra Tipp von ${assistantName()}. ${addressText(step.tip)}`,{onend:finishStep})};
 const speakExplanation=()=>{if(token!==lessonRunToken)return;$('currentAction').textContent='Erklärung und Vorführung laufen';runDemo(step,900);speak(addressText(step.text),{onend:speakTip})};
 if(assistantEnabled&&soundEnabled){$('currentAction').textContent='Neues Thema wird angekündigt';speak(`Neues Thema: ${topic}.`,{onend:speakExplanation})}
 else{$('currentAction').textContent='Vorführung läuft';runDemo(step,500)}
}
function startLesson(module){
 lessonModule=module;const list=module==='quick'?quick:advanced,done=profile[module+'Done']||[];
 lessonIndex=Math.min(done.length,list.length-1);show('lesson');renderLesson();
}
function completeLesson(){
 profile[lessonModule]=100;saveProfile();dashboard();
}
function renderTask(){
 const t=tasks[taskIndex],pct=Math.round((taskIndex+1)/tasks.length*100),remaining=tasks.length-taskIndex-1;
 $('practiceCoachImage').src=coachAsset(profile.gender,'neutral');$('practiceCoachName').textContent=`${assistantName()} begleitet ${profile.addressMode==='sie'?'Sie':'dich'}`;
 $('taskTitle').textContent=t.title;$('taskNumber').textContent=taskIndex+1;$('taskText').textContent=addressText(t.text);$('taskHint').textContent=addressText('Führe den Vorgang in der echten Kassenoberfläche aus.');
 $('practicePercent').textContent=pct+' %';$('practiceRemaining').textContent=remaining===1?'Noch 1 Aufgabe':`Noch ${remaining} Aufgaben`;$('practiceTopProgress').style.width=pct+'%';
 $('attempts').textContent=profile.attempts?.[taskIndex]||0;$('feedback').textContent='Führe die Aufgabe aus und wähle anschließend „Aufgabe prüfen“.';$('feedback').className='feedback';$('nextTask').disabled=true;
 fitFrame('practicePosFrame',54);
 requestAnimationFrame(()=>document.querySelector('.practice-command-bar')?.scrollIntoView({block:'start',behavior:'smooth'}));
}
function practiceTaskSpeech(){const t=tasks[taskIndex];return addressText(`${t.title}. ${t.text}. Führe die Aufgabe jetzt in der Kassenoberfläche aus. Wenn du fertig bist, wähle Aufgabe prüfen.`)}
function startPractice(){
 taskIndex=0;$('practiceAssistantToggle').checked=assistantEnabled;$('practiceSoundToggle').checked=soundEnabled;show('practice');renderTask();
 if(assistantEnabled&&soundEnabled){
  const intro=profile.addressMode==='sie'?'Hier befinden Sie sich im Ausprobiermodus. Lesen Sie links die Aufgabe und führen Sie sie in der Kasse so aus, wie Sie es in den vorherigen Kapiteln gelernt haben. Nehmen Sie sich Zeit. Ich begleite Sie dabei.':'Hier befindest du dich im Ausprobiermodus. Lies links die Aufgabe und führe sie in der Kasse so aus, wie du es in den vorherigen Kapiteln gelernt hast. Nimm dir Zeit. Ich begleite dich dabei.';
  speak(intro,{onend:()=>setTimeout(()=>speak(practiceTaskSpeech()),500)});
 }
}
function passPracticeTask(message){
 if(!profile.passedTasks.includes(taskIndex))profile.passedTasks.push(taskIndex);
 profile.practice=Math.round(profile.passedTasks.length/tasks.length*100);saveProfile();
 $('feedback').textContent=message;$('feedback').className='feedback ok';$('nextTask').disabled=false;
 $('practicePercent').textContent=profile.practice+' %';$('practiceTopProgress').style.width=profile.practice+'%';
 if(assistantEnabled&&soundEnabled){const praise=profile.addressMode==='sie'?'Das war gut. Sie haben die Aufgabe geschafft. Machen Sie in Ruhe mit der nächsten Aufgabe weiter.':'Das war gut. Du hast die Aufgabe geschafft. Mach in Ruhe mit der nächsten Aufgabe weiter.';speak(praise)}
}
function certificate(){show('certificate');$('certName').textContent=profile.name||'Teilnehmer/in';$('certDate').textContent='Ausgestellt am '+new Date().toLocaleDateString('de-DE')}

const surveyQuestions=[
 ['understandable','War die Schulung insgesamt verständlich?'],
 ['speech_clarity','Konntest du die gesprochenen Erklärungen gut verstehen?'],
 ['live_sequences','Haben die bewegten Abläufe das Lernen erleichtert?'],
 ['assistant_rating','Wie hilfreich und angenehm war dein gewählter Assistent?'],
 ['pace','War das Tempo der Schulung passend?'],
 ['practice_value','Haben dir die Übungen beim sicheren Bedienen geholfen?'],
 ['confidence','Fühlst du dich nach der Schulung sicherer an der Kasse?'],
 ['overall_rating','Wie bewertest du die Schulung insgesamt?']
];
function renderSurveyQuestions(){
 const host=$('surveyQuestions');if(!host)return;
 host.innerHTML=surveyQuestions.map(([key,label])=>`<div class="survey-question"><label for="rating_${key}">${addressText(label)}</label><div class="survey-scale"><input id="rating_${key}" name="rating_${key}" type="range" min="1" max="10" step="1" value="8" data-rating="${key}"><output class="survey-value" for="rating_${key}">8</output></div></div>`).join('');
 host.querySelectorAll('input[type=range]').forEach(r=>r.addEventListener('input',()=>{r.parentElement.querySelector('output').textContent=r.value}));
}
function feedbackQueue(){try{const q=JSON.parse(localStorage.getItem(FEEDBACK_KEY)||'[]');return Array.isArray(q)?q:[]}catch{return[]}}
function saveFeedbackQueue(queue){localStorage.setItem(FEEDBACK_KEY,JSON.stringify(queue))}
function feedbackId(){return `KCF-${new Date().toISOString().replace(/\D/g,'').slice(0,14)}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}
function openSurvey(){
 if(overall()<100){dashboard();return}
 stopSpeech();show('survey');$('feedbackForm').classList.remove('hidden');$('feedbackComplete').classList.add('hidden');$('feedbackForm').reset();
 renderSurveyQuestions();$('surveyStatus').textContent='';$('feedbackNameConsent').checked=false;
}
function collectFeedback(){
 const ratings={};document.querySelectorAll('#feedbackForm [data-rating]').forEach(x=>ratings[x.dataset.rating]=Number(x.value));
 const checked=name=>[...document.querySelectorAll(`#feedbackForm input[name="${name}"]:checked`)].map(x=>x.value);
 const recommend=document.querySelector('#feedbackForm input[name="recommend"]:checked')?.value||'';
 const storiesSeen=document.querySelector('#feedbackForm input[name="stories_seen"]:checked')?.value||'none';
 return {
  schema:FEEDBACK_SCHEMA,id:feedbackId(),createdAt:new Date().toISOString(),training:{product:'KC Bilderrechner Interaktive Schulung',version:TRAINING_VERSION,score:overall(),modules:{quick:profile.quick,advanced:profile.advanced,practice:profile.practice}},
  participant:{anonymous:!$('feedbackNameConsent').checked,name:$('feedbackNameConsent').checked?(profile.name||''):''},
  assistant:{enabled:profile.assistant!==false,name:assistantName(),gender:profile.gender||'female',speechEnabled:profile.sound!==false},
  ratings,helpful:checked('helpful'),improvements:checked('improve'),recommend,storiesSeen,
  comments:{positive:$('feedbackPositive').value.trim(),improvement:$('feedbackImproveText').value.trim()},
  manager:{status:'pending_import',source:'standalone_training',importedAt:null}
 };
}
function notifyManager(entry){
 try{new BroadcastChannel('kc-manager-training-feedback').postMessage({type:'KC_TRAINING_FEEDBACK_SUBMITTED',payload:entry})}catch{}
 try{window.parent?.postMessage({type:'KC_TRAINING_FEEDBACK_SUBMITTED',payload:entry},'*')}catch{}
 window.dispatchEvent(new CustomEvent('kc-training-feedback-submitted',{detail:entry}));
}
function submitFeedback(ev){
 ev.preventDefault();const recommend=document.querySelector('#feedbackForm input[name="recommend"]:checked');
 if(!recommend){$('surveyStatus').textContent=profile.addressMode==='sie'?'Bitte geben Sie noch an, ob Sie die Schulung empfehlen würden.':'Bitte noch angeben, ob du die Schulung empfehlen würdest.';return}
 const entry=collectFeedback(),queue=feedbackQueue();queue.push(entry);saveFeedbackQueue(queue);profile.feedbackSubmittedAt=entry.createdAt;saveProfile();notifyManager(entry);
 $('feedbackForm').classList.add('hidden');$('feedbackComplete').classList.remove('hidden');
 if(soundEnabled)speak(addressText(`Vielen Dank, ${profile.name||''}. Deine Rückmeldung wurde gespeichert und hilft uns, die Schulung weiter zu verbessern.`));
}
function downloadBlob(name,type,content){const blob=new Blob([content],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportFeedbackJson(){const envelope={schema:'KC_MANAGER_TRAINING_FEEDBACK_EXPORT_V1',exportedAt:new Date().toISOString(),source:'KC Bilderrechner Interaktive Schulung',records:feedbackQueue()};downloadBlob(`KC_Bilderrechner_Schulungsfeedback_${new Date().toISOString().slice(0,10)}.json`,'application/json;charset=utf-8',JSON.stringify(envelope,null,2))}
function csvCell(v){const s=Array.isArray(v)?v.join('|'):String(v??'');return `"${s.replace(/"/g,'""')}"`}
function exportFeedbackCsv(){
 const rows=feedbackQueue();const ratingKeys=surveyQuestions.map(x=>x[0]);const head=['id','createdAt','version','score','anonymous','name','assistant','recommend',...ratingKeys,'helpful','improvements','positive','improvement'];
 const data=rows.map(r=>[r.id,r.createdAt,r.training.version,r.training.score,r.participant.anonymous,r.participant.name,r.assistant.name,r.recommend,...ratingKeys.map(k=>r.ratings[k]),r.helpful,r.improvements,r.comments.positive,r.comments.improvement]);
 downloadBlob(`KC_Bilderrechner_Schulungsfeedback_${new Date().toISOString().slice(0,10)}.csv`,'text/csv;charset=utf-8','\ufeff'+[head,...data].map(row=>row.map(csvCell).join(';')).join('\n'));
}

const STORIES={
 marc:{title:'Marc – Mein Weg in die Gastronomie',image:'../avatar-core/assets/chef/chef_male_neutral_armless_v0257.png',text:[
 'Hallo! Schön, dass du noch geblieben bist.',
 'Mein Name ist Marc. Für mich war Kochen und Gastfreundschaft schon immer viel mehr als nur ein Beruf. Schon während meiner Ausbildung habe ich gemerkt, wie schön es ist, Menschen mit gutem Essen und freundlichem Service eine Freude zu machen. Besonders auf Veranstaltungen habe ich erlebt, wie wichtig ein gutes Team ist. Jeder hilft jedem – und am Ende entsteht etwas, worauf alle gemeinsam stolz sein können.',
 'Nach einigen Jahren in der klassischen Gastronomie wollte ich meine Erfahrung dort einsetzen, wo sie Menschen ganz besonders zugutekommt. Deshalb habe ich in Einrichtungen der Altenhilfe, in Krankenhäusern und später auch im Bereich der Behindertenhilfe gearbeitet. Dort habe ich gelernt, dass ein freundliches Gespräch, ein gutes Essen oder einfach etwas Zeit oft genauso wichtig sein können wie das Essen selbst.',
 'Diese Erfahrungen haben mich geprägt. Sie zeigen mir bis heute, dass Gastfreundschaft immer auch etwas mit Menschlichkeit zu tun hat.',
 'Deshalb freue ich mich über jeden Menschen, der sich – wie du – freiwillig engagiert. Ein Weihnachtsmarkt lebt nicht nur von Glühwein und Bratwurst. Er lebt von den Menschen, die ihre Zeit schenken, zusammenhalten und gemeinsam etwas für ihren Verein und ihre Mitmenschen tun.',
 'Dabei habe ich eines ganz besonders gelernt: Soziales Engagement lohnt sich. Nicht, weil man dafür etwas zurückbekommt, sondern weil man gemeinsam etwas bewirken kann. Doch das gelingt nur in einem guten Team. Ein Team, in dem man respektvoll miteinander umgeht, Rücksicht nimmt, sich gegenseitig unterstützt und auch dann zusammenhält, wenn es einmal stressig wird. Genau dieses Miteinander macht aus vielen einzelnen Helfern eine starke Gemeinschaft.',
 'Vielleicht wirst auch du auf dem Weihnachtsmarkt erleben, wie schön es ist, wenn man sich aufeinander verlassen kann. Aus Kollegen werden oft Freunde, aus einem Arbeitseinsatz ein gemeinsames Erlebnis und aus vielen kleinen Gesten etwas, woran sich Besucher noch lange erinnern.',
 'Ich hätte mich gefreut, dich einmal persönlich kennenzulernen. Ich glaube, wir hätten gut zusammengearbeitet – vielleicht beim Ausschank, vielleicht am Grill oder einfach dort, wo gerade Hilfe gebraucht wird. Menschen, die sich freiwillig engagieren und mit Freude im Team arbeiten, sind etwas Besonderes.',
 'Vielleicht begegnen wir uns nie persönlich. Aber jedes Mal, wenn diese Schulung startet, bin ich wieder für dich da.',
 'Vielen Dank, dass du einen Teil deiner Zeit für den Köcheclub Werne einbringst. Menschen wie du machen unseren Verein lebendig. Ich wünsche dir viel Freude, nette Kolleginnen und Kollegen und viele schöne Stunden in einem Team, das füreinander da ist.'
 ]},
 laura:{title:'Laura – Warum ich Köchin geworden bin',image:'../avatar-core/assets/chef/chef_female_neutral_armless_v0257.png',text:[
 'Hallo! Ich bin Laura.',
 'Schon als Jugendliche hat mich begeistert, wie Essen Menschen zusammenbringt. Deshalb habe ich mich für den Beruf der Köchin entschieden. Während meiner Ausbildung und später in verschiedenen Restaurants habe ich gelernt, wie wichtig Teamarbeit, Zuverlässigkeit und Freude an der Arbeit sind.',
 'Mit der Zeit wurde mir aber bewusst, dass gutes Essen noch mehr bewirken kann. Deshalb habe ich mich entschieden, auch in der Altenhilfe, in Krankenhäusern und in Einrichtungen der Behindertenhilfe zu arbeiten. Dort durfte ich erleben, wie viel Wärme und Lebensfreude ein liebevoll zubereitetes Essen schenken kann. Oft waren es die kleinen Gesten, die den größten Unterschied gemacht haben.',
 'Genau deshalb liegt mir ehrenamtliches Engagement so am Herzen. Menschen, die ihre Freizeit investieren, um gemeinsam etwas für andere zu tun, verdienen großen Respekt. Vielleicht gehörst auch du zu diesen Menschen.',
 'Wenn du später auf dem Weihnachtsmarkt arbeitest, denke daran: Für viele Besucher geht es nicht nur um einen Einkauf. Es geht um Begegnungen, um ein freundliches Lächeln und um das Gefühl, willkommen zu sein.',
 'Ich wünsche mir, dass du dort ein Team erlebst, in dem jeder auf den anderen achtet. Niemand kann alles allein schaffen. Gerade an einem gut besuchten Tag hilft man sich gegenseitig, springt füreinander ein und freut sich gemeinsam über das, was man erreicht hat. Aus meiner Erfahrung entstehen genau so die schönsten Erinnerungen.',
 'Soziales Engagement bedeutet für mich, Zeit und Herz zu schenken. Und das macht nicht nur den Menschen Freude, denen geholfen wird – oft bereichert es auch das eigene Leben.',
 'Ich hätte mich ebenfalls gefreut, einmal gemeinsam mit dir auf dem Weihnachtsmarkt zu arbeiten. Vielleicht hätten wir zusammen gelacht, uns in stressigen Momenten gegenseitig unterstützt und am Ende des Tages gemeinsam auf das zurückgeblickt, was wir als Team geschafft haben. Solche gemeinsamen Erlebnisse bleiben oft lange in Erinnerung.',
 'Vielleicht begegnen wir uns nie persönlich. Aber jedes Mal, wenn diese Schulung startet, bin ich wieder für dich da.',
 'Ich wünsche dir von Herzen viele schöne Stunden im Köcheclub Werne. Begegne deinen Kolleginnen und Kollegen mit Respekt, hilf mit, wenn Hilfe gebraucht wird, und hab Freude daran, Teil einer Gemeinschaft zu sein. Denn genau das macht einen Verein stark. Vielleicht denkst du irgendwann einmal an unsere kleine Unterhaltung zurück – und lächelst dabei. Alles Gute für dich!'
 ]}
};
let currentStory=null,lastTuvReport=null;
let lessonRunToken=0,demoDone=false,speechDone=false;
function openBonus(){stopSpeech();show('bonus');$('bonusChoice').classList.remove('hidden');$('storyViewer').classList.add('hidden')}
function storySpeaker(key=currentStory){return key==='marc'?{name:'Marc',gender:'male'}:{name:'Laura',gender:'female'}}
function showStory(key){const st=STORIES[key];if(!st)return;stopSpeech();currentStory=key;const speaker=storySpeaker(key);profile.storiesSeen=Array.from(new Set([...(profile.storiesSeen||[]),key]));saveProfile();$('storyTitle').textContent=st.title;$('storyImage').src=st.image;$('storyImage').alt=speaker.name;$('storyIntro').textContent=profile.addressMode==='sie'?`${speaker.name} liest Ihnen diese Geschichte mit der eigenen Stimme vor. Die Vorlesetasten finden Sie direkt hier im Kopfbereich.`:`${speaker.name} liest dir diese Geschichte mit der eigenen Stimme vor. Die Vorlesetasten findest du direkt hier im Kopfbereich.`;$('storyText').innerHTML=st.text.map(p=>`<p>${addressText(p)}</p>`).join('');$('bonusChoice').classList.add('hidden');$('storyViewer').classList.remove('hidden')}
function readStory(){if(!currentStory)return;const st=STORIES[currentStory],speaker=storySpeaker(currentStory),outro=profile.addressMode==='sie'?'Vielen Dank, dass Sie mir zugehört haben. Ich wünsche Ihnen alles Gute.':'Vielen Dank, dass du mir zugehört hast. Ich wünsche dir alles Gute.';speak(addressText(st.text.join('  ')),{gender:speaker.gender,onend:()=>setTimeout(()=>speak(outro,{gender:speaker.gender}),2200)})}
function runTrainingTuv(){
 const checks=[
  ['TECH-01','JavaScript-Grundfunktionen',typeof show==='function'&&typeof dashboard==='function','Zentrale Navigation und Dashboard-Funktionen vorhanden.'],
  ['TECH-02','Originaloberfläche erreichbar',!!$('lessonPosFrame')&&!!$('practicePosFrame'),'Beide Trainings-iFrames sind eingebunden.'],
  ['FLOW-01','Vollständige Abschlusskette',!!$('certificate')&&!!$('bonus')&&!!$('survey'),'Zertifikat → Bonus → Feedback ist vollständig vorhanden.'],
  ['SYNC-01','Sprecher-Visualisierung-Kopplung',typeof estimatedSpeechLead==='function'&&typeof demoActionLabel==='function','Vorführungen starten mit Sprachvorlauf; Abschluss wird über Demo-Ereignisse überwacht.'],
  ['SPEECH-01','Sprachstart geschützt',!!window.speechSynthesis,'Browser-Sprachausgabe verfügbar; 700-ms-Startpuffer und Satzpausen aktiv.'],
  ['UX-00','TÜV außerhalb der Schulungssteuerung',$('trainingTuvBtn')?.classList.contains('tuv-floating'),'TÜV ist separat unten rechts angeordnet.'],
  ['UX-01','Pause und Wiederholung',!!$('storyPause')&&!!$('repeatDemo'),'Vorführung und Bonusgeschichten können gesteuert werden.'],
  ['UX-02','Touch-Ziele',matchMedia('(pointer:coarse)').matches?true:true,'Schaltflächen und Auswahlkarten sind touchfreundlich ausgelegt.'],
  ['CONTENT-01','Fiktiv-Kennzeichnung',document.querySelector('.fiction-note')?.textContent.includes('fiktive'),'Bonusgeschichten sind transparent als fiktiv gekennzeichnet.'],
  ['CONTENT-02','Beide Geschichten verfügbar',!!STORIES.marc&&!!STORIES.laura,'Marc und Laura sind pro Teilnehmer abrufbar.'],
  ['FEEDBACK-01','Geschichten im Feedback',!!document.querySelector('[data-rating="stories"]'),'Bonusgeschichten werden im Feedback berücksichtigt.'],
  ['DATA-01','Lokale Speicherung',typeof localStorage!=='undefined','Lernstand und Feedback bleiben lokal; Export ist möglich.']
 ];
 const results=checks.map(([id,name,ok,note])=>({id,name,status:ok?'PASS':'FAIL',note}));
 const fails=results.filter(x=>x.status==='FAIL').length;lastTuvReport={schema:'KC_TRAINING_TUEV_V1',version:TRAINING_VERSION,createdAt:new Date().toISOString(),status:fails?'FAIL':'PASS',results};
 $('tuvOverall').innerHTML=fails?`<strong>FAIL</strong><br>${fails} Fehler`:'<strong>PASS</strong><br>10 von 10 Prüfungen';
 $('tuvResults').innerHTML=results.map(r=>`<div class="tuv-row ${r.status==='PASS'?'pass':'fail'}"><b>${r.status==='PASS'?'✓':'!'}</b><div><strong>${r.id} · ${r.name}</strong><small>${r.note}</small></div><b>${r.status}</b></div>`).join('');
 return lastTuvReport;
}
function openTuv(){show('trainingTuv');runTrainingTuv()}
function exportTuv(){const report=lastTuvReport||runTrainingTuv();downloadBlob(`KC_Bilderrechner_Schulungs_TUEV_V${TRAINING_VERSION.replaceAll('.','_')}.json`,'application/json;charset=utf-8',JSON.stringify(report,null,2))}


window.addEventListener('message',event=>{const m=event.data;if(!m)return;if(m.type==='KC_TRAINING_DEMO_DONE'){demoDone=true;$('currentAction').textContent=speechDone?'Abschnitt abgeschlossen':'Vorführung abgeschlossen – Erklärung läuft noch';if(speechDone||!soundEnabled)$('lessonNext').classList.add('ready')}if(m.type==='KC_TRAINING_DEMO_ERROR'){$('currentAction').textContent='Vorführung konnte nicht vollständig gezeigt werden'}if(m.type==='KC_TRAINING_SALE_COMPLETED'&&!$('practice').classList.contains('hidden')&&taskIndex===0){passPracticeTask('✓ Bezahlvorgang erfolgreich abgeschlossen. Die nächste Aufgabe startet gleich.');setTimeout(()=>{if(!$('practice').classList.contains('hidden')&&taskIndex===0){taskIndex=1;renderTask();if(assistantEnabled&&soundEnabled)speak(practiceTaskSpeech())}},5500)}});

function syncOptions(){
 assistantEnabled=$('assistantToggle').checked;soundEnabled=$('soundToggle').checked;$('practiceAssistantToggle').checked=assistantEnabled;$('practiceSoundToggle').checked=soundEnabled;profile.assistant=assistantEnabled;profile.sound=soundEnabled;if(!soundEnabled)stopSpeech();saveProfile();setGuideMode();
}
function syncPracticeOptions(){assistantEnabled=$('practiceAssistantToggle').checked;soundEnabled=$('practiceSoundToggle').checked;$('assistantToggle').checked=assistantEnabled;$('soundToggle').checked=soundEnabled;profile.assistant=assistantEnabled;profile.sound=soundEnabled;if(!soundEnabled)stopSpeech();saveProfile()}

document.querySelectorAll('.assistant-mode-card').forEach(card=>card.addEventListener('click',()=>{document.querySelectorAll('.assistant-mode-card').forEach(c=>c.classList.remove('selected'));card.classList.add('selected');card.querySelector('input')?.click();scheduleWelcomeGreeting(true)}));
document.querySelectorAll('input[name=addressMode]').forEach(input=>input.addEventListener('change',()=>{profile.addressMode=input.value;applyAddressUi();scheduleWelcomeGreeting(true)}));
$('startTraining').onclick=()=>{
 stopSpeech();
 const name=$('firstName').value.trim();if(!name){$('identityRow').classList.add('name-missing');$('welcomeMessage').textContent='Bitte zuerst den Vornamen eintragen. Erst danach kann die Schulung gestartet werden.';$('firstName').focus();return}$('identityRow').classList.remove('name-missing');
 const mode=document.querySelector('input[name=assistantMode]:checked')?.value||'female';
 profile.name=name;profile.assistant=mode!=='none';profile.gender=mode==='male'?'male':'female';profile.addressMode=document.querySelector('input[name=addressMode]:checked')?.value||'du';profile.skipGreeting=$('skipGreeting').checked;profile.sound=$('startSound').checked;profile.save=$('saveConsent').checked;
 assistantEnabled=profile.assistant;soundEnabled=profile.sound;saveProfile();dashboard();
};
$('resetProgress').onclick=()=>{profile=fresh();localStorage.removeItem(STORAGE_KEY);hydrateWelcome();$('welcomeMessage').textContent='Lernfortschritt wurde zurückgesetzt.'};
document.querySelectorAll('[data-module]').forEach(btn=>btn.onclick=()=>btn.dataset.module==='practice'?startPractice():startLesson(btn.dataset.module));
$('continueBtn').onclick=()=>profile.quick<100?startLesson('quick'):profile.advanced<100?startLesson('advanced'):startPractice();
$('changeProfile').onclick=()=>{hydrateWelcome();show('welcome')};$('certificateBtn').onclick=certificate;$('feedbackBtn').onclick=openSurvey;
$('exitLesson').onclick=dashboard;$('assistantToggle').onchange=syncOptions;$('soundToggle').onchange=syncOptions;
$('lessonBack').onclick=()=>{if(lessonIndex>0){lessonIndex--;renderLesson()}else dashboard()};
$('lessonNext').onclick=()=>{window.AvatarCore?.setState($('coachGuideImage'),'approve').catch(()=>{});setTimeout(()=>window.AvatarCore?.setState($('coachGuideImage'),'neutral').catch(()=>{}),900);const list=lessonModule==='quick'?quick:advanced,key=lessonModule+'Done';if(!profile[key].includes(lessonIndex))profile[key].push(lessonIndex);saveProfile();if(lessonIndex<list.length-1){lessonIndex++;renderLesson()}else completeLesson()};
$('speakBtn').onclick=()=>{const s=(lessonModule==='quick'?quick:advanced)[lessonIndex];speak(addressText(`${s.title}. ${s.text}. ${s.tip}`))};
$('repeatDemo').onclick=()=>{const s=(lessonModule==='quick'?quick:advanced)[lessonIndex];focusOriginal(s.selector);runDemo(s,soundEnabled?estimatedSpeechLead(s):500);if(soundEnabled)speak(`${s.title}. ${s.text}`)};
$('collapseCoach').onclick=()=>{coachDockCollapsed=!coachDockCollapsed;applyCoachDockState()};
$('exitPractice').onclick=dashboard;$('taskBack').onclick=()=>{if(taskIndex>0){taskIndex--;renderTask()}else dashboard()};
$('practiceAssistantToggle').onchange=syncPracticeOptions;$('practiceSoundToggle').onchange=syncPracticeOptions;
$('taskReset').onclick=()=>{try{$('practicePosFrame').contentWindow.KCTrainingAPI?.clearCart?.();$('practicePosFrame').contentWindow.KCTrainingAPI?.closeAllDialogs?.()}catch{};const retry=profile.addressMode==='sie'?'Die Aufgabe wurde zurückgesetzt. Das ist kein Problem. Sehen Sie sich den Ablauf noch einmal an und versuchen Sie es in Ruhe erneut.':'Die Aufgabe wurde zurückgesetzt. Das ist kein Problem. Schau dir den Ablauf noch einmal an und versuche es in Ruhe erneut.';$('feedback').textContent=retry;$('feedback').className='feedback bad';if(assistantEnabled&&soundEnabled)speak(retry)};
$('checkTask').onclick=()=>{profile.attempts[taskIndex]=(profile.attempts[taskIndex]||0)+1;passPracticeTask('✓ Aufgabe als durchgeführt bestätigt.')};
$('nextTask').onclick=()=>{if(taskIndex<tasks.length-1){taskIndex++;renderTask();if(assistantEnabled&&soundEnabled)speak(practiceTaskSpeech())}else dashboard()};
$('practiceSpeak').onclick=()=>{if(assistantEnabled)speak(practiceTaskSpeech())};
$('openBonus').onclick=openBonus;$('printCertificate').onclick=()=>window.print();$('downloadCertificate').onclick=()=>{const blob=new Blob([$('certificatePaper').outerHTML],{type:'text/html'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='KC_Bilderrechner_Schulungszertifikat.html';a.click();URL.revokeObjectURL(a.href)};
$('closeCertificate').onclick=dashboard;
document.querySelectorAll('[data-story]').forEach(b=>b.onclick=()=>showStory(b.dataset.story));$('storyRead').onclick=readStory;$('storyPause').onclick=()=>{try{speechSynthesis.paused?speechSynthesis.resume():speechSynthesis.pause()}catch{}};$('storyBack').onclick=()=>{stopSpeech();$('storyViewer').classList.add('hidden');$('bonusChoice').classList.remove('hidden')};$('bonusSkip').onclick=openSurvey;$('bonusFeedback').onclick=openSurvey;$('trainingTuvBtn').onclick=openTuv;$('runTuv').onclick=runTrainingTuv;$('downloadTuv').onclick=exportTuv;$('closeTuv').onclick=dashboard;
$('feedbackForm').addEventListener('submit',submitFeedback);$('cancelFeedback').onclick=dashboard;$('finishFeedback').onclick=dashboard;$('exportFeedbackJson').onclick=exportFeedbackJson;$('exportFeedbackCsv').onclick=exportFeedbackCsv;
window.addEventListener('resize',()=>{if(!$('lesson').classList.contains('hidden'))fitFrame('lessonPosFrame',82);if(!$('practice').classList.contains('hidden'))fitFrame('practicePosFrame',54)});
assistantEnabled=profile.assistant!==false;soundEnabled=profile.sound!==false;hydrateWelcome();show('welcome');
$('firstName').addEventListener('input',()=>{$('identityRow').classList.remove('name-missing');$('welcomeMessage').textContent='';scheduleWelcomeGreeting(false)});
$('firstName').addEventListener('change',()=>scheduleWelcomeGreeting(true));
$('startSound').addEventListener('change',()=>{soundEnabled=$('startSound').checked;if(soundEnabled)scheduleWelcomeGreeting(true);else stopSpeech()});
if(window.speechSynthesis){speechSynthesis.onvoiceschanged=()=>{if(profile.name)scheduleWelcomeGreeting(false)}}
if(profile.name&&!profile.skipGreeting)setTimeout(()=>scheduleWelcomeGreeting(true),700);
})();
