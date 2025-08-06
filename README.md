# shelly_cancello_interlock
Script per Shelly 2PM Gen3 che gestisce un cancello motorizzato con finecorsa e interblocco, in modalità “interruttore detached”.

# Controllo Cancello con Shelly 2PM Gen3

Script per Shelly Gen2/Gen3 (firmware 0.9+) che controlla un cancello motorizzato a doppia uscita (apri/chiudi) utilizzando i finecorsa e l’interblocco tra i relè. Supporta la modalità "interruttore detached" e previene attivazioni indesiderate.

## Funzionalità

- Interblocco automatico: apertura e chiusura non possono essere attive contemporaneamente
- Stop automatico ai finecorsa
- Blocco attivazione se il finecorsa è già attivo
- Compatibile con input configurati come "interruttore detached"
- Debug logging attivabile/disattivabile
- Configurazione centralizzata

## Requisiti

- Dispositivo: Shelly 2PM Gen3
- Firmware: versione 0.9 o superiore
- Script engine: abilitato

## Installazione

1. Accedi all'interfaccia web del tuo Shelly.
2. Vai nella sezione **Scripts** e crea uno script nuovo.
3. Incolla il contenuto dello script `controlloCancello.js`.
4. Salva e attiva lo script.
5. Imposta **entrambi gli switch in modalità "detached"** se vuoi comandarli solo da script o automazioni esterne.

## Configurazione

Puoi modificare la configurazione all'inizio dello script:

```js
let CONFIG = {
  RELAY_APRI: 1,
  RELAY_CHIUDI: 0,
  INPUT_FINE_APRI: 1,
  INPUT_FINE_CHIUDI: 0,
  DEBUG: true
};
