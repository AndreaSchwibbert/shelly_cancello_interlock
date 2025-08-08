/**
 * Copyright 2025 Andrea Schwibbert
 * Script: controlloCancello
 * Versione: 2.0 - Versione finale ottimizzata per finecorsa NC
 * Descrizione: Gestione interblocco + finecorsa con blocco ultra-veloce
 * Compatibile con: Shelly Gen2/Gen3 (firmware 0.9+)
 */

// Configurazione centralizzata
let CONFIG = {
  RELAY_APRI: 1,           // switch:1 = apertura
  RELAY_CHIUDI: 0,         // switch:0 = chiusura  
  INPUT_FINE_APRI: 1,      // input:1 = finecorsa apertura
  INPUT_FINE_CHIUDI: 0,    // input:0 = finecorsa chiusura
  DEBUG: false             // Cambia a true per debug dettagliato
};

// Stato dei finecorsa - verranno inizializzati durante l'inizializzazione
let statoFinecorsaApri = null;
let statoFinecorsaChiudi = null;

// Funzione helper per logging
function debug(message) {
  if (CONFIG.DEBUG) {
    print(message);
  }
}

// Funzione per verificare se il finecorsa è attivo (NC = false quando premuto)
function finecorsaAttivo(statoInput) {
  return statoInput === false;
}

// Funzione per stampare "attivo"/"disattivo"
function statoStringa(attivo) {
  return attivo ? "attivo" : "disattivo";
}

// Configurazione modalità detached per controllo completo dei relè
function configuraModalitaDetached() {
  debug("Configurazione modalità detached...");
  Shelly.call("Switch.SetConfig", {
    id: CONFIG.RELAY_APRI,
    config: { in_mode: "detached" }
  }, function(res, err) {
    if (err) {
      debug("Errore config detached APRI: " + JSON.stringify(err));
    } else {
      debug("Modalità detached configurata per apertura");
    }
  });
  
  Shelly.call("Switch.SetConfig", {
    id: CONFIG.RELAY_CHIUDI,
    config: { in_mode: "detached" }
  }, function(res, err) {
    if (err) {
      debug("Errore config detached CHIUDI: " + JSON.stringify(err));
    } else {
      debug("Modalità detached configurata per chiusura");
    }
  });
}

// Gestione aggiornamento stato dei finecorsa
Shelly.addStatusHandler(function (e) {
  // Gestione finecorsa apertura
  if (e.component === "input:" + CONFIG.INPUT_FINE_APRI && 
      e.delta && typeof e.delta.state !== "undefined") {
    
    statoFinecorsaApri = e.delta.state;
    let attivo = finecorsaAttivo(statoFinecorsaApri);
    debug("Finecorsa apertura: " + statoStringa(attivo));
    
    if (attivo) {
      debug("Finecorsa apertura attivo -> spengo apertura");
      Shelly.call("Switch.set", { 
        id: CONFIG.RELAY_APRI, 
        on: false 
      });
    }
  }
  
  // Gestione finecorsa chiusura
  if (e.component === "input:" + CONFIG.INPUT_FINE_CHIUDI && 
      e.delta && typeof e.delta.state !== "undefined") {
    
    statoFinecorsaChiudi = e.delta.state;
    let attivo = finecorsaAttivo(statoFinecorsaChiudi);
    debug("Finecorsa chiusura: " + statoStringa(attivo));
    
    if (attivo) {
      debug("Finecorsa chiusura attivo -> spengo chiusura");
      Shelly.call("Switch.set", { 
        id: CONFIG.RELAY_CHIUDI, 
        on: false 
      });
    }
  }
});

// Gestione interblocco e blocco ultra-veloce
Shelly.addStatusHandler(function (e) {
  // Attendi che i finecorsa siano stati inizializzati
  if (statoFinecorsaApri === null || statoFinecorsaChiudi === null) {
    return;
  }
  
  // Intercetta eventi dei relè
  if (e.component && (e.component === "switch:" + CONFIG.RELAY_APRI || e.component === "switch:" + CONFIG.RELAY_CHIUDI)) {
    
    // Gestione apertura
    if (e.component === "switch:" + CONFIG.RELAY_APRI) {
      let finecorsaApriAttivo = finecorsaAttivo(statoFinecorsaApri);
      
      // Blocco ultra-veloce se finecorsa attivo
      if (e.delta && e.delta.output === true && finecorsaApriAttivo) {
        debug("BLOCCO: apertura bloccata - finecorsa attivo");
        Shelly.call("Switch.set", { id: CONFIG.RELAY_APRI, on: false });
        return;
      }
      
      // Interblocco normale
      if (e.delta && e.delta.output === true) {
        debug("Apertura attivata -> interblocco");
        Shelly.call("Switch.set", { id: CONFIG.RELAY_CHIUDI, on: false });
      }
    }
    
    // Gestione chiusura
    if (e.component === "switch:" + CONFIG.RELAY_CHIUDI) {
      let finecorsaChiudiAttivo = finecorsaAttivo(statoFinecorsaChiudi);
      
      // Blocco ultra-veloce se finecorsa attivo
      if (e.delta && e.delta.output === true && finecorsaChiudiAttivo) {
        debug("BLOCCO: chiusura bloccata - finecorsa attivo");
        Shelly.call("Switch.set", { id: CONFIG.RELAY_CHIUDI, on: false });
        return;
      }
      
      // Interblocco normale
      if (e.delta && e.delta.output === true) {
        debug("Chiusura attivata -> interblocco");
        Shelly.call("Switch.set", { id: CONFIG.RELAY_APRI, on: false });
      }
    }
  }
});

// Funzione di inizializzazione
function inizializza() {
  debug("=== INIZIALIZZAZIONE SCRIPT CANCELLO ===");
  
  // Configura modalità detached (essenziale per il controllo)
  configuraModalitaDetached();
  
  let finecorsaLetti = 0;
  let totaleDaLeggere = 2;
  
  // Funzione chiamata quando entrambi i finecorsa sono stati letti
  function verificaInizializzazioneCompletata() {
    finecorsaLetti++;
    if (finecorsaLetti === totaleDaLeggere) {
      let apriAttivo = finecorsaAttivo(statoFinecorsaApri);
      let chiudiAttivo = finecorsaAttivo(statoFinecorsaChiudi);
      
      debug("=== INIZIALIZZAZIONE COMPLETATA ===");
      debug("Finecorsa apertura: " + statoStringa(apriAttivo));
      debug("Finecorsa chiusura: " + statoStringa(chiudiAttivo));
      
      // Verifica condizioni anomale
      if (apriAttivo && chiudiAttivo) {
        debug("ATTENZIONE: Entrambi i finecorsa sono attivi!");
      }
      
      debug("Script operativo!");
    }
  }
  
  // Lettura stato iniziale finecorsa apertura
  Shelly.call("Input.GetStatus", { 
    id: CONFIG.INPUT_FINE_APRI 
  }, function (res, err) {
    if (err) {
      debug("Errore lettura finecorsa apertura");
      statoFinecorsaApri = true; // Default sicuro
      verificaInizializzazioneCompletata();
      return;
    }
    statoFinecorsaApri = res.state;
    let attivo = finecorsaAttivo(statoFinecorsaApri);
    debug("Stato iniziale apertura: " + statoStringa(attivo));
    
    // Spegni relè se finecorsa già attivo
    if (attivo) {
      debug("Spegnimento sicurezza apertura");
      Shelly.call("Switch.set", { id: CONFIG.RELAY_APRI, on: false });
    }
    verificaInizializzazioneCompletata();
  });
  
  // Lettura stato iniziale finecorsa chiusura
  Shelly.call("Input.GetStatus", { 
    id: CONFIG.INPUT_FINE_CHIUDI 
  }, function (res, err) {
    if (err) {
      debug("Errore lettura finecorsa chiusura");
      statoFinecorsaChiudi = true; // Default sicuro
      verificaInizializzazioneCompletata();
      return;
    }
    statoFinecorsaChiudi = res.state;
    let attivo = finecorsaAttivo(statoFinecorsaChiudi);
    debug("Stato iniziale chiusura: " + statoStringa(attivo));
    
    // Spegni relè se finecorsa già attivo
    if (attivo) {
      debug("Spegnimento sicurezza chiusura");
      Shelly.call("Switch.set", { id: CONFIG.RELAY_CHIUDI, on: false });
    }
    verificaInizializzazioneCompletata();
  });
}

// Avvia l'inizializzazione
inizializza();
