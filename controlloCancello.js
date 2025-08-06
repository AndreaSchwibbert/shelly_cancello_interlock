/**
 * Copyright 2025 Andrea Schwibbert
 * Script: controlloCancello
 * Versione: 1.1
 * Descrizione: Gestione interblocco + finecorsa in modalità "Interruttore Detached"
 * Compatibile con: Shelly Gen2/Gen3 (firmware 0.9+)
 */

// Configurazione centralizzata
let CONFIG = {
  RELAY_APRI: 1,           // switch:1 = apertura
  RELAY_CHIUDI: 0,         // switch:0 = chiusura  
  INPUT_FINE_APRI: 1,      // input:1 = finecorsa apertura
  INPUT_FINE_CHIUDI: 0,    // input:0 = finecorsa chiusura
  DEBUG: true              // Abilita/disabilita messaggi di debug
};

// Stato dei finecorsa
let statoFinecorsaApri = false;
let statoFinecorsaChiudi = false;

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
  
  // Lettura stato iniziale finecorsa apertura
  Shelly.call("Input.GetStatus", { 
    id: CONFIG.INPUT_FINE_APRI 
  }, function (res, err) {
    if (err) {
      debug("Errore lettura finecorsa apertura: " + JSON.stringify(err));
      return;
    }
    statoFinecorsaApri = res.state === true;
    debug("Stato iniziale finecorsa apertura: " + statoStringa(statoFinecorsaApri));
    
    // Se il finecorsa è già attivo all'avvio, spegni il relè corrispondente
    if (statoFinecorsaApri) {
      Shelly.call("Switch.set", { 
        id: CONFIG.RELAY_APRI, 
        on: false 
      });
    }
  });
  
  // Lettura stato iniziale finecorsa chiusura
  Shelly.call("Input.GetStatus", { 
    id: CONFIG.INPUT_FINE_CHIUDI 
  }, function (res, err) {
    if (err) {
      debug("Errore lettura finecorsa chiusura: " + JSON.stringify(err));
      return;
    }
    statoFinecorsaChiudi = res.state === true;
    debug("Stato iniziale finecorsa chiusura: " + statoStringa(statoFinecorsaChiudi));
    
    // Se il finecorsa è già attivo all'avvio, spegni il relè corrispondente
    if (statoFinecorsaChiudi) {
      Shelly.call("Switch.set", { 
        id: CONFIG.RELAY_CHIUDI, 
        on: false 
      });
    }
  });
  
  debug("Script avviato con successo!");
}

// Avvia l'inizializzazione
inizializza();
