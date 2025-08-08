# Shelly Cancello Interlock

Script per Shelly Gen2/Gen3 che gestisce un cancello motorizzato con finecorsa e interblocco tra relè.

## 🎯 Funzionalità

- **Interblocco automatico**: impedisce l'attivazione simultanea di apertura e chiusura
- **Gestione finecorsa**: arresto automatico del motore quando raggiunge il limite
- **Protezione anti-danneggiamento**: blocca il comando se il finecorsa è già attivo
- **Debug configurabile**: log dettagliati attivabili per diagnostica

## 📋 Requisiti

- **Dispositivo**: Shelly 2PM, Plus 2PM o Pro 2PM
- **Firmware**: ≥ 0.9.0
- **Collegamenti**:
  - Switch 0: Motore chiusura
  - Switch 1: Motore apertura
  - Input 0: Finecorsa chiusura
  - Input 1: Finecorsa apertura

## ⚙️ Installazione

1. Accedi all'interfaccia web dello Shelly
2. Vai in **Scripts** → **Create Script**
3. Incolla il codice di `controlloCancello.js`
4. Salva e attiva lo script

## 🔧 Configurazione

Modifica i parametri nel CONFIG se necessario:

```javascript
let CONFIG = {
  RELAY_APRI: 1,        // Relè apertura (default: 1)
  RELAY_CHIUDI: 0,      // Relè chiusura (default: 0)
  INPUT_FINE_APRI: 1,   // Input finecorsa apertura
  INPUT_FINE_CHIUDI: 0, // Input finecorsa chiusura
  DEBUG: false          // Abilita log di debug
};
