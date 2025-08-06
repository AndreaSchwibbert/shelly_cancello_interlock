/**
 * Copyright 2025 Andrea Schwibbert
 * Script: controlloCancello
 * Versione: 1.2
 * Descrizione: Gestione interblocco + finecorsa in modalità "Interruttore Detached"
 * Compatibile con: Shelly Gen2/Gen3 (firmware 0.9+)
 */

// Configurazione centralizzata
let CONFIG = {
  RELAY_APRI: 1,           // switch:1 = apertura
  RELAY_CHIUDI: 0,         // switch:0 = chiusura  
  INPUT_FINE_APRI: 1,      // input:1 = finecorsa apertura
  INPUT_FINE_CHIUDI: 0,    // input:0 = finecorsa chiusura
  DEBUG: false              // Abilita/disabilita messaggi di debug
};

// Stato dei finecorsa - verranno inizializzati con i valori reali durante l'inizializzazione
let statoFinecorsaApri = null;  // null indica "non ancora letto"
let statoFinecorsaChiudi = null;  // null indica "non ancora letto"

// Funzione helper per logging
function debug(message) {
  if (CONFIG.DEBUG) {
    print(message);
  }
}

// Funzione per stampare "attivo"/"disattivo"
function statoStringa(val) {
  return val ? "attivo" : "disattivo";
}

// Configurazione modalità detached (opzionale)
function configuraModalitaDetached() {
  Shelly.call("Switch.SetConfig", {
    id: CONFIG.RELAY_APRI,
    config: { in_mode: "detached" }
  }, function(res, err) {
    if (err) {
      debug("Errore config detached APRI: " + JSON.stringify(err));
    }
  });
  
  Shelly.call("Switch.SetConfig", {
    id: CONFIG.RELAY_CHIUDI,
    config: { in_mode: "detached" }
  }, function(res, err) {
    if (err) {
      debug("Errore config detached CHIUDI: " + JSON.stringify(err));
    }
  });
}

// Gestione aggiornamento stato dei finecorsa
Shelly.addStatusHandler(function (e) {
  // Gestione finecorsa apertura
  if (e.component === "input:" + CONFIG.INPUT_FINE_APRI && 
      e.delta && typeof e.delta.state !== "undefined") {
    
    statoFinecorsaApri = e.delta.state === true;
    debug("Finecorsa apertura aggiornato: " + statoStringa(statoFinecorsaApri));
    
    if (statoFinecorsaApri) {
      debug("Finecorsa apertura attivo -> spengo apertura");
      Shelly.call("Switch.set", { 
        id: CONFIG.RELAY_APRI, 
        on: false 
      }, function(res, err) {
        if (err) {
          debug("Errore spegnimento apertura: " + JSON.stringify(err));
        }
      });
    }
  }
  
  // Gestione finecorsa chiusura
  if (e.component === "input:" + CONFIG.INPUT_FINE_CHIUDI && 
      e.delta && typeof e.delta.state !== "undefined") {
    
    statoFinecorsaChiudi = e.delta.state === true;
    debug("Finecorsa chiusura aggiornato: " + statoStringa(statoFinecorsaChiudi));
    
    if (statoFinecorsaChiudi) {
      debug("Finecorsa chiusura attivo -> spengo chiusura");
      Shelly.call("Switch.set", { 
        id: CONFIG.RELAY_CHIUDI, 
        on: false 
      }, function(res, err) {
        if (err) {
          debug("Errore spegnimento chiusura: " + JSON.stringify(err));
        }
      });
    }
  }
});

// Gestione interblocco e blocco attivazione se finecorsa è già attivo
Shelly.addStatusHandler(function (e) {
  // Attendi che i finecorsa siano stati letti prima di gestire gli eventi
  if (statoFinecorsaApri === null || statoFinecorsaChiudi === null) {
    debug("Stato finecorsa non ancora inizializzato, ignoro evento");
    return;
  }
  
  if (!e.delta || e.delta.output !== true) {
    return; // Esci se non è un'attivazione
  }
  
  // Gestione attivazione apertura
  if (e.component === "switch:" + CONFIG.RELAY_APRI) {
    if (statoFinecorsaApri) {
      debug("Tentativo di apertura ignorato: finecorsa attivo → spengo");
      Shelly.call("Switch.set", { 
        id: CONFIG.RELAY_APRI, 
        on: false 
      });
      return;
    }
    
    debug("Apertura attivata -> spengo chiusura (interblocco)");
    Shelly.call("Switch.set", { 
      id: CONFIG.RELAY_CHIUDI, 
      on: false 
    });
  }
  
  // Gestione attivazione chiusura
  if (e.component === "switch:" + CONFIG.RELAY_CHIUDI) {
    if (statoFinecorsaChiudi) {
      debug("Tentativo di chiusura ignorato: finecorsa attivo → spengo");
      Shelly.call("Switch.set", { 
        id: CONFIG.RELAY_CHIUDI, 
        on: false 
      });
      return;
    }
    
    debug("Chiusura attivata -> spengo apertura (interblocco)");
    Shelly.call("Switch.set", { 
      id: CONFIG.RELAY_APRI, 
      on: false 
    });
  }
});

// Funzione di inizializzazione
function inizializza() {
  debug("=== INIZIALIZZAZIONE SCRIPT CANCELLO ===");
  
  // Configura modalità detached (decommenta se necessario)
  // configuraModalitaDetached();
  
  let finecorsaLetti = 0;
  let totaleDaLeggere = 2;
  
  // Funzione chiamata quando entrambi i finecorsa sono stati letti
  function verificaInizializzazioneCompletata() {
    finecorsaLetti++;
    if (finecorsaLetti === totaleDaLeggere) {
      debug("=== INIZIALIZZAZIONE COMPLETATA ===");
      debug("Finecorsa apertura: " + statoStringa(statoFinecorsaApri));
      debug("Finecorsa chiusura: " + statoStringa(statoFinecorsaChiudi));
      
      // Verifica condizioni anomale all'avvio
      if (statoFinecorsaApri && statoFinecorsaChiudi) {
        debug("ATTENZIONE: Entrambi i finecorsa sono attivi! Verificare il cablaggio.");
      }
      
      debug("Script pronto e operativo!");
    }
  }
  
  // Lettura stato iniziale finecorsa apertura
  Shelly.call("Input.GetStatus", { 
    id: CONFIG.INPUT_FINE_APRI 
  }, function (res, err) {
    if (err) {
      debug("Errore lettura finecorsa apertura: " + JSON.stringify(err));
      statoFinecorsaApri = false; // Default sicuro in caso di errore
      verificaInizializzazioneCompletata();
      return;
    }
    statoFinecorsaApri = res.state === true;
    debug("Stato iniziale finecorsa apertura: " + statoStringa(statoFinecorsaApri));
    
    // Se il finecorsa è già attivo all'avvio, spegni il relè corrispondente
    if (statoFinecorsaApri) {
      debug("Finecorsa apertura già attivo - spengo relè apertura per sicurezza");
      Shelly.call("Switch.set", { 
        id: CONFIG.RELAY_APRI, 
        on: false 
      });
    }
    verificaInizializzazioneCompletata();
  });
  
  // Lettura stato iniziale finecorsa chiusura
  Shelly.call("Input.GetStatus", { 
    id: CONFIG.INPUT_FINE_CHIUDI 
  }, function (res, err) {
    if (err) {
      debug("Errore lettura finecorsa chiusura: " + JSON.stringify(err));
      statoFinecorsaChiudi = false; // Default sicuro in caso di errore
      verificaInizializzazioneCompletata();
      return;
    }
    statoFinecorsaChiudi = res.state === true;
    debug("Stato iniziale finecorsa chiusura: " + statoStringa(statoFinecorsaChiudi));
    
    // Se il finecorsa è già attivo all'avvio, spegni il relè corrispondente
    if (statoFinecorsaChiudi) {
      debug("Finecorsa chiusura già attivo - spengo relè chiusura per sicurezza");
      Shelly.call("Switch.set", { 
        id: CONFIG.RELAY_CHIUDI, 
        on: false 
      });
    }
    verificaInizializzazioneCompletata();
  });
}

// Avvia l'inizializzazione
inizializza();
