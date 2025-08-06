/**
 * Script: controlloCancello
 * Gestione interblocco + finecorsa in modalità "Interruttore Detached"
 */

let RELAY_APRI = 1;           // switch:1 = apertura
let RELAY_CHIUDI = 0;         // switch:0 = chiusura
let INPUT_FINE_APRI = 1;      // input:1
let INPUT_FINE_CHIUDI = 0;    // input:0

let statoFinecorsaApri = false;
let statoFinecorsaChiudi = false;

// Funzione per stampare "attivo"/"disattivo"
function statoStringa(val) {
  return val ? "attivo" : "disattivo";
}

// Gestione aggiornamento stato dei finecorsa
Shelly.addStatusHandler(function (e) {
  if (e.component === "input:" + INPUT_FINE_APRI && e.delta && typeof e.delta.state !== "undefined") {
    statoFinecorsaApri = e.delta.state === true;
    print("Finecorsa apertura aggiornato:", statoStringa(statoFinecorsaApri));
    if (statoFinecorsaApri) {
      print("Finecorsa apertura attivo -> spengo apertura");
      Shelly.call("Switch.set", { id: RELAY_APRI, on: false });
    }
  }

  if (e.component === "input:" + INPUT_FINE_CHIUDI && e.delta && typeof e.delta.state !== "undefined") {
    statoFinecorsaChiudi = e.delta.state === true;
    print("Finecorsa chiusura aggiornato:", statoStringa(statoFinecorsaChiudi));
    if (statoFinecorsaChiudi) {
      print("Finecorsa chiusura attivo -> spengo chiusura");
      Shelly.call("Switch.set", { id: RELAY_CHIUDI, on: false });
    }
  }
});

// Gestione interblocco e blocco attivazione se finecorsa è già attivo
Shelly.addStatusHandler(function (e) {
  if (e.delta && e.delta.output === true) {

    if (e.component === "switch:" + RELAY_APRI) {
      if (statoFinecorsaApri) {
        print("Tentativo di apertura ignorato: finecorsa attivo → spengo");
        Shelly.call("Switch.set", { id: RELAY_APRI, on: false });
        return;
      }
      print("Apertura attivata -> spengo chiusura");
      Shelly.call("Switch.set", { id: RELAY_CHIUDI, on: false });
    }

    if (e.component === "switch:" + RELAY_CHIUDI) {
      if (statoFinecorsaChiudi) {
        print("Tentativo di chiusura ignorato: finecorsa attivo → spengo");
        Shelly.call("Switch.set", { id: RELAY_CHIUDI, on: false });
        return;
      }
      print("Chiusura attivata -> spengo apertura");
      Shelly.call("Switch.set", { id: RELAY_APRI, on: false });
    }
  }
});

// Lettura iniziale stato finecorsa all'avvio
Shelly.call("Input.GetStatus", { id: INPUT_FINE_APRI }, function (res) {
  statoFinecorsaApri = res.state === true;
  print("Stato iniziale finecorsa apertura:", statoStringa(statoFinecorsaApri));
});

Shelly.call("Input.GetStatus", { id: INPUT_FINE_CHIUDI }, function (res) {
  statoFinecorsaChiudi = res.state === true;
  print("Stato iniziale finecorsa chiusura:", statoStringa(statoFinecorsaChiudi));
});
