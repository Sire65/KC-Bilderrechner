(()=>{
  "use strict";
  const C={
    EMAIL_SENT:{type:"success",text:"E-Mail wurde erfolgreich versendet."},
    EMAIL_ACCEPTED:{type:"success",text:"E-Mail wurde vom Provider angenommen."},
    EMAIL_DELIVERED:{type:"success",text:"E-Mail wurde zugestellt."},
    EMAIL_OPENED:{type:"info",text:"E-Mail wurde geöffnet."},
    EMAIL_NO_SUBJECT:{type:"warning",text:"E-Mail kann nicht versendet werden: Betreff fehlt."},
    EMAIL_NO_RECIPIENT:{type:"warning",text:"E-Mail kann nicht versendet werden: Empfänger fehlt."},
    EMAIL_INVALID_RECIPIENT:{type:"warning",text:"E-Mail-Adresse des Empfängers ist ungültig."},
    EMAIL_PROVIDER_UNAVAILABLE:{type:"error",text:"E-Mail-Provider ist derzeit nicht erreichbar."},
    EMAIL_FAILED:{type:"error",text:"E-Mail-Versand ist fehlgeschlagen."},
    EMAIL_RETRY:{type:"warning",text:"E-Mail-Versand wird automatisch erneut versucht."},
    PUSH_SENT:{type:"success",text:"Push-Nachricht wurde versendet."},
    PUSH_DELIVERED:{type:"success",text:"Push-Nachricht wurde zugestellt."},
    PUSH_OPENED:{type:"info",text:"Push-Nachricht wurde geöffnet."},
    PUSH_NO_RECIPIENT:{type:"warning",text:"Push-Nachricht kann nicht versendet werden: Empfänger fehlt."},
    PUSH_NO_SUBSCRIPTION:{type:"warning",text:"Für den Empfänger ist kein aktives Push-Gerät registriert."},
    PUSH_SUBSCRIPTION_EXPIRED:{type:"warning",text:"Push-Abonnement ist abgelaufen und wurde deaktiviert."},
    PUSH_FAILED:{type:"error",text:"Push-Versand ist fehlgeschlagen."},
    PUSH_RETRY:{type:"warning",text:"Push-Versand wird automatisch erneut versucht."},
    SMS_SENT:{type:"success",text:"SMS wurde versendet."},
    SMS_NO_RECIPIENT:{type:"warning",text:"SMS kann nicht versendet werden: Telefonnummer fehlt."},
    SMS_PROVIDER_MISSING:{type:"warning",text:"SMS-Provider ist noch nicht eingerichtet."},
    SMS_FAILED:{type:"error",text:"SMS-Versand ist fehlgeschlagen."},
    WHATSAPP_SENT:{type:"success",text:"WhatsApp-Nachricht wurde versendet."},
    WHATSAPP_NO_RECIPIENT:{type:"warning",text:"WhatsApp-Nachricht kann nicht versendet werden: Empfänger fehlt."},
    WHATSAPP_PROVIDER_MISSING:{type:"warning",text:"WhatsApp-Provider ist noch nicht eingerichtet."},
    WHATSAPP_FAILED:{type:"error",text:"WhatsApp-Versand ist fehlgeschlagen."},
    TEMPLATE_MISSING:{type:"warning",text:"Nachricht kann nicht erstellt werden: Vorlage fehlt."},
    TEMPLATE_VARIABLE_MISSING:{type:"warning",text:"Nachrichtenvorlage ist unvollständig: Pflichtvariable fehlt."},
    PROGRAM_NOT_ALLOWED:{type:"error",text:"Quellprogramm ist für diesen Versandweg nicht freigegeben."},
    QUIET_HOURS:{type:"info",text:"Nachricht wird wegen der Ruhezeit später versendet."},
    RATE_LIMIT:{type:"warning",text:"Versandlimit erreicht. Nachricht wird verzögert verarbeitet."},
    QUEUED:{type:"info",text:"Nachricht wurde in die Versandwarteschlange aufgenommen."},
    RETRY_SCHEDULED:{type:"warning",text:"Versand fehlgeschlagen. Ein erneuter Versuch wurde eingeplant."},
    DEAD_LETTER:{type:"error",text:"Nachricht konnte nach mehreren Versuchen nicht versendet werden und wurde in die Fehlerablage verschoben."},
    DISPATCH_DISABLED:{type:"warning",text:"Echter Versand ist derzeit zentral gesperrt."},
    TEST_OK:{type:"success",text:"Kommunikations-Test wurde erfolgreich abgeschlossen."}
  };
  function format(code,vars={}){
    const def=C[code]||{type:"info",text:String(code||"Unbekanntes Kommunikationsereignis")};
    let text=def.text;
    for(const [k,v] of Object.entries(vars||{})) text=text.replaceAll(`{{${k}}}`,String(v));
    return {code,type:def.type,text};
  }
  function emit(code,vars={}){
    const msg=format(code,vars);
    if(window.KCMessageCore?.add) window.KCMessageCore.add(msg.text,msg.type);
    return msg;
  }
  window.KCCommunicationMessages={version:"1.0.0",catalog:C,format,emit};
})();
